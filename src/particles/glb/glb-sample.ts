/**
 * glb-sample.ts
 * src/particles/glb/glb-sample.ts
 *
 * Turns triangles into an evenly spaced cloud of dots sitting on the model's
 * surface, with a hard cap on how many.
 *
 * ─── WHY NOT JUST USE THE VERTICES ───────────────────────────────────────────
 *
 * Because vertex density has nothing to do with surface area. A modeller puts
 * vertices where the shape needs control: hundreds around an eye, four across a
 * whole wall. Render the vertices as dots and you get a bright clot at every
 * detailed area and empty space everywhere else, which reads as a broken
 * model rather than a stylised one. The count is also whatever the modeller
 * happened to leave, which may be 200 or 200,000.
 *
 * So the surface is sampled instead, which decouples the dot count from the
 * mesh entirely. A 500-triangle prop and a 200,000-triangle character both come
 * back at whatever budget you asked for, distributed evenly.
 *
 * ─── HOW THE EVEN SPACING WORKS ──────────────────────────────────────────────
 *
 * Three stages:
 *
 *   1. Area-weighted allocation. Each triangle gets a share of the budget in
 *      proportion to its area, with the fractional remainder carried forward so
 *      a long run of small triangles still accumulates points instead of each
 *      rounding to zero.
 *
 *   2. A low-discrepancy sequence inside each triangle, not Math.random. Random
 *      barycentric points clump: you get visible pairs and visible holes,
 *      because that is what randomness looks like. The R2 sequence (the 2D
 *      generalisation of the golden ratio) spreads points as evenly as a
 *      sequence can, so even four points in one triangle land well apart.
 *
 *   3. A voxel grid thin-out. Oversample, then keep at most one point per cell
 *      of a 3D grid whose cell size is derived from the surface area and the
 *      budget. This is what produces the actual grid look, and it is what
 *      guarantees a minimum spacing between dots no matter how the geometry
 *      folds back on itself. Two surfaces 1mm apart, which area weighting would
 *      happily put dots on both of, collapse to one layer.
 *
 * The cell size is then refined a few times to land on the requested count,
 * because the relationship between cell size and occupied-cell count depends on
 * how the surface curves and cannot be solved for directly.
 *
 * ─── STRUCTURE LINES ─────────────────────────────────────────────────────────
 *
 * Every hand-written shape in this engine emits `lines` as well as points, and
 * that wireframe is a lot of what makes them read as objects rather than fog.
 * Models get the same treatment: edges where two faces meet at a sharp angle
 * are the model's silhouette and panel lines, so those get a run of points
 * along them plus the index pairs to connect them.
 *
 * Structure points are emitted first, which matters: the renderer and the
 * morph ordering both treat the early indices as the structural core.
 *
 * ─── COST ────────────────────────────────────────────────────────────────────
 *
 * All of this runs once, at load, and it runs in a worker when one is
 * available. The per-frame cost of a model is only the skinning pass, which is
 * proportional to the dot budget and completely independent of the triangle
 * count. A 300k-triangle model costs exactly as much per frame as a cube.
 */

import type { GlbDoc } from './glb-parse.ts'
import { createPoseRig } from './glb-pose.ts'
import { mat4, mat4Mul, mat4Identity } from './glb-math.ts'

/** Up to four bone influences per dot, matching glTF's per-vertex limit. */
const INFLUENCES = 4

export interface SampleOptions {
    /** How many dots to aim for. The result is within a few percent of this. */
    count: number
    /**
     * Degrees. Edges where the two faces meet at a sharper angle than this
     * become structure lines. 35 catches panel lines and silhouettes; raise it
     * for a smooth organic model that should have almost none.
     */
    edgeAngle?: number
    /** Share of the budget that may go to structure lines. 0 disables them. */
    edgeBudget?: number
    /** Degrees of rotation applied at load, to fix up a model's orientation. */
    rotateX?: number
    rotateY?: number
    rotateZ?: number
    /** Multiplies the fitted scale. 1 fills the same volume as the other shapes. */
    scale?: number
    /** Seed for the allocation remainder and jitter, so a model is stable. */
    seed?: number
}

export interface SampledCloud {
    count: number
    /** count*3. Positions in bind space, before skinning. */
    base: Float32Array
    /** count*3. Surface normals in bind space. */
    normal: Float32Array
    /** count*INFLUENCES. Palette slot per influence, -1 for unused. */
    slot: Int32Array
    /** count*INFLUENCES. Weights, summing to 1 per dot. */
    weight: Float32Array
    /** Index pairs for the structure wireframe. */
    lines: Uint32Array
    /** Dots below this index are structural; the rest are surface fill. */
    structEnd: number
    /** Applied after skinning: orientation, centring and fit-to-view scale. */
    normalizeMatrix: Float32Array
    stats: {
        triangles: number
        /** Total surface area in the model's own units. */
        area: number
        /** The grid cell size the thin-out settled on. */
        cell: number
        structurePoints: number
        sharpEdges: number
    }
}

// ── Small deterministic RNG, same family as shapes.ts uses ────────────────────
function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * The R2 low-discrepancy sequence.
 *
 * The 1D version of this is the golden ratio, which is the single most evenly
 * spreading irrational step there is. R2 is its two dimensional cousin, built
 * from the plastic number, and it beats both random sampling and a jittered
 * grid for coverage at small counts. Which matters here, because most triangles
 * only get one to four points.
 */
const R2_A = 0.7548776662466927   // 1/plastic
const R2_B = 0.5698402909980532   // 1/plastic^2

// ── Influence merging ─────────────────────────────────────────────────────────

/**
 * Blend the three corner vertices' bone influences into one set of four for the
 * sampled point.
 *
 * Joint indices cannot be interpolated, so the three vertices' influence lists
 * are accumulated by joint and the strongest four kept. The alternative, taking
 * the nearest vertex's influences outright, visibly snaps dots to one bone
 * across a triangle that straddles a joint, and on a shoulder or a knee that is
 * the exact place it shows.
 *
 * Twelve candidate pairs at most, so this is a linear scan rather than a map.
 */
function mergeInfluences(
    outSlot: Int32Array, outWeight: Float32Array, outOff: number,
    slots: Int32Array, weights: Float32Array,
    i0: number, i1: number, i2: number,
    b0: number, b1: number, b2: number,
): void {
    const accSlot = MERGE_SLOT
    const accWeight = MERGE_WEIGHT
    let used = 0

    const add = (slot: number, w: number) => {
        if (slot < 0 || w <= 0) return
        for (let k = 0; k < used; k++) {
            if (accSlot[k] === slot) { accWeight[k] += w; return }
        }
        accSlot[used] = slot
        accWeight[used] = w
        used++
    }

    for (let c = 0; c < INFLUENCES; c++) {
        add(slots[i0 * INFLUENCES + c], weights[i0 * INFLUENCES + c] * b0)
        add(slots[i1 * INFLUENCES + c], weights[i1 * INFLUENCES + c] * b1)
        add(slots[i2 * INFLUENCES + c], weights[i2 * INFLUENCES + c] * b2)
    }

    // Partial selection sort for the top four. With at most 12 entries this is
    // cheaper than a real sort and allocates nothing.
    const take = Math.min(INFLUENCES, used)
    for (let a = 0; a < take; a++) {
        let best = a
        for (let b = a + 1; b < used; b++) if (accWeight[b] > accWeight[best]) best = b
        if (best !== a) {
            const ts = accSlot[a]; accSlot[a] = accSlot[best]; accSlot[best] = ts
            const tw = accWeight[a]; accWeight[a] = accWeight[best]; accWeight[best] = tw
        }
    }

    let sum = 0
    for (let a = 0; a < take; a++) sum += accWeight[a]
    if (sum <= 0) {
        // Every influence had zero weight, which some exporters produce for
        // vertices that were never weighted. Pin it to the first joint rather
        // than leaving the dot at the origin.
        outSlot[outOff] = accSlot[0] ?? -1
        outWeight[outOff] = 1
        for (let a = 1; a < INFLUENCES; a++) { outSlot[outOff + a] = -1; outWeight[outOff + a] = 0 }
        return
    }

    for (let a = 0; a < INFLUENCES; a++) {
        if (a < take) {
            outSlot[outOff + a] = accSlot[a]
            outWeight[outOff + a] = accWeight[a] / sum
        } else {
            outSlot[outOff + a] = -1
            outWeight[outOff + a] = 0
        }
    }
}

// Module-level scratch for mergeInfluences. Twelve is the maximum number of
// distinct joints three four-influence vertices can reference.
const MERGE_SLOT = new Int32Array(12)
const MERGE_WEIGHT = new Float32Array(12)

// ── Hash grid ─────────────────────────────────────────────────────────────────

/**
 * Open-addressed hash grid over 3D cell coordinates, storing which point won
 * each cell.
 *
 * A Map keyed by a string, or by a packed number, would be simpler to read and
 * is the usual way this gets written. It is also the thing that makes loading a
 * big model slow: a Map insert per candidate allocates, and a few hundred
 * thousand of them is enough to feel. This keeps the cell coordinates and the
 * winning point index in parallel typed arrays and probes linearly, which
 * allocates once.
 *
 * ─── WHY IT CHECKS NEIGHBOURS ────────────────────────────────────────────────
 *
 * One point per cell alone does not give even spacing. Two points either side
 * of a cell boundary can sit arbitrarily close together and both be kept, so
 * the result still has visible pairs: measured on a sampled character, the
 * closest pair came out at a seventh of the mean spacing. Rejecting a candidate
 * that falls within a minimum distance of any point already kept in the
 * twenty-six surrounding cells turns the cell grid into a proper minimum
 * distance filter, which is what actually reads as an even grid.
 *
 * The neighbour scan is 27 probes per candidate. At load time, in a worker,
 * that is not a cost worth optimising away.
 */
class CellGrid {
    private mask: number
    private keyX: Int32Array
    private keyY: Int32Array
    private keyZ: Int32Array
    private owner: Int32Array
    private used: Uint8Array

    constructor(capacity: number) {
        // Power of two at least twice the capacity, so the load factor stays
        // under 0.5 and linear probing stays short.
        let size = 16
        while (size < capacity * 2) size *= 2
        this.mask = size - 1
        this.keyX = new Int32Array(size)
        this.keyY = new Int32Array(size)
        this.keyZ = new Int32Array(size)
        this.owner = new Int32Array(size)
        this.used = new Uint8Array(size)
    }

    clear(): void {
        this.used.fill(0)
    }

    /** Three odd multipliers, xor-folded. Cheap, and well spread for small ints. */
    private slotOf(x: number, y: number, z: number): number {
        let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791)
        h = h & this.mask
        for (; ;) {
            if (!this.used[h]) return h
            if (this.keyX[h] === x && this.keyY[h] === y && this.keyZ[h] === z) return h
            h = (h + 1) & this.mask
        }
    }

    /** Index of the point holding this cell, or -1 when the cell is free. */
    peek(x: number, y: number, z: number): number {
        const h = this.slotOf(x, y, z)
        return this.used[h] ? this.owner[h] : -1
    }

    put(x: number, y: number, z: number, index: number): void {
        const h = this.slotOf(x, y, z)
        this.used[h] = 1
        this.keyX[h] = x; this.keyY[h] = y; this.keyZ[h] = z
        this.owner[h] = index
    }
}

// ── Candidate buffers ─────────────────────────────────────────────────────────

interface Candidates {
    n: number
    pos: Float32Array
    nrm: Float32Array
    slot: Int32Array
    weight: Float32Array
}

// ── Sampling ──────────────────────────────────────────────────────────────────

export function sampleGlb(doc: GlbDoc, opts: SampleOptions): SampledCloud {
    const target = Math.max(32, Math.floor(opts.count))
    const edgeAngle = opts.edgeAngle ?? 35
    const edgeBudget = opts.edgeBudget ?? 0.3
    const rng = mulberry32(opts.seed ?? 0x5eed)

    // Rest pose, used for everything geometric. The cloud is built in bind
    // space and skinned at runtime, so the rest pose is only needed to measure
    // areas, find sharp edges and fit the normalisation.
    const rig = createPoseRig(doc)
    rig.apply(-1, 0)
    const palette = rig.palette

    // ── Pass 1: per-vertex rest positions and influence slots ────────────────
    // Flattened across every primitive, so the grid thin-out and the edge pass
    // see one model rather than a list of parts.
    let totalVerts = 0
    let totalTris = 0
    for (const p of doc.primitives) {
        totalVerts += p.position.length / 3
        totalTris += p.indices.length / 3
    }

    const vRest = new Float32Array(totalVerts * 3)     // rest-pose world position
    const vBase = new Float32Array(totalVerts * 3)     // bind-space position
    const vNrm = new Float32Array(totalVerts * 3)
    const vSlot = new Int32Array(totalVerts * INFLUENCES).fill(-1)
    const vWeight = new Float32Array(totalVerts * INFLUENCES)
    const tri = new Uint32Array(totalTris * 3)

    let vOff = 0
    let tOff = 0

    for (let pi = 0; pi < doc.primitives.length; pi++) {
        const prim = doc.primitives[pi]
        const nodeIdx = doc.primitiveNode[pi]
        const node = doc.nodes[nodeIdx]
        const vCount = prim.position.length / 3
        const skinned = prim.joints !== null && prim.weights !== null && node.skin >= 0

        // Slot base for this primitive's skin, if any.
        const skinBase = skinned ? rig.nodeCount + rig.skinSlotBase[node.skin] : 0

        for (let v = 0; v < vCount; v++) {
            const g = vOff + v
            const x = prim.position[v * 3]
            const y = prim.position[v * 3 + 1]
            const z = prim.position[v * 3 + 2]

            vBase[g * 3] = x; vBase[g * 3 + 1] = y; vBase[g * 3 + 2] = z

            if (skinned) {
                const joints = prim.joints!
                const weights = prim.weights!
                for (let c = 0; c < INFLUENCES; c++) {
                    const w = weights[v * INFLUENCES + c]
                    vSlot[g * INFLUENCES + c] = w > 0 ? skinBase + joints[v * INFLUENCES + c] : -1
                    vWeight[g * INFLUENCES + c] = w
                }
            } else {
                // One influence: the mesh node itself, at full weight.
                vSlot[g * INFLUENCES] = nodeIdx
                vWeight[g * INFLUENCES] = 1
            }

            // Rest position, by running the same skinning the runtime will.
            let rx = 0, ry = 0, rz = 0
            for (let c = 0; c < INFLUENCES; c++) {
                const s = vSlot[g * INFLUENCES + c]
                if (s < 0) continue
                const w = vWeight[g * INFLUENCES + c]
                if (w === 0) continue
                const m = s * 16
                rx += w * (palette[m] * x + palette[m + 4] * y + palette[m + 8] * z + palette[m + 12])
                ry += w * (palette[m + 1] * x + palette[m + 5] * y + palette[m + 9] * z + palette[m + 13])
                rz += w * (palette[m + 2] * x + palette[m + 6] * y + palette[m + 10] * z + palette[m + 14])
            }
            vRest[g * 3] = rx; vRest[g * 3 + 1] = ry; vRest[g * 3 + 2] = rz

            if (prim.normal) {
                vNrm[g * 3] = prim.normal[v * 3]
                vNrm[g * 3 + 1] = prim.normal[v * 3 + 1]
                vNrm[g * 3 + 2] = prim.normal[v * 3 + 2]
            }
        }

        for (let t = 0; t < prim.indices.length; t++) {
            tri[tOff + t] = vOff + prim.indices[t]
        }

        vOff += vCount
        tOff += prim.indices.length
    }

    const triCount = tOff / 3

    // ── Pass 2: triangle areas ───────────────────────────────────────────────
    const area = new Float32Array(triCount)
    let totalArea = 0
    for (let t = 0; t < triCount; t++) {
        const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, c = tri[t * 3 + 2] * 3
        const e1x = vRest[b] - vRest[a], e1y = vRest[b + 1] - vRest[a + 1], e1z = vRest[b + 2] - vRest[a + 2]
        const e2x = vRest[c] - vRest[a], e2y = vRest[c + 1] - vRest[a + 1], e2z = vRest[c + 2] - vRest[a + 2]
        const cx = e1y * e2z - e1z * e2y
        const cy = e1z * e2x - e1x * e2z
        const cz = e1x * e2y - e1y * e2x
        const ar = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz)
        area[t] = ar
        totalArea += ar
    }

    if (totalArea <= 0) {
        throw new Error(
            'Model has zero surface area. Every triangle is degenerate, which usually ' +
            'means the mesh was exported with a zero scale on one axis.',
        )
    }

    // ── Pass 3: sharp edges, for the structure wireframe ─────────────────────
    const edgeLimit = Math.floor(target * edgeBudget)
    const sharpEdges: number[] = []   // pairs of vertex indices

    if (edgeLimit > 8 && triCount <= 400000) {
        // Edge key is a + b * totalVerts, which is exact as a double for any
        // vertex count a browser could actually hold.
        const seen = new Map<number, number>()   // key -> first triangle
        const cosLimit = Math.cos((edgeAngle * Math.PI) / 180)

        const faceN = new Float32Array(triCount * 3)
        for (let t = 0; t < triCount; t++) {
            const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, c = tri[t * 3 + 2] * 3
            const e1x = vRest[b] - vRest[a], e1y = vRest[b + 1] - vRest[a + 1], e1z = vRest[b + 2] - vRest[a + 2]
            const e2x = vRest[c] - vRest[a], e2y = vRest[c + 1] - vRest[a + 1], e2z = vRest[c + 2] - vRest[a + 2]
            let nx = e1y * e2z - e1z * e2y
            let ny = e1z * e2x - e1x * e2z
            let nz = e1x * e2y - e1y * e2x
            const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
            nx /= l; ny /= l; nz /= l
            faceN[t * 3] = nx; faceN[t * 3 + 1] = ny; faceN[t * 3 + 2] = nz
        }

        for (let t = 0; t < triCount && sharpEdges.length < edgeLimit * 2; t++) {
            for (let e = 0; e < 3; e++) {
                const i0 = tri[t * 3 + e]
                const i1 = tri[t * 3 + ((e + 1) % 3)]
                const lo = i0 < i1 ? i0 : i1
                const hi = i0 < i1 ? i1 : i0
                const key = lo + hi * totalVerts

                const other = seen.get(key)
                if (other === undefined) {
                    seen.set(key, t)
                    continue
                }

                // Two faces share this edge. Sharp if their normals diverge.
                const d =
                    faceN[t * 3] * faceN[other * 3] +
                    faceN[t * 3 + 1] * faceN[other * 3 + 1] +
                    faceN[t * 3 + 2] * faceN[other * 3 + 2]
                if (d < cosLimit) sharpEdges.push(lo, hi)
            }
        }

        // An edge used by only one triangle is a boundary: the silhouette of an
        // open surface such as a plane or a cloth. Those are always worth
        // drawing, and they are what is left in `seen` with no partner. The map
        // does not record partner counts, so this is approximated by taking
        // boundary edges only when almost nothing sharp was found, which is the
        // case where a model would otherwise have no wireframe at all.
        if (sharpEdges.length < 16) {
            const count = new Map<number, number>()
            for (let t = 0; t < triCount; t++) {
                for (let e = 0; e < 3; e++) {
                    const i0 = tri[t * 3 + e]
                    const i1 = tri[t * 3 + ((e + 1) % 3)]
                    const lo = i0 < i1 ? i0 : i1
                    const hi = i0 < i1 ? i1 : i0
                    const key = lo + hi * totalVerts
                    count.set(key, (count.get(key) ?? 0) + 1)
                }
            }
            for (const [key, c] of count) {
                if (c !== 1) continue
                const hi = Math.floor(key / totalVerts)
                const lo = key - hi * totalVerts
                sharpEdges.push(lo, hi)
                if (sharpEdges.length >= edgeLimit * 2) break
            }
        }
    }

    // ── Pass 4: structure points along the sharp edges ───────────────────────
    const structPos: number[] = []
    const structNrm: number[] = []
    const structSlotList: number[] = []
    const structWeightList: number[] = []
    const lines: number[] = []

    if (sharpEdges.length >= 2) {
        // Spacing so the whole edge set uses roughly its budget.
        let edgeLen = 0
        for (let e = 0; e < sharpEdges.length; e += 2) {
            const a = sharpEdges[e] * 3, b = sharpEdges[e + 1] * 3
            edgeLen += Math.hypot(vRest[b] - vRest[a], vRest[b + 1] - vRest[a + 1], vRest[b + 2] - vRest[a + 2])
        }
        const spacing = edgeLen > 0 ? edgeLen / Math.max(1, edgeLimit) : 1

        for (let e = 0; e < sharpEdges.length; e += 2) {
            if (structPos.length / 3 >= edgeLimit) break
            const ia = sharpEdges[e], ib = sharpEdges[e + 1]
            const a = ia * 3, b = ib * 3
            const len = Math.hypot(vRest[b] - vRest[a], vRest[b + 1] - vRest[a + 1], vRest[b + 2] - vRest[a + 2])
            const steps = Math.max(2, Math.min(24, Math.round(len / spacing) + 1))

            const first = structPos.length / 3
            for (let s = 0; s < steps; s++) {
                const f = s / (steps - 1)
                // Bind-space position, because that is what gets skinned.
                for (let c = 0; c < 3; c++) {
                    structPos.push(vBase[a + c] + (vBase[b + c] - vBase[a + c]) * f)
                    structNrm.push(vNrm[a + c] + (vNrm[b + c] - vNrm[a + c]) * f)
                }
                // Influences from whichever endpoint is nearer, which is exact
                // at the ends and a reasonable blend in between. Edges are
                // short relative to a bone, so the error is not visible.
                const src = f < 0.5 ? ia : ib
                for (let c = 0; c < INFLUENCES; c++) {
                    structSlotList.push(vSlot[src * INFLUENCES + c])
                    structWeightList.push(vWeight[src * INFLUENCES + c])
                }
                if (s > 0) lines.push(first + s - 1, first + s)
            }
        }
    }

    const structCount = structPos.length / 3
    const fillTarget = Math.max(16, target - structCount)

    // ── Pass 5: oversample the surface ───────────────────────────────────────
    // Oversampling then thinning is what produces even spacing. Three times the
    // budget is enough for the grid to have a real choice of which point to keep
    // in each cell, without the memory cost growing to anything that matters.
    const over = Math.min(fillTarget * 3 + 64, 400000)

    const cand: Candidates = {
        n: 0,
        pos: new Float32Array(over * 3),
        nrm: new Float32Array(over * 3),
        slot: new Int32Array(over * INFLUENCES).fill(-1),
        weight: new Float32Array(over * INFLUENCES),
    }

    // Area-weighted allocation with a carried remainder, so a long tail of
    // small triangles accumulates points rather than every one rounding to zero.
    let carry = rng()
    let seq = rng() * 1000
    const perArea = over / totalArea

    // Hoisted. Asking this inside the triangle loop walks every primitive per
    // triangle, which on a 200k-triangle model is a few million needless
    // property reads at load time.
    const anyNormals = doc.primitives.some(p => p.normal !== null)

    for (let t = 0; t < triCount && cand.n < over; t++) {
        const want = area[t] * perArea + carry
        const take = Math.floor(want)
        carry = want - take
        if (take <= 0) continue

        const i0 = tri[t * 3], i1 = tri[t * 3 + 1], i2 = tri[t * 3 + 2]
        const a = i0 * 3, b = i1 * 3, c = i2 * 3

        // Face normal as a fallback for a model with no NORMAL attribute.
        let fnx = 0, fny = 0, fnz = 0
        if (!anyNormals) {
            const e1x = vBase[b] - vBase[a], e1y = vBase[b + 1] - vBase[a + 1], e1z = vBase[b + 2] - vBase[a + 2]
            const e2x = vBase[c] - vBase[a], e2y = vBase[c + 1] - vBase[a + 1], e2z = vBase[c + 2] - vBase[a + 2]
            fnx = e1y * e2z - e1z * e2y
            fny = e1z * e2x - e1x * e2z
            fnz = e1x * e2y - e1y * e2x
            const l = Math.sqrt(fnx * fnx + fny * fny + fnz * fnz) || 1
            fnx /= l; fny /= l; fnz /= l
        }

        for (let s = 0; s < take && cand.n < over; s++) {
            seq += 1
            let u = (seq * R2_A) % 1
            let v = (seq * R2_B) % 1
            // Fold the unit square onto the triangle. Inlined rather than
            // calling a helper that returns [b0, b1, b2], because a returned
            // tuple is an allocation and this runs up to 400,000 times.
            if (u + v > 1) { u = 1 - u; v = 1 - v }
            const b0 = 1 - u - v, b1 = u, b2 = v

            const o = cand.n * 3
            for (let k = 0; k < 3; k++) {
                cand.pos[o + k] = vBase[a + k] * b0 + vBase[b + k] * b1 + vBase[c + k] * b2
            }

            const hasN = vNrm[a] !== 0 || vNrm[a + 1] !== 0 || vNrm[a + 2] !== 0
            if (hasN) {
                let nx = vNrm[a] * b0 + vNrm[b] * b1 + vNrm[c] * b2
                let ny = vNrm[a + 1] * b0 + vNrm[b + 1] * b1 + vNrm[c + 1] * b2
                let nz = vNrm[a + 2] * b0 + vNrm[b + 2] * b1 + vNrm[c + 2] * b2
                const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
                nx /= l; ny /= l; nz /= l
                cand.nrm[o] = nx; cand.nrm[o + 1] = ny; cand.nrm[o + 2] = nz
            } else {
                cand.nrm[o] = fnx; cand.nrm[o + 1] = fny; cand.nrm[o + 2] = fnz
            }

            mergeInfluences(
                cand.slot, cand.weight, cand.n * INFLUENCES,
                vSlot, vWeight, i0, i1, i2, b0, b1, b2,
            )

            cand.n++
        }
    }

    // ── Pass 6: thin onto a grid ─────────────────────────────────────────────
    // Candidate rest positions, needed because the grid has to be built in the
    // space the model actually occupies, not bind space, which for a skinned
    // model can be a T-pose spread across a different volume.
    const candRest = new Float32Array(cand.n * 3)
    for (let i = 0; i < cand.n; i++) {
        const x = cand.pos[i * 3], y = cand.pos[i * 3 + 1], z = cand.pos[i * 3 + 2]
        let rx = 0, ry = 0, rz = 0
        for (let c = 0; c < INFLUENCES; c++) {
            const s = cand.slot[i * INFLUENCES + c]
            if (s < 0) continue
            const w = cand.weight[i * INFLUENCES + c]
            if (w === 0) continue
            const m = s * 16
            rx += w * (palette[m] * x + palette[m + 4] * y + palette[m + 8] * z + palette[m + 12])
            ry += w * (palette[m + 1] * x + palette[m + 5] * y + palette[m + 9] * z + palette[m + 13])
            rz += w * (palette[m + 2] * x + palette[m + 6] * y + palette[m + 10] * z + palette[m + 14])
        }
        candRest[i * 3] = rx; candRest[i * 3 + 1] = ry; candRest[i * 3 + 2] = rz
    }

    // Starting cell size. For a surface of area A covered by cells of side c,
    // the number of occupied cells goes as A / c^2, so c = sqrt(A / N) is the
    // right first guess. It is only a guess because a folded surface puts
    // several patches in one cell and a curved one puts one patch in several.
    let cell = Math.sqrt(totalArea / fillTarget)
    const grid = new CellGrid(cand.n)
    const keep = new Int32Array(fillTarget)
    let kept = 0

    for (let attempt = 0; attempt < 6; attempt++) {
        grid.clear()
        kept = 0
        const inv = 1 / cell
        // Slightly under one cell, so a candidate in a neighbouring cell has to
        // be genuinely separated rather than merely in a different box. Pushing
        // this toward 1.0 rejects more and makes the grid stricter but harder to
        // hit a target count with.
        const minDist = cell * 0.82
        const minDist2 = minDist * minDist

        for (let i = 0; i < cand.n && kept < fillTarget; i++) {
            const px = candRest[i * 3], py = candRest[i * 3 + 1], pz = candRest[i * 3 + 2]
            const ix = Math.floor(px * inv)
            const iy = Math.floor(py * inv)
            const iz = Math.floor(pz * inv)

            if (grid.peek(ix, iy, iz) >= 0) continue

            let tooClose = false
            for (let dx = -1; dx <= 1 && !tooClose; dx++) {
                for (let dy = -1; dy <= 1 && !tooClose; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        if (dx === 0 && dy === 0 && dz === 0) continue
                        const o = grid.peek(ix + dx, iy + dy, iz + dz)
                        if (o < 0) continue
                        const ex = candRest[o * 3] - px
                        const ey = candRest[o * 3 + 1] - py
                        const ez = candRest[o * 3 + 2] - pz
                        if (ex * ex + ey * ey + ez * ez < minDist2) { tooClose = true; break }
                    }
                }
            }
            if (tooClose) continue

            grid.put(ix, iy, iz, i)
            keep[kept++] = i
        }

        // Within 4% is close enough, and the last attempt is taken as it stands.
        const ratio = kept / fillTarget
        if (Math.abs(ratio - 1) < 0.04 || attempt === 5) break

        // Occupied cells scale as c^-2, so correcting by the square root of the
        // ratio converges in two or three steps. Damped, because an
        // over-correction on a folded surface can oscillate.
        cell *= Math.pow(ratio, 0.45)
    }

    // ── Assemble ─────────────────────────────────────────────────────────────
    const count = structCount + kept
    const base = new Float32Array(count * 3)
    const normal = new Float32Array(count * 3)
    const slot = new Int32Array(count * INFLUENCES).fill(-1)
    const weight = new Float32Array(count * INFLUENCES)

    for (let i = 0; i < structCount; i++) {
        for (let c = 0; c < 3; c++) {
            base[i * 3 + c] = structPos[i * 3 + c]
            normal[i * 3 + c] = structNrm[i * 3 + c]
        }
        for (let c = 0; c < INFLUENCES; c++) {
            slot[i * INFLUENCES + c] = structSlotList[i * INFLUENCES + c]
            weight[i * INFLUENCES + c] = structWeightList[i * INFLUENCES + c]
        }
    }

    for (let k = 0; k < kept; k++) {
        const src = keep[k]
        const dst = structCount + k
        for (let c = 0; c < 3; c++) {
            base[dst * 3 + c] = cand.pos[src * 3 + c]
            normal[dst * 3 + c] = cand.nrm[src * 3 + c]
        }
        for (let c = 0; c < INFLUENCES; c++) {
            slot[dst * INFLUENCES + c] = cand.slot[src * INFLUENCES + c]
            weight[dst * INFLUENCES + c] = cand.weight[src * INFLUENCES + c]
        }
    }

    // ── Normalisation matrix ─────────────────────────────────────────────────
    // Orientation first, then centre, then fit. Fitted once from the rest pose
    // and then frozen, so an animation that throws an arm out does not make the
    // whole model breathe in and out.
    const rot = orientationMatrix(opts.rotateX ?? 0, opts.rotateY ?? 0, opts.rotateZ ?? 0)

    // Rotated rest positions of the points actually kept, which is what should
    // be centred. Using the full mesh bounds instead would off-centre a model
    // whose geometry is mostly in one limb.
    let cx = 0, cy = 0, cz = 0
    const rotRest = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        const src = i < structCount ? -1 : keep[i - structCount]
        let x: number, y: number, z: number
        if (src < 0) {
            // Structure points: rest position via the same skinning.
            x = base[i * 3]; y = base[i * 3 + 1]; z = base[i * 3 + 2]
            let ax = 0, ay = 0, az = 0
            for (let c = 0; c < INFLUENCES; c++) {
                const s = slot[i * INFLUENCES + c]
                if (s < 0) continue
                const w = weight[i * INFLUENCES + c]
                if (w === 0) continue
                const m = s * 16
                ax += w * (palette[m] * x + palette[m + 4] * y + palette[m + 8] * z + palette[m + 12])
                ay += w * (palette[m + 1] * x + palette[m + 5] * y + palette[m + 9] * z + palette[m + 13])
                az += w * (palette[m + 2] * x + palette[m + 6] * y + palette[m + 10] * z + palette[m + 14])
            }
            x = ax; y = ay; z = az
        } else {
            x = candRest[src * 3]; y = candRest[src * 3 + 1]; z = candRest[src * 3 + 2]
        }

        const rx = rot[0] * x + rot[4] * y + rot[8] * z
        const ry = rot[1] * x + rot[5] * y + rot[9] * z
        const rz = rot[2] * x + rot[6] * y + rot[10] * z
        rotRest[i * 3] = rx; rotRest[i * 3 + 1] = ry; rotRest[i * 3 + 2] = rz
        cx += rx; cy += ry; cz += rz
    }
    cx /= count || 1; cy /= count || 1; cz /= count || 1

    // Fit on the 95th percentile radius rather than the maximum, matching what
    // norm95 in shapes.ts does. A single stray vertex miles from the body would
    // otherwise shrink the whole model to a speck, and models do have those.
    const radii = new Float32Array(count)
    for (let i = 0; i < count; i++) {
        radii[i] = Math.hypot(
            rotRest[i * 3] - cx, rotRest[i * 3 + 1] - cy, rotRest[i * 3 + 2] - cz,
        )
    }
    radii.sort()
    const p95 = radii[Math.floor(count * 0.95)] || 1
    const fit = (0.88 / p95) * (opts.scale ?? 1)

    // normalize = Scale * Translate(-centre) * Rotate
    const centreM = mat4Identity(mat4())
    centreM[12] = -cx; centreM[13] = -cy; centreM[14] = -cz
    const scaleM = mat4Identity(mat4())
    scaleM[0] = fit; scaleM[5] = fit; scaleM[10] = fit

    const normalizeMatrix = mat4()
    mat4Mul(normalizeMatrix, centreM, rot)
    mat4Mul(normalizeMatrix, scaleM, normalizeMatrix)

    return {
        count,
        base,
        normal,
        slot,
        weight,
        lines: new Uint32Array(lines),
        structEnd: structCount,
        normalizeMatrix,
        stats: {
            triangles: triCount,
            area: totalArea,
            cell,
            structurePoints: structCount,
            sharpEdges: sharpEdges.length / 2,
        },
    }
}

/** Z then Y then X, degrees, as a column-major matrix. */
function orientationMatrix(xDeg: number, yDeg: number, zDeg: number): Float32Array {
    const d2r = Math.PI / 180
    const cx = Math.cos(xDeg * d2r), sx = Math.sin(xDeg * d2r)
    const cy = Math.cos(yDeg * d2r), sy = Math.sin(yDeg * d2r)
    const cz = Math.cos(zDeg * d2r), sz = Math.sin(zDeg * d2r)

    const rx = mat4Identity(mat4())
    rx[5] = cx; rx[6] = sx; rx[9] = -sx; rx[10] = cx
    const ry = mat4Identity(mat4())
    ry[0] = cy; ry[2] = -sy; ry[8] = sy; ry[10] = cy
    const rz = mat4Identity(mat4())
    rz[0] = cz; rz[1] = sz; rz[4] = -sz; rz[5] = cz

    const out = mat4()
    mat4Mul(out, ry, rz)
    mat4Mul(out, rx, out)
    return out
}