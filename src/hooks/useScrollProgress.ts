/**
 * useScrollProgress.ts
 * src/hooks/useScrollProgress.ts
 *
 * Returns 0 to 1 describing how far a tall element has travelled through the
 * viewport. Attach the ref to an outer container that is taller than the
 * screen, keep a sticky child inside it, and drive any animation from the
 * number that comes back.
 *
 *   const { ref, progress } = useScrollProgress<HTMLDivElement>()
 *   <div ref={ref} style={{ height: '300vh' }}>
 *     <div style={{ position: 'sticky', top: 0, height: '100vh' }}> ... </div>
 *   </div>
 *
 * 0 means the container has just reached the top of the viewport, 1 means its
 * bottom edge has arrived. Reads are throttled to one per animation frame, so
 * scrolling stays cheap.
 *
 * Add to src/hooks/index.ts:
 *   export * from './useScrollProgress'
 */

import { useEffect, useRef, useState } from 'react'

export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
    const ref = useRef<T>(null)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        let raf = 0

        const measure = () => {
            raf = 0
            const rect = el.getBoundingClientRect()
            const total = rect.height - window.innerHeight

            // Container shorter than the viewport: treat as all or nothing.
            if (total <= 0) {
                setProgress(rect.top <= 0 ? 1 : 0)
                return
            }

            const travelled = -rect.top
            const next = travelled / total
            setProgress(next < 0 ? 0 : next > 1 ? 1 : next)
        }

        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(measure)
        }

        measure()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [])

    return { ref, progress }
}

// ─────────────────────────────────────────────────────────────────────────────
// Segment helpers, useful anywhere a single progress value drives many things
// ─────────────────────────────────────────────────────────────────────────────

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Remap a slice of an overall progress value to its own local 0 to 1. */
export const segment = (p: number, start: number, end: number) =>
    clamp01((p - start) / (end - start || 1))

/** Smoothstep, takes the hard edges off a linear segment. */
export const ease = (t: number) => t * t * (3 - 2 * t)