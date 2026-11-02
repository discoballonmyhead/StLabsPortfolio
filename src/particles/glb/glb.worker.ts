/**
 * glb.worker.ts
 * src/particles/glb/glb.worker.ts
 *
 * Fetches, parses and samples a model off the main thread.
 *
 * This is the whole reason a model can be loaded without the page stuttering.
 * Parsing a detailed .glb and sampling a few hundred thousand candidate points
 * is tens of milliseconds at best and several hundred for a heavy character,
 * and on the main thread that is a visible freeze: scrolling stops, the music
 * ribbon stops, clicks queue up. In here it is invisible.
 *
 * The result's typed arrays are transferred rather than copied, so the main
 * thread adopts the worker's buffers instead of allocating a second set. The
 * worker's copies become unusable at that point, which is fine: it is about to
 * be terminated.
 *
 * ─── A NOTE ON THE `self` TYPING BELOW ───────────────────────────────────────
 *
 * The obvious way to type this file is a `/// <reference lib="webworker" />`
 * directive and `DedicatedWorkerGlobalScope`. That is avoided deliberately.
 * Pulling the webworker lib into a project whose tsconfig already has DOM puts
 * two conflicting declarations of `self`, `postMessage` and a dozen other
 * globals into the same program, and the resulting duplicate-identifier errors
 * land in files that have nothing to do with workers. Declaring the two members
 * actually used here keeps the blast radius to this file.
 *
 * Keep this file thin. The pipeline lives in ModelSource so the worker path and
 * the main-thread fallback cannot drift apart.
 */

import { buildFromUrl, transferablesOf } from './ModelSource'
import type { WorkerRequest, WorkerReply } from './ModelSource'

/** The two bits of the worker global this file touches. */
interface WorkerScope {
    onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
    postMessage(message: WorkerReply, transfer?: ArrayBuffer[]): void
}

const ctx = self as unknown as WorkerScope

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const { url, opts } = event.data

    try {
        const built = await buildFromUrl(url, opts)

        ctx.postMessage({
            ok: true,
            cloud: built.cloud,
            poseDoc: built.poseDoc,
            warnings: built.warnings,
            parseMs: built.parseMs,
            sampleMs: built.sampleMs,
        }, transferablesOf(built))
    } catch (err) {
        // Errors do not survive structured cloning with their class intact, and
        // a worker failure that arrives as "[object Object]" is useless. The
        // message goes across as a string and ModelSource rebuilds a GlbError.
        ctx.postMessage({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        })
    }
}