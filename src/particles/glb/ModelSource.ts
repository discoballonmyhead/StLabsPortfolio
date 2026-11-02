/**
 * ModelSource.ts
 * src/particles/glb/ModelSource.ts
 *
 * The public face of the GLB engine. Everything above this file deals in
 * "give me a model by id and a time in seconds"; everything below deals in
 * accessors and bone matrices.
 *
 * ─── WHAT LOADING ACTUALLY COSTS ─────────────────────────────────────────────
 *
 * Parsing and sampling is the expensive part, and it is all one-off. It happens
 * in a Web Worker when the browser has one, which it will, so the main thread
 * never blocks: the page stays interactive and scrollable while a model loads,
 * and the model fades in whenever it is ready. If the worker cannot be created
 * the work falls back to the main thread with a yield between stages, which is
 * worse but still usable.
 *
 * Per frame, a model costs one skinning pass over its own dot budget. Nothing
 * about that scales with the triangle count, so a 300,000-triangle character
 * and a cube cost the same per frame at the same dot budget. This is the whole
 * reason for sampling up front rather than rendering the mesh.
 *
 * ─── WHY THE DOT COUNT IS REFITTED ───────────────────────────────────────────
 *
 * The existing particle engine allocates its buffers once from
 * `particleCount`, and then reads exactly that many points out of every shape
 * it morphs between. A model whose sampler happened to return 2,480 points
 * would read 120 points past the end of the array, which in a Float32Array is
 * silently zero, so a fifth of the model would collapse into a hard dot at the
 * origin. Hence `toShapeData(n)`, which always hands back exactly n points.
 */

import type { ShapeData } from '../shapes'
import { parseGlb, GlbError } from './glb-parse'
import type { GlbDoc } from './glb-parse'
import { sampleGlb } from './glb-sample'
import type { SampledCloud, SampleOptions } from './glb-sample'
import { createPoseRig } from './glb-pose'
import type { PoseDoc, PoseRig } from './glb-pose'

const INFLUENCES = 4

/**
 * `import.meta.env.DEV` is Vite's, and TypeScript only knows the `env` property
 * exists if the project pulls in vite/client types. The cast keeps this module
 * compiling in a project that does not, and the optional chain makes it return
 * false under a test runner that defines no env at all.
 */
function isDev(): boolean {
    return (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true
}

export interface ModelClipInfo {
    name: string
    duration: number
}

export interface ModelSource {
    id: string
    url: string
    /** How many dots the sampler actually produced. */
    count: number
    /** Index pairs for the structure wireframe, into the dot array. */
    lines: Uint32Array
    /** Dots below this index are structural rather than surface fill. */
    structEnd: number
    clips: ModelClipInfo[]
    hasAnimation: boolean
    /** Non-fatal notes from parsing and sampling, worth logging in dev. */
    warnings: string[]
    stats: SampledCloud['stats'] & { parseMs: number; sampleMs: number }

    /**
     * Write posed, normalised positions.
     *
     * @param out   at least count*3 floats
     * @param time  seconds. Wrapped by the clip duration, so a rising clock
     *              loops. Ignored for a model with no animation.
     * @param clip  index into `clips`, or -1 for the rest pose
     */
    pose(out: Float32Array, time: number, clip?: number): void

    /**
     * The rest pose as a ShapeData the existing engine can morph to and from,
     * resampled to exactly `n` points.
     */
    toShapeData(n: number): ShapeData

    /** Per-dot surface normals in bind space, if you want to shade by them. */
    normals: Float32Array
}

// ── Internal construction ─────────────────────────────────────────────────────

/**
 * The output of the load pipeline, before it becomes a ModelSource.
 *
 * Exported because the worker passes one straight to `transferablesOf`, and a
 * public function taking a private type trips TS4023 the moment the project
 * turns on declaration output.
 */
export interface Built {
    cloud: SampledCloud
    poseDoc: PoseDoc
    warnings: string[]
    parseMs: number
    sampleMs: number
}

function makeSource(id: string, url: string, built: Built): ModelSource {
    const { cloud, poseDoc } = built
    const rig: PoseRig = createPoseRig(poseDoc)
    const nm = cloud.normalizeMatrix

    // Caches of the refitted ShapeData, keyed by the requested point count. The
    // engine asks for the same n every time, so this is a single entry in
    // practice, and it means a model dropped into a morph sequence costs nothing
    // after the first frame.
    const shapeCache = new Map<number, ShapeData>()

    function pose(out: Float32Array, time: number, clip = 0): void {
        const useClip = rig.durations.length > 0 && clip >= 0 ? clip : -1
        rig.apply(useClip, time)
        const palette = rig.palette
        const { base, slot, weight, count } = cloud

        for (let i = 0; i < count; i++) {
            const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2]
            const io = i * INFLUENCES

            let x = 0, y = 0, z = 0

            // Unrolled over the four influence slots. A model's dots are
            // overwhelmingly either rigid (one influence) or fully weighted
            // (four), and the early-out on slot < 0 makes the rigid case cost
            // one matrix rather than four.
            for (let c = 0; c < INFLUENCES; c++) {
                const s = slot[io + c]
                if (s < 0) break
                const w = weight[io + c]
                if (w === 0) continue
                const m = s * 16
                x += w * (palette[m] * bx + palette[m + 4] * by + palette[m + 8] * bz + palette[m + 12])
                y += w * (palette[m + 1] * bx + palette[m + 5] * by + palette[m + 9] * bz + palette[m + 13])
                z += w * (palette[m + 2] * bx + palette[m + 6] * by + palette[m + 10] * bz + palette[m + 14])
            }

            // Orientation, centring and fit, in one matrix.
            out[i * 3] = nm[0] * x + nm[4] * y + nm[8] * z + nm[12]
            out[i * 3 + 1] = nm[1] * x + nm[5] * y + nm[9] * z + nm[13]
            out[i * 3 + 2] = nm[2] * x + nm[6] * y + nm[10] * z + nm[14]
        }
    }

    function toShapeData(n: number): ShapeData {
        const hit = shapeCache.get(n)
        if (hit) return hit

        // Rest pose, posed once into a scratch buffer.
        const posed = new Float32Array(cloud.count * 3)
        pose(posed, 0, -1)

        const positions = new Float32Array(n * 3)
        const lines: number[] = []

        if (n >= cloud.count) {
            // Room for every dot. Copy them, then pad by repeating surface fill
            // points with a small offset along the normal, which reads as extra
            // density rather than as doubled dots sitting exactly on top of each
            // other.
            positions.set(posed.subarray(0, cloud.count * 3))
            const fillStart = cloud.structEnd
            const fillCount = Math.max(1, cloud.count - fillStart)
            for (let i = cloud.count; i < n; i++) {
                const src = fillStart + ((i - cloud.count) % fillCount)
                const jitter = 0.004 * (((i * 2654435761) % 1000) / 500 - 1)
                positions[i * 3] = posed[src * 3] + cloud.normal[src * 3] * jitter
                positions[i * 3 + 1] = posed[src * 3 + 1] + cloud.normal[src * 3 + 1] * jitter
                positions[i * 3 + 2] = posed[src * 3 + 2] + cloud.normal[src * 3 + 2] * jitter
            }
            // The wireframe indices are still valid, since dot 0..count-1 kept
            // their positions.
            for (let i = 0; i < cloud.lines.length; i++) lines.push(cloud.lines[i])
        } else {
            // Not enough room. Structure points come first so they survive;
            // surface fill is strided, which keeps the thinned set spread out
            // rather than taking one dense region.
            const keepStruct = Math.min(cloud.structEnd, Math.floor(n * 0.4))
            for (let i = 0; i < keepStruct; i++) {
                positions[i * 3] = posed[i * 3]
                positions[i * 3 + 1] = posed[i * 3 + 1]
                positions[i * 3 + 2] = posed[i * 3 + 2]
            }
            const fillStart = cloud.structEnd
            const fillAvail = cloud.count - fillStart
            const fillWant = n - keepStruct
            for (let k = 0; k < fillWant; k++) {
                const src = fillStart + Math.floor((k * fillAvail) / fillWant)
                const dst = keepStruct + k
                positions[dst * 3] = posed[src * 3]
                positions[dst * 3 + 1] = posed[src * 3 + 1]
                positions[dst * 3 + 2] = posed[src * 3 + 2]
            }
            // Keep only the wireframe segments whose endpoints both survived.
            for (let i = 0; i + 1 < cloud.lines.length; i += 2) {
                const a = cloud.lines[i], b = cloud.lines[i + 1]
                if (a < keepStruct && b < keepStruct) lines.push(a, b)
            }
        }

        const data: ShapeData = {
            positions,
            lines: new Uint32Array(lines),
            coreEnd: Math.min(cloud.structEnd, n),
        }
        shapeCache.set(n, data)
        return data
    }

    return {
        id,
        url,
        count: cloud.count,
        lines: cloud.lines,
        structEnd: cloud.structEnd,
        clips: rig.durations.map((d, i) => ({
            name: poseDoc.animations[i]?.name ?? `clip ${i}`,
            duration: d,
        })),
        hasAnimation: rig.durations.some(d => d > 0),
        warnings: built.warnings,
        stats: { ...cloud.stats, parseMs: built.parseMs, sampleMs: built.sampleMs },
        normals: cloud.normal,
        pose,
        toShapeData,
    }
}

// ── Worker plumbing ───────────────────────────────────────────────────────────

/**
 * Message the worker sends back.
 *
 * The cloud's typed arrays are transferred rather than copied, so a big model
 * does not cost a second allocation of the same data on the main thread.
 */
export interface WorkerSuccess {
    ok: true
    cloud: SampledCloud
    poseDoc: PoseDoc
    warnings: string[]
    parseMs: number
    sampleMs: number
}
export interface WorkerFailure {
    ok: false
    error: string
}
export type WorkerReply = WorkerSuccess | WorkerFailure

export interface WorkerRequest {
    url: string
    opts: SampleOptions
}

/**
 * The shared work, used by both the worker and the main-thread fallback.
 *
 * Kept here rather than in the worker file so there is exactly one copy of the
 * pipeline and the two paths cannot drift.
 */
export async function buildFromUrl(
    url: string,
    opts: SampleOptions,
    onStage?: () => Promise<void>,
): Promise<Built> {
    const res = await fetch(url)
    if (!res.ok) {
        throw new GlbError(
            `Could not fetch ${url}: ${res.status} ${res.statusText}. ` +
            'A model in public/models/ is served from the site root, so the path ' +
            'should start with a slash and include the file name.',
        )
    }
    const buf = await res.arrayBuffer()

    const t0 = performance.now()
    const doc: GlbDoc = await parseGlb(buf, url)
    const t1 = performance.now()

    if (onStage) await onStage()

    const cloud = sampleGlb(doc, opts)
    const t2 = performance.now()

    return {
        cloud,
        poseDoc: {
            nodes: doc.nodes,
            roots: doc.roots,
            skins: doc.skins,
            animations: doc.animations,
        },
        warnings: doc.warnings,
        parseMs: t1 - t0,
        sampleMs: t2 - t1,
    }
}

/** Every typed array in a built result, for the worker's transfer list. */
export function transferablesOf(built: Built): ArrayBuffer[] {
    const out: ArrayBuffer[] = [
        built.cloud.base.buffer as ArrayBuffer,
        built.cloud.normal.buffer as ArrayBuffer,
        built.cloud.slot.buffer as ArrayBuffer,
        built.cloud.weight.buffer as ArrayBuffer,
        built.cloud.lines.buffer as ArrayBuffer,
        built.cloud.normalizeMatrix.buffer as ArrayBuffer,
    ]
    // Animation tracks are the other thing big enough to be worth moving.
    for (const anim of built.poseDoc.animations) {
        for (const ch of anim.channels) {
            out.push(ch.times.buffer as ArrayBuffer)
            out.push(ch.values.buffer as ArrayBuffer)
        }
    }
    // Duplicates are not allowed in a transfer list, and several views can share
    // one buffer when the file was tightly packed.
    return Array.from(new Set(out))
}

// ── Loading, with memoisation ─────────────────────────────────────────────────

const inFlight = new Map<string, Promise<ModelSource>>()

let workerFactory: (() => Worker) | null = null

/**
 * Tell the loader how to make its worker.
 *
 * This is injected rather than created here because the URL form that a bundler
 * understands, `new Worker(new URL('./glb.worker.ts', import.meta.url))`, has
 * to appear literally in a file the bundler is compiling. Passing a factory
 * keeps that one line at the call site and leaves this module bundler-agnostic
 * and testable.
 */
export function setModelWorkerFactory(factory: (() => Worker) | null): void {
    workerFactory = factory
}

function loadViaWorker(
    id: string, url: string, opts: SampleOptions,
): Promise<ModelSource> {
    return new Promise((resolve, reject) => {
        let worker: Worker
        try {
            worker = workerFactory!()
        } catch (err) {
            reject(err)
            return
        }

        // A model that never answers should not leave a spinner up forever.
        const timeout = setTimeout(() => {
            worker.terminate()
            reject(new GlbError(
                `Timed out loading ${url} after 30 seconds. If the model is very ` +
                'large, lower its dot budget, or decimate the mesh before export.',
            ))
        }, 30000)

        worker.onmessage = (e: MessageEvent<WorkerReply>) => {
            clearTimeout(timeout)
            worker.terminate()
            const reply = e.data
            if (!reply.ok) {
                reject(new GlbError(reply.error))
                return
            }
            resolve(makeSource(id, url, {
                cloud: reply.cloud,
                poseDoc: reply.poseDoc,
                warnings: reply.warnings,
                parseMs: reply.parseMs,
                sampleMs: reply.sampleMs,
            }))
        }

        worker.onerror = ev => {
            clearTimeout(timeout)
            worker.terminate()
            reject(new GlbError(
                `Worker failed while loading ${url}: ${ev.message || 'unknown error'}`,
            ))
        }

        const req: WorkerRequest = { url, opts }
        worker.postMessage(req)
    })
}

async function loadOnMainThread(
    id: string, url: string, opts: SampleOptions,
): Promise<ModelSource> {
    // Yield between fetch-and-parse and sampling, so the browser gets a chance
    // to paint and handle input in the middle of the work rather than only at
    // the end. It does not make the work cheaper, it makes it less rude.
    const yieldToBrowser = () => new Promise<void>(r => { setTimeout(r, 0) })
    const built = await buildFromUrl(url, opts, yieldToBrowser)
    return makeSource(id, url, built)
}

export interface LoadModelOptions extends SampleOptions {
    /** Stable key for the cache. Defaults to the URL plus the dot count. */
    id?: string
    /** Force the main thread, for debugging. */
    noWorker?: boolean
}

/**
 * Load, parse and sample a model, once.
 *
 * Calls for the same id share one promise, so three components asking for the
 * same model fetch and sample it once between them. Failures are not cached:
 * a model that failed because the network was down should be retryable.
 */
export function loadModel(url: string, options: LoadModelOptions): Promise<ModelSource> {
    const id = options.id ?? `${url}@${options.count}`
    const hit = inFlight.get(id)
    if (hit) return hit

    const absolute = typeof window !== 'undefined'
        ? new URL(url, window.location.href).toString()
        : url

    const opts: SampleOptions = {
        count: options.count,
        edgeAngle: options.edgeAngle,
        edgeBudget: options.edgeBudget,
        rotateX: options.rotateX,
        rotateY: options.rotateY,
        rotateZ: options.rotateZ,
        scale: options.scale,
        seed: options.seed,
    }

    const useWorker = !options.noWorker && workerFactory !== null
    const promise = (useWorker
        ? loadViaWorker(id, absolute, opts).catch(err => {
            // A worker that cannot start is a build or CSP problem, not a
            // problem with the model, and falling back is strictly better than
            // showing nothing.
            if (isDev()) {
                console.warn('[glb] worker path failed, falling back to the main thread', err)
            }
            return loadOnMainThread(id, absolute, opts)
        })
        : loadOnMainThread(id, absolute, opts)
    ).catch(err => {
        inFlight.delete(id)
        throw err
    })

    inFlight.set(id, promise)
    return promise
}

/** Drop a cached model, so the next load re-fetches. Used by hot reload. */
export function evictModel(id: string): void {
    inFlight.delete(id)
}

export { GlbError }