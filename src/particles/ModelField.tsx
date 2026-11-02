/**
 * ModelField.tsx
 * src/particles/ModelField.tsx
 *
 * Renders a .glb model as a field of dots, in the same visual language as the
 * hand-written shapes: perspective depth, colour fading toward the background
 * with distance, a structure wireframe under the dots, and batched fills so the
 * whole frame costs a handful of canvas calls.
 *
 * ─── HOW TO USE IT ───────────────────────────────────────────────────────────
 *
 *   <ModelField model="mascot" />                      a registry entry
 *   <ModelField url="/models/thing.glb" count={1800} /> ad hoc
 *
 * Registry entries live in models.config.ts, which is where the budget,
 * orientation and clip belong so a model can be retuned without touching a
 * component.
 *
 * ─── WHAT IT COSTS ───────────────────────────────────────────────────────────
 *
 * Per frame: one skinning pass over the dot budget, one projection pass, and
 * then the draw. All of that is proportional to the dot count and completely
 * independent of the model's triangle count.
 *
 * The frame loop is gated three ways, all of which matter on a long page:
 *
 *   IntersectionObserver   stops entirely when scrolled out of view
 *   visibilitychange       stops when the tab is hidden
 *   static models          posed once, then only redrawn when something moves
 *
 * A static model with spin off and nothing hovering it does not run a frame
 * loop at all, which is the difference between a decorative canvas that costs
 * nothing and one that quietly drains a laptop battery.
 *
 * ─── RESPONSIVE ──────────────────────────────────────────────────────────────
 *
 * The dot budget is chosen once, at mount, from the viewport area and whether
 * this is a small screen. It is deliberately not recomputed on resize: the
 * budget is baked into the sampling, so changing it means re-sampling the
 * model, and re-sampling mid-interaction to chase a window drag is a bad trade.
 * Rotating a phone keeps the budget it was given, which is the right one for
 * that device either way.
 */

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { loadModel, setModelWorkerFactory } from './glb/ModelSource'
import type { ModelSource } from './glb/ModelSource'
import { modelRegistry, modelDefaults } from './models.config'
import type { ModelEntry } from './models.config'

// ── Worker wiring ─────────────────────────────────────────────────────────────
//
// This single line has to live in a file the bundler compiles, because the
// `new URL(..., import.meta.url)` form is what tells Vite to emit the worker as
// its own chunk. Registering it from here keeps ModelSource free of any
// bundler-specific syntax.
//
// Wrapped because a stricter Content-Security-Policy, or a runtime with no
// worker support at all, should degrade to main-thread loading rather than
// throwing at import time and taking the whole page down.
try {
    setModelWorkerFactory(() => new Worker(
        new URL('./glb/glb.worker.ts', import.meta.url),
        { type: 'module' },
    ))
} catch {
    setModelWorkerFactory(null)
}

export interface ModelFieldProps {
    /** A key in modelRegistry. Supplies every default below. */
    model?: string
    /** Or load a file directly. Takes priority over `model` for the URL. */
    url?: string
    /** Dot budget. Defaults to a value derived from the viewport. */
    count?: number
    /** Which animation clip to play. -1 holds the rest pose. */
    clip?: number
    /** Degrees per second of automatic rotation about the vertical axis. */
    spin?: number
    rotateX?: number
    rotateY?: number
    rotateZ?: number
    /** Multiplies the fitted size. 1 matches the other shapes. */
    scale?: number
    /** Sharp-edge threshold in degrees for the structure wireframe. */
    edgeAngle?: number
    /** Near colour. Dots fade from the background colour to this with depth. */
    accent?: string
    isDark?: boolean
    /** Drag to rotate with a pointer. */
    interactive?: boolean
    onLoad?: (source: ModelSource) => void
    onError?: (error: Error) => void
    className?: string
    style?: CSSProperties
}

const TAU = Math.PI * 2
const DEPTH_BANDS = 10
const LINE_BANDS = 5

function hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace('#', '').padEnd(6, '0')
    return [
        parseInt(c.slice(0, 2), 16),
        parseInt(c.slice(2, 4), 16),
        parseInt(c.slice(4, 6), 16),
    ]
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/**
 * Pick a dot budget for this device.
 *
 * Area-derived with a hard floor and ceiling. The ceiling is the important
 * part: a 4K monitor should not be handed four times the work just because it
 * has four times the pixels, because the dots get smaller, not more numerous,
 * and nobody can see the difference past a couple of thousand.
 */
function budgetFor(entry: ModelEntry | undefined): number {
    if (typeof window === 'undefined') return modelDefaults.count

    const w = window.innerWidth
    const h = window.innerHeight
    const small = w < 760
    const area = (w * h) / 10000

    const base = entry?.count ?? modelDefaults.count
    const ceiling = small
        ? (entry?.countMobile ?? Math.round(base * 0.55))
        : base

    // Scale down on a genuinely small viewport, never up.
    const scaled = Math.round(ceiling * clamp(area / 90, 0.45, 1))
    return clamp(scaled, 220, 4200)
}

export default function ModelField(props: ModelFieldProps) {
    const entry = props.model ? modelRegistry[props.model] : undefined

    const url = props.url ?? entry?.url
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [source, setSource] = useState<ModelSource | null>(null)
    const [error, setError] = useState<Error | null>(null)

    // Budget is decided once. See the note at the top of the file.
    const budgetRef = useRef<number>(0)
    if (budgetRef.current === 0) {
        budgetRef.current = props.count ?? budgetFor(entry)
    }

    const onLoadRef = useRef(props.onLoad)
    const onErrorRef = useRef(props.onError)
    useEffect(() => { onLoadRef.current = props.onLoad }, [props.onLoad])
    useEffect(() => { onErrorRef.current = props.onError }, [props.onError])

    // ── Load ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!url) {
            setError(new Error(
                props.model
                    ? `No model registered under "${props.model}". Add it to modelRegistry in models.config.ts.`
                    : 'ModelField needs either a `model` id or a `url`.',
            ))
            return
        }

        let live = true
        setError(null)

        loadModel(url, {
            id: `${url}@${budgetRef.current}`,
            count: budgetRef.current,
            edgeAngle: props.edgeAngle ?? entry?.edgeAngle ?? modelDefaults.edgeAngle,
            edgeBudget: entry?.edgeBudget ?? modelDefaults.edgeBudget,
            rotateX: props.rotateX ?? entry?.rotateX ?? 0,
            rotateY: props.rotateY ?? entry?.rotateY ?? 0,
            rotateZ: props.rotateZ ?? entry?.rotateZ ?? 0,
            scale: props.scale ?? entry?.scale ?? 1,
            seed: entry?.seed,
        })
            .then(src => {
                if (!live) return
                setSource(src)
                onLoadRef.current?.(src)
                if (src.warnings.length && isDev()) {
                    for (const w of src.warnings) console.warn(`[glb:${src.id}] ${w}`)
                }
            })
            .catch((err: Error) => {
                if (!live) return
                setError(err)
                onErrorRef.current?.(err)
                if (isDev()) console.error(`[glb] ${url} failed to load`, err)
            })

        return () => { live = false }
        // Intentionally keyed on the identity of the model, not on every prop:
        // changing the accent should not re-fetch and re-sample the file.
    }, [url, props.model])

    // ── Draw ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !source) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const reduced =
            typeof window !== 'undefined' &&
            !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

        const isDark = props.isDark ?? true
        const accent = props.accent ?? entry?.accent ?? modelDefaults.accent
        const [fr, fg, fb] = hexToRgb(accent)
        const [br, bg, bb] = isDark ? [0, 0, 0] : [250, 250, 250]

        const spinDegPerSec = reduced ? 0 : (props.spin ?? entry?.spin ?? modelDefaults.spin)
        const clip = props.clip ?? entry?.clip ?? 0
        const animated = source.hasAnimation && clip >= 0 && !reduced

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const n = source.count

        // ── Buffers, allocated once ──────────────────────────────────────────
        const posed = new Float32Array(n * 3)     // model space, posed
        const sx = new Float32Array(n)            // screen x
        const sy = new Float32Array(n)
        const sd = new Float32Array(n)            // depth 0 far, 1 near
        const sr = new Float32Array(n)            // radius in css px
        const onCanvas = new Uint8Array(n)

        // Per-dot size variation, so the field has texture rather than reading
        // as a uniform stipple. Deterministic, so it does not shimmer.
        const psz = new Float32Array(n)
        for (let i = 0; i < n; i++) {
            const h = ((i * 2654435761) >>> 0) / 4294967296
            psz[i] = h < 0.6 ? 0.45 + h * 0.6 : h < 0.9 ? 0.85 + h * 0.5 : 1.35 + h * 0.5
        }

        // Colour lookup tables, built once per theme and accent rather than
        // composing an rgba string per dot per frame. String building in the
        // draw loop is the single most expensive thing a canvas renderer can do.
        const dotStyle: string[] = new Array(DEPTH_BANDS)
        const lineStyle: string[] = new Array(LINE_BANDS)
        const lineWidth = new Float32Array(LINE_BANDS)
        for (let b = 0; b < DEPTH_BANDS; b++) {
            const t = (b + 0.5) / DEPTH_BANDS
            const r = Math.round(lerp(br, fr, t))
            const g = Math.round(lerp(bg, fg, t))
            const bl = Math.round(lerp(bb, fb, t))
            const a = (isDark ? 0.1 : 0.08) + t * (isDark ? 0.72 : 0.6)
            dotStyle[b] = `rgba(${r},${g},${bl},${a.toFixed(3)})`
        }
        for (let b = 0; b < LINE_BANDS; b++) {
            const t = (b + 0.5) / LINE_BANDS
            const r = Math.round(lerp(br, fr, t))
            const g = Math.round(lerp(bg, fg, t))
            const bl = Math.round(lerp(bb, fb, t))
            const a = Math.pow(t, 1.4) * (isDark ? 0.4 : 0.3)
            lineStyle[b] = `rgba(${r},${g},${bl},${a.toFixed(3)})`
            lineWidth[b] = lerp(0.3, 0.9, t)
        }

        let W = 0, H = 0, cx = 0, cy = 0, viewScale = 0
        function measure() {
            W = canvas!.offsetWidth
            H = canvas!.offsetHeight
            canvas!.width = Math.max(1, Math.round(W * dpr))
            canvas!.height = Math.max(1, Math.round(H * dpr))
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
            cx = W / 2
            cy = H / 2
            // Fit the unit sphere the normaliser produced into the shorter axis,
            // so the model never crops when the container is a narrow column.
            viewScale = Math.min(W, H) * 0.42
            dirty = true
        }

        const FOV = 3.0
        // Live view rotation. The model's own orientation is already baked into
        // the sampled positions by the normalisation matrix, so this starts at
        // zero and only ever carries spin and drag.
        let yaw = 0
        let pitch = 0.1
        let dirty = true

        // ── Pointer rotation ─────────────────────────────────────────────────
        let dragging = false
        let lastX = 0, lastY = 0
        const interactive = props.interactive ?? false

        const onDown = (e: PointerEvent) => {
            if (!interactive) return
            dragging = true
            lastX = e.clientX; lastY = e.clientY
            canvas!.setPointerCapture(e.pointerId)
        }
        const onMove = (e: PointerEvent) => {
            if (!dragging) return
            yaw += (e.clientX - lastX) * 0.006
            pitch = clamp(pitch + (e.clientY - lastY) * 0.004, -1.2, 1.2)
            lastX = e.clientX; lastY = e.clientY
            dirty = true
            start()
        }
        const onUp = (e: PointerEvent) => {
            if (!dragging) return
            dragging = false
            try { canvas!.releasePointerCapture(e.pointerId) } catch { /* already gone */ }
        }

        if (interactive) {
            canvas.addEventListener('pointerdown', onDown)
            canvas.addEventListener('pointermove', onMove)
            canvas.addEventListener('pointerup', onUp)
            canvas.addEventListener('pointercancel', onUp)
            canvas.style.cursor = 'grab'
            canvas.style.touchAction = 'none'
        }

        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(canvas)

        // ── Frame ────────────────────────────────────────────────────────────
        let raf = 0
        let running = false
        let disposed = false
        let onScreen = true
        let lastT = performance.now()
        const bootedAt = performance.now()

        // The rest pose only has to be computed once for a static model.
        source.pose(posed, 0, animated ? clip : -1)

        function draw(now: number) {
            if (disposed) return
            if (!onScreen || document.hidden) { running = false; return }

            const dt = Math.min(0.05, (now - lastT) / 1000)
            lastT = now

            let moved = false
            if (spinDegPerSec !== 0 && !dragging) {
                yaw += (spinDegPerSec * Math.PI / 180) * dt
                moved = true
            }
            if (animated) {
                source!.pose(posed, (now - bootedAt) / 1000, clip)
                moved = true
            }

            if (!moved && !dirty) {
                // Nothing changed. A static model with spin off settles here and
                // stops asking for frames, which is the point.
                running = false
                return
            }
            dirty = false
            raf = requestAnimationFrame(draw)

            ctx!.clearRect(0, 0, W, H)
            if (W === 0 || H === 0) return

            const cosY = Math.cos(yaw), sinY = Math.sin(yaw)
            const cosX = Math.cos(pitch), sinX = Math.sin(pitch)

            // ── Project ──────────────────────────────────────────────────────
            let minZ = Infinity, maxZ = -Infinity
            for (let i = 0; i < n; i++) {
                const x0 = posed[i * 3], y0 = posed[i * 3 + 1], z0 = posed[i * 3 + 2]

                const x1 = x0 * cosY + z0 * sinY
                const z1 = -x0 * sinY + z0 * cosY
                const y2 = y0 * cosX - z1 * sinX
                const z2 = y0 * sinX + z1 * cosX

                const persp = FOV / (FOV + z2)
                sx[i] = cx + x1 * persp * viewScale
                sy[i] = cy - y2 * persp * viewScale
                sd[i] = z2
                sr[i] = psz[i] * persp
                if (z2 < minZ) minZ = z2
                if (z2 > maxZ) maxZ = z2

                // A margin rather than an exact bound, so a dot whose centre is
                // just outside still contributes its edge.
                onCanvas[i] = (sx[i] > -8 && sx[i] < W + 8 && sy[i] > -8 && sy[i] < H + 8) ? 1 : 0
            }

            const zSpan = maxZ - minZ || 1
            const toDepth = (z: number) => (z - minZ) / zSpan

            // ── Structure lines, under the dots ──────────────────────────────
            const lines = source!.lines
            if (lines.length >= 2) {
                for (let b = 0; b < LINE_BANDS; b++) {
                    const lo = b / LINE_BANDS, hi = (b + 1) / LINE_BANDS
                    let any = false
                    ctx!.beginPath()
                    for (let k = 0; k + 1 < lines.length; k += 2) {
                        const a = lines[k], c = lines[k + 1]
                        if (a >= n || c >= n) continue
                        if (!onCanvas[a] && !onCanvas[c]) continue
                        const d = (toDepth(sd[a]) + toDepth(sd[c])) * 0.5
                        if (d < lo || d >= hi) continue
                        ctx!.moveTo(sx[a], sy[a])
                        ctx!.lineTo(sx[c], sy[c])
                        any = true
                    }
                    if (!any) continue
                    ctx!.strokeStyle = lineStyle[b]
                    ctx!.lineWidth = lineWidth[b]
                    ctx!.stroke()
                }
            }

            // ── Dots, batched by depth band ──────────────────────────────────
            // One fill per band instead of one per dot. Ten fills for the whole
            // model, whatever the budget.
            for (let b = 0; b < DEPTH_BANDS; b++) {
                const lo = b / DEPTH_BANDS, hi = (b + 1) / DEPTH_BANDS
                let any = false
                ctx!.beginPath()
                for (let i = 0; i < n; i++) {
                    if (!onCanvas[i]) continue
                    const d = toDepth(sd[i])
                    if (d < lo || d >= hi) continue
                    const r = sr[i]
                    if (r < 0.7) {
                        // A sub-pixel arc costs the same as a big one and looks
                        // identical to a rect at this size.
                        ctx!.rect(sx[i] - r, sy[i] - r, r * 2, r * 2)
                    } else {
                        ctx!.moveTo(sx[i] + r, sy[i])
                        ctx!.arc(sx[i], sy[i], r, 0, TAU)
                    }
                    any = true
                }
                if (!any) continue
                ctx!.fillStyle = dotStyle[b]
                ctx!.fill()
            }

            if (reduced) { running = false }
        }

        function start() {
            if (running || disposed) return
            running = true
            lastT = performance.now()
            raf = requestAnimationFrame(draw)
        }

        const io = new IntersectionObserver(entries => {
            onScreen = entries[0].isIntersecting
            if (onScreen) { dirty = true; start() }
        }, { rootMargin: '80px' })
        io.observe(canvas)

        const onVis = () => { if (!document.hidden) { dirty = true; start() } }
        document.addEventListener('visibilitychange', onVis)

        start()

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            document.removeEventListener('visibilitychange', onVis)
            if (interactive) {
                canvas.removeEventListener('pointerdown', onDown)
                canvas.removeEventListener('pointermove', onMove)
                canvas.removeEventListener('pointerup', onUp)
                canvas.removeEventListener('pointercancel', onUp)
            }
        }
    }, [
        source, props.accent, props.isDark, props.spin, props.clip,
        props.interactive, entry,
    ])

    // A failed model should leave a hole, not an error box on a marketing page.
    // The message is in the console and in onError for whoever is building.
    if (error) return null

    return (
        <canvas
            ref={canvasRef}
            className={props.className}
            aria-hidden="true"
            style={{
                display: 'block',
                width: '100%',
                height: '100%',
                // Fades in when the model arrives, so there is no pop.
                opacity: source ? 1 : 0,
                transition: 'opacity 700ms ease',
                pointerEvents: props.interactive ? 'auto' : 'none',
                ...props.style,
            }}
        />
    )
}

function isDev(): boolean {
    return (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true
}