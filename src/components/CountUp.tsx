/**
 * CountUp.tsx
 * src/components/CountUp.tsx
 *
 * Animates the numeric part of a string when it first scrolls into view, then
 * leaves it alone. Anything that is not a digit rides along untouched, so all
 * of these work:
 *
 *   <CountUp value="6" />          counts 0 to 6
 *   <CountUp value="100%" />       counts 0% to 100%
 *   <CountUp value="3.4x" />       counts 0.0x to 3.4x, keeps one decimal
 *   <CountUp value="~40k" />       keeps the tilde and the k
 *   <CountUp value="Zero" />       no digits, renders as is
 *
 * Respects prefers-reduced-motion by showing the final value immediately.
 *
 * Add to src/components/index.ts:
 *   export { CountUp } from './CountUp'
 */

import { useEffect, useRef, useState } from 'react'

export interface CountUpProps {
    value: string
    /** Seconds the count takes. Default 1.1 */
    duration?: number
    className?: string
    style?: React.CSSProperties
}

/** Pulls "3.4" out of "~3.4x" along with whatever sits either side of it. */
function parse(value: string) {
    const match = value.match(/-?\d[\d,]*\.?\d*/)
    if (!match) return null
    const raw = match[0]
    const numeric = parseFloat(raw.replace(/,/g, ''))
    if (Number.isNaN(numeric)) return null
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0
    const grouped = raw.includes(',')
    return {
        numeric,
        decimals,
        grouped,
        prefix: value.slice(0, match.index ?? 0),
        suffix: value.slice((match.index ?? 0) + raw.length),
    }
}

function format(n: number, decimals: number, grouped: boolean) {
    const fixed = n.toFixed(decimals)
    if (!grouped) return fixed
    const [whole, frac] = fixed.split('.')
    const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return frac ? `${withCommas}.${frac}` : withCommas
}

export function CountUp({ value, duration = 1.1, className = '', style = {} }: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const [display, setDisplay] = useState(() => {
        const parsed = parse(value)
        return parsed ? `${parsed.prefix}${format(0, parsed.decimals, parsed.grouped)}${parsed.suffix}` : value
    })
    const done = useRef(false)

    useEffect(() => {
        const parsed = parse(value)
        const el = ref.current

        // Nothing to animate, or the visitor asked for less motion.
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (!parsed || !el || reduced || typeof IntersectionObserver === 'undefined') {
            setDisplay(value)
            return
        }

        let raf = 0
        const run = () => {
            if (done.current) return
            done.current = true
            const start = performance.now()
            const tick = (now: number) => {
                const t = Math.min((now - start) / (duration * 1000), 1)
                // easeOutCubic, fast off the line then settles
                const eased = 1 - Math.pow(1 - t, 3)
                setDisplay(
                    `${parsed.prefix}${format(parsed.numeric * eased, parsed.decimals, parsed.grouped)}${parsed.suffix}`,
                )
                if (t < 1) raf = requestAnimationFrame(tick)
                else setDisplay(value)
            }
            raf = requestAnimationFrame(tick)
        }

        const io = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    run()
                    io.disconnect()
                }
            },
            { threshold: 0.4 },
        )
        io.observe(el)

        return () => {
            cancelAnimationFrame(raf)
            io.disconnect()
        }
    }, [value, duration])

    return (
        <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
            {display}
        </span>
    )
}

export default CountUp