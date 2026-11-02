/**
 * useModelShape.ts
 * src/particles/glb/useModelShape.ts
 *
 * Bridges a loaded .glb into the existing shape system, so a model can sit in a
 * morph sequence next to the hand-written shapes.
 *
 * ─── THE PROBLEM THIS SOLVES ─────────────────────────────────────────────────
 *
 * `sampleShape` is synchronous. It has to be: ParticleViewer calls it mid-frame
 * when a morph crosses into the next shape, and there is nowhere to await. A
 * model, on the other hand, needs a network fetch and a sampling pass.
 *
 * So the two are decoupled. This hook does the async part and then hands the
 * finished cloud to `registerModelShape`, which drops it into a registry that
 * `sampleShape` can read synchronously from then on. Before that happens,
 * `sampleShape('model:x')` returns a stand-in shape, so a sequence containing a
 * model that has not arrived yet morphs through a sphere instead of collapsing
 * to the origin.
 *
 * In practice the model is registered long before the sequence reaches it,
 * because the hook runs on mount and a hero sequence spends several seconds on
 * its first shape.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *
 *   // In whatever component owns the particle field:
 *   useModelShape('mascot', heroParticleConfig.particleCount)
 *
 *   // Then in particles.config.ts:
 *   shapes: ['statelessLogo', 'icosphere', 'model:mascot', 'trefoil', ...]
 *
 * One important limitation, stated plainly: a model used this way is a STATIC
 * shape. The morph pipeline interpolates between two fixed point sets, so there
 * is nowhere for a per-frame pose to go. A model whose animation should play
 * belongs in ModelField, which owns its own loop. Using an animated model here
 * is not an error, you just get its rest pose.
 */

import { useEffect, useState } from 'react'
import { loadModel } from './ModelSource'
import type { ModelSource } from './ModelSource'
import { registerModelShape } from '../shapes'
import { modelDefaults, modelRegistry } from '../models.config'


export interface UseModelShapeResult {
    source: ModelSource | null
    error: Error | null
    /** True once sampleShape('model:<id>') will return the real model. */
    ready: boolean
}

/**
 * Load a registered model and make it available to `sampleShape`.
 *
 * @param id  a key in modelRegistry
 * @param n   the point count the particle field uses. Must match the field's
 *            `particleCount`, because that is how many points it will read.
 */
export function useModelShape(id: string | null, n: number): UseModelShapeResult {
    const [source, setSource] = useState<ModelSource | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        if (!id) return
        const entry = modelRegistry[id]
        if (!entry) {
            setError(new Error(
                `No model registered under "${id}". Add it to modelRegistry in models.config.ts.`,
            ))
            return
        }

        let live = true
        setError(null)
        setReady(false)

        loadModel(entry.url, {
            id: `${entry.url}@shape${n}`,
            // Sample at the field's point count, so the refit in toShapeData is
            // a copy rather than a thin-out.
            count: Math.max(entry.count, n),
            edgeAngle: entry.edgeAngle ?? modelDefaults.edgeAngle,
            edgeBudget: entry.edgeBudget ?? modelDefaults.edgeBudget,
            rotateX: entry.rotateX,
            rotateY: entry.rotateY,
            rotateZ: entry.rotateZ,
            scale: entry.scale,
            seed: entry.seed,
        })
            .then(src => {
                if (!live) return
                // Register at the exact count the field reads. Doing it here,
                // rather than letting sampleShape call toShapeData lazily, keeps
                // the refit off the frame where the morph starts.
                registerModelShape(id, src.toShapeData(n))
                setSource(src)
                setReady(true)
            })
            .catch((err: Error) => {
                if (!live) return
                setError(err)
            })

        return () => { live = false }
    }, [id, n])

    return { source, error, ready }
}

/**
 * Load several models for one field.
 *
 * Handy when a sequence has more than one model in it. They load in parallel
 * and each registers as it lands, so the sequence is never blocked on the
 * slowest one.
 */
export function useModelShapes(ids: readonly string[], n: number): {
    ready: string[]
    errors: Record<string, Error>
} {
    const [ready, setReady] = useState<string[]>([])
    const [errors, setErrors] = useState<Record<string, Error>>({})

    // Joined rather than passed as an array, so a caller writing the list
    // inline does not re-run this effect on every render.
    const key = ids.join('|')

    useEffect(() => {
        let live = true
        setReady([])
        setErrors({})

        for (const id of ids) {
            const entry = modelRegistry[id]
            if (!entry) {
                setErrors(e => ({ ...e, [id]: new Error(`No model registered under "${id}".`) }))
                continue
            }
            loadModel(entry.url, {
                id: `${entry.url}@shape${n}`,
                count: Math.max(entry.count, n),
                edgeAngle: entry.edgeAngle ?? modelDefaults.edgeAngle,
                edgeBudget: entry.edgeBudget ?? modelDefaults.edgeBudget,
                rotateX: entry.rotateX,
                rotateY: entry.rotateY,
                rotateZ: entry.rotateZ,
                scale: entry.scale,
                seed: entry.seed,
            })
                .then(src => {
                    if (!live) return
                    registerModelShape(id, src.toShapeData(n))
                    setReady(r => (r.includes(id) ? r : [...r, id]))
                })
                .catch((err: Error) => {
                    if (!live) return
                    setErrors(e => ({ ...e, [id]: err }))
                })
        }

        return () => { live = false }
    }, [key, n])

    return { ready, errors }
}