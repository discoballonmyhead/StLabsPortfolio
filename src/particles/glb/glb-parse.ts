/**
 * glb-parse.ts
 * src/particles/glb/glb-parse.ts
 *
 * A glTF 2.0 reader, written for exactly one purpose: pulling triangles, a node
 * hierarchy, skin data and animation tracks out of a .glb file so they can be
 * turned into dots.
 *
 * ─── WHY THIS IS HAND WRITTEN ────────────────────────────────────────────────
 *
 * three.js plus GLTFLoader is around 600KB of JavaScript, and it brings a whole
 * WebGL renderer, material system and texture pipeline with it. None of that is
 * wanted here: the dots are drawn by the existing Canvas 2D batcher, and the
 * only thing needed from the file is geometry and transforms. On a site whose
 * other priority is page weight and crawlability, importing a renderer to read
 * a file format is the wrong trade.
 *
 * The parts of glTF that matter here are small and well specified. The parts
 * that are large (PBR materials, textures, cameras, lights, morph targets) are
 * ignored on purpose, and the ignored list is stated below rather than left for
 * you to discover.
 *
 * ─── WHAT IS SUPPORTED ───────────────────────────────────────────────────────
 *
 *   Container      .glb (binary) and .gltf (JSON), with buffers inline as
 *                  data: URIs or sitting next to the file
 *   Primitives     mode 4 (TRIANGLES), indexed or not
 *   Accessors      every component type, byteStride, normalized integers,
 *                  and sparse accessors
 *   Hierarchy      nodes with matrix or TRS, multiple scenes, deep nesting
 *   Skinning       skins with joints and inverseBindMatrices, JOINTS_0 and
 *                  WEIGHTS_0
 *   Animation      translation, rotation and scale channels, with STEP,
 *                  LINEAR and CUBICSPLINE interpolation
 *
 * ─── WHAT IS NOT ─────────────────────────────────────────────────────────────
 *
 *   Draco and meshopt compression. Both replace the vertex data with a
 *   compressed stream that needs its own decoder, which is another large
 *   dependency. Detected and reported with a clear message rather than failing
 *   somewhere confusing, because "re-export without Draco" is a thirty second
 *   fix in Blender and worth telling you plainly.
 *
 *   Morph targets, and animation of weights. A dot cloud sampled from the base
 *   mesh is not wrong without them, just not blend-shaped.
 *
 *   Materials, textures, cameras, lights. Colour comes from the particle
 *   config, by design, so the whole model stays on the site's palette.
 *
 *   Triangle strips and fans, lines, points. Every exporter in common use
 *   writes mode 4. Anything else is skipped with a warning rather than
 *   silently dropped.
 */

// ── glTF constants ────────────────────────────────────────────────────────────

const GLB_MAGIC = 0x46546c67        // 'glTF'
const CHUNK_JSON = 0x4e4f534a       // 'JSON'
const CHUNK_BIN = 0x004e4942        // 'BIN\0'

const COMP_BYTE = 5120
const COMP_UBYTE = 5121
const COMP_SHORT = 5122
const COMP_USHORT = 5123
const COMP_UINT = 5125
const COMP_FLOAT = 5126

const COMP_SIZE: Record<number, number> = {
    [COMP_BYTE]: 1, [COMP_UBYTE]: 1,
    [COMP_SHORT]: 2, [COMP_USHORT]: 2,
    [COMP_UINT]: 4, [COMP_FLOAT]: 4,
}

const TYPE_COUNT: Record<string, number> = {
    SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16,
}

const MODE_TRIANGLES = 4

/** Compression extensions that make the vertex data unreadable without a decoder. */
const BLOCKING_EXTENSIONS = [
    'KHR_draco_mesh_compression',
    'EXT_meshopt_compression',
]

// ── Shapes of the bits of glTF JSON this file touches ─────────────────────────

interface RawBufferView {
    buffer: number
    byteOffset?: number
    byteLength: number
    byteStride?: number
}

interface RawAccessorSparse {
    count: number
    indices: { bufferView: number; byteOffset?: number; componentType: number }
    values: { bufferView: number; byteOffset?: number }
}

interface RawAccessor {
    bufferView?: number
    byteOffset?: number
    componentType: number
    normalized?: boolean
    count: number
    type: string
    sparse?: RawAccessorSparse
}

interface RawPrimitive {
    attributes: Record<string, number>
    indices?: number
    mode?: number
}

interface RawMesh { primitives: RawPrimitive[]; name?: string }

interface RawNode {
    name?: string
    children?: number[]
    mesh?: number
    skin?: number
    matrix?: number[]
    translation?: number[]
    rotation?: number[]
    scale?: number[]
}

interface RawSkin {
    joints: number[]
    inverseBindMatrices?: number
    skeleton?: number
    name?: string
}

interface RawAnimationSampler {
    input: number
    output: number
    interpolation?: 'LINEAR' | 'STEP' | 'CUBICSPLINE'
}

interface RawAnimationChannel {
    sampler: number
    target: { node?: number; path: string }
}

interface RawAnimation {
    name?: string
    samplers: RawAnimationSampler[]
    channels: RawAnimationChannel[]
}

interface RawGltf {
    asset?: { version?: string }
    scene?: number
    scenes?: { nodes?: number[] }[]
    nodes?: RawNode[]
    meshes?: RawMesh[]
    accessors?: RawAccessor[]
    bufferViews?: RawBufferView[]
    buffers?: { byteLength: number; uri?: string }[]
    skins?: RawSkin[]
    animations?: RawAnimation[]
    extensionsRequired?: string[]
    extensionsUsed?: string[]
}

// ── The parsed result ─────────────────────────────────────────────────────────

/** One triangle list, already flattened out of its primitive. */
export interface ParsedPrimitive {
    /** Vertex positions, 3 floats per vertex, in the mesh's own space. */
    position: Float32Array
    /** Vertex normals, or null when the file has none. */
    normal: Float32Array | null
    /** Triangle indices, 3 per face, always present (generated if the file had none). */
    indices: Uint32Array
    /** 4 joint indices per vertex, or null when the primitive is not skinned. */
    joints: Uint16Array | null
    /** 4 weights per vertex, matching `joints`. */
    weights: Float32Array | null
}

export interface ParsedNode {
    name: string
    children: number[]
    parent: number
    mesh: number
    skin: number
    /** Local transform, column-major. Already composed from matrix or TRS. */
    localMatrix: Float32Array
    /** Rest-pose TRS, kept separately so animation can override one channel. */
    translation: Float32Array
    rotation: Float32Array
    scale: Float32Array
}

export interface ParsedSkin {
    joints: number[]
    /** 16 floats per joint, column-major. */
    inverseBind: Float32Array
}

export type Interpolation = 'LINEAR' | 'STEP' | 'CUBICSPLINE'

export interface ParsedChannel {
    node: number
    path: 'translation' | 'rotation' | 'scale'
    interpolation: Interpolation
    /** Keyframe times in seconds, ascending. */
    times: Float32Array
    /**
     * Keyframe values. Stride is 3 for translation and scale, 4 for rotation,
     * and three times that for CUBICSPLINE, which stores in-tangent, value and
     * out-tangent per key.
     */
    values: Float32Array
    stride: number
}

export interface ParsedAnimation {
    name: string
    duration: number
    channels: ParsedChannel[]
}

export interface GlbDoc {
    primitives: ParsedPrimitive[]
    /** Which node each primitive hangs off, parallel to `primitives`. */
    primitiveNode: number[]
    nodes: ParsedNode[]
    roots: number[]
    skins: ParsedSkin[]
    animations: ParsedAnimation[]
    /** Non-fatal problems worth surfacing: skipped primitives, missing normals. */
    warnings: string[]
}

export class GlbError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'GlbError'
    }
}

// ── Container ─────────────────────────────────────────────────────────────────

interface Container {
    json: RawGltf
    /** The GLB binary chunk, or null for a .gltf file. */
    bin: Uint8Array | null
}

function readGlbContainer(data: ArrayBuffer): Container {
    const view = new DataView(data)
    if (view.byteLength < 12) throw new GlbError('File is too small to be a GLB.')

    const magic = view.getUint32(0, true)
    if (magic !== GLB_MAGIC) {
        // A .gltf file is JSON, so give a useful message rather than "bad magic".
        throw new GlbError(
            'Not a GLB file. The first four bytes should be "glTF". If this is a ' +
            '.gltf JSON file, pass it with a .gltf extension so it is parsed as text.',
        )
    }

    const version = view.getUint32(4, true)
    if (version !== 2) {
        throw new GlbError(`GLB version ${version} is not supported. Export glTF 2.0.`)
    }

    let json: RawGltf | null = null
    let bin: Uint8Array | null = null

    // Chunks run from byte 12 to the end. Each is a 4-byte length, a 4-byte
    // type, then the payload padded to a 4-byte boundary.
    let off = 12
    while (off + 8 <= view.byteLength) {
        const len = view.getUint32(off, true)
        const type = view.getUint32(off + 4, true)
        const start = off + 8

        if (start + len > view.byteLength) {
            throw new GlbError('GLB chunk runs past the end of the file. It is truncated.')
        }

        if (type === CHUNK_JSON) {
            const text = new TextDecoder().decode(new Uint8Array(data, start, len))
            json = JSON.parse(text) as RawGltf
        } else if (type === CHUNK_BIN) {
            bin = new Uint8Array(data, start, len)
        }
        // Unknown chunk types are skipped, which the spec requires.

        off = start + len + ((4 - (len % 4)) % 4)
    }

    if (!json) throw new GlbError('GLB has no JSON chunk.')
    return { json, bin }
}

function decodeDataUri(uri: string): Uint8Array {
    const comma = uri.indexOf(',')
    if (comma < 0) throw new GlbError('Malformed data URI in buffer.')
    const meta = uri.slice(0, comma)
    const payload = uri.slice(comma + 1)

    if (!meta.includes(';base64')) {
        // Percent-encoded text payload. Legal, and essentially never produced.
        const text = decodeURIComponent(payload)
        const out = new Uint8Array(text.length)
        for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i)
        return out
    }

    const binary = atob(payload)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return out
}

/**
 * Resolve every buffer the file references.
 *
 * A buffer is one of three things: the GLB binary chunk (no uri), a data: URI,
 * or a sibling file. The sibling case needs a fetch, which is why this is
 * async and why the caller passes the model's own URL as the base.
 */
async function resolveBuffers(
    json: RawGltf,
    bin: Uint8Array | null,
    baseUrl: string,
): Promise<Uint8Array[]> {
    const specs = json.buffers ?? []
    const out: Uint8Array[] = []

    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i]

        if (!spec.uri) {
            if (!bin) {
                throw new GlbError(
                    `Buffer ${i} has no uri, so it should be the GLB binary chunk, but ` +
                    'the file has no binary chunk.',
                )
            }
            out.push(bin)
            continue
        }

        if (spec.uri.startsWith('data:')) {
            out.push(decodeDataUri(spec.uri))
            continue
        }

        // A relative path next to the model. new URL handles ../ and query strings.
        const url = new URL(spec.uri, baseUrl).toString()
        const res = await fetch(url)
        if (!res.ok) {
            throw new GlbError(
                `Buffer ${i} points at ${spec.uri}, which returned ${res.status}. ` +
                'Self-contained .glb files avoid this: export with buffers embedded.',
            )
        }
        out.push(new Uint8Array(await res.arrayBuffer()))
    }

    return out
}

// ── Accessors ─────────────────────────────────────────────────────────────────

/**
 * Integer attributes can be stored normalized, meaning the integer range maps
 * onto 0..1 or -1..1. KHR_mesh_quantization leans on this heavily, and a file
 * that uses it reads as garbage if the flag is ignored.
 *
 * The negative-side divisors are the odd ones: the spec says to clamp rather
 * than use the full two's complement range, so -128 and -127 both map to -1.
 */
function normalizeFactor(componentType: number): number {
    switch (componentType) {
        case COMP_BYTE: return 1 / 127
        case COMP_UBYTE: return 1 / 255
        case COMP_SHORT: return 1 / 32767
        case COMP_USHORT: return 1 / 65535
        default: return 1
    }
}

function typedViewFor(
    componentType: number, buf: Uint8Array, byteOffset: number, count: number,
): ArrayLike<number> {
    // The underlying ArrayBuffer may not be aligned for the view type, which
    // happens with tightly packed GLB chunks. Falling back to a copy is correct
    // and only costs anything at load time.
    const base = buf.byteOffset + byteOffset
    const ab = buf.buffer
    const size = COMP_SIZE[componentType]
    const aligned = base % size === 0

    // ArrayBufferLike, not ArrayBuffer. A Uint8Array's `.buffer` is typed as
    // ArrayBufferLike because it may be a SharedArrayBuffer, and narrowing the
    // parameter to ArrayBuffer makes the aligned-copy path below fail to
    // compile under strict mode.
    const make = (b: ArrayBufferLike, o: number, n: number): ArrayLike<number> => {
        switch (componentType) {
            case COMP_BYTE: return new Int8Array(b, o, n)
            case COMP_UBYTE: return new Uint8Array(b, o, n)
            case COMP_SHORT: return new Int16Array(b, o, n)
            case COMP_USHORT: return new Uint16Array(b, o, n)
            case COMP_UINT: return new Uint32Array(b, o, n)
            case COMP_FLOAT: return new Float32Array(b, o, n)
            default: throw new GlbError(`Unknown accessor component type ${componentType}.`)
        }
    }

    if (aligned) return make(ab, base, count)
    const copy = new Uint8Array(buf.buffer, base, count * size).slice()
    return make(copy.buffer, 0, count)
}

/**
 * Read an accessor out as floats, honouring byteStride, normalized integers and
 * sparse overrides.
 *
 * Returns tightly packed data: `count * componentsPerElement` floats with no
 * stride, because every consumer downstream wants it packed.
 */
function readAccessorFloat(
    json: RawGltf, buffers: Uint8Array[], index: number,
): Float32Array {
    const acc = json.accessors?.[index]
    if (!acc) throw new GlbError(`Accessor ${index} is missing.`)

    const comps = TYPE_COUNT[acc.type]
    if (!comps) throw new GlbError(`Accessor ${index} has unknown type ${acc.type}.`)

    const out = new Float32Array(acc.count * comps)
    const factor = acc.normalized ? normalizeFactor(acc.componentType) : 1

    // bufferView is optional: an accessor with none reads as all zeroes, which
    // only happens alongside a sparse block that fills some of them in.
    if (acc.bufferView !== undefined) {
        const bv = json.bufferViews?.[acc.bufferView]
        if (!bv) throw new GlbError(`Buffer view ${acc.bufferView} is missing.`)
        const buf = buffers[bv.buffer]
        if (!buf) throw new GlbError(`Buffer ${bv.buffer} is missing.`)

        const compSize = COMP_SIZE[acc.componentType]
        const elemSize = compSize * comps
        const stride = bv.byteStride ?? elemSize
        const viewStart = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)

        if (stride === elemSize) {
            // Packed. One view over the whole run.
            const src = typedViewFor(acc.componentType, buf, viewStart, acc.count * comps)
            for (let i = 0; i < out.length; i++) out[i] = src[i] * factor
        } else {
            // Interleaved. One view per element, which is slower but only runs
            // at load time, and interleaved attributes are common in optimised
            // exports so it has to work.
            for (let e = 0; e < acc.count; e++) {
                const src = typedViewFor(
                    acc.componentType, buf, viewStart + e * stride, comps,
                )
                for (let c = 0; c < comps; c++) out[e * comps + c] = src[c] * factor
            }
        }
    }

    if (acc.sparse) {
        const sp = acc.sparse
        const ibv = json.bufferViews?.[sp.indices.bufferView]
        const vbv = json.bufferViews?.[sp.values.bufferView]
        if (!ibv || !vbv) throw new GlbError(`Accessor ${index} has a broken sparse block.`)

        const idx = typedViewFor(
            sp.indices.componentType,
            buffers[ibv.buffer],
            (ibv.byteOffset ?? 0) + (sp.indices.byteOffset ?? 0),
            sp.count,
        )
        const vals = typedViewFor(
            acc.componentType,
            buffers[vbv.buffer],
            (vbv.byteOffset ?? 0) + (sp.values.byteOffset ?? 0),
            sp.count * comps,
        )
        for (let s = 0; s < sp.count; s++) {
            const target = idx[s] * comps
            for (let c = 0; c < comps; c++) out[target + c] = vals[s * comps + c] * factor
        }
    }

    return out
}

/** Same, but for indices, which want to stay integers. */
function readAccessorIndices(
    json: RawGltf, buffers: Uint8Array[], index: number,
): Uint32Array {
    const acc = json.accessors?.[index]
    if (!acc) throw new GlbError(`Index accessor ${index} is missing.`)
    if (acc.type !== 'SCALAR') {
        throw new GlbError(`Index accessor ${index} should be SCALAR, got ${acc.type}.`)
    }

    const out = new Uint32Array(acc.count)
    if (acc.bufferView === undefined) return out

    const bv = json.bufferViews?.[acc.bufferView]
    if (!bv) throw new GlbError(`Buffer view ${acc.bufferView} is missing.`)
    const buf = buffers[bv.buffer]

    const compSize = COMP_SIZE[acc.componentType]
    const stride = bv.byteStride ?? compSize
    const viewStart = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)

    if (stride === compSize) {
        const src = typedViewFor(acc.componentType, buf, viewStart, acc.count)
        for (let i = 0; i < acc.count; i++) out[i] = src[i]
    } else {
        for (let i = 0; i < acc.count; i++) {
            const src = typedViewFor(acc.componentType, buf, viewStart + i * stride, 1)
            out[i] = src[0]
        }
    }
    return out
}

// ── Nodes ─────────────────────────────────────────────────────────────────────

function parseNodes(json: RawGltf): { nodes: ParsedNode[]; roots: number[] } {
    const raw = json.nodes ?? []
    const nodes: ParsedNode[] = raw.map(n => {
        const translation = new Float32Array(n.translation ?? [0, 0, 0])
        const rotation = new Float32Array(n.rotation ?? [0, 0, 0, 1])
        const scale = new Float32Array(n.scale ?? [1, 1, 1])

        const localMatrix = new Float32Array(16)
        if (n.matrix) {
            // A node may give a baked matrix instead of TRS. The two are
            // mutually exclusive in the spec. Animation targets TRS channels,
            // so a matrix node cannot be animated, and that is fine: exporters
            // only write a matrix for static nodes.
            for (let i = 0; i < 16; i++) localMatrix[i] = n.matrix[i]
        } else {
            localMatrix[0] = 1; localMatrix[5] = 1; localMatrix[10] = 1; localMatrix[15] = 1
        }

        return {
            name: n.name ?? '',
            children: n.children ?? [],
            parent: -1,
            mesh: n.mesh ?? -1,
            skin: n.skin ?? -1,
            localMatrix,
            translation,
            rotation,
            scale,
        }
    })

    // Parent links, so a world transform can be walked without recursion.
    for (let i = 0; i < nodes.length; i++) {
        for (const c of nodes[i].children) {
            if (c >= 0 && c < nodes.length) nodes[c].parent = i
        }
    }

    // Roots. Prefer the declared scene; fall back to every parentless node,
    // which covers files with no scene at all.
    let roots: number[] = []
    const sceneIdx = json.scene ?? 0
    const scene = json.scenes?.[sceneIdx]
    if (scene?.nodes?.length) {
        roots = scene.nodes.slice()
    } else {
        for (let i = 0; i < nodes.length; i++) if (nodes[i].parent === -1) roots.push(i)
    }

    return { nodes, roots }
}

// ── Animations ────────────────────────────────────────────────────────────────

function parseAnimations(json: RawGltf, buffers: Uint8Array[]): ParsedAnimation[] {
    const out: ParsedAnimation[] = []

    for (const anim of json.animations ?? []) {
        const channels: ParsedChannel[] = []
        let duration = 0

        for (const ch of anim.channels) {
            const path = ch.target.path
            if (path !== 'translation' && path !== 'rotation' && path !== 'scale') {
                // 'weights' drives morph targets, which are not supported.
                continue
            }
            if (ch.target.node === undefined) continue

            const sampler = anim.samplers[ch.sampler]
            if (!sampler) continue

            const times = readAccessorFloat(json, buffers, sampler.input)
            const values = readAccessorFloat(json, buffers, sampler.output)
            if (times.length === 0) continue

            const interpolation: Interpolation = sampler.interpolation ?? 'LINEAR'
            const comps = path === 'rotation' ? 4 : 3
            const stride = interpolation === 'CUBICSPLINE' ? comps * 3 : comps

            if (values.length < times.length * stride) {
                // A malformed sampler would read past the end of the array every
                // frame. Drop the channel instead.
                continue
            }

            const last = times[times.length - 1]
            if (last > duration) duration = last

            channels.push({
                node: ch.target.node,
                path,
                interpolation,
                times,
                values,
                stride,
            })
        }

        out.push({ name: anim.name ?? `clip ${out.length}`, duration, channels })
    }

    return out
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Parse a .glb or .gltf into the structures the sampler and poser want.
 *
 * `baseUrl` is the URL the file came from. It is only used to resolve external
 * buffers, and can be anything for a self-contained .glb.
 */
export async function parseGlb(data: ArrayBuffer, baseUrl: string): Promise<GlbDoc> {
    const warnings: string[] = []

    // A .gltf file is UTF-8 JSON. Sniff rather than trusting the extension,
    // since this may have come from a fetch with no useful filename.
    let container: Container
    const firstFour = new DataView(data).getUint32(0, true)
    if (firstFour === GLB_MAGIC) {
        container = readGlbContainer(data)
    } else {
        const text = new TextDecoder().decode(data)
        try {
            container = { json: JSON.parse(text) as RawGltf, bin: null }
        } catch {
            throw new GlbError(
                'File is neither a GLB (its first bytes are not "glTF") nor valid JSON.',
            )
        }
    }

    const { json, bin } = container

    // Fail on compression before touching any geometry, so the error names the
    // actual problem instead of surfacing as a missing accessor.
    const required = json.extensionsRequired ?? []
    const used = json.extensionsUsed ?? []
    for (const ext of BLOCKING_EXTENSIONS) {
        if (required.includes(ext) || used.includes(ext)) {
            throw new GlbError(
                `This model uses ${ext}, which compresses the vertex data and needs ` +
                'its own decoder. Re-export it with compression off. In Blender that ' +
                'is the Compression checkbox in the glTF export panel; in gltfpack, ' +
                'drop the -cc flag.',
            )
        }
    }

    const buffers = await resolveBuffers(json, bin, baseUrl)
    const { nodes, roots } = parseNodes(json)

    // ── Primitives, flattened per node ───────────────────────────────────────
    // A mesh can be referenced by several nodes, each with its own transform.
    // Walking nodes rather than meshes means an instanced mesh produces one
    // primitive entry per placement, which is what the sampler needs.
    const primitives: ParsedPrimitive[] = []
    const primitiveNode: number[] = []

    for (let ni = 0; ni < nodes.length; ni++) {
        const meshIdx = nodes[ni].mesh
        if (meshIdx < 0) continue
        const mesh = json.meshes?.[meshIdx]
        if (!mesh) continue

        for (let pi = 0; pi < mesh.primitives.length; pi++) {
            const prim = mesh.primitives[pi]
            const mode = prim.mode ?? MODE_TRIANGLES

            if (mode !== MODE_TRIANGLES) {
                warnings.push(
                    `Skipped a non-triangle primitive (mode ${mode}) on ` +
                    `"${mesh.name || `mesh ${meshIdx}`}". Only triangles can be surface sampled.`,
                )
                continue
            }

            const posIdx = prim.attributes.POSITION
            if (posIdx === undefined) {
                warnings.push(`Skipped a primitive with no POSITION attribute.`)
                continue
            }

            const position = readAccessorFloat(json, buffers, posIdx)
            const vertexCount = position.length / 3

            const normal = prim.attributes.NORMAL !== undefined
                ? readAccessorFloat(json, buffers, prim.attributes.NORMAL)
                : null

            let indices: Uint32Array
            if (prim.indices !== undefined) {
                indices = readAccessorIndices(json, buffers, prim.indices)
            } else {
                // Non-indexed: vertices are consumed in order, three at a time.
                indices = new Uint32Array(vertexCount)
                for (let i = 0; i < vertexCount; i++) indices[i] = i
            }

            if (indices.length % 3 !== 0) {
                warnings.push(
                    'A primitive had an index count that is not a multiple of three. ' +
                    'The trailing partial triangle was dropped.',
                )
                indices = indices.subarray(0, indices.length - (indices.length % 3))
            }

            let joints: Uint16Array | null = null
            let weights: Float32Array | null = null
            if (
                nodes[ni].skin >= 0 &&
                prim.attributes.JOINTS_0 !== undefined &&
                prim.attributes.WEIGHTS_0 !== undefined
            ) {
                const jf = readAccessorFloat(json, buffers, prim.attributes.JOINTS_0)
                joints = new Uint16Array(jf.length)
                for (let i = 0; i < jf.length; i++) joints[i] = jf[i]

                weights = readAccessorFloat(json, buffers, prim.attributes.WEIGHTS_0)

                // Renormalise. Exporters quantise weights and the four do not
                // always sum to one; left alone, the model subtly shrinks or
                // swells wherever the sum is off.
                for (let v = 0; v < vertexCount; v++) {
                    const o = v * 4
                    const sum = weights[o] + weights[o + 1] + weights[o + 2] + weights[o + 3]
                    if (sum > 0 && Math.abs(sum - 1) > 1e-4) {
                        weights[o] /= sum; weights[o + 1] /= sum
                        weights[o + 2] /= sum; weights[o + 3] /= sum
                    }
                }

                if (prim.attributes.JOINTS_1 !== undefined) {
                    warnings.push(
                        'This model has more than four bone influences per vertex ' +
                        '(JOINTS_1). Only the first four are used, which is visually ' +
                        'indistinguishable for dots.',
                    )
                }
            }

            primitives.push({ position, normal, indices, joints, weights })
            primitiveNode.push(ni)
        }
    }

    if (primitives.length === 0) {
        throw new GlbError(
            'No triangles found. The file parsed, but every mesh was either empty, ' +
            'not triangles, or missing positions.',
        )
    }

    // ── Skins ────────────────────────────────────────────────────────────────
    const skins: ParsedSkin[] = (json.skins ?? []).map((s, si) => {
        let inverseBind: Float32Array
        if (s.inverseBindMatrices !== undefined) {
            inverseBind = readAccessorFloat(json, buffers, s.inverseBindMatrices)
        } else {
            // Spec default is identity per joint.
            inverseBind = new Float32Array(s.joints.length * 16)
            for (let j = 0; j < s.joints.length; j++) {
                const o = j * 16
                inverseBind[o] = 1; inverseBind[o + 5] = 1
                inverseBind[o + 10] = 1; inverseBind[o + 15] = 1
            }
            warnings.push(`Skin ${si} has no inverseBindMatrices; assuming identity.`)
        }
        return { joints: s.joints, inverseBind }
    })

    const animations = parseAnimations(json, buffers)

    return { primitives, primitiveNode, nodes, roots, skins, animations, warnings }
}