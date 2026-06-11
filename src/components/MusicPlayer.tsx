/**
 * MusicPlayer.tsx
 *
 * Mounted ONCE in App.tsx above the router — never remounts on navigation.
 * Audio persists across all route changes.
 *
 * FADE BEHAVIOUR:
 *   Top-level routes (/, /projects, /team) — full volume, music plays normally.
 *   Sub-routes (/projects/slug, etc.)      — music fades to 0 over 1.5s on enter,
 *                                            fades back in on return.
 *   This is detected by pathname depth (more than 1 segment = sub-route).
 *
 * VISUALIZER:
 *   Uses Web Audio API AnalyserNode connected to the <audio> element.
 *   Reads real FFT frequency data (256 buckets) every frame.
 *   The .mp3 file must be served from the same origin (public/music/).
 *
 *   Window 1  0:52–1:39  Retro / tame — vertical bars, phosphor palette,
 *                          CRT scanlines, bass-reactive bloom
 *   Window 2  2:52–3:37  Glitch / flashy — RGB-split waveform, pixel burst,
 *                          screen-tear slices, neon palette
 *
 *   Pausing → intensity fades to 0 immediately.
 *   Resuming within window → picks back up instantly.
 *
 * CRESCENDO EVENTS:
 *   Dispatches CustomEvent 'mp:crescendo' { detail: { active: boolean } }
 *   when entering/leaving any visualizer window.
 *   TeamPage listens to auto-glitch team members during crescendo.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { musicConfig } from '@/config'

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLE_ID = 'mp-styles'
function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = `

    .mp-slider{-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;outline:none;cursor:pointer;
      background:linear-gradient(to right,var(--mp-fg) var(--mp-pct),#2a2a2a var(--mp-pct))}
    .mp-slider::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;border-radius:50%;
      background:var(--mp-fg);cursor:pointer;transition:transform .12s}
    .mp-slider::-webkit-slider-thumb:hover{transform:scale(1.4)}
    .mp-slider::-moz-range-thumb{width:10px;height:10px;border-radius:50%;border:none;background:var(--mp-fg);cursor:pointer}
  `
    document.head.appendChild(el)
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconMusic = ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
)
const IconClose = ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)
const IconPlay = ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
)
const IconPause = ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <rect x="5" y="3" width="4" height="18" rx="1" /><rect x="15" y="3" width="4" height="18" rx="1" />
    </svg>
)
const IconVol = ({ muted, size = 13 }: { muted: boolean; size?: number }) => muted ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
        <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
)
const Vinyl = ({ size = 52 }: { size?: number }) => (
    <svg viewBox="0 0 52 52" width={size} height={size} style={{ display: 'block' }}>
        <circle cx="26" cy="26" r="26" fill="#1a1a1a" />
        <circle cx="26" cy="26" r="20" fill="#111" />
        {[13, 15, 17, 19].map(r => <circle key={r} cx="26" cy="26" r={r} fill="none" stroke="#1e1e1e" strokeWidth="0.8" />)}
        <circle cx="26" cy="26" r="8" fill="#0d0d0d" />
        <circle cx="26" cy="26" r="3" fill="#2a2a2a" />
    </svg>
)

// ── Visualizer windows ────────────────────────────────────────────────────────
const WINDOWS = [
    { start: 52, end: 99, type: 'retro' },  // 0:52–1:39
    { start: 172, end: 219, type: 'glitch' },  // 2:52–3:39
] as const
type WinType = 'retro' | 'glitch'

function getWinType(t: number): WinType | null {
    return (WINDOWS.find(w => t >= w.start && t <= w.end)?.type ?? null) as WinType | null
}

// ── AnalyserNode visualizer ───────────────────────────────────────────────────
// Left side: overlapping sine waves derived from frequency bands.
// Right side: mirror of left.
// Window 2 adds a subtle matrix+glitch overlay on top.
// Palette: orange (#FF6B2B), white (#f0f0f0), green (#00FFB2).
// Zero GC in draw loop — all buffers pre-allocated.
function useVisualizer(
    audioRef: React.RefObject<HTMLAudioElement | null>,
    playing: boolean,
    currentTime: number,
) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ctxARef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const alphaRef = useRef(0)
    const prevWinRef = useRef<WinType | null>(null)
    const matrixRef = useRef<MatrixColumn[]>([])

    // Connect Web Audio on first interaction
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        const connect = () => {
            if (ctxARef.current) return
            const actx = new AudioContext()
            const src = actx.createMediaElementSource(audio)
            const anal = actx.createAnalyser()
            anal.fftSize = 2048
            anal.smoothingTimeConstant = 0.80
            src.connect(anal)
            anal.connect(actx.destination)
            ctxARef.current = actx
            analyserRef.current = anal
        }
        const onInteract = () => {
            connect()
            ctxARef.current?.resume()
            audio.play().catch(() => { })
            window.removeEventListener('click', onInteract)
            window.removeEventListener('touchend', onInteract)
            window.removeEventListener('keydown', onInteract)
        }
        window.addEventListener('click', onInteract)
        window.addEventListener('touchend', onInteract)
        window.addEventListener('keydown', onInteract)
        return () => {
            window.removeEventListener('click', onInteract)
            window.removeEventListener('touchend', onInteract)
            window.removeEventListener('keydown', onInteract)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        let raf = 0

        // Pre-allocate typed arrays — no GC in draw loop
        const freqData = new Uint8Array(1024)
        const timeData = new Uint8Array(2048)

        function resize() {
            canvas!.width = window.innerWidth
            canvas!.height = window.innerHeight
            // Re-init matrix columns on resize
            initMatrix(matrixRef, canvas!.width)
        }
        resize()
        window.addEventListener('resize', resize)

        function draw() {
            raf = requestAnimationFrame(draw)

            const winType = getWinType(currentTime)
            const target = (winType && playing) ? 1 : 0
            alphaRef.current += (target - alphaRef.current) * (target > alphaRef.current ? 0.022 : 0.055)
            const alpha = alphaRef.current

            // Crescendo events
            const isActive = winType !== null && playing
            if ((prevWinRef.current !== null) !== isActive) {
                window.dispatchEvent(new CustomEvent('mp:crescendo', { detail: { active: isActive } }))
                prevWinRef.current = isActive ? winType : null
            }

            ctx.clearRect(0, 0, canvas!.width, canvas!.height)
            if (alpha < 0.004) return

            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(freqData)
                analyserRef.current.getByteTimeDomainData(timeData)
            }

            const W = canvas!.width, H = canvas!.height

            // Draw waves on both sides
            drawWaves(ctx, W, H, alpha, freqData, timeData, winType)

            // Glitch overlay only in window 2
            if (winType === 'glitch') {
                drawMatrixGlitch(ctx, W, H, alpha, freqData, matrixRef.current)
            }
        }

        draw()
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing, currentTime])

    return canvasRef
}

// ── Matrix column state ───────────────────────────────────────────────────────
interface MatrixColumn {
    x: number
    y: number
    speed: number
    chars: string
    len: number
}

const MATRIX_CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF'

function initMatrix(ref: React.MutableRefObject<MatrixColumn[]>, W: number) {
    const cols = Math.floor(W / 16)
    ref.current = Array.from({ length: cols }, (_, i) => ({
        x: i * 16,
        y: Math.random() * -200,
        speed: 0.4 + Math.random() * 0.8,
        chars: Array.from({ length: 20 }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]).join(''),
        len: 6 + Math.floor(Math.random() * 12),
    }))
}

// ── Wave renderer ─────────────────────────────────────────────────────────────
// Three overlapping sine waves on each side derived from bass/mid/high bands.
// Width of each wave zone = 18% of viewport, fading to transparent inward.
function drawWaves(
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    alpha: number,
    freq: Uint8Array,
    time: Uint8Array,
    winType: WinType | null,
) {
    // Extract energy from frequency bands
    // Bass: buckets 2-8, Mid: 20-80, High: 100-200
    let bass = 0, mid = 0, high = 0
    for (let i = 2; i < 8; i++) bass += freq[i]
    for (let i = 20; i < 80; i++) mid += freq[i]
    for (let i = 100; i < 200; i++) high += freq[i]
    bass /= 6 * 255; mid /= 60 * 255; high /= 100 * 255

    // Wave zone width — grows slightly with energy
    const ZONE_W = W * (0.15 + bass * 0.06)
    const CY = H / 2

    // Three waves per side — bass, mid, high — each a different colour
    // orange = bass, white = mid, green = high
    const waves = [
        { amp: bass * H * 0.25, freq_wave: 2.2, phase_off: 0, color: [255, 107, 43], a_base: 0.55 },  // orange, bass
        { amp: mid * H * 0.15, freq_wave: 3.7, phase_off: Math.PI / 3, color: [240, 240, 240], a_base: 0.40 },  // white,  mid
        { amp: high * H * 0.11, freq_wave: 6.1, phase_off: Math.PI * 0.8, color: [0, 255, 178], a_base: 0.35 },  // green,  high
    ]

    // Phase advances with time-domain signal for reactivity
    const phaseOffset = (time[0] - 128) / 128 * Math.PI * 0.5

    for (const side of ['left', 'right'] as const) {
        // Clip to wave zone
        ctx.save()
        if (side === 'left') {
            ctx.rect(0, 0, ZONE_W, H)
        } else {
            ctx.rect(W - ZONE_W, 0, ZONE_W, H)
        }
        ctx.clip()

        for (const wave of waves) {
            const [r, g, b] = wave.color
            // Gradient fades the wave to transparent as it approaches centre
            const grad = side === 'left'
                ? ctx.createLinearGradient(0, 0, ZONE_W, 0)
                : ctx.createLinearGradient(W - ZONE_W, 0, W, 0)

            const aMax = alpha * (wave.a_base + bass * 0.25)
            if (side === 'left') {
                grad.addColorStop(0, `rgba(${r},${g},${b},${aMax})`)
                grad.addColorStop(0.7, `rgba(${r},${g},${b},${aMax * 0.5})`)
                grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
            } else {
                grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
                grad.addColorStop(0.3, `rgba(${r},${g},${b},${aMax * 0.5})`)
                grad.addColorStop(1, `rgba(${r},${g},${b},${aMax})`)
            }

            ctx.globalAlpha = 1
            ctx.strokeStyle = grad
            ctx.lineWidth = winType === 'glitch' ? 2.5 : 1.8
            ctx.beginPath()

            const STEPS = 120
            for (let i = 0; i <= STEPS; i++) {
                const t = i / STEPS  // 0=top 1=bottom of canvas
                const y = t * H
                // X displacement: sine wave across the height
                const angle = t * Math.PI * wave.freq_wave + phaseOffset + wave.phase_off
                const dispX = Math.sin(angle) * wave.amp

                let x: number
                if (side === 'left') {
                    x = ZONE_W * 0.4 + dispX
                } else {
                    x = (W - ZONE_W * 0.4) - dispX
                }

                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
            }
            ctx.stroke()
        }

        ctx.restore()
    }
}

// ── Matrix + glitch overlay ───────────────────────────────────────────────────
// Subtle: matrix rain ONLY in the wave zones (sides), not centre.
// Occasional horizontal glitch slice. Orange/green/white palette.
function drawMatrixGlitch(
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    alpha: number,
    freq: Uint8Array,
    cols: MatrixColumn[],
) {
    let bass = 0
    for (let i = 2; i < 8; i++) bass += freq[i]
    bass /= 6 * 255

    const ZONE_W = W * 0.22  // slightly wider zone for matrix

    // ── Matrix rain — left and right zones only ──
    ctx.save()
    // Clip to left zone + right zone
    ctx.beginPath()
    ctx.rect(0, 0, ZONE_W, H)
    ctx.rect(W - ZONE_W, 0, ZONE_W, H)
    ctx.clip()

    const fontSize = 12
    ctx.font = `${fontSize}px monospace`

    for (const col of cols) {
        // Only draw columns that fall in the zone areas
        const inLeft = col.x < ZONE_W
        const inRight = col.x > W - ZONE_W
        if (!inLeft && !inRight) continue

        // Advance column
        col.y += col.speed * (1 + bass * 2)
        if (col.y > H + col.len * fontSize) {
            col.y = Math.random() * -100
            col.speed = 0.4 + Math.random() * 0.8
        }

        // Draw trail — each char fades from bright head to dim tail
        for (let j = 0; j < col.len; j++) {
            const cy = col.y - j * fontSize
            if (cy < -fontSize || cy > H) continue
            const t = 1 - j / col.len    // 1=head, 0=tail
            const char = col.chars[j % col.chars.length]

            // Head char: white, trail: green fading to transparent
            let r: number, g2: number, b2: number
            if (j === 0) { r = 240; g2 = 240; b2 = 240 }         // white head
            else { r = 0; g2 = 255; b2 = 178 }          // green trail

            const a = alpha * t * (j === 0 ? 0.85 : 0.35)
            ctx.globalAlpha = a
            ctx.fillStyle = `rgb(${r},${g2},${b2})`
            ctx.fillText(char, col.x, cy)
        }
    }
    ctx.restore()

    // ── Occasional horizontal glitch slices (rare, subtle) ──
    const glitchChance = bass * 0.15  // only when bass spikes
    if (Math.random() < glitchChance) {
        const slices = 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < slices; i++) {
            const y = Math.random() * H
            const th = 1 + Math.random() * 4
            const off = (Math.random() - 0.5) * 30 * bass
            // orange flash
            ctx.globalAlpha = alpha * 0.06
            ctx.fillStyle = '#FF6B2B'
            ctx.fillRect(off, y, W - Math.abs(off) * 2, th)
        }
    }

    ctx.globalAlpha = 1
}


// ── Volume fade on sub-routes ─────────────────────────────────────────────────
// Top-level routes: /, /projects, /team → full volume
// Sub-routes: /projects/slug, etc.      → fade to 0
function useRouteFade(
    audioRef: React.RefObject<HTMLAudioElement | null>,
    baseVolume: number,
    muted: boolean,
) {
    const { pathname } = useLocation()
    const fadeRaf = useRef(0)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        const depth = pathname.split('/').filter(Boolean).length
        const isTop = depth <= 1  // /, /projects, /team
        const target = isTop ? (muted ? 0 : baseVolume) : 0

        cancelAnimationFrame(fadeRaf.current)
        function step() {
            if (!audio) return
            const diff = target - audio.volume
            if (Math.abs(diff) < 0.002) { audio.volume = target; return }
            audio.volume = Math.max(0, Math.min(1, audio.volume + diff * 0.06))
            fadeRaf.current = requestAnimationFrame(step)
        }
        step()
        return () => cancelAnimationFrame(fadeRaf.current)
    }, [pathname, baseVolume, muted])
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MusicPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [open, setOpen] = useState(false)
    const [playing, setPlaying] = useState(true)
    const [volume, setVolume] = useState(0.05)
    const [muted, setMuted] = useState(false)
    const [ready, setReady] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)

    const FG = '#a8a8a8'
    const PANEL_W = 280, TAB_W = 28, TAB_H = 96, BOTTOM = 80

    useEffect(() => { ensureStyles() }, [])

    // Audio setup — timeupdate for visualizer window detection
    useEffect(() => {
        const a = audioRef.current
        if (!a) return
        a.volume = volume
        const onReady = () => setReady(true)
        const onTime = () => setCurrentTime(a.currentTime)
        a.addEventListener('canplay', onReady)
        a.addEventListener('timeupdate', onTime)
        return () => {
            a.removeEventListener('canplay', onReady)
            a.removeEventListener('timeupdate', onTime)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Route-based volume fade
    useRouteFade(audioRef, volume, muted)

    const togglePlay = useCallback(() => {
        const a = audioRef.current
        if (!a || !ready) return
        if (playing) a.pause()
        else a.play().catch(() => { })
    }, [playing, ready])

    // Visualizer with real AnalyserNode
    const canvasRef = useVisualizer(audioRef, playing, currentTime)

    const volPct = `${Math.round((muted ? 0 : volume) * 100)}%`

    return (
        <>
            <audio
                ref={audioRef}
                src={musicConfig.src}
                autoPlay
                loop
                preload="auto"
                onPlay={() => {
                    setPlaying(true)
                        // Set a global flag for components that mount AFTER playback starts
                        ; (window as any).__MUSIC_PLAYING__ = true;
                    // Dispatch an event for components currently mounted
                    window.dispatchEvent(new CustomEvent('mp:playstate', { detail: { playing: true } }))
                }}
                onPause={() => {
                    setPlaying(false)
                        ; (window as any).__MUSIC_PLAYING__ = false;
                    window.dispatchEvent(new CustomEvent('mp:playstate', { detail: { playing: false } }))
                }}
            />

            {/* Full-viewport visualizer canvas — behind everything, no pointer events */}
            <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'block' }} />

            {/* Tab bookmark — glows to hint its presence */}
            <div
                onClick={() => setOpen(o => !o)}
                title={open ? 'Close player' : 'Open music player'}
                style={{
                    position: 'fixed',
                    bottom: `${BOTTOM}px`,
                    right: open ? `${PANEL_W}px` : '0px',
                    zIndex: 200,
                    width: `${TAB_W}px`,
                    height: `${TAB_H}px`,
                    background: playing ? '#161616' : '#0f0f0f',
                    border: '1px solid #2a2a2a',
                    borderRight: open ? '1px solid #2a2a2a' : 'none',
                    boxShadow: playing ? '-3px 0 12px rgba(255,107,43,0.18)' : '-2px 0 8px rgba(255,107,43,0.08)',
                    borderRadius: '6px 0 0 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'right 0.32s cubic-bezier(0.16,1,0.3,1), background 0.15s',
                    // Static glow — feint, orange tint, no animation
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                onMouseLeave={e => (e.currentTarget.style.background = playing ? '#161616' : '#0f0f0f')}
            >
                <div style={{ color: open ? '#555' : playing ? '#FF8C55' : '#444', transition: 'color 0.15s,transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
                    {open ? <IconClose size={13} /> : <IconMusic size={15} />}
                </div>
                {!open && (
                    <div style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: playing ? FG : '#2a2a2a',
                        boxShadow: playing ? `0 0 6px ${FG}` : 'none',
                        transition: 'background 0.2s, box-shadow 0.2s',
                    }} />
                )}
            </div>

            {/* Slide panel */}
            <div style={{
                position: 'fixed',
                bottom: `${BOTTOM - TAB_H * 0.5}px`,
                right: '0px',
                zIndex: 199,
                width: `${PANEL_W}px`,
                transform: open ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
                background: 'rgba(10,10,10,0.97)',
                backdropFilter: 'blur(16px)',
                border: '1px solid #1e1e1e',
                borderRight: 'none',
                borderRadius: '10px 0 0 10px',
                padding: '16px',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
                pointerEvents: open ? 'all' : 'none',
            }}>
                {/* Album art + track info */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden',
                        flexShrink: 0, border: '1px solid #2a2a2a', background: '#111'
                    }}>
                        {musicConfig.albumArt
                            ? <img src={musicConfig.albumArt} alt={musicConfig.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Vinyl size={52} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                            fontSize: '13px', fontWeight: 600, color: '#f0f0f0', letterSpacing: '-0.01em',
                            marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                            {musicConfig.title}
                        </p>
                        <p style={{ fontSize: '11px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {musicConfig.artist}
                        </p>
                        <p style={{
                            fontSize: '10px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden',
                            textOverflow: 'ellipsis', marginTop: '1px'
                        }}>
                            {musicConfig.album}
                        </p>
                    </div>
                </div>

                {/* Play / Pause */}
                <button onClick={togglePlay} disabled={!ready}
                    style={{
                        width: '100%', height: '36px', borderRadius: '7px',
                        background: playing ? '#1e1e1e' : FG, border: `1px solid ${playing ? '#333' : FG}`,
                        color: playing ? FG : '#080808', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '7px', cursor: ready ? 'pointer' : 'not-allowed',
                        fontSize: '12px', fontWeight: 500, letterSpacing: '0.03em',
                        transition: 'background 0.14s,border-color 0.14s', marginBottom: '12px',
                        opacity: ready ? 1 : 0.45
                    }}
                    onMouseEnter={e => { if (ready) e.currentTarget.style.background = playing ? '#252525' : '#bbb' }}
                    onMouseLeave={e => { e.currentTarget.style.background = playing ? '#1e1e1e' : FG }}>
                    {playing ? <><IconPause size={13} /> Pause</> : <><IconPlay size={13} /> Play</>}
                </button>

                {/* Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setMuted(m => !m)}
                        style={{
                            background: 'none', border: 'none', padding: '4px', color: muted ? '#333' : '#555',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.12s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f0')}
                        onMouseLeave={e => (e.currentTarget.style.color = muted ? '#333' : '#555')}>
                        <IconVol muted={muted} />
                    </button>
                    <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
                        onChange={e => { const v = parseFloat(e.target.value); setVolume(v); if (v > 0 && muted) setMuted(false) }}
                        className="mp-slider"
                        style={{ flex: 1, '--mp-fg': FG, '--mp-pct': volPct } as React.CSSProperties} />
                    <span style={{
                        fontSize: '10px', color: '#3a3a3a', width: '28px', textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)'
                    }}>
                        {muted ? '0%' : volPct}
                    </span>
                </div>
            </div>
        </>
    )
}