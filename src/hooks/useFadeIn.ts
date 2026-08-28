/**
 * useFadeIn.ts
 * src/hooks/useFadeIn.ts
 *
 * Reveal-on-scroll primitive. Returns a ref to attach to any element and an
 * inline style that fades + lifts it into place the first time it enters the
 * viewport.
 *
 * Honours prefers-reduced-motion: those users get the finished state instantly
 * with no transition at all.
 *
 * Add to src/hooks/index.ts:
 *   export * from './useFadeIn'
 */

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

export interface FadeInOptions {
    /** Seconds to wait before the transition starts. Stagger lists with this. */
    delay?: number
    /** How far below its resting place the element starts, in px. */
    y?: number
    /** Fraction of the element that must be visible before it fires. */
    threshold?: number
    /** false = re-hides when scrolled back out. Default true (fire once). */
    once?: boolean
    /** Transition length in seconds. */
    duration?: number
}

export function useFadeIn<T extends HTMLElement = HTMLDivElement>({
    delay = 0,
    y = 18,
    threshold = 0.12,
    once = true,
    duration = 0.62,
}: FadeInOptions = {}) {
    const ref = useRef<T>(null)
    const [inView, setInView] = useState(false)
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        if (!mq) return
        setReduced(mq.matches)
        const onChange = () => setReduced(mq.matches)
        mq.addEventListener?.('change', onChange)
        return () => mq.removeEventListener?.('change', onChange)
    }, [])

    useEffect(() => {
        const el = ref.current
        if (!el) return

        // No IntersectionObserver (very old browser, SSR snapshot) - just show it.
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true)
            return
        }

        const io = new IntersectionObserver(
            entries => {
                const e = entries[0]
                if (e.isIntersecting) {
                    setInView(true)
                    if (once) io.disconnect()
                } else if (!once) {
                    setInView(false)
                }
            },
            { threshold, rootMargin: '0px 0px -6% 0px' },
        )

        io.observe(el)
        return () => io.disconnect()
    }, [threshold, once])

    const style: CSSProperties = reduced
        ? { opacity: 1 }
        : {
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : `translateY(${y}px)`,
            transition:
                `opacity ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s, ` +
                `transform ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
            willChange: 'opacity, transform',
        }

    return { ref, style, inView }
}