import { useCallback, useEffect, useRef, useState } from 'react'
import { initStrudel } from '@strudel/web'
import { RARE_INTRO, buildPatternString, cycleSeconds, DEFAULT_CPS, slotSlowFactor } from './StrudelChords'
import { toMidi, midiToY, cycleFractionToX } from './NoteMath'

/**
 * Same deal as useBackgroundChords.ts: @strudel/web attaches its API to the
 * global scope once initStrudel() resolves. Declared again here so this file
 * type-checks on its own — TS ambient declarations merge safely if both are
 * present in the same project.
 */
declare global {
    interface Window {
        chord: (input: string) => StrudelPattern
        hush: () => void
        getAudioContext?: () => AudioContext
    }
}

interface Hap {
    whole: { begin: number | { valueOf(): number } } | null
    value: { note?: string | number } | string | number
}

interface StrudelPattern {
    dict: (name: string) => StrudelPattern
    voicing: () => StrudelPattern
    s: (instrument: string) => StrudelPattern
    gain: (n: number) => StrudelPattern
    room: (n: number) => StrudelPattern
    slow: (n: number) => StrudelPattern
    play: () => void
    queryArc: (begin: number, end: number) => Hap[]
}

interface Particle {
    midi: number
    x: number
    yBase: number
    bornAt: number
    lifeMs: number
}

const MIN_MIDI = 48 // C3 — bottom of the visual range
const MAX_MIDI = 84 // C6 — top of the visual range
const PARTICLE_LIFE_MS = 2200
const DRIFT_PX = 26 // how far a particle gently rises over its life

export interface NoteFieldProps {
    style?: React.CSSProperties
    className?: string
    /** If set, attempts to start playback this many ms after mount. Browsers
     *  can still block this with no preceding click — see `audioBlocked` below,
     *  which flips true so the UI can fall back to an explicit prompt. */
    autoPlayDelayMs?: number
}

export default function NoteField({ style, className, autoPlayDelayMs }: NoteFieldProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const particlesRef = useRef<Particle[]>([])
    const patternRef = useRef<StrudelPattern | null>(null)
    const startTimeRef = useRef<number | null>(null)
    const lastCycleRef = useRef(0)
    const tickRafRef = useRef<number | null>(null)
    const drawRafRef = useRef<number | null>(null)
    const autoPlayArmedRef = useRef(false) // "the 1.2s timer has fired, waiting on isReady if needed"

    const [isPlaying, setIsPlaying] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [audioBlocked, setAudioBlocked] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const audioNow = useCallback((): number => {
        return window.getAudioContext ? window.getAudioContext().currentTime : performance.now() / 1000
    }, [])

    // Doesn't touch Strudel at all — @strudel/web may not actually expose
    // getAudioContext as a global (same category of gap as the setcpm one),
    // so this checks the browser's real autoplay gate directly instead:
    // any AudioContext on the page starts "suspended" without a qualifying
    // user gesture, and that's governed page-wide, not per-instance.
    const isAudioLikelyBlocked = useCallback((): boolean => {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return false // can't check — assume it's fine rather than block unnecessarily
        try {
            const probe = new Ctor()
            const blocked = probe.state === 'suspended'
            probe.close?.()
            return blocked
        } catch {
            return false
        }
    }, [])

    // Boot the audio engine once, eagerly — same pattern the strudel docs use:
    // init on load, actual sound only ever starts from the click handler below.
    useEffect(() => {
        let cancelled = false
        Promise.resolve()
            .then(() => initStrudel())
            .then(() => {
                if (!cancelled) setIsReady(true)
            })
            .catch((err: unknown) => {
                console.error('Strudel failed to initialize:', err)
                if (!cancelled) setError('Audio engine failed to load.')
            })
        return () => {
            cancelled = true
        }
    }, [])

    // Canvas sizing, DPR-aware so it stays crisp on retina displays.
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return
        const dpr = window.devicePixelRatio || 1
        const rect = container.getBoundingClientRect()
        canvas.width = Math.max(1, Math.round(rect.width * dpr))
        canvas.height = Math.max(1, Math.round(rect.height * dpr))
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        const ctx = canvas.getContext('2d')
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }, [])

    useEffect(() => {
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)
        return () => window.removeEventListener('resize', resizeCanvas)
    }, [resizeCanvas])

    const draw = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return
        const dpr = window.devicePixelRatio || 1
        const width = canvas.width / dpr
        const height = canvas.height / dpr

        ctx.clearRect(0, 0, width, height)

        const now = performance.now()
        particlesRef.current = particlesRef.current.filter((p) => now - p.bornAt < p.lifeMs)

        for (const p of particlesRef.current) {
            const age = now - p.bornAt
            const t = age / p.lifeMs // 0 -> 1 over its life
            // fade in over the first 12%, fade out over the rest
            const alpha = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88
            const y = p.yBase - DRIFT_PX * t
            const radius = 3 + 5 * Math.min(1, t * 2)

            const gradient = ctx.createRadialGradient(p.x, y, 0, p.x, y, radius * 4)
            gradient.addColorStop(0, `rgba(240, 240, 240, ${0.5 * alpha})`)
            gradient.addColorStop(1, 'rgba(240, 240, 240, 0)')
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(p.x, y, radius * 4, 0, Math.PI * 2)
            ctx.fill()
        }

        drawRafRef.current = requestAnimationFrame(draw)
    }, [])

    const tick = useCallback(() => {
        const canvas = canvasRef.current
        const pattern = patternRef.current
        if (!canvas || !pattern || startTimeRef.current == null) return

        const dpr = window.devicePixelRatio || 1
        const width = canvas.width / dpr
        const height = canvas.height / dpr

        // The scheduler itself never leaves Strudel's default 0.5 cycles/sec —
        // see the comment on DEFAULT_CPS in strudelChords.ts. This has to use
        // that same fixed rate, or our queries land on the wrong window of the
        // pattern relative to what's actually sounding.
        const elapsedRealSeconds = audioNow() - startTimeRef.current
        const elapsedCycles = elapsedRealSeconds * DEFAULT_CPS
        const secondsPerSlot = cycleSeconds(RARE_INTRO.bpm, RARE_INTRO.beatsPerCycle)

        // Pure, safe to call repeatedly — queryArc just maps a time span to events.
        const haps = pattern.queryArc(lastCycleRef.current, elapsedCycles)
        for (const hap of haps) {
            const rawNote =
                typeof hap.value === 'object' && hap.value !== null ? hap.value.note : hap.value
            if (rawNote == null) continue
            const midi = toMidi(rawNote as string | number)
            const beginCycle =
                hap.whole == null
                    ? elapsedCycles
                    : typeof hap.whole.begin === 'number'
                        ? hap.whole.begin
                        : Number(hap.whole.begin.valueOf())

            // Convert back to real seconds, then to "how far through this musical
            // slot are we" — otherwise the sweep resets on Strudel's fixed 2s
            // clock instead of on the actual chord-hold length.
            const positionInSlot = (beginCycle / DEFAULT_CPS) / secondsPerSlot

            particlesRef.current.push({
                midi,
                x: cycleFractionToX(positionInSlot, width),
                yBase: midiToY(midi, MIN_MIDI, MAX_MIDI, height),
                bornAt: performance.now(),
                lifeMs: PARTICLE_LIFE_MS,
            })
        }
        lastCycleRef.current = elapsedCycles

        tickRafRef.current = requestAnimationFrame(tick)
    }, [audioNow])

    const stop = useCallback(() => {
        if (typeof window.hush === 'function') window.hush()
        startTimeRef.current = null
        patternRef.current = null
        particlesRef.current = []
        if (tickRafRef.current != null) cancelAnimationFrame(tickRafRef.current)
        if (drawRafRef.current != null) cancelAnimationFrame(drawRafRef.current)
        tickRafRef.current = null
        drawRafRef.current = null
        setIsPlaying(false)
    }, [])

    const play = useCallback(() => {
        if (isAudioLikelyBlocked()) {
            // Don't start the visual without the audio — that's the "smoke with
            // no music" state. Show the explicit prompt instead; a real click on
            // it will pass this check next time, since it'll carry a genuine
            // user gesture.
            setAudioBlocked(true)
            return
        }
        try {
            const pattern = window
                .chord(buildPatternString(RARE_INTRO.steps))
                .dict('ireal')
                .voicing()
                .s(RARE_INTRO.instrument)
                .gain(0.4)
                .room(0.4)
                .slow(slotSlowFactor(RARE_INTRO.bpm, RARE_INTRO.beatsPerCycle))
            pattern.play()

            patternRef.current = pattern
            startTimeRef.current = audioNow()
            lastCycleRef.current = 0
            particlesRef.current = []
            setIsPlaying(true)
            setAudioBlocked(false)

            // two independent rAF loops: `tick` polls Strudel for new note events,
            // `draw` repaints the canvas — kept separate so a slow query never
            // stalls the redraw, and vice versa.
            tickRafRef.current = requestAnimationFrame(tick)
            drawRafRef.current = requestAnimationFrame(draw)
        } catch (err) {
            console.error('Strudel playback error:', err)
            setError('Playback failed — see console.')
        }
    }, [audioNow, tick, draw, isAudioLikelyBlocked])

    const toggle = useCallback(() => {
        if (!isReady) return
        if (isPlaying) stop()
        else play()
    }, [isReady, isPlaying, play, stop])

    // Auto-play: start counting on mount; if the engine is still loading when
    // the timer fires, `autoPlayArmedRef` carries the request forward to the
    // isReady effect below instead of dropping it.
    useEffect(() => {
        if (autoPlayDelayMs == null) return
        const timer = setTimeout(() => {
            autoPlayArmedRef.current = true
            if (isReady) play()
        }, autoPlayDelayMs)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoPlayDelayMs])

    useEffect(() => {
        if (isReady && autoPlayArmedRef.current && !isPlaying) {
            autoPlayArmedRef.current = false
            play()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady])

    useEffect(() => {
        return () => stop()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div ref={containerRef} className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
            <button
                type="button"
                onClick={toggle}
                disabled={!isReady}
                aria-pressed={isPlaying}
                aria-label={isPlaying ? 'Pause background chords' : 'Play background chords'}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: isReady ? 'pointer' : 'default',
                    color: '#555',
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    opacity: isPlaying ? 0 : 1,
                    transition: 'opacity 0.4s ease',
                }}
            >
                {error ?? (isReady ? (audioBlocked ? 'tap for sound' : 'click to play') : 'loading…')}
            </button>
        </div>
    )
}