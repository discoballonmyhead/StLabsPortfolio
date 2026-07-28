/**
 * FadeUp.tsx
 * src/components/FadeUp.tsx
 *
 * Wrap anything to have it fade and lift into view on scroll.
 *
 *   <FadeUp>            <Panel /></FadeUp>
 *   <FadeUp delay={0.08}><Panel /></FadeUp>   stagger inside a map
 *
 * Add to src/components/index.ts:
 *   export { FadeUp } from './FadeUp'
 */

import type { CSSProperties, ReactNode } from 'react'
import { useFadeIn } from '@/hooks/useFadeIn'

export interface FadeUpProps {
    children: ReactNode
    /** Seconds of delay. Use index * 0.07 inside a list for a stagger. */
    delay?: number
    /** Starting offset in px. Default 18. */
    y?: number
    className?: string
    style?: CSSProperties
}

export function FadeUp({ children, delay = 0, y = 18, className = '', style = {} }: FadeUpProps) {
    const { ref, style: fadeStyle } = useFadeIn<HTMLDivElement>({ delay, y })
    return (
        <div ref={ref} className={className} style={{ ...fadeStyle, ...style }}>
            {children}
        </div>
    )
}

export default FadeUp