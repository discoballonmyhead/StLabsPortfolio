/**
 * VoiceOrb.tsx — v2
 *
 * Siri-style voice-reactive particle orb in a small popup window.
 *
 *  NEW IN v2 — SHAPE SELECTOR:
 *    Each orb has its own shape dropdown (footer, above the record button):
 *      • AUTO — continuously transforms through the ORB_SHAPES cycle, with
 *        your voice driving the morph clock (unchanged v1 behaviour).
 *      • Any single shape (all 17 from the library) — the orb morphs into it
 *        once and then HOLDS it, still fully voice-reactive (breathing,
 *        jitter, wander, glow all keep responding to the mic).
 *    Switching selection NEVER pops: the current on-screen blend is baked
 *    into a scratch buffer and used as the morph source, so even switching
 *    mid-transition glides smoothly into the new target. Since the two orbs
 *    are separate instances, blue and orange each keep their own selection.
 *
 *  NEW IN v2.1:
 *    • EDITABLE TITLE — pass a `title` prop and/or click the header text and
 *      type; each orb keeps its own name.
 *    • NOISE GATE — the mic must open a gate before it affects the orb AT
 *      ALL: the signal has to beat a slowly-tracked noise floor by
 *      GATE_RATIO× AND clear an absolute GATE_ABS threshold (with
 *      hysteresis). Fans, coil whine, machine hum, and quiet chatter read
 *      as silence — the orb sits calm until you speak genuinely loud.
 *      Loudness is then normalized against a peak tracked ONLY while the
 *      gate is open, so it calibrates to your loud voice, not the room.
 *      Tune GATE_ABS / GATE_RATIO below if your environment differs.
 *  • "Predictably unpredictable": all wander comes from layered sines at
 *    IRRATIONAL frequency ratios — deterministic code, never-repeating sum.
 *  • orange = low-cortisol chill; blue = same organism, more erratic.
 *  • RECORD (bottom) captures the popup screen (the canvas) via
 *    canvas.captureStream() → MediaRecorder, video only, no audio;
 *    stopping auto-downloads a .webm. CLOSE (top right) tears everything
 *    down; an in-flight recording still saves.
 *
 * No mic permission? The orb idles with ambient breathing and shows a note.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { sampleShape, SHAPE_NAMES } from '@/particles/shapes'
import type { ShapeName } from '@/particles/shapes'

type Variant = 'blue' | 'orange'
type ShapeMode = 'auto' | ShapeName

interface Props {
    variant: Variant
    onClose: () => void
    /** px from the right edge — lets two orbs sit side by side */
    offsetRight?: number
    /** optional starting selection; defaults to 'auto' */
    initialShape?: ShapeMode
    /** popup title — also editable inline by clicking the header text */
    title?: string
}

// ── Motion + palette per variant ──────────────────────────────────────────────
const VARIANTS: Record<Variant, {
    label: string
    colors: string[]
    far: string
    glow: string          // "r,g,b" for the bloom
    accent: string
    noiseAmp: number      // wander amplitude multiplier
    noiseSpeed: number    // wander frequency multiplier
    jitter: number        // per-particle radial shimmer
    breathe: number       // idle scale breathing depth
}> = {
    orange: {
        label: 'ORANGE',
        colors: ['#FF6B2B', '#FFA35C', '#FFB347', '#FF8C55', '#F2E9DC'],
        far: '#1A0A04',
        glow: '255,107,43',
        accent: '#FF8C55',
        // low-cortisol chill — everything slow and shallow
        noiseAmp: 1.0,
        noiseSpeed: 1.0,
        jitter: 0.020,
        breathe: 0.030,
    },
    blue: {
        label: 'BLUE',
        colors: ['#4DA6FF', '#61DAFF', '#1BCAFF', '#C8E8FF', '#7C9FFF'],
        far: '#04101F',
        glow: '77,166,255',
        accent: '#61DAFF',
        // same organism, a bit more erratic
        noiseAmp: 1.75,
        noiseSpeed: 1.9,
        jitter: 0.055,
        breathe: 0.048,
    },
}

// Shapes AUTO mode cycles through (curated for the small canvas).
// The dropdown offers ALL of SHAPE_NAMES, so any shape can be locked.
const ORB_SHAPES: ShapeName[] = [
    'icosphere', 'superEllipsoid', 'roseCurve', 'trefoil', 'torusKnot', 'lissajous',
]

const TAU = Math.PI * 2
const N = 720            // particles — small canvas, keep it feather-light
const SIZE = 300         // canvas css px (square)
const DEPTH_B = 10       // depth-batched fill styles (1 fillStyle per bucket)
const HOLD = 3.4         // morph-clock units held per shape in AUTO mode
const MORPH = 1.15       // morph-clock units per transition

// ── Noise gate — makes the orb ignore room / machine noise ────────────────────
// The gate must OPEN before the mic affects the orb at all. RAISE these if it
// still reacts to your environment; lower them if you have to shout too hard.
const GATE_ABS = 0.09    // absolute open threshold (0..1 of full-scale energy)
const GATE_RATIO = 3.0   // signal must ALSO exceed the tracked noise floor by this ×
const GATE_CLOSE = 0.7   // hysteresis: gate closes at open-threshold × this

function hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace('#', '').padEnd(6, '0')
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Layered sines at irrational frequency ratios: deterministic, never repeats. */
function wander(t: number, seed: number): number {
    return Math.sin(t * 0.61 + seed) * 0.5
        + Math.sin(t * 1.73 + seed * 2.09) * 0.3
        + Math.sin(t * 4.31 + seed * 0.47) * 0.2
}

/** 'torusKnot' → 'Torus Knot' for the dropdown labels. */
function prettyShape(name: ShapeName): string {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()
}

export default function VoiceOrb({
    variant, onClose, offsetRight = 24, initialShape = 'auto', title: titleProp,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const micStreamRef = useRef<MediaStream | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const recRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef(0)

    const [micState, setMicState] = useState<'pending' | 'live' | 'denied'>('pending')
    const [recording, setRecording] = useState(false)
    const [recSecs, setRecSecs] = useState(0)

    // Shape selection — state for the dropdown, ref for the rAF loop
    // (the engine reads the ref every frame; no remount on change).
    const [shapeMode, setShapeMode] = useState<ShapeMode>(initialShape)
    const shapeModeRef = useRef<ShapeMode>(initialShape)
    useEffect(() => { shapeModeRef.current = shapeMode }, [shapeMode])

    // Title — seeded from the prop, editable inline in the header
    const [title, setTitle] = useState(titleProp ?? `Voice orb · ${VARIANTS[variant].label}`)

    const V = VARIANTS[variant]

    // ── Mic: getUserMedia → AnalyserNode (never routed to speakers) ────────────
    useEffect(() => {
        let cancelled = false
        navigator.mediaDevices
            // noiseSuppression ON: the browser strips steady machine hum before we
            // even see it; autoGainControl OFF so our own gate stays meaningful.
            .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
            .then(stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
                micStreamRef.current = stream
                const actx = new AudioContext()
                const src = actx.createMediaStreamSource(stream)
                const anal = actx.createAnalyser()
                anal.fftSize = 512
                anal.smoothingTimeConstant = 0.55
                src.connect(anal)                    // analysis only — no feedback loop
                audioCtxRef.current = actx
                analyserRef.current = anal
                setMicState('live')
            })
            .catch(() => setMicState('denied'))
        return () => {
            cancelled = true
            analyserRef.current = null
            micStreamRef.current?.getTracks().forEach(t => t.stop())
            audioCtxRef.current?.close().catch(() => { })
        }
    }, [])

    // ── Engine ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = SIZE * dpr
        canvas.height = SIZE * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        const seed = variant === 'blue' ? 7.31 : 2.17
        const fd = new Uint8Array(256)
        const far = hexToRgb(V.far)

        const colorFor = (name: ShapeName, autoIdx: number, isAuto: boolean): string =>
            isAuto
                ? V.colors[autoIdx % V.colors.length]
                : V.colors[Math.max(SHAPE_NAMES.indexOf(name), 0) % V.colors.length]

        // ── Morph state machine ─────────────────────────────────────────────
        //  phase 'hold'  — showing Apos (st = 0). In AUTO the clock ticks toward
        //                  the next transition; when LOCKED it holds forever.
        //  phase 'morph' — blending Apos → Bpos over MORPH clock units.
        //  beginMorphTo() BAKES the current on-screen blend into a scratch
        //  buffer as the new source, so retargeting mid-morph never pops.
        const startMode = shapeModeRef.current
        const startShape: ShapeName = startMode === 'auto' ? ORB_SHAPES[0] : startMode
        let autoIdx = 0
        let phase: 'hold' | 'morph' = 'hold'
        let phaseT = 0
        let targetName: ShapeName = startShape
        let Apos: Float32Array = sampleShape(startShape, N).positions
        let Bpos: Float32Array = Apos
        let cRgb = hexToRgb(colorFor(startShape, 0, startMode === 'auto'))
        let nRgb = cRgb
        const bake = new Float32Array(N * 3)

        const beginMorphTo = (name: ShapeName, color: string) => {
            // Bake whatever is currently on screen as the new morph source.
            const st0 = phase === 'morph' ? smoothstep(clamp(phaseT / MORPH, 0, 1)) : 0
            const inv0 = 1 - st0
            for (let j = 0; j < N * 3; j++) bake[j] = Apos[j] * inv0 + Bpos[j] * st0
            cRgb = [
                Math.round(lerp(cRgb[0], nRgb[0], st0)),
                Math.round(lerp(cRgb[1], nRgb[1], st0)),
                Math.round(lerp(cRgb[2], nRgb[2], st0)),
            ]
            Apos = bake                      // in-place re-bake later is index-safe
            Bpos = sampleShape(name, N).positions
            nRgb = hexToRgb(color)
            targetName = name
            phase = 'morph'
            phaseT = 0
        }

        // Per-particle buffers (allocated once)
        const px = new Float32Array(N).fill(SIZE / 2)
        const py = new Float32Array(N).fill(SIZE / 2)
        const psz = Float32Array.from({ length: N }, () => 0.5 + Math.random() * 1.1)
        const pph = Float32Array.from({ length: N }, () => Math.random() * TAU)
        const bucket = new Uint8Array(N)

        // Depth style LUT — rebuilt only while the palette actually blends
        const styles = new Array<string>(DEPTH_B)
        let lutKey = -1
        const rebuild = (fg: [number, number, number]) => {
            for (let b = 0; b < DEPTH_B; b++) {
                const tD = (b + 0.5) / DEPTH_B
                const r = Math.round(lerp(far[0], fg[0], tD))
                const g = Math.round(lerp(far[1], fg[1], tD))
                const bl = Math.round(lerp(far[2], fg[2], tD))
                styles[b] = `rgba(${r},${g},${bl},${(0.16 + tD * 0.80).toFixed(3)})`
            }
        }

        // Voice level — noise-gated. `floor` tracks the room/machine hum,
        // `peak` normalizes loudness but only learns while the gate is open,
        // `gateOpen` carries the hysteresis so the gate doesn't flutter.
        let floor = 0.02, peak = 0.15, gateOpen = false, lvl = 0
        let orbit = 0
        let last = performance.now()
        let raf = 0

        const draw = (now: number) => {
            raf = requestAnimationFrame(draw)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            const tS = now * 0.001

            // ── Voice level — noise-gated ────────────────────────────────────────
            const anal = analyserRef.current
            if (anal) {
                anal.getByteFrequencyData(fd)
                let sum = 0
                for (let k = 2; k < 72; k++) sum += fd[k]     // ~80Hz–6kHz: the voice band
                const raw = sum / (70 * 255)

                // Noise floor: adapts to steady hum ONLY while the gate is closed
                // (so your own speech can never teach the floor to ignore you).
                // Rises very slowly toward sustained noise, falls fast when it quiets.
                if (!gateOpen) floor += (raw - floor) * (raw < floor ? 0.06 : 0.003)

                // Gate with hysteresis: opens above max(GATE_ABS, floor×GATE_RATIO),
                // closes a bit lower so it doesn't flutter at the boundary.
                const openAt = Math.max(GATE_ABS, floor * GATE_RATIO)
                const closeAt = openAt * GATE_CLOSE
                if (!gateOpen && raw > openAt) gateOpen = true
                else if (gateOpen && raw < closeAt) gateOpen = false

                if (gateOpen) {
                    // Normalize against a peak learned only while the gate is open —
                    // calibrates to YOUR loud voice, never to the room.
                    peak = Math.max(raw, peak * 0.999, openAt * 1.5)
                    const en = clamp((raw - closeAt) / (peak - closeAt), 0, 1)
                    lvl = en > lvl ? lvl + (en - lvl) * 0.35 : lvl + (en - lvl) * 0.08
                } else {
                    lvl += (0 - lvl) * 0.06                     // gate closed → settle calm
                }
            } else {
                lvl += (0.05 - lvl) * 0.02                    // no mic → ambient idle
            }

            // ── Shape selection + morph clock ────────────────────────────────────
            const mode = shapeModeRef.current
            const clockSpeed = 0.30 + lvl * 2.3             // voice pushes transitions

            if (mode === 'auto') {
                if (phase === 'hold') {
                    phaseT += dt * clockSpeed
                    if (phaseT >= HOLD) {
                        autoIdx++
                        const next = ORB_SHAPES[autoIdx % ORB_SHAPES.length]
                        beginMorphTo(next, colorFor(next, autoIdx, true))
                    }
                }
            } else if (targetName !== mode) {
                // A specific shape is selected and we're not already heading there.
                beginMorphTo(mode, colorFor(mode, autoIdx, false))
            }
            // (locked + phase 'hold' → nothing advances: the shape holds forever)

            if (phase === 'morph') {
                phaseT += dt * clockSpeed
                if (phaseT >= MORPH) {
                    Apos = Bpos                                 // cached arrays, never mutated
                    cRgb = nRgb
                    phase = 'hold'
                    phaseT = 0
                }
            }
            const st = phase === 'morph' ? smoothstep(clamp(phaseT / MORPH, 0, 1)) : 0
            const inv = 1 - st

            const fg: [number, number, number] = [
                Math.round(lerp(cRgb[0], nRgb[0], st)),
                Math.round(lerp(cRgb[1], nRgb[1], st)),
                Math.round(lerp(cRgb[2], nRgb[2], st)),
            ]
            const key = (fg[0] << 16) | (fg[1] << 8) | fg[2]
            if (key !== lutKey) { rebuild(fg); lutKey = key }

            // Background painted IN — so the recorded .webm matches the popup
            ctx.fillStyle = '#070707'
            ctx.fillRect(0, 0, SIZE, SIZE)

            // ── Predictably-unpredictable wander ─────────────────────────────────
            const wT = tS * V.noiseSpeed
            const drive = 0.35 + lvl
            const ox = wander(wT, seed) * 9 * V.noiseAmp * drive
            const oy = wander(wT * 0.83, seed * 1.9) * 7 * V.noiseAmp * drive
            orbit += dt * (0.10 + lvl * 0.55 + wander(wT * 0.5, seed * 3.1) * 0.05 * V.noiseAmp)

            const cx = SIZE / 2 + ox, cy = SIZE / 2 + oy
            const scale = SIZE * 0.30 * (1 + wander(wT * 1.4, seed * 0.7) * V.breathe + lvl * 0.22)
            const rx = Math.sin(orbit * 0.9) * 0.5 + wander(wT * 0.6, seed * 4.3) * 0.12 * V.noiseAmp
            const cosY = Math.cos(orbit), sinY = Math.sin(orbit)
            const cosX = Math.cos(rx), sinX = Math.sin(rx)
            const FOV = 3.0
            const jr = V.jitter * (0.25 + lvl * 1.6)
            const jw = tS * (3 + V.noiseSpeed * 2)

            // Voice-scaled bloom (one gradient per frame — trivial at this size)
            const glowR = scale * 1.7
            const gA = 0.05 + lvl * 0.14
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
            g.addColorStop(0, `rgba(${V.glow},${gA.toFixed(3)})`)
            g.addColorStop(0.5, `rgba(${V.glow},${(gA * 0.35).toFixed(3)})`)
            g.addColorStop(1, `rgba(${V.glow},0)`)
            ctx.fillStyle = g
            ctx.fillRect(0, 0, SIZE, SIZE)

            // ── Fused particle pass ──────────────────────────────────────────────
            for (let i = 0; i < N; i++) {
                const j = i * 3
                // radial voice shimmer — each dot breathes on its own phase
                const jm = 1 + Math.sin(jw + pph[i]) * jr
                let x0: number, y0: number, z0: number
                if (st === 0) { x0 = Apos[j]; y0 = Apos[j + 1]; z0 = Apos[j + 2] }
                else {
                    x0 = Apos[j] * inv + Bpos[j] * st
                    y0 = Apos[j + 1] * inv + Bpos[j + 1] * st
                    z0 = Apos[j + 2] * inv + Bpos[j + 2] * st
                }
                const x = x0 * jm, y = y0 * jm, z = z0 * jm
                const x1 = x * cosY + z * sinY
                const z1 = -x * sinY + z * cosY
                const y2 = y * cosX - z1 * sinX
                const z2 = y * sinX + z1 * cosX
                const d = FOV / (FOV + z2 + 0.0001)
                px[i] += (cx + x1 * scale * d - px[i]) * 0.14
                py[i] += (cy + y2 * scale * d - py[i]) * 0.14
                let b = ((1 - z2) * 0.5 * DEPTH_B) | 0
                if (b < 0) b = 0; else if (b >= DEPTH_B) b = DEPTH_B - 1
                bucket[i] = b
            }
            // One path + one fillStyle per depth bucket
            for (let b = 0; b < DEPTH_B; b++) {
                let any = false
                const persp = 0.6 + ((b + 0.5) / DEPTH_B) * 0.5
                ctx.beginPath()
                for (let i = 0; i < N; i++) {
                    if (bucket[i] !== b) continue
                    const r = psz[i] * persp * (0.8 + lvl * 0.5)
                    if (r < 0.75) ctx.rect(px[i] - r, py[i] - r, r * 2, r * 2)
                    else { ctx.moveTo(px[i] + r, py[i]); ctx.arc(px[i], py[i], r, 0, TAU) }
                    any = true
                }
                if (any) { ctx.fillStyle = styles[b]; ctx.fill() }
            }
        }

        raf = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(raf)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant])

    // ── Screen recording (canvas capture — video only, no audio) ──────────────
    const startRecording = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas || recRef.current) return
        const stream = canvas.captureStream(30)
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                ? 'video/webm;codecs=vp8'
                : 'video/webm'
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 })
        chunksRef.current = []
        rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        rec.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `voice-orb-${variant}-${Date.now()}.webm`
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 4000)
            stream.getTracks().forEach(t => t.stop())
            recRef.current = null
        }
        rec.start(250)
        recRef.current = rec
        setRecording(true)
        setRecSecs(0)
        timerRef.current = window.setInterval(() => setRecSecs(s => s + 1), 1000)
    }, [variant])

    const stopRecording = useCallback(() => {
        clearInterval(timerRef.current)
        setRecording(false)
        if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    }, [])

    // Teardown any in-flight recording on unmount (it still saves)
    useEffect(() => () => {
        clearInterval(timerRef.current)
        if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    }, [])

    const mm = String(Math.floor(recSecs / 60)).padStart(2, '0')
    const ss = String(recSecs % 60).padStart(2, '0')

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: `${offsetRight}px`,
            zIndex: 300,
            width: `${SIZE}px`,
            background: 'rgba(8,8,8,0.97)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #1e1e1e',
            borderRadius: '14px',
            boxShadow: `0 12px 48px rgba(0,0,0,0.7), 0 0 24px rgba(${V.glow},0.10)`,
            overflow: 'hidden',
        }}>
            {/* Header — title + close (top right) */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderBottom: '1px solid #161616',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: V.accent, boxShadow: `0 0 8px rgba(${V.glow},0.8)`,
                    }} />
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        spellCheck={false}
                        aria-label="Orb title — click to rename"
                        title="Click to rename"
                        style={{
                            background: 'none', border: 'none', outline: 'none', padding: 0,
                            margin: 0, width: '200px', cursor: 'text',
                            fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em',
                            color: '#666', textTransform: 'uppercase', fontFamily: 'inherit',
                        }}
                        onFocus={e => (e.currentTarget.style.color = '#c8c8c8')}
                        onBlur={e => (e.currentTarget.style.color = '#666')}
                    />
                </div>
                <button onClick={onClose} title="Close"
                    style={{
                        background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                        color: '#555', display: 'flex', alignItems: 'center', transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f0')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* The screen that gets recorded */}
            <canvas ref={canvasRef} style={{ display: 'block', width: `${SIZE}px`, height: `${SIZE}px` }} />

            {/* Footer — shape selector, record button (bottom), mic state */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '10px 12px 14px', borderTop: '1px solid #161616',
            }}>
                {/* Shape selector — Auto cycles; any shape locks + holds */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={{
                        fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em',
                        color: '#444', textTransform: 'uppercase', flexShrink: 0,
                    }}>
                        Shape
                    </span>
                    <select
                        value={shapeMode}
                        onChange={e => setShapeMode(e.target.value as ShapeMode)}
                        style={{
                            flex: 1,
                            background: '#111',
                            color: shapeMode === 'auto' ? V.accent : '#aaa',
                            border: '1px solid #2a2a2a',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            outline: 'none',
                        }}
                    >
                        <option value="auto">Auto — keep transforming</option>
                        {SHAPE_NAMES.map(name => (
                            <option key={name} value={name}>{prettyShape(name)}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={recording ? stopRecording : startRecording}
                    title={recording ? 'Stop and save recording' : 'Record this screen'}
                    style={{
                        width: '46px', height: '46px', borderRadius: '50%', cursor: 'pointer',
                        background: '#111',
                        border: `2px solid ${recording ? '#f87171' : '#2a2a2a'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'border-color 0.15s, transform 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    {recording
                        ? <span style={{ width: '16px', height: '16px', borderRadius: '3px', background: '#f87171' }} />
                        : <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e05252' }} />}
                </button>
                <span style={{
                    fontSize: '10px', fontVariantNumeric: 'tabular-nums',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                    color: recording ? '#f87171' : micState === 'denied' ? '#8a6a3a' : '#3a3a3a',
                }}>
                    {recording
                        ? `REC ${mm}:${ss}`
                        : micState === 'denied'
                            ? 'mic blocked — idling'
                            : micState === 'pending'
                                ? 'requesting mic…'
                                : 'listening'}
                </span>
            </div>
        </div>
    )
}