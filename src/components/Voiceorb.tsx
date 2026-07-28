/**
 * Voiceorb.tsx - v3
 * src/components/Voiceorb.tsx
 *
 * Voice reactive particle orb in a small popup. Same engine as v2, but every
 * control moved off the UI and onto the keyboard.
 *
 * WHAT CHANGED FROM v2
 *   - The shape dropdown is gone. Shapes step with Q and E, auto cycle toggles
 *     with C, and everything else has a key too. See orb.config.ts.
 *   - An info button sits next to the title. It opens a panel holding the full
 *     key list and the colour swatches, both read live from site.config.ts.
 *   - Colour is no longer hardcoded per variant. Swatches come from
 *     ORB_SWATCHES in site.config.ts and can be cycled with X and W or clicked in the panel.
 *     The variant now only decides how the orb MOVES, via ORB_MOTION.
 *   - Popup width adapts to the viewport, so it behaves on a phone.
 *
 * KEYS ONLY REACH THE ACTIVE ORB
 *   With two orbs open, keys go to whichever one the pointer is over, falling
 *   back to the last one clicked. Keys are ignored entirely while the title
 *   field has focus, so renaming an orb to "zebra" will not spin it.
 *
 * NO MIC?
 *   The orb idles with ambient breathing and the footer says so. Everything
 *   except voice reactivity still works.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sampleShape, SHAPE_NAMES } from '@/particles/shapes'
import type { ShapeName } from '@/particles/shapes'
import {
    ORB_SWATCHES,
    ORB_DEFAULT_SWATCH,
    ORB_MOTION,
    ORB_KEYS,
    ORB_KEY_LIST,
} from '@/config'
import type { OrbSwatch } from '@/config'

type Variant = 'blue' | 'orange'
type ShapeMode = 'auto' | ShapeName

interface Props {
    variant: Variant
    onClose: () => void
    /** px from the right edge, so two orbs can sit side by side */
    offsetRight?: number
    initialShape?: ShapeMode
    title?: string
}

// ── Which orb the keyboard is talking to ──────────────────────────────────────
// Module scope on purpose: it is shared across every mounted orb.
let ACTIVE_ORB: number | null = null
let ORB_SEQ = 0

// Shapes the auto cycle walks through. The keys can reach all of SHAPE_NAMES.
const ORB_SHAPES: ShapeName[] = [
    'icosphere', 'superEllipsoid', 'roseCurve', 'trefoil', 'torusKnot', 'lissajous',
]

const TAU = Math.PI * 2
const N = 720   // particles, kept light for a small canvas
const BASE = 300   // design width in css px
const DEPTH_B = 10    // depth buckets, one fillStyle each
const HOLD = 3.4   // morph clock units held per shape in auto mode
const MORPH = 1.15  // morph clock units per transition

// Noise gate. Raise if the orb still twitches at room noise, lower if you have
// to shout. GATE_ABS is absolute, GATE_RATIO is relative to the tracked floor.
const GATE_ABS = 0.09
const GATE_RATIO = 3.0
const GATE_CLOSE = 0.7

function hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace('#', '').padEnd(6, '0')
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Layered sines at irrational ratios: deterministic, never actually repeats. */
function wander(t: number, seed: number): number {
    return Math.sin(t * 0.61 + seed) * 0.5
        + Math.sin(t * 1.73 + seed * 2.09) * 0.3
        + Math.sin(t * 4.31 + seed * 0.47) * 0.2
}

/** 'torusKnot' becomes 'Torus Knot' for display. */
function prettyShape(name: string): string {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim()
}

function swatchById(id: string): OrbSwatch {
    return ORB_SWATCHES.find(s => s.id === id) ?? ORB_SWATCHES[0]
}

/** Popup width: 300 on desktop, viewport minus gutters on small screens. */
function computeSize(): number {
    if (typeof window === 'undefined') return BASE
    return Math.max(210, Math.min(BASE, window.innerWidth - 48))
}

export default function VoiceOrb({
    variant, onClose, offsetRight = 24, initialShape = 'auto', title: titleProp,
}: Props) {
    const orbId = useMemo(() => ++ORB_SEQ, [])

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const micStreamRef = useRef<MediaStream | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const recRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef(0)

    const [micState, setMicState] = useState<'pending' | 'live' | 'denied'>('pending')
    const [recording, setRecording] = useState(false)
    const [recSecs, setRecSecs] = useState(0)
    const [size, setSize] = useState(computeSize)
    const [infoOpen, setInfoOpen] = useState(false)

    // State drives the UI, refs feed the render loop with no remount.
    const defaultSwatchId = ORB_DEFAULT_SWATCH[variant] ?? ORB_SWATCHES[0].id
    const [shapeMode, setShapeMode] = useState<ShapeMode>(initialShape)
    const [swatchId, setSwatchId] = useState<string>(defaultSwatchId)
    const [spin, setSpin] = useState(true)
    const [micOn, setMicOn] = useState(true)
    const [shake, setShake] = useState(false) // Default to not shaking

    const shapeModeRef = useRef<ShapeMode>(initialShape)
    const swatchRef = useRef<OrbSwatch>(swatchById(defaultSwatchId))
    const swatchDirty = useRef(false)
    const spinRef = useRef(true)
    const micOnRef = useRef(true)
    const shakeRef = useRef(false)
    const sizeRef = useRef(size)

    useEffect(() => { shapeModeRef.current = shapeMode }, [shapeMode])
    useEffect(() => { spinRef.current = spin }, [spin])
    useEffect(() => { micOnRef.current = micOn }, [micOn])
    useEffect(() => { shakeRef.current = shake }, [shake])
    useEffect(() => { sizeRef.current = size }, [size])
    useEffect(() => {
        swatchRef.current = swatchById(swatchId)
        swatchDirty.current = true
    }, [swatchId])

    const swatch = swatchById(swatchId)
    const MOTION = ORB_MOTION[variant]

    const [title, setTitle] = useState(
        titleProp ?? `Voice orb ${variant === 'blue' ? 'blue' : 'orange'}`,
    )

    // ── Responsive width ────────────────────────────────────────────────────────
    useEffect(() => {
        const onResize = () => setSize(computeSize())
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    // ── Mic: getUserMedia to an AnalyserNode, never routed to speakers ──────────
    useEffect(() => {
        let cancelled = false
        navigator.mediaDevices
            .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
            .then(stream => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
                micStreamRef.current = stream
                const actx = new AudioContext()
                const src = actx.createMediaStreamSource(stream)
                const anal = actx.createAnalyser()
                anal.fftSize = 512
                anal.smoothingTimeConstant = 0.55
                src.connect(anal)
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

    // ── Canvas sizing, kept out of the engine so resizing never resets it ───────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = size * dpr
        canvas.height = size * dpr
        canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }, [size])

    // ── Engine ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!

        const seed = variant === 'blue' ? 7.31 : 2.17
        const fd = new Uint8Array(256)

        // Cache the far tone so we only parse hex when the swatch actually changes.
        let farKey = ''
        let far: [number, number, number] = [0, 0, 0]

        const colorFor = (name: ShapeName, autoIdx: number, isAuto: boolean): string => {
            const cols = swatchRef.current.colors
            return isAuto
                ? cols[autoIdx % cols.length]
                : cols[Math.max(SHAPE_NAMES.indexOf(name), 0) % cols.length]
        }

        // Morph state machine. beginMorphTo bakes the current on screen blend into
        // a scratch buffer first, so retargeting mid transition never pops.
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
            const st0 = phase === 'morph' ? smoothstep(clamp(phaseT / MORPH, 0, 1)) : 0
            const inv0 = 1 - st0
            for (let j = 0; j < N * 3; j++) bake[j] = Apos[j] * inv0 + Bpos[j] * st0
            cRgb = [
                Math.round(lerp(cRgb[0], nRgb[0], st0)),
                Math.round(lerp(cRgb[1], nRgb[1], st0)),
                Math.round(lerp(cRgb[2], nRgb[2], st0)),
            ]
            Apos = bake
            Bpos = sampleShape(name, N).positions
            nRgb = hexToRgb(color)
            targetName = name
            phase = 'morph'
            phaseT = 0
        }

        const px = new Float32Array(N).fill(sizeRef.current / 2)
        const py = new Float32Array(N).fill(sizeRef.current / 2)
        const psz = Float32Array.from({ length: N }, () => 0.5 + Math.random() * 1.1)
        const pph = Float32Array.from({ length: N }, () => Math.random() * TAU)
        const bucket = new Uint8Array(N)

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

        let floor = 0.02, peak = 0.15, gateOpen = false, lvl = 0
        let orbit = 0
        let last = performance.now()
        let raf = 0

        const draw = (now: number) => {
            raf = requestAnimationFrame(draw)
            const dt = Math.min((now - last) / 1000, 0.05)
            last = now
            const tS = now * 0.001

            const SW = swatchRef.current
            const S = sizeRef.current

            // Swatch changed: refresh the depth palette and glide the colour over.
            if (SW.far !== farKey) { farKey = SW.far; far = hexToRgb(SW.far); lutKey = -1 }
            if (swatchDirty.current) {
                swatchDirty.current = false
                beginMorphTo(targetName, colorFor(targetName, autoIdx, shapeModeRef.current === 'auto'))
                lutKey = -1
            }

            // ── Voice level, noise gated ─────────────────────────────────────────
            const anal = micOnRef.current ? analyserRef.current : null
            if (anal) {
                anal.getByteFrequencyData(fd)
                let sum = 0
                for (let k = 2; k < 72; k++) sum += fd[k]   // roughly 80Hz to 6kHz
                const raw = sum / (70 * 255)

                if (!gateOpen) floor += (raw - floor) * (raw < floor ? 0.06 : 0.003)

                const openAt = Math.max(GATE_ABS, floor * GATE_RATIO)
                const closeAt = openAt * GATE_CLOSE
                if (!gateOpen && raw > openAt) gateOpen = true
                else if (gateOpen && raw < closeAt) gateOpen = false

                if (gateOpen) {
                    peak = Math.max(raw, peak * 0.999, openAt * 1.5)
                    const en = clamp((raw - closeAt) / (peak - closeAt), 0, 1)
                    lvl = en > lvl ? lvl + (en - lvl) * 0.35 : lvl + (en - lvl) * 0.08
                } else {
                    lvl += (0 - lvl) * 0.06
                }
            } else {
                lvl += (0.05 - lvl) * 0.02   // mic off or denied, ambient idle
            }

            // ── Shape selection and morph clock ──────────────────────────────────
            const mode = shapeModeRef.current
            const clockSpeed = 0.30 + lvl * 2.3

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
                beginMorphTo(mode, colorFor(mode, autoIdx, false))
            }

            if (phase === 'morph') {
                phaseT += dt * clockSpeed
                if (phaseT >= MORPH) {
                    Apos = Bpos
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

            // Background painted in, so a recording matches what you see.
            ctx.fillStyle = '#070707'
            ctx.fillRect(0, 0, S, S)

            // ── Wander and Shake ─────────────────────────────────────────────────
            const wT = tS * MOTION.noiseSpeed
            const drive = 0.35 + lvl

            // Only drift the entire shape randomly if shake is enabled
            const shakeMult = shakeRef.current ? 1 : 0
            const ox = wander(wT, seed) * 9 * MOTION.noiseAmp * drive * shakeMult
            const oy = wander(wT * 0.83, seed * 1.9) * 7 * MOTION.noiseAmp * drive * shakeMult

            if (spinRef.current) {
                orbit += dt * (0.10 + lvl * 0.55 + wander(wT * 0.5, seed * 3.1) * 0.05 * MOTION.noiseAmp)
            }

            const cx = S / 2 + ox
            const cy = S / 2 + oy
            const scale = S * 0.30 * (1 + wander(wT * 1.4, seed * 0.7) * MOTION.breathe + lvl * 0.22)

            // Limit violent shape-level rotation noise based on shake toggle
            const rx = Math.sin(orbit * 0.9) * 0.5 + wander(wT * 0.6, seed * 4.3) * 0.12 * MOTION.noiseAmp * shakeMult

            const cosY = Math.cos(orbit), sinY = Math.sin(orbit)
            const cosX = Math.cos(rx), sinX = Math.sin(rx)
            const FOV = 3.0

            // Individual particles ALWAYS jitter, completely independent of the shape shake toggle
            const jr = MOTION.jitter * (0.25 + lvl * 1.6)
            const jw = tS * (3 + MOTION.noiseSpeed * 2)

            const glowR = scale * 1.7
            const gA = 0.05 + lvl * 0.14
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
            g.addColorStop(0, `rgba(${SW.glow},${gA.toFixed(3)})`)
            g.addColorStop(0.5, `rgba(${SW.glow},${(gA * 0.35).toFixed(3)})`)
            g.addColorStop(1, `rgba(${SW.glow},0)`)
            ctx.fillStyle = g
            ctx.fillRect(0, 0, S, S)

            // ── Particle pass ────────────────────────────────────────────────────
            for (let i = 0; i < N; i++) {
                const j = i * 3
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

    // ── Recording ───────────────────────────────────────────────────────────────
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

    useEffect(() => () => {
        clearInterval(timerRef.current)
        if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    }, [])

    // ── Shape and colour stepping ───────────────────────────────────────────────
    const stepShape = useCallback((dir: 1 | -1) => {
        setShapeMode(prev => {
            const list = SHAPE_NAMES as readonly ShapeName[]
            if (prev === 'auto') {
                // Leaving auto: land on the first or last shape depending on direction.
                return dir === 1 ? list[0] : list[list.length - 1]
            }
            const i = list.indexOf(prev)
            const n = (i + dir + list.length) % list.length
            return list[n]
        })
    }, [])

    const stepSwatch = useCallback((dir: 1 | -1) => {
        setSwatchId(prev => {
            const i = ORB_SWATCHES.findIndex(s => s.id === prev)
            const n = (i + dir + ORB_SWATCHES.length) % ORB_SWATCHES.length
            return ORB_SWATCHES[n].id
        })
    }, [])

    const resetAll = useCallback(() => {
        setShapeMode('auto')
        setSwatchId(defaultSwatchId)
        setSpin(true)
        setMicOn(true)
        setShake(false)
    }, [defaultSwatchId])

    // ── Keyboard ────────────────────────────────────────────────────────────────
    useEffect(() => {
        // Newest orb takes focus on mount so keys work without moving the mouse.
        ACTIVE_ORB = orbId

        const onKey = (e: KeyboardEvent) => {
            if (ACTIVE_ORB !== orbId) return
            if (e.metaKey || e.ctrlKey || e.altKey) return

            // Never steal keys from a text field.
            const t = e.target as HTMLElement | null
            if (t) {
                const tag = t.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return
            }

            const k = e.key.toLowerCase()
            let handled = true

            switch (k) {
                case ORB_KEYS.nextShape.key: stepShape(1); break
                case ORB_KEYS.prevShape.key: stepShape(-1); break
                case ORB_KEYS.toggleAuto.key: setShapeMode(p => (p === 'auto' ? (SHAPE_NAMES[0] as ShapeName) : 'auto')); break
                case ORB_KEYS.toggleSpin.key: setSpin(s => !s); break
                case ORB_KEYS.nextColor.key: stepSwatch(1); break
                case ORB_KEYS.prevColor.key: stepSwatch(-1); break
                case ORB_KEYS.toggleMic.key: setMicOn(m => !m); break
                case 'j': setShake(s => !s); break // Fallback key 'j' injected for Shake Toggle
                case ORB_KEYS.toggleRec.key:
                    if (recRef.current) stopRecording(); else startRecording()
                    break
                case ORB_KEYS.reset.key: resetAll(); break
                case ORB_KEYS.toggleInfo.key: setInfoOpen(o => !o); break
                case ORB_KEYS.close.key: onClose(); break
                default: handled = false
            }

            if (handled) e.preventDefault()
        }

        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            if (ACTIVE_ORB === orbId) ACTIVE_ORB = null
        }
    }, [orbId, stepShape, stepSwatch, resetAll, startRecording, stopRecording, onClose])

    const claimFocus = useCallback(() => { ACTIVE_ORB = orbId }, [orbId])

    const mm = String(Math.floor(recSecs / 60)).padStart(2, '0')
    const ss = String(recSecs % 60).padStart(2, '0')

    const modeLabel = shapeMode === 'auto' ? 'Auto' : prettyShape(shapeMode)

    // Inject custom key for shake into display keys safely if not in external config yet
    const displayKeys = [...ORB_KEY_LIST]
    if (!displayKeys.some(k => k.key === 'j')) {
        displayKeys.push({ key: 'j', label: 'Toggle shake', display: 'J' } as any)
    }

    return (
        <div
            ref={rootRef}
            onMouseEnter={claimFocus}
            onPointerDown={claimFocus}
            style={{
                position: 'fixed',
                bottom: '24px',
                right: `${offsetRight}px`,
                zIndex: 300,
                width: `${size}px`,
                maxWidth: 'calc(100vw - 32px)',
                background: 'rgba(8,8,8,0.97)',
                backdropFilter: 'blur(16px)',
                border: '1px solid #1e1e1e',
                borderRadius: '14px',
                boxShadow: `0 12px 48px rgba(0,0,0,0.7), 0 0 24px rgba(${swatch.glow},0.10)`,
                overflow: 'hidden',
            }}
        >
            {/* Header: dot, editable title, info, close */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    padding: '10px 10px 10px 12px',
                    borderBottom: '1px solid #161616',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <span
                        style={{
                            width: '7px',
                            height: '7px',
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: swatch.accent,
                            boxShadow: `0 0 8px rgba(${swatch.glow},0.8)`,
                        }}
                    />
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        spellCheck={false}
                        aria-label="Orb title, click to rename"
                        title="Click to rename"
                        style={{
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            minWidth: 0,
                            flex: 1,
                            cursor: 'text',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.13em',
                            color: '#666',
                            textTransform: 'uppercase',
                            fontFamily: 'inherit',
                        }}
                        onFocus={e => (e.currentTarget.style.color = '#c8c8c8')}
                        onBlur={e => (e.currentTarget.style.color = '#666')}
                    />
                </div>

                <button
                    onClick={() => setInfoOpen(o => !o)}
                    title="Controls and colours"
                    aria-label="Controls and colours"
                    aria-expanded={infoOpen}
                    style={{
                        width: '20px',
                        height: '20px',
                        flexShrink: 0,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: infoOpen ? `rgba(${swatch.glow},0.16)` : 'transparent',
                        border: `1px solid ${infoOpen ? swatch.accent : '#2a2a2a'}`,
                        color: infoOpen ? swatch.accent : '#666',
                        fontSize: '10px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono, monospace)',
                        lineHeight: 1,
                        transition: 'color 0.12s, border-color 0.12s, background 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = swatch.accent; e.currentTarget.style.borderColor = swatch.accent }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = infoOpen ? swatch.accent : '#666'
                        e.currentTarget.style.borderColor = infoOpen ? swatch.accent : '#2a2a2a'
                    }}
                >
                    i
                </button>

                <button
                    onClick={onClose}
                    title="Close"
                    aria-label="Close"
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        color: '#555',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f0')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Info panel: keys and swatches, both from orb.config.ts */}
            {infoOpen && (
                <div style={{ borderBottom: '1px solid #161616', background: 'rgba(255,255,255,0.015)' }}>
                    <div style={{ padding: '12px 12px 10px' }}>
                        <p
                            style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: '#4a4a4a',
                                margin: '0 0 9px',
                            }}
                        >
                            Colour
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {ORB_SWATCHES.map(s => {
                                const active = s.id === swatchId
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setSwatchId(s.id)}
                                        title={s.label}
                                        aria-label={s.label}
                                        aria-pressed={active}
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            padding: 0,
                                            background: `linear-gradient(135deg, ${s.colors[0]}, ${s.colors[2] ?? s.colors[1]})`,
                                            border: `2px solid ${active ? '#f0f0f0' : 'transparent'}`,
                                            boxShadow: active ? `0 0 9px rgba(${s.glow},0.7)` : 'none',
                                            transition: 'transform 0.12s, box-shadow 0.12s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.14)')}
                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ padding: '2px 12px 12px' }}>
                        <p
                            style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: '#4a4a4a',
                                margin: '0 0 8px',
                            }}
                        >
                            Keys
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {displayKeys.map(b => (
                                <div
                                    key={b.key}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}
                                >
                                    <span style={{ fontSize: '10.5px', color: '#6a6a6a', lineHeight: 1.5 }}>{b.label}</span>
                                    <kbd
                                        style={{
                                            flexShrink: 0,
                                            minWidth: '18px',
                                            textAlign: 'center',
                                            fontFamily: 'var(--font-mono, monospace)',
                                            fontSize: '9.5px',
                                            color: '#9a9a9a',
                                            background: '#141414',
                                            border: '1px solid #262626',
                                            borderRadius: '3px',
                                            padding: '2px 5px',
                                            letterSpacing: '0.04em',
                                        }}
                                    >
                                        {b.display}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '9.5px', color: '#3a3a3a', margin: '10px 0 0', lineHeight: 1.6 }}>
                            Keys go to the orb your pointer is over. They are ignored while the title is being edited.
                        </p>
                    </div>
                </div>
            )}

            {/* The surface that gets recorded */}
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: `${size}px`, height: `${size}px` }}
            />

            {/* Footer: live state readout plus the record button */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px 14px',
                    borderTop: '1px solid #161616',
                }}
            >
                {/* Read only status strip. Every value here is changed by a key. */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                        width: '100%',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '9px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                    }}
                >
                    <span style={{ color: shapeMode === 'auto' ? swatch.accent : '#7a7a7a' }}>{modeLabel}</span>
                    <span style={{ color: '#242424' }}>/</span>
                    <span style={{ color: spin ? '#7a7a7a' : '#3a3a3a' }}>{spin ? 'Spin' : 'Still'}</span>
                    <span style={{ color: '#242424' }}>/</span>
                    <span style={{ color: shake ? '#7a7a7a' : '#3a3a3a' }}>{shake ? 'Shake' : 'Smooth'}</span>
                    <span style={{ color: '#242424' }}>/</span>
                    <span style={{ color: micOn && micState === 'live' ? '#7a7a7a' : '#3a3a3a' }}>
                        {micState === 'denied' ? 'No mic' : micOn ? 'Mic on' : 'Mic off'}
                    </span>
                </div>

                <button
                    onClick={recording ? stopRecording : startRecording}
                    title={recording ? 'Stop and save recording' : 'Record this screen'}
                    aria-label={recording ? 'Stop and save recording' : 'Record this screen'}
                    style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        background: '#111',
                        border: `2px solid ${recording ? '#f87171' : '#2a2a2a'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 0.15s, transform 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    {recording
                        ? <span style={{ width: '16px', height: '16px', borderRadius: '3px', background: '#f87171' }} />
                        : <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e05252' }} />}
                </button>

                <span
                    style={{
                        fontSize: '10px',
                        fontVariantNumeric: 'tabular-nums',
                        fontFamily: 'var(--font-mono, monospace)',
                        letterSpacing: '0.06em',
                        color: recording ? '#f87171' : micState === 'denied' ? '#8a6a3a' : '#3a3a3a',
                    }}
                >
                    {recording
                        ? `REC ${mm}:${ss}`
                        : micState === 'denied'
                            ? 'mic blocked, idling'
                            : micState === 'pending'
                                ? 'requesting mic'
                                : 'press I for controls'}
                </span>
            </div>
        </div>
    )
}