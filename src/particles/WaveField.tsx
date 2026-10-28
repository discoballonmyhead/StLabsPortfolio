/**
 * WaveField.tsx
 * src/particles/WaveField.tsx
 *
 * A standalone particle wave for the hosted status pages. It does NOT go
 * through ParticleViewer or sampleShape.
 *
 * ─── WHY IT IS ITS OWN COMPONENT ─────────────────────────────────────────────
 *
 * The status pages were rendering the wave by pointing ParticleViewer at a
 * hero config locked to shapes: ['wave']. That had two problems.
 *
 *   1. It hijacked the home page. heroParticleConfig is shared, so locking it
 *      to the wave froze the home page on a single shape.
 *   2. The wave shape is deliberately uncached, because it animates. So every
 *      frame called sampleShape('wave', 3500), which builds 3500 small arrays
 *      and then copies them into fresh Float32Arrays. At 60fps that is around
 *      200,000 allocations a second, and the garbage collector shows up as
 *      visible stutter.
 *
 * This component allocates its buffers once and then only ever writes numbers
 * into them. Nothing is allocated inside the frame loop.
 *
 * ─── RESPONSIVE ──────────────────────────────────────────────────────────────
 *
 * The wave is measured in screen space, not world space, so it always spans
 * the viewport exactly with no perspective maths to get wrong.
 *
 *   Landscape / desktop   horizontal bands drifting across the full width
 *   Portrait / mobile     the whole field rotates 90 degrees so the wave runs
 *                         DOWN the screen. A horizontal wave in a tall phone
 *                         viewport is a thin stripe with dead space above and
 *                         below; rotating it fills the frame instead.
 *
 * Particle count scales with area and is capped per orientation, so a phone
 * does not render a desktop workload.
 *
 * ─── THE DELIVERY PULSE ──────────────────────────────────────────────────────
 *
 * With `pulse` on, a bright crest travels the length of the wave on a loop,
 * like a packet in transit. StatusPage turns it on for the email and password
 * reset screens, where "something is on its way" is the actual message. It is
 * off for the plain auth screens.
 *
 * ─── ACCESSIBILITY AND COST ──────────────────────────────────────────────────
 *
 *   prefers-reduced-motion   renders one static frame, no loop at all
 *   IntersectionObserver     loop stops when the canvas is off screen
 *   visibilitychange         loop stops when the tab is hidden
 *   DPR capped at 2          a 3x phone screen does not triple the fill cost
 */

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

export interface WaveFieldProps {
    /** Hex accent, usually the status page's own colour. */
    accent: string
    isDark: boolean
    /** 'auto' picks vertical on a portrait viewport. Default 'auto'. */
    orientation?: 'horizontal' | 'vertical' | 'auto'
    /** Travelling crest, for "your message is on its way" screens. */
    pulse?: boolean
    /** Multiplies the computed particle count. 1 is the default density. */
    density?: number
    // Imported as a type rather than reached through the React UMD global,
    // which is an error (TS2686) in a module file on some tsconfig setups.
    style?: CSSProperties
    className?: string
}

const TAU = Math.PI * 2

// Particles per 10,000 css px of canvas area, then clamped. Tuned so a laptop
// lands near 1,400 and a phone near 500.
const PER_AREA = 1.1
const MIN_PARTICLES = 260
const MAX_PARTICLES = 1800

// Annotated as number rather than left to infer the literal 9. Without the
// annotation TypeScript narrows the type to `9`, and then the `STRANDS === 1`
// guard below is an error: "types '9' and '1' have no overlap". The guard is
// worth keeping so a single-strand setting still divides safely.
const STRANDS: number = 9  // continuous lines through the wave
const STRAND_PTS = 46      // points per strand, also the line resolution
const SPREAD = 0.30        // how much of the cross axis the bands occupy
const AMP = 0.085          // crest height as a fraction of the cross axis
const DRIFT = 0.040        // phase advance per second
const PULSE_PERIOD = 4.2   // seconds for one crest to cross
const PULSE_WIDTH = 0.16   // crest width as a fraction of the long axis

function hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace('#', '').padEnd(6, '0')
    return [
        parseInt(c.slice(0, 2), 16),
        parseInt(c.slice(2, 4), 16),
        parseInt(c.slice(4, 6), 16),
    ]
}

export default function WaveField({
    accent,
    isDark,
    orientation = 'auto',
    pulse = false,
    density = 1,
    style,
    className,
}: WaveFieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const reduced =
            typeof window !== 'undefined' &&
            !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

        const [ar, ag, ab] = hexToRgb(accent)
        // Mixing the accent toward the page background keeps the far particles from
        // reading as grey mush on light mode and as invisible on dark.
        const [br, bg, bb] = isDark ? [0, 0, 0] : [250, 250, 250]

        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        // ── Buffers, allocated once at the largest size we will ever use ────────
        const px = new Float32Array(MAX_PARTICLES)     // position along the wave, 0..1
        const pOff = new Float32Array(MAX_PARTICLES)   // offset across the wave, -1..1
        const pJit = new Float32Array(MAX_PARTICLES)   // per-particle crest jitter
        const pSz = new Float32Array(MAX_PARTICLES)    // radius in css px
        const pDep = new Float32Array(MAX_PARTICLES)   // 0 far, 1 near
        const pPh = new Float32Array(MAX_PARTICLES)    // own phase, stops lockstep

        for (let i = 0; i < MAX_PARTICLES; i++) {
            px[i] = Math.random()
            pOff[i] = (Math.random() * 2 - 1) * (Math.random() < 0.72 ? 1 : 1.45)
            pJit[i] = (Math.random() * 2 - 1) * 0.55
            pDep[i] = Math.random()
            pPh[i] = Math.random() * TAU
            const r = Math.random()
            pSz[i] = r < 0.62 ? 0.5 + Math.random() * 0.4
                : r < 0.9 ? 0.9 + Math.random() * 0.5
                    : 1.5 + Math.random() * 0.6
        }

        // Screen-space scratch for the strand lines. Written every frame, never grown.
        const sx = new Float32Array(STRANDS * STRAND_PTS)
        const sy = new Float32Array(STRANDS * STRAND_PTS)

        let W = 0, H = 0, count = 0, vertical = false

        function measure() {
            W = canvas!.offsetWidth
            H = canvas!.offsetHeight
            canvas!.width = Math.max(1, Math.round(W * dpr))
            canvas!.height = Math.max(1, Math.round(H * dpr))
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

            vertical = orientation === 'vertical'
                ? true
                : orientation === 'horizontal'
                    ? false
                    : H > W * 1.1   // auto: portrait gets the vertical wave

            const area = (W * H) / 10000
            count = Math.round(
                Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, area * PER_AREA * density)),
            )
        }

        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(canvas)

        /**
         * The wave surface. `t` runs 0..1 along the long axis, `off` runs -1..1
         * across it. Returns the crest displacement in normalised cross-axis units.
         * Three sines at non-integer ratios so the pattern never visibly repeats.
         */
        function crest(t: number, off: number, phase: number): number {
            return (
                Math.sin(t * Math.PI * 3 + phase) * 0.42 +
                Math.sin(t * Math.PI * 1.5 + off * 2.2 - phase * 0.5) * 0.24 +
                Math.sin(t * Math.PI * 5.3 + off * 1.1 + phase * 0.8) * 0.09
            )
        }

        let raf = 0
        let disposed = false
        let onScreen = true
        let running = false
        let startedAt = performance.now()

        function frame(now: number) {
            if (disposed) return
            if (!onScreen || document.hidden) { running = false; return }
            raf = requestAnimationFrame(frame)

            const time = reduced ? 2.0 : (now - startedAt) / 1000
            const phase = time * DRIFT * TAU

            ctx!.clearRect(0, 0, W, H)
            if (W === 0 || H === 0) return

            // long = along the wave, cross = across it
            const longPx = vertical ? H : W
            const crossPx = vertical ? W : H
            const crossMid = crossPx * 0.5
            const ampPx = crossPx * AMP
            const spreadPx = crossPx * SPREAD

            // Wave space to canvas space is just a swap of the two axes, and it is
            // written out at each of the three call sites below rather than going
            // through a helper. A helper returning [x, y] allocates an array on
            // every call, which at this particle count is around two thousand
            // allocations per frame, and that garbage is exactly what this component
            // exists to avoid.

            // ── Travelling crest ──────────────────────────────────────────────────
            // headT is where the bright band currently sits along the long axis.
            const headT = pulse && !reduced
                ? ((time % PULSE_PERIOD) / PULSE_PERIOD)
                : -1

            // ── Strand lines, drawn under the dots ────────────────────────────────
            for (let s = 0; s < STRANDS; s++) {
                const off = STRANDS === 1 ? 0 : (s / (STRANDS - 1)) * 2 - 1
                const base = s * STRAND_PTS
                for (let i = 0; i < STRAND_PTS; i++) {
                    const t = i / (STRAND_PTS - 1)
                    const c = crossMid + off * spreadPx + crest(t, off, phase) * ampPx
                    const lp = t * longPx
                    const cxp = vertical ? c : lp
                    const cyp = vertical ? lp : c
                    sx[base + i] = cxp
                    sy[base + i] = cyp
                }
            }

            for (let s = 0; s < STRANDS; s++) {
                const off = STRANDS === 1 ? 0 : (s / (STRANDS - 1)) * 2 - 1
                // Centre strands read as nearer, so they get more presence.
                const near = 1 - Math.abs(off) * 0.55
                const a = (isDark ? 0.17 : 0.13) * near
                if (a < 0.012) continue

                ctx!.beginPath()
                const base = s * STRAND_PTS
                ctx!.moveTo(sx[base], sy[base])
                for (let i = 1; i < STRAND_PTS; i++) ctx!.lineTo(sx[base + i], sy[base + i])

                const r = Math.round(br + (ar - br) * near)
                const g = Math.round(bg + (ag - bg) * near)
                const b = Math.round(bb + (ab - bb) * near)
                ctx!.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`
                ctx!.lineWidth = 0.6 + near * 0.5
                ctx!.stroke()
            }

            // ── Dots ──────────────────────────────────────────────────────────────
            // Batched into 4 depth bands so the whole field costs 4 fill() calls
            // instead of one per particle.
            const BANDS = 4
            for (let band = 0; band < BANDS; band++) {
                const lo = band / BANDS, hi = (band + 1) / BANDS
                const depth = (band + 0.5) / BANDS
                let any = false
                ctx!.beginPath()

                for (let i = 0; i < count; i++) {
                    const d = pDep[i]
                    if (d < lo || d >= hi) continue

                    const t = px[i]
                    const off = pOff[i]
                    const c =
                        crossMid +
                        off * spreadPx +
                        crest(t, off, phase + pPh[i] * 0.06) * ampPx +
                        pJit[i] * ampPx * 0.5

                    const lp = t * longPx
                    const cxp = vertical ? c : lp
                    const cyp = vertical ? lp : c
                    // Depth scales the dot, so the field has some air in it.
                    const r = pSz[i] * (0.65 + depth * 0.5)
                    if (r < 0.75) ctx!.rect(cxp - r, cyp - r, r * 2, r * 2)
                    else { ctx!.moveTo(cxp + r, cyp); ctx!.arc(cxp, cyp, r, 0, TAU) }
                    any = true
                }

                if (!any) continue
                const mix = 0.25 + depth * 0.75
                const r = Math.round(br + (ar - br) * mix)
                const g = Math.round(bg + (ag - bg) * mix)
                const b = Math.round(bb + (ab - bb) * mix)
                const a = (isDark ? 0.14 : 0.11) + depth * (isDark ? 0.5 : 0.38)
                ctx!.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`
                ctx!.fill()
            }

            // ── Crest highlight, drawn last so it sits on top ─────────────────────
            if (headT >= 0) {
                let any = false
                ctx!.beginPath()
                for (let i = 0; i < count; i++) {
                    // Distance along the long axis from the travelling head, wrapped so
                    // the crest is continuous across the loop boundary.
                    let dist = Math.abs(px[i] - headT)
                    if (dist > 0.5) dist = 1 - dist
                    if (dist > PULSE_WIDTH) continue

                    const t = px[i]
                    const off = pOff[i]
                    const c =
                        crossMid +
                        off * spreadPx +
                        crest(t, off, phase + pPh[i] * 0.06) * ampPx +
                        pJit[i] * ampPx * 0.5
                    const lp = t * longPx
                    const cxp = vertical ? c : lp
                    const cyp = vertical ? lp : c
                    const glow = 1 - dist / PULSE_WIDTH
                    const r = pSz[i] * (1.1 + glow * 1.5)
                    ctx!.moveTo(cxp + r, cyp)
                    ctx!.arc(cxp, cyp, r, 0, TAU)
                    any = true
                }
                if (any) {
                    ctx!.fillStyle = `rgba(${ar},${ag},${ab},${isDark ? 0.30 : 0.22})`
                    ctx!.fill()
                }

                // A soft band behind the crest, so it reads as a wavefront and not
                // just a cluster of brighter dots.
                const headPx = headT * longPx
                const halfPx = PULSE_WIDTH * longPx
                const g0 = vertical
                    ? ctx!.createLinearGradient(0, headPx - halfPx, 0, headPx + halfPx)
                    : ctx!.createLinearGradient(headPx - halfPx, 0, headPx + halfPx, 0)
                g0.addColorStop(0, `rgba(${ar},${ag},${ab},0)`)
                g0.addColorStop(0.5, `rgba(${ar},${ag},${ab},${isDark ? 0.055 : 0.04})`)
                g0.addColorStop(1, `rgba(${ar},${ag},${ab},0)`)
                ctx!.fillStyle = g0
                if (vertical) ctx!.fillRect(0, headPx - halfPx, W, halfPx * 2)
                else ctx!.fillRect(headPx - halfPx, 0, halfPx * 2, H)
            }

            // One frame is enough when motion is reduced.
            if (reduced) { cancelAnimationFrame(raf); running = false }
        }

        function start() {
            if (running || disposed) return
            running = true
            startedAt = performance.now() - 2000   // begin mid-drift, not from flat
            raf = requestAnimationFrame(frame)
        }

        const io = new IntersectionObserver(entries => {
            onScreen = entries[0].isIntersecting
            if (onScreen) start()
        })
        io.observe(canvas)

        const onVis = () => { if (!document.hidden) start() }
        document.addEventListener('visibilitychange', onVis)

        start()

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            document.removeEventListener('visibilitychange', onVis)
        }
    }, [accent, isDark, orientation, pulse, density])

    return (
        <canvas
            ref={canvasRef}
            className={className}
            aria-hidden="true"
            style={{
                display: 'block',
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                ...style,
            }}
        />
    )
}