/**
 * Voiceorb.tsx - v4
 * src/components/Voiceorb.tsx
 *
 * Voice reactive particle orb in a small popup. Same rendering engine as v3;
 * the keyboard layer underneath it has been rebuilt.
 *
 * ─── WHAT CHANGED FROM v3 ────────────────────────────────────────────────────
 *
 * The control surface is the same idea, with six specific bugs out of it. The
 * full account of each is in orbControls.ts; in short:
 *
 *   - One orb open now simply has the keyboard. Before, keys did nothing until
 *     the pointer had been over the orb at least once.
 *   - Closing the focused orb hands the keyboard to the one underneath instead
 *     of leaving no orb listening.
 *   - An older orb can no longer steal focus back from a newer one when one of
 *     its callbacks happens to change identity.
 *   - Holding a stepping key walks shapes at a readable rate instead of
 *     strobing through all of them in a quarter of a second.
 *   - Shake is a real binding in site.config.ts rather than a hardcoded `case`
 *     plus an `as any` push into the help panel.
 *   - Two actions bound to the same key is now reported in development rather
 *     than silently disabling one of them.
 *
 * And three things that were missing:
 *
 *   - Leaving auto cycle lands on the shape currently on screen, so the orb
 *     does not jump when you take manual control.
 *   - Spin has a speed, adjustable with the bracket keys.
 *   - A random shape key, which is the fastest way to find the one you want out
 *     of twenty-seven.
 *
 * ─── SHAPES ──────────────────────────────────────────────────────────────────
 *
 * Auto cycle walks ORB_SHAPE_CYCLE, which is ordered so consecutive shapes are
 * never two variations on the same thing. Q and E step through every shape in
 * SHAPE_NAMES except the wave, which is a flat band built for the status page
 * background and makes no sense in a sphere.
 *
 * ─── NO MIC? ─────────────────────────────────────────────────────────────────
 *
 * The orb idles with ambient breathing and the footer says so. Everything
 * except voice reactivity still works.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sampleShape, SHAPE_NAMES, SHAPE_LABELS, ORB_SHAPE_CYCLE } from '@/particles/shapes'
import type { ShapeName } from '@/particles/shapes'

import {
    useOrbKeys, visibleBindings, nextOrbId, pushOrb, ORB_GROUP_LABELS,
} from './orb/orbControls'
import type { OrbHandlers, OrbBinding } from './orb/orbControls'
import { ORB_DEFAULT_SWATCH, ORB_MOTION, ORB_SWATCHES, OrbSwatch } from '@/config'
import { ORB_KEYS } from '@/config/site.config.orb'

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

const TAU = Math.PI * 2
const N = 720   // particles, kept light for a small canvas
const BASE = 300   // design width in css px
const DEPTH_B = 10    // depth buckets, one fillStyle each
const HOLD = 3.4   // morph clock units held per shape in auto mode
const MORPH = 1.15  // morph clock units per transition

/** Spin speed steps the bracket keys walk through. 1 is the original rate. */
const SPIN_STEPS = [0.25, 0.5, 1, 1.75, 3] as const

// Noise gate. Raise if the orb still twitches at room noise, lower if you have
// to shout. GATE_ABS is absolute, GATE_RATIO is relative to the tracked floor.
const GATE_ABS = 0.09
const GATE_RATIO = 3.0
const GATE_CLOSE = 0.7

/**
 * Shapes the manual keys walk through.
 *
 * Everything except the wave, which is a flat horizontal band sized for a
 * full-bleed background. In a 300px circle it is a line, and having it in the
 * cycle means two keypresses out of every lap look like the orb broke.
 */
const STEP_SHAPES: ShapeName[] = SHAPE_NAMES.filter(s => s !== 'wave')

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

/**
 * Display name for a shape.
 *
 * Reads SHAPE_LABELS rather than de-camel-casing the identifier, because the
 * generic version produced "Dna Helix" and "Stateless Logo", and a few of the
 * new shapes need a proper name rather than a mangled one.
 */
function shapeLabel(name: ShapeName): string {
    return SHAPE_LABELS[name] ?? name
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
    const orbId = useMemo(() => nextOrbId(), [])

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
    const [spinStep, setSpinStep] = useState(2)      // index into SPIN_STEPS, 1x
    const [micOn, setMicOn] = useState(true)
    const [shake, setShake] = useState(false)

    const shapeModeRef = useRef<ShapeMode>(initialShape)
    const swatchRef = useRef<OrbSwatch>(swatchById(defaultSwatchId))
    const swatchDirty = useRef(false)
    const spinRef = useRef(true)
    // Typed as number rather than left to infer. SPIN_STEPS is `as const`, so
    // SPIN_STEPS[2] has the literal type 1 and the ref would refuse every other
    // step in the list.
    const spinSpeedRef = useRef<number>(SPIN_STEPS[2])
    const micOnRef = useRef(true)
    const shakeRef = useRef(false)
    const sizeRef = useRef(size)

    /**
     * The shape actually on screen right now, written by the render loop.
     *
     * This is what makes leaving auto cycle feel right: the keyboard needs to
     * know what you are looking at, not what the state machine started on. The
     * old version jumped to SHAPE_NAMES[0] whichever shape was up, which read
     * as the orb losing its place.
     */
    const visibleShapeRef = useRef<ShapeName>(
        initialShape === 'auto' ? ORB_SHAPE_CYCLE[0] : initialShape,
    )

    useEffect(() => { shapeModeRef.current = shapeMode }, [shapeMode])
    useEffect(() => { spinRef.current = spin }, [spin])
    useEffect(() => { spinSpeedRef.current = SPIN_STEPS[spinStep] }, [spinStep])
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
        const startShape: ShapeName = startMode === 'auto' ? ORB_SHAPE_CYCLE[0] : startMode
        let autoIdx = 0
        let phase: 'hold' | 'morph' = 'hold'
        let phaseT = 0
        let targetName: ShapeName = startShape
        let Apos: Float32Array = sampleShape(startShape, N).positions
        let Bpos: Float32Array = Apos
        let cRgb = hexToRgb(colorFor(startShape, 0, startMode === 'auto'))
        let nRgb = cRgb
        const bake = new Float32Array(N * 3)

        visibleShapeRef.current = startShape

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
            visibleShapeRef.current = name
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
                        const next = ORB_SHAPE_CYCLE[autoIdx % ORB_SHAPE_CYCLE.length]
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

            // ── Wander and shake ─────────────────────────────────────────────────
            const wT = tS * MOTION.noiseSpeed
            const drive = 0.35 + lvl

            // Only drift the whole shape around if shake is on.
            const shakeMult = shakeRef.current ? 1 : 0
            const ox = wander(wT, seed) * 9 * MOTION.noiseAmp * drive * shakeMult
            const oy = wander(wT * 0.83, seed * 1.9) * 7 * MOTION.noiseAmp * drive * shakeMult

            if (spinRef.current) {
                orbit += dt
                    * (0.10 + lvl * 0.55 + wander(wT * 0.5, seed * 3.1) * 0.05 * MOTION.noiseAmp)
                    * spinSpeedRef.current
            }

            const cx = S / 2 + ox
            const cy = S / 2 + oy
            const scale = S * 0.30 * (1 + wander(wT * 1.4, seed * 0.7) * MOTION.breathe + lvl * 0.22)

            // Shape-level rotation noise is gated by shake too.
            const rx = Math.sin(orbit * 0.9) * 0.5 + wander(wT * 0.6, seed * 4.3) * 0.12 * MOTION.noiseAmp * shakeMult

            const cosY = Math.cos(orbit), sinY = Math.sin(orbit)
            const cosX = Math.cos(rx), sinX = Math.sin(rx)
            const FOV = 3.0

            // Individual particles always jitter, independent of the shake toggle.
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

    /**
     * Step through STEP_SHAPES.
     *
     * Leaving auto continues from the shape on screen rather than jumping to the
     * start of the list. A shape not in STEP_SHAPES, which only happens if the
     * orb was opened with initialShape: 'wave', falls back to index 0 rather
     * than wrapping off the end of the array.
     */
    const stepShape = useCallback((dir: 1 | -1) => {
        setShapeMode(prev => {
            const from = prev === 'auto' ? visibleShapeRef.current : prev
            const i = STEP_SHAPES.indexOf(from)
            const base = i < 0 ? 0 : i
            return STEP_SHAPES[(base + dir + STEP_SHAPES.length) % STEP_SHAPES.length]
        })
    }, [])

    /**
     * Jump somewhere else in the list.
     *
     * Excludes whatever is already showing, so pressing the key always visibly
     * does something. A random pick that can land on the current shape feels
     * broken roughly one time in twenty-seven, which is often enough to notice.
     */
    const randomShape = useCallback(() => {
        setShapeMode(prev => {
            const current = prev === 'auto' ? visibleShapeRef.current : prev
            const pool = STEP_SHAPES.filter(s => s !== current)
            return pool[Math.floor(Math.random() * pool.length)] ?? STEP_SHAPES[0]
        })
    }, [])

    const toggleAuto = useCallback(() => {
        setShapeMode(prev => (prev === 'auto' ? visibleShapeRef.current : 'auto'))
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
        setSpinStep(2)
        setMicOn(true)
        setShake(false)
    }, [defaultSwatchId])

    // ── Keyboard ────────────────────────────────────────────────────────────────
    //
    // One handler per action, keyed by the same names as ORB_KEYS. An action in
    // the config with no handler here is simply not bound, and does not appear
    // in the help panel, so the two can never disagree about what works.
    const handlers: OrbHandlers = useMemo(() => ({
        nextShape: () => stepShape(1),
        prevShape: () => stepShape(-1),
        randomShape,
        toggleAuto,
        toggleSpin: () => setSpin(s => !s),
        spinFaster: () => setSpinStep(s => Math.min(SPIN_STEPS.length - 1, s + 1)),
        spinSlower: () => setSpinStep(s => Math.max(0, s - 1)),
        nextColor: () => stepSwatch(1),
        prevColor: () => stepSwatch(-1),
        toggleShake: () => setShake(s => !s),
        toggleMic: () => setMicOn(m => !m),
        toggleRec: () => { if (recRef.current) stopRecording(); else startRecording() },
        reset: resetAll,
        toggleInfo: () => setInfoOpen(o => !o),
        close: onClose,
    }), [
        stepShape, randomShape, toggleAuto, stepSwatch, resetAll,
        startRecording, stopRecording, onClose,
    ])

    useOrbKeys({ orbId, bindings: ORB_KEYS, handlers })

    /** Pointing at an orb gives it the keyboard, which matters with two open. */
    const claimFocus = useCallback(() => { pushOrb(orbId) }, [orbId])

    const mm = String(Math.floor(recSecs / 60)).padStart(2, '0')
    const ss = String(recSecs % 60).padStart(2, '0')

    const modeLabel = shapeMode === 'auto'
        ? `Auto ${shapeLabel(visibleShapeRef.current)}`
        : shapeLabel(shapeMode)

    // Help panel content, grouped, derived from what is actually wired up.
    const keyGroups = useMemo(() => {
        const rows = visibleBindings(ORB_KEYS, handlers)
        const order: OrbBinding['group'][] = ['shape', 'look', 'audio', 'window']
        return order
            .map(group => ({
                group,
                label: ORB_GROUP_LABELS[group],
                rows: rows.filter(r => r.binding.group === group),
            }))
            .filter(g => g.rows.length > 0)
    }, [handlers])

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
                background: '#0a0a0a',
                border: '1px solid #1c1c1c',
                borderRadius: '14px',
                overflow: 'hidden',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: `0 12px 48px rgba(0,0,0,0.7), 0 0 24px rgba(${swatch.glow},0.10)`,
            }}
        >
            {/* Header: status dot, editable title, info and close */}
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

            {/* Info panel: swatches and keys, both from site.config.ts */}
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
                        {keyGroups.map(group => (
                            <div key={group.group} style={{ marginBottom: '10px' }}>
                                <p
                                    style={{
                                        fontSize: '9px',
                                        fontWeight: 600,
                                        letterSpacing: '0.14em',
                                        textTransform: 'uppercase',
                                        color: '#4a4a4a',
                                        margin: '0 0 7px',
                                    }}
                                >
                                    {group.label}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {group.rows.map(({ action, binding }) => (
                                        <div
                                            key={action}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}
                                        >
                                            <span style={{ fontSize: '10.5px', color: '#6a6a6a', lineHeight: 1.5 }}>
                                                {binding.label}
                                            </span>
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
                                                {binding.display}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <p style={{ fontSize: '9.5px', color: '#3a3a3a', margin: '2px 0 0', lineHeight: 1.6 }}>
                            With one orb open the keys always reach it. With two, they go to
                            whichever one you last pointed at. They are ignored while the title
                            is being edited.
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
                    <span style={{ color: spin ? '#7a7a7a' : '#3a3a3a' }}>
                        {spin ? (spinStep === 2 ? 'Spin' : `Spin ${SPIN_STEPS[spinStep]}x`) : 'Still'}
                    </span>
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