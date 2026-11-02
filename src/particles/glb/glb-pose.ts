/**
 * glb-pose.ts
 * src/particles/glb/glb-pose.ts
 *
 * Turns a parsed glTF document plus a time in seconds into a flat palette of
 * matrices, one per thing a dot can be attached to. The sampler and the
 * skinning loop both read that palette and nothing else, which is what keeps
 * rigid models and skinned models on the same code path.
 *
 * ─── THE PALETTE ─────────────────────────────────────────────────────────────
 *
 * One Float32Array, 16 floats per slot, laid out as:
 *
 *   slot 0 .. nodeCount-1        world matrix of each node
 *   slot nodeCount + off[s] + j  skin s, joint j: jointWorld * inverseBind
 *
 * A dot on an unskinned mesh gets one influence: its node's slot at weight 1.
 * A dot on a skinned mesh gets up to four influences into the skin block. The
 * skinning loop does not know or care which it is dealing with, so there is one
 * loop rather than two, and no branch per dot per frame.
 *
 * ─── WHY SKINNED POSITIONS IGNORE THE MESH NODE ──────────────────────────────
 *
 * This catches everybody once. For a skinned mesh, glTF says the mesh node's
 * own transform is ignored: the joint matrices already carry the full world
 * transform. Multiplying by the mesh node's matrix as well applies it twice,
 * and the usual symptom is a character at double scale or orbiting the origin.
 * So skinned vertices stay in their own space here, and only rigid vertices get
 * a node matrix.
 *
 * ─── COST ────────────────────────────────────────────────────────────────────
 *
 * Per frame this is one pass over the animation channels (a handful of
 * comparisons and one interpolation each), one pass over the nodes to compose
 * world matrices, and one pass over the joints. For a rigged character that is
 * a few hundred matrix multiplies, which is nothing next to the per-dot work.
 * Nothing in here allocates.
 */

import type { GlbDoc, ParsedChannel } from './glb-parse'

/**
 * The parts of a parsed document the poser needs.
 *
 * Narrower than GlbDoc on purpose. The sampler runs in a worker and the poser
 * runs on the main thread, so only this much has to cross the boundary: the
 * triangles stay in the worker and are never copied back, which is most of the
 * payload for a detailed model.
 */
export type PoseDoc = Pick<GlbDoc, 'nodes' | 'roots' | 'skins' | 'animations'>
import {
    mat4, mat4Copy, mat4Identity, mat4Mul, mat4FromTRS,
    quatSlerp, quatNormalize, lerp, hermite,
} from './glb-math.ts'

export interface PoseRig {
    /** 16 floats per slot. Rewritten in place by `apply`. */
    palette: Float32Array
    slotCount: number
    /** Where skin s's joint block starts, as a slot index. */
    skinSlotBase: number[]
    nodeCount: number
    /** Clip durations in seconds, parallel to doc.animations. */
    durations: number[]
    /**
     * Rebuild the palette for a given clip and time.
     *
     * @param clip  index into doc.animations, or -1 for the rest pose
     * @param time  seconds into the clip. Wrapped by the clip duration, so
     *              passing a monotonically rising clock loops the animation.
     */
    apply(clip: number, time: number): void
}

/**
 * Find the keyframe segment containing `t`.
 *
 * `cursor` is where the last lookup landed. Playback is almost always forward
 * at a steady rate, so the next lookup is in the same segment or the next one,
 * and starting from the cursor turns a binary search into one or two
 * comparisons. The binary search is still there for seeks and loop wraps.
 *
 * Returns the index of the keyframe at or before t.
 */
function findKey(times: Float32Array, t: number, cursor: number): number {
    const n = times.length
    if (t <= times[0]) return 0
    if (t >= times[n - 1]) return n - 1

    let i = cursor
    if (i < 0) i = 0
    if (i > n - 2) i = n - 2

    if (t >= times[i] && t < times[i + 1]) return i
    if (i + 2 < n && t >= times[i + 1] && t < times[i + 2]) return i + 1

    let lo = 0, hi = n - 1
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        if (times[mid] <= t) lo = mid
        else hi = mid
    }
    return lo
}

export function createPoseRig(doc: PoseDoc): PoseRig {
    const nodeCount = doc.nodes.length

    const skinSlotBase: number[] = []
    let skinSlots = 0
    for (const skin of doc.skins) {
        skinSlotBase.push(skinSlots)
        skinSlots += skin.joints.length
    }

    const slotCount = nodeCount + skinSlots
    const palette = new Float32Array(slotCount * 16)

    // Rest-pose TRS, copied once. Every frame starts from these and lets the
    // animation channels overwrite only what they drive, which is how a clip
    // that animates rotation alone leaves translation and scale where the
    // modeller put them.
    const restT = new Float32Array(nodeCount * 3)
    const restR = new Float32Array(nodeCount * 4)
    const restS = new Float32Array(nodeCount * 3)
    const hasMatrix = new Uint8Array(nodeCount)

    for (let i = 0; i < nodeCount; i++) {
        const n = doc.nodes[i]
        restT[i * 3] = n.translation[0]
        restT[i * 3 + 1] = n.translation[1]
        restT[i * 3 + 2] = n.translation[2]
        restR[i * 4] = n.rotation[0]
        restR[i * 4 + 1] = n.rotation[1]
        restR[i * 4 + 2] = n.rotation[2]
        restR[i * 4 + 3] = n.rotation[3]
        restS[i * 3] = n.scale[0]
        restS[i * 3 + 1] = n.scale[1]
        restS[i * 3 + 2] = n.scale[2]

        // A node that shipped a baked matrix has no meaningful TRS, so its
        // local matrix is used as-is and animation cannot touch it. Exporters
        // only bake a matrix for static nodes, so this costs nothing in
        // practice and avoids silently decomposing a matrix badly.
        const m = n.localMatrix
        const isIdentity =
            m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 0 &&
            m[4] === 0 && m[5] === 1 && m[6] === 0 && m[7] === 0 &&
            m[8] === 0 && m[9] === 0 && m[10] === 1 && m[11] === 0 &&
            m[12] === 0 && m[13] === 0 && m[14] === 0 && m[15] === 1
        hasMatrix[i] = isIdentity ? 0 : 1
    }

    // Working state, allocated once.
    const curT = new Float32Array(nodeCount * 3)
    const curR = new Float32Array(nodeCount * 4)
    const curS = new Float32Array(nodeCount * 3)
    const localM = new Float32Array(nodeCount * 16)
    const worldM = new Float32Array(nodeCount * 16)

    const tmpA = mat4()
    const tmpB = mat4()
    const tmpT = new Float32Array(3)
    const tmpR = new Float32Array(4)
    const tmpS = new Float32Array(3)
    const trsT = new Float32Array(3)
    const trsR = new Float32Array(4)
    const trsS = new Float32Array(3)

    // One cursor per channel, so each track remembers where it was.
    const cursors: number[][] = doc.animations.map(a => a.channels.map(() => 0))

    /**
     * Depth-ordered node list. Composing world = parent * local requires the
     * parent to be done first, and recursion per frame is both slower and a
     * stack-overflow risk on a deep rig. This is computed once.
     */
    const order: number[] = []
    {
        const stack = doc.roots.slice().reverse()
        const seen = new Uint8Array(nodeCount)
        while (stack.length) {
            const i = stack.pop()!
            if (i < 0 || i >= nodeCount || seen[i]) continue
            seen[i] = 1
            order.push(i)
            const kids = doc.nodes[i].children
            for (let k = kids.length - 1; k >= 0; k--) stack.push(kids[k])
        }
        // Nodes outside the declared scene still get posed. A joint that is not
        // reachable from the scene root happens in exported files more often
        // than it should, and leaving it at an uninitialised matrix collapses
        // part of the mesh to the origin.
        for (let i = 0; i < nodeCount; i++) if (!seen[i]) order.push(i)
    }

    function sampleChannel(ch: ParsedChannel, t: number, cursorIdx: number, cl: number): void {
        const { times, values, stride, interpolation } = ch
        const comps = ch.path === 'rotation' ? 4 : 3

        const k = findKey(times, t, cursors[cl][cursorIdx])
        cursors[cl][cursorIdx] = k

        const last = times.length - 1
        const out = ch.path === 'rotation' ? tmpR : (ch.path === 'translation' ? tmpT : tmpS)

        // CUBICSPLINE stores [inTangent, value, outTangent] per key, so the
        // value sits one component-block into the stride.
        const valueOff = interpolation === 'CUBICSPLINE' ? comps : 0

        if (k >= last || interpolation === 'STEP') {
            const o = k * stride + valueOff
            for (let c = 0; c < comps; c++) out[c] = values[o + c]
            if (ch.path === 'rotation') quatNormalize(out, 0)
            return
        }

        const t0 = times[k], t1 = times[k + 1]
        const span = t1 - t0
        const f = span > 0 ? (t - t0) / span : 0

        if (interpolation === 'CUBICSPLINE') {
            const o0 = k * stride
            const o1 = (k + 1) * stride
            for (let c = 0; c < comps; c++) {
                const p0 = values[o0 + comps + c]
                const m0 = values[o0 + comps * 2 + c]
                const p1 = values[o1 + comps + c]
                const m1 = values[o1 + c]
                out[c] = hermite(p0, m0, p1, m1, f, span)
            }
            if (ch.path === 'rotation') quatNormalize(out, 0)
            return
        }

        // LINEAR. Rotation has to slerp; anything else lerps.
        if (ch.path === 'rotation') {
            quatSlerp(out, 0, values, k * stride, values, (k + 1) * stride, f)
        } else {
            const o0 = k * stride, o1 = (k + 1) * stride
            for (let c = 0; c < comps; c++) {
                out[c] = lerp(values[o0 + c], values[o1 + c], f)
            }
        }
    }

    function apply(clip: number, time: number): void {
        // Start from the rest pose.
        curT.set(restT)
        curR.set(restR)
        curS.set(restS)

        const anim = clip >= 0 ? doc.animations[clip] : undefined
        if (anim && anim.duration > 0) {
            // Wrap, so a rising clock loops the clip. A clip of duration 0 (a
            // single keyframe) would divide by zero, hence the guard above.
            const t = time - Math.floor(time / anim.duration) * anim.duration

            for (let ci = 0; ci < anim.channels.length; ci++) {
                const ch = anim.channels[ci]
                const ni = ch.node
                if (ni < 0 || ni >= nodeCount) continue

                sampleChannel(ch, t, ci, clip)

                if (ch.path === 'translation') {
                    curT[ni * 3] = tmpT[0]; curT[ni * 3 + 1] = tmpT[1]; curT[ni * 3 + 2] = tmpT[2]
                } else if (ch.path === 'rotation') {
                    curR[ni * 4] = tmpR[0]; curR[ni * 4 + 1] = tmpR[1]
                    curR[ni * 4 + 2] = tmpR[2]; curR[ni * 4 + 3] = tmpR[3]
                } else {
                    curS[ni * 3] = tmpS[0]; curS[ni * 3 + 1] = tmpS[1]; curS[ni * 3 + 2] = tmpS[2]
                }

                // An animated node cannot keep using a baked matrix.
                hasMatrix[ni] = 0
            }
        }

        // Local matrices.
        for (let i = 0; i < nodeCount; i++) {
            const o = i * 16
            if (hasMatrix[i]) {
                for (let e = 0; e < 16; e++) localM[o + e] = doc.nodes[i].localMatrix[e]
            } else {
                // Copied into scratch rather than passed as subarrays.
                // `subarray` allocates a view, and three of them per node per
                // frame is a few dozen allocations a frame for a rigged
                // character, which is exactly the garbage this file is written
                // to avoid.
                trsT[0] = curT[i * 3]; trsT[1] = curT[i * 3 + 1]; trsT[2] = curT[i * 3 + 2]
                trsR[0] = curR[i * 4]; trsR[1] = curR[i * 4 + 1]
                trsR[2] = curR[i * 4 + 2]; trsR[3] = curR[i * 4 + 3]
                trsS[0] = curS[i * 3]; trsS[1] = curS[i * 3 + 1]; trsS[2] = curS[i * 3 + 2]
                mat4FromTRS(tmpA, trsT, trsR, trsS)
                for (let e = 0; e < 16; e++) localM[o + e] = tmpA[e]
            }
        }

        // World matrices, parents before children.
        for (let oi = 0; oi < order.length; oi++) {
            const i = order[oi]
            const p = doc.nodes[i].parent
            const wo = i * 16
            if (p < 0) {
                for (let e = 0; e < 16; e++) worldM[wo + e] = localM[i * 16 + e]
            } else {
                mat4Copy(tmpA, worldM, p * 16)
                mat4Copy(tmpB, localM, i * 16)
                mat4Mul(tmpA, tmpA, tmpB)
                for (let e = 0; e < 16; e++) worldM[wo + e] = tmpA[e]
            }
        }

        // Node slots are the world matrices directly. Copied element-wise
        // rather than through palette.set(worldM.subarray(...)), which would
        // allocate a view every frame for no benefit.
        for (let e = 0; e < nodeCount * 16; e++) palette[e] = worldM[e]

        // Skin slots: jointWorld * inverseBind.
        for (let s = 0; s < doc.skins.length; s++) {
            const skin = doc.skins[s]
            const base = (nodeCount + skinSlotBase[s]) * 16
            for (let j = 0; j < skin.joints.length; j++) {
                const nj = skin.joints[j]
                if (nj < 0 || nj >= nodeCount) {
                    mat4Identity(tmpA)
                } else {
                    mat4Copy(tmpA, worldM, nj * 16)
                    mat4Copy(tmpB, skin.inverseBind, j * 16)
                    mat4Mul(tmpA, tmpA, tmpB)
                }
                for (let e = 0; e < 16; e++) palette[base + j * 16 + e] = tmpA[e]
            }
        }
    }

    const rig: PoseRig = {
        palette,
        slotCount,
        skinSlotBase,
        nodeCount,
        durations: doc.animations.map(a => a.duration),
        apply,
    }

    // Start on the rest pose so the palette is valid before the first frame.
    apply(-1, 0)
    return rig
}