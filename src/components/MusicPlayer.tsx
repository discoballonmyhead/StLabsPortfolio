/**
 * MusicPlayer.tsx — v3
 *
 * Mounted ONCE in App.tsx above the router — never remounts on navigation.
 * Audio persists across all route changes. Fade behaviour, panel UI, and the
 * 'mp:state' / 'mp:crescendo' event contracts are unchanged. The <audio>
 * element also carries id="mp-audio" so other components (e.g. ParticleViewer)
 * can read the real playback position directly via document.getElementById,
 * instead of relying only on the play/pause events.
 *
 * VISUALIZER v3:
 *
 *   AUTO-GAIN (the fix that makes everything else visible):
 *     The AnalyserNode sits downstream of the <audio> element's volume, and the
 *     player defaults to volume 0.10 — so raw FFT energies were ~10× too small.
 *     Kick never crossed the old thresholds; embers and waves never fired.
 *     Energies are now normalized by a slow-decaying running peak (AGC), so the
 *     visualizer reacts identically at 10% or 100% volume.
 *
 *   BARS — 56 per side (was 17), hairline 1.2px, log-spaced frequency bands
 *     (bass at the bottom, air at the top). Max reach is 8% of viewport width,
 *     capped at 150px — a slim shimmer hugging each edge.
 *     Each bar carries a THEMED TWO-TONE GRADIENT oriented by its side:
 *     left bars flow left→right, right bars right→left, from the bar's own
 *     ramp colour into the next colour up the ramp, ending white-hot at the
 *     tip. Falling 1px peak ticks linger at recent maxima.
 *
 *   COLOR — one ramp across all bars, matching the particle system:
 *     deep cosmic orange (bass) → amber → cream (mids) → mint → cosmic green.
 *
 *   GLITCH WINDOW (the "boom" phase) — all effects confined to the outer ~26%
 *   of each edge; the centre of the viewport stays untouched:
 *     • EMBERS — kick-driven bursts off both bar tips: fly inward, drag,
 *       rise with buoyancy, flicker, die in under a second.
 *     • MOTES  — continuously seeded tiny sparks that LINGER 5–10 seconds,
 *       drifting upward with a sine wobble; their inward speed decays at the
 *       edge-zone boundary so they hover by the sides.
 *     • WAVES  — hard kicks ripple a vertical sine front inward from each
 *       edge, dissolving as it travels.
 *     • Subtle RGB-split shift on the bars.
 *
 *   PERF: single persistent rAF loop (reads audio.currentTime directly — no
 *   more effect teardown on every timeupdate), pooled particles/waves with
 *   in-place compaction, DPR-aware canvas (capped 1.5×) so hairline bars
 *   render crisp, zero per-frame allocations beyond the bar gradients.
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
    @keyframes mp-hint-pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}
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

// ═══ BOOM PERIODS — EDIT HERE ═════════════════════════════════════════════════
// start/end are SECONDS into the track.
//   'retro'  = calm phase  (bars + peaks only)
//   'glitch' = BOOM phase  (embers, lingering motes, waves, RGB shift)
// Add, remove, move, or resize windows freely. You can also override these from
// site config without touching this file:
//   musicConfig.visualizerWindows = [{ start: 30, end: 60, type: 'glitch' }, ...]
type WinType = 'retro' | 'glitch'
interface VisWindow { start: number; end: number; type: WinType }

const DEFAULT_WINDOWS: VisWindow[] = [
    { start: 52, end: 99, type: 'retro' },   // 0:52–1:39
    { start: 172, end: 217, type: 'glitch' },  // 2:52–3:37
]
const WINDOWS: VisWindow[] =
    (musicConfig as { visualizerWindows?: VisWindow[] }).visualizerWindows ?? DEFAULT_WINDOWS

// ═══ DEV TUNING FLAGS ═════════════════════════════════════════════════════════
// DEBUG_FORCE_WINDOW: set to 'glitch' to force the boom phase at ANY point in
//   the track — no more waiting until 2:52 to check the particles. Set back to
//   null before shipping.
// BEAT_DEBUG: draws a small live meter bottom-left (orange = low-band energy
//   with its white threshold notch, green = spectral flux, dot flashes on every
//   detected beat). Works even outside the windows, so you can watch the
//   detector against the whole track and judge it directly.
const DEBUG_FORCE_WINDOW: WinType | null = null
const BEAT_DEBUG = false

function getWinType(t: number): WinType | null {
    return WINDOWS.find(w => t >= w.start && t <= w.end)?.type ?? null
}

// ── Palette — one cohesive ramp, matches the particle system ──────────────────
const RAMP = ['#FF4D00', '#FF6B2B', '#FFA35C', '#F2E9DC', '#8CF5D2', '#00FFB2']

function hexToRgbArr(hex: string): [number, number, number] {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function sampleRamp(t: number): [number, number, number] {
    const seg = Math.min(Math.max(t, 0), 1) * (RAMP.length - 1)
    const i = Math.min(Math.floor(seg), RAMP.length - 2)
    const f = seg - i
    const a = hexToRgbArr(RAMP[i]), b = hexToRgbArr(RAMP[i + 1])
    return [Math.round(lerp(a[0], b[0], f)), Math.round(lerp(a[1], b[1], f)), Math.round(lerp(a[2], b[2], f))]
}

// ── Visual constants ──────────────────────────────────────────────────────────
const BAR_COUNT = 56          // bars per side (was 17)
const BAR_TH = 1.2            // hairline thickness (px)
const REACH_FRAC = 0.08       // max bar length as fraction of W (was 0.22 in v1)
const REACH_MAX_PX = 150      // hard cap, keeps bars slim on ultrawide screens
const EDGE_ZONE = 0.26        // effects never leave this fraction of W per edge
const MAX_P = 480             // shared pool: embers + motes
const KIND_EMBER = 0
const KIND_MOTE = 1
const MAX_WAVES = 8
const TAU = Math.PI * 2

// Log-spaced band edges: 56 bands over FFT bins 1..560 (~20 Hz–12 kHz @44.1k/2048).
// Single-bin bands at the bottom resolve the bass, wide bands cover the air.
const MAX_BIN = 560
const BAND_EDGES: number[] = (() => {
    const e: number[] = []
    for (let i = 0; i <= BAR_COUNT; i++) e.push(Math.round(Math.pow(MAX_BIN, i / BAR_COUNT)))
    for (let i = 1; i <= BAR_COUNT; i++) if (e[i] <= e[i - 1]) e[i] = e[i - 1] + 1
    return e
})()

// Per-bar precomputed colour strings ("r,g,b"):
//   BAR_BASE — the bar's own ramp colour (screen-edge end of the gradient)
//   BAR_NEXT — the colour a step up the ramp (inner end — the theme flows THROUGH the bar)
//   BAR_HOT  — the tip, pushed 70% toward white
const BAR_BASE: string[] = []
const BAR_NEXT: string[] = []
const BAR_HOT: string[] = []
const BAR_RGB: [number, number, number][] = []
for (let i = 0; i < BAR_COUNT; i++) {
    const t = i / (BAR_COUNT - 1)
    const base = sampleRamp(t)
    const next = sampleRamp(Math.min(t + 0.12, 1))
    const hot: [number, number, number] = [
        Math.round(next[0] + (255 - next[0]) * 0.7),
        Math.round(next[1] + (255 - next[1]) * 0.7),
        Math.round(next[2] + (255 - next[2]) * 0.7),
    ]
    BAR_RGB.push(base)
    BAR_BASE.push(base.join(','))
    BAR_NEXT.push(next.join(','))
    BAR_HOT.push(hot.join(','))
}

function useVisualizer(audioRef: React.RefObject<HTMLAudioElement | null>, playing: boolean) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ctxARef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const playingRef = useRef(playing)
    useEffect(() => { playingRef.current = playing }, [playing])

    // Connect Web Audio on first interaction (unchanged)
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        const connect = () => {
            if (ctxARef.current) return
            const actx = new AudioContext()
            const src = actx.createMediaElementSource(audio)
            const anal = actx.createAnalyser()
            anal.fftSize = 2048
            // 0.60 (was 0.80): heavy analyser smoothing smears the very kick
            // transients beat detection needs; the bars get their own
            // attack/release envelope, so they stay smooth regardless.
            anal.smoothingTimeConstant = 0.50
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

    // ── Persistent render loop ──────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        let raf = 0
        const freqData = new Uint8Array(1024)

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
        let W = 0, H = 0
        function resize() {
            W = window.innerWidth; H = window.innerHeight
            canvas!.width = W * dpr; canvas!.height = H * dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        resize()
        window.addEventListener('resize', resize)

        let alpha = 0
        let prevActive = false
        let prevWin: WinType | null = null

        // AGC: energies are divided by a slowly decaying running peak, so the
        // visualizer is volume-independent (element volume scales the analyser
        // input — at the default 10% volume nothing used to cross a threshold).
        let agc = 0.12

        // Per-bar envelope (fast attack / slow release) + falling peak ticks
        const smooth = new Float32Array(BAR_COUNT)
        const peakW = new Float32Array(BAR_COUNT)
        let kickS = 0

        // Beat detection — DUAL detector:
        //  (a) ENERGY: instant low-band energy vs a ~0.7s rolling mean, with a
        //      variance-adaptive multiplier (steady mixes → stricter, dynamic
        //      mixes → looser). Catches kicks even when riding on loud bass.
        //  (b) FLUX: statistical outlier (mean + 2.2σ) in the frame-to-frame
        //      spectral RISE — catches soft/ghost kicks the energy test misses.
        //  A beat fires when EITHER trips, with a 130ms refractory period.
        // Statistics are TIME-based EMAs (τ = 0.7s), so detection behaves
        // identically on 60, 120, or 144Hz displays.
        let eAvg = 0, eVar = 0, statsAgeMs = 0, prevE = 0, lastNow = -1
        const prevLow = new Float32Array(16)
        let fluxAvg = 0.01, fluxVar = 0.0001
        let lastBeatMs = 0
        let armed = true      // re-arm latch: one kick's plateau can't double-fire
        let flashT = 0        // debug-meter beat flash
        let burstLeft = 0     // extra embers queued by the latest beat

        // Shared particle pool — embers (fast, bright, short) + motes (slow, dim, lingering)
        const px = new Float32Array(MAX_P), py = new Float32Array(MAX_P)
        const pvx = new Float32Array(MAX_P), pvy = new Float32Array(MAX_P)
        const plife = new Float32Array(MAX_P)
        const pdecay = new Float32Array(MAX_P)
        const psize = new Float32Array(MAX_P)
        const pseed = new Float32Array(MAX_P)
        const pclr = new Uint8Array(MAX_P)
        const pkind = new Uint8Array(MAX_P)
        let pCount = 0

        // Wave pool — vertical sine fronts rippling inward from an edge
        const waveT = new Float32Array(MAX_WAVES)
        const waveSide = new Uint8Array(MAX_WAVES)
        const waveAmp = new Float32Array(MAX_WAVES)
        const waveOn = new Uint8Array(MAX_WAVES)
        let lastWaveMs = 0

        function spawnParticle(
            kind: number, x: number, y: number, vx: number, vy: number,
            decay: number, size: number, clr: number,
        ) {
            if (pCount >= MAX_P) return
            const i = pCount++
            px[i] = x; py[i] = y; pvx[i] = vx; pvy[i] = vy
            plife[i] = 1; pdecay[i] = decay; psize[i] = size
            pseed[i] = Math.random() * TAU; pclr[i] = clr; pkind[i] = kind
        }

        function draw(now: number) {
            raf = requestAnimationFrame(draw)

            const t = audioRef.current?.currentTime ?? 0
            const dt = lastNow < 0 ? 16.7 : Math.min(now - lastNow, 50)
            lastNow = now
            const isPlaying = playingRef.current
            const winType = DEBUG_FORCE_WINDOW ?? getWinType(t)
            const target = winType && isPlaying ? 1 : 0
            alpha += (target - alpha) * (target > alpha ? 0.022 : 0.06)

            // Crescendo dispatch (same contract as v1)
            const isActive = winType !== null && isPlaying
            if (prevActive !== isActive) {
                window.dispatchEvent(new CustomEvent('mp:crescendo', { detail: { active: isActive } }))
                prevActive = isActive
                prevWin = isActive ? winType : null
            } else if (isActive) prevWin = winType

            ctx.clearRect(0, 0, W, H)

            // ═══ ANALYSIS — runs EVERY frame (cheap), even outside the
            // windows, so the beat detector never loses its statistics and
            // the debug meter can be judged against the whole track ═════════
            if (analyserRef.current) analyserRef.current.getByteFrequencyData(freqData)

            // Band energies → AGC-normalized → per-bar envelope
            let frameMax = 0
            for (let i = 0; i < BAR_COUNT; i++) {
                const lo = BAND_EDGES[i], hi = BAND_EDGES[i + 1]
                let sum = 0
                for (let k = lo; k < hi; k++) sum += freqData[k]
                const raw = sum / ((hi - lo) * 255)
                if (raw > frameMax) frameMax = raw
                const en = Math.min(raw / agc, 1)
                const s = smooth[i]
                smooth[i] = en > s ? s + (en - s) * 0.5 : s + (en - s) * 0.08
            }
            agc = Math.max(frameMax, agc * 0.9975, 0.05)

            // Kick metric — normalized low-end (bins 1..8), its own envelope
            let kSum = 0
            for (let k = 1; k < 8; k++) kSum += freqData[k]
            const kickN = Math.min((kSum / (7 * 255)) / agc, 1)
            kickS = kickN > kickS ? kickS + (kickN - kickS) * 0.5 : kickS + (kickN - kickS) * 0.1

            // ── Beat detection — DUAL detector (energy OR flux) ─────────────
            // Instant KICK-REGION energy (bins 1..8 — where kicks actually
            // live; summing the full low band diluted the swing to nothing)
            let E = 0
            for (let k = 1; k < 9; k++) E += freqData[k]
            E = (E / (8 * 255)) / Math.max(agc, 0.05)

            // Positive spectral flux (frame-to-frame rise only)
            let flux = 0
            for (let k = 1; k < 16; k++) {
                const v = freqData[k] / 255
                const d = v - prevLow[k]
                if (d > 0) flux += d
                prevLow[k] = v
            }
            flux /= Math.max(agc, 0.05)

            // Time-based EMA statistics (τ = 0.7s) — refresh-rate independent
            const aStat = 1 - Math.exp(-dt / 700)
            statsAgeMs += dt

            // Variance-adaptive multiplier: punchy dynamic mixes lower the bar,
            // flat steady mixes raise it (avoids machine-gunning on drones)
            const C = Math.max(1.12, 1.45 - eVar * 8)
            const beatThresh = C * eAvg
            const energyBeat = statsAgeMs > 350 && E > beatThresh && E > prevE
            const fluxStd = Math.sqrt(Math.max(fluxVar, 1e-6))
            // Flux path: a 1.5× jump over its mean AND a 3.5σ outlier AND a
            // small energy bump (corroboration) — steady noise satisfies
            // none of these together; real kicks satisfy all three.
            const fluxBeat = flux > fluxAvg * 1.5 && flux > fluxAvg + 3.5 * fluxStd
                && flux > 0.02 * (dt / 16.7) && E > eAvg * 1.03
            // 75ms refractory + re-arm latch: the latch (not the refractory)
            // prevents double-fires on a single kick's plateau, so the
            // refractory can stay short enough for syncopated 16th-note kicks.
            const isBeat = armed && (energyBeat || fluxBeat) && now - lastBeatMs > 75
            if (isBeat) { lastBeatMs = now; armed = false }
            else if (!armed && (E < beatThresh || now - lastBeatMs > 350)) armed = true
            const strength = Math.max(Math.min(
                Math.max(E / Math.max(eAvg, 1e-3), flux / Math.max(fluxAvg, 1e-3)) - 1, 3), 0.4)
            flashT = isBeat ? 1 : Math.max(0, flashT - 0.08)

            // Update statistics AFTER the decision, with beats CLIPPED: the
            // stats track the noise floor's true breadth, but a spike is
            // clamped before entering them — so beats can't raise the bar
            // and hide the kick that follows 100ms later.
            // (First 800ms: unclipped fast bootstrap so eAvg converges to the
            // mix level immediately instead of starving under the clip.)
            const warmup = statsAgeMs < 800
            const eClip = warmup ? E : Math.min(E, Math.max(eAvg, 0.05) * 1.7)
            const aE = warmup ? Math.min(aStat * 4, 0.5) : aStat
            const ed = eClip - eAvg
            eAvg += ed * aE
            eVar += (ed * ed - eVar) * aE
            prevE = E
            const fClip = Math.min(flux, fluxAvg * 2.5)
            const fd = fClip - fluxAvg
            fluxAvg += fd * aStat
            fluxVar += (fd * fd - fluxVar) * aStat

            // ── Debug meter (BEAT_DEBUG) — visible at all times ─────────────
            if (BEAT_DEBUG) {
                const mx = 14, my = H - 56
                ctx.fillStyle = 'rgba(0,0,0,0.65)'
                ctx.fillRect(mx - 8, my - 10, 186, 48)
                // energy bar (orange) + threshold notch (white)
                ctx.fillStyle = '#2a2a2a'; ctx.fillRect(mx, my, 120, 6)
                ctx.fillStyle = '#FF6B2B'; ctx.fillRect(mx, my, Math.min(E / 2, 1) * 120, 6)
                ctx.fillStyle = '#fff'; ctx.fillRect(mx + Math.min(beatThresh / 2, 1) * 120, my - 2, 2, 10)
                // flux bar (green)
                ctx.fillStyle = '#2a2a2a'; ctx.fillRect(mx, my + 16, 120, 6)
                ctx.fillStyle = '#00FFB2'; ctx.fillRect(mx, my + 16, Math.min(flux * 4, 1) * 120, 6)
                // beat flash
                ctx.beginPath(); ctx.arc(mx + 156, my + 11, 9, 0, TAU)
                ctx.fillStyle = `rgba(255,255,255,${(0.12 + flashT * 0.88).toFixed(2)})`
                ctx.fill()
            }

            // ═══ VISUALS — gated on window alpha ════════════════════════════
            if (alpha < 0.004) { pCount = 0; waveOn.fill(0); burstLeft = 0; return }

            const REACH = Math.min(W * REACH_FRAC, REACH_MAX_PX)
            const ROW_H = H / BAR_COUNT
            const glitch = prevWin === 'glitch'

            // Local emitters (share all the loop-scope geometry)
            const emitEmbers = (count: number) => {
                for (let s = 0; s < count; s++) {
                    const bi = (Math.random() * BAR_COUNT) | 0
                    const en = smooth[bi]
                    if (en < 0.12) continue
                    const barW = Math.pow(en, 1.3) * REACH
                    const y = H - (bi + 0.5) * ROW_H + (Math.random() - 0.5) * ROW_H
                    const left = Math.random() < 0.5
                    spawnParticle(
                        KIND_EMBER,
                        left ? barW : W - barW, y,
                        (left ? 1 : -1) * (0.8 + Math.random() * 2.6),
                        (Math.random() - 0.7) * 1.4,
                        0.016 + Math.random() * 0.012,
                        1.2 + Math.random() * 1.6,
                        bi,
                    )
                }
            }

            // ── Spawns (glitch window) ──────────────────────────────────────
            if (glitch) {
                // BASELINE — never ceases while the boom window is active:
                // a steady trickle of embers + lingering motes keeps both
                // edges alive between hits, scaling gently with the energy.
                emitEmbers((Math.random() < 0.30 + kickS * 0.35 ? 1 : 0) + (kickS > 0.5 ? 1 : 0))
                if (Math.random() < 0.12 + kickS * 0.15) {
                    const bi = (Math.random() * BAR_COUNT) | 0
                    const barW = Math.pow(smooth[bi], 1.3) * REACH
                    const left = Math.random() < 0.5
                    spawnParticle(
                        KIND_MOTE,
                        left ? barW * Math.random() : W - barW * Math.random(),
                        H - (bi + 0.5) * ROW_H,
                        (left ? 1 : -1) * (0.05 + Math.random() * 0.2),
                        -(0.1 + Math.random() * 0.3),
                        0.0016 + Math.random() * 0.0018,
                        0.8 + Math.random() * 1.0,
                        bi,
                    )
                }

                // BEAT ACCENTS — on top of the baseline, each detected kick
                // queues a distinct ember pop and ripples waves off the edges
                if (isBeat) {
                    burstLeft += Math.floor(8 + strength * 8)
                    if (now - lastWaveMs > 300) {
                        lastWaveMs = now
                        let spawned = 0
                        for (let w = 0; w < MAX_WAVES && spawned < 2; w++) {
                            if (waveOn[w]) continue
                            waveOn[w] = 1
                            waveT[w] = 0
                            waveSide[w] = spawned
                            waveAmp[w] = 5 + Math.min(strength, 3) * 4
                            spawned++
                        }
                    }
                }
            } else burstLeft = 0

            // Drain the queued beat burst over ~2–3 frames (reads as a pop)
            if (burstLeft > 0) {
                const emit = Math.min(burstLeft, 9)
                burstLeft -= emit
                emitEmbers(emit)
            }

            // ── Bars — hairlines with side-directed two-tone theme gradients ─
            for (let i = 0; i < BAR_COUNT; i++) {
                const en = smooth[i]
                const barW = Math.pow(en, 1.3) * REACH
                const cy = H - (i + 0.5) * ROW_H

                peakW[i] = Math.max(peakW[i] - REACH * 0.005, barW)

                const A = alpha * (0.20 + en * 0.80)
                const shX = glitch ? ((i % 3) - 1) * kickS * 2.5 : 0
                const yT = cy - BAR_TH / 2 + (glitch ? (i % 2 === 0 ? 0.5 : -0.5) * kickS : 0)

                if (barW >= 1.5) {
                    // LEFT — theme flows left→right: base colour at the screen
                    // edge → next ramp colour → white-hot tip
                    const gL = ctx.createLinearGradient(shX, 0, shX + barW, 0)
                    gL.addColorStop(0, `rgba(${BAR_BASE[i]},${(A * 0.25).toFixed(3)})`)
                    gL.addColorStop(0.6, `rgba(${BAR_NEXT[i]},${(A * 0.85).toFixed(3)})`)
                    gL.addColorStop(1, `rgba(${BAR_HOT[i]},${A.toFixed(3)})`)
                    ctx.fillStyle = gL
                    ctx.fillRect(shX, yT, barW, BAR_TH)
                    // faint tip glow
                    ctx.fillStyle = `rgba(${BAR_HOT[i]},${(A * 0.16).toFixed(3)})`
                    ctx.fillRect(shX + barW - 3, yT - 1.5, 5, BAR_TH + 3)

                    // RIGHT — mirrored: theme flows right→left
                    const x0 = W - barW + shX
                    const gR = ctx.createLinearGradient(x0, 0, x0 + barW, 0)
                    gR.addColorStop(0, `rgba(${BAR_HOT[i]},${A.toFixed(3)})`)
                    gR.addColorStop(0.4, `rgba(${BAR_NEXT[i]},${(A * 0.85).toFixed(3)})`)
                    gR.addColorStop(1, `rgba(${BAR_BASE[i]},${(A * 0.25).toFixed(3)})`)
                    ctx.fillStyle = gR
                    ctx.fillRect(x0, yT, barW, BAR_TH)
                    ctx.fillStyle = `rgba(${BAR_HOT[i]},${(A * 0.16).toFixed(3)})`
                    ctx.fillRect(x0 - 2, yT - 1.5, 5, BAR_TH + 3)
                }

                // 1px falling peak ticks
                if (peakW[i] > barW + 3 && peakW[i] > 2.5) {
                    ctx.fillStyle = `rgba(${BAR_BASE[i]},${(alpha * 0.22).toFixed(3)})`
                    ctx.fillRect(peakW[i], yT, 1, BAR_TH)
                    ctx.fillRect(W - peakW[i] - 1, yT, 1, BAR_TH)
                }
            }

            // ── Waves — vertical sine fronts, confined to the edge zones ────
            for (let w = 0; w < MAX_WAVES; w++) {
                if (!waveOn[w]) continue
                waveT[w] += 0.016
                const wt = waveT[w]
                if (wt >= 1) { waveOn[w] = 0; continue }
                const easeOut = 1 - (1 - wt) * (1 - wt)
                const front = easeOut * W * EDGE_ZONE
                const x0 = waveSide[w] === 0 ? front : W - front
                const amp = waveAmp[w] * (1 - wt)
                const wA = alpha * (1 - wt) * 0.30
                ctx.beginPath()
                const STEPS = 36
                for (let s = 0; s <= STEPS; s++) {
                    const y = (s / STEPS) * H
                    const x = x0 + Math.sin(y * 0.02 + wt * 9 + w) * amp
                    if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
                }
                ctx.strokeStyle = `rgba(242,233,220,${wA.toFixed(3)})`
                ctx.lineWidth = 1
                ctx.stroke()
            }

            // ── Particles — embers + lingering motes ────────────────────────
            let alive = 0
            const nowS = now * 0.001
            const zoneL = W * EDGE_ZONE, zoneR = W - zoneL
            for (let i = 0; i < pCount; i++) {
                plife[i] -= pdecay[i]
                if (plife[i] <= 0) continue

                const mote = pkind[i] === KIND_MOTE
                if (mote) {
                    px[i] += pvx[i] + Math.sin(nowS * 1.4 + pseed[i]) * 0.25
                    py[i] += pvy[i]
                    // soft-stop at the edge-zone boundary — motes hover by the sides
                    if (px[i] > zoneL && px[i] < W * 0.5) pvx[i] *= 0.9
                    if (px[i] < zoneR && px[i] >= W * 0.5) pvx[i] *= 0.9
                } else {
                    px[i] += pvx[i]
                    py[i] += pvy[i]
                    pvx[i] *= 0.985           // drag
                    pvy[i] -= 0.015           // buoyancy — embers rise as they fade
                }

                const life = plife[i]
                const flicker = mote
                    ? 0.75 + 0.25 * Math.sin(nowS * 3 + pseed[i])
                    : 0.8 + 0.2 * Math.sin(nowS * 14 + pseed[i])
                const [r, g, b] = BAR_RGB[pclr[i]]
                const a = alpha * life * flicker * (mote ? 0.45 : 0.9)
                const sz = psize[i] * (mote ? 1 : 0.6 + life * 0.8)

                ctx.fillStyle = `rgba(${r},${g},${b},${(a * 0.25).toFixed(3)})`
                ctx.fillRect(px[i] - sz, py[i] - sz, sz * 3, sz * 3)
                ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`
                ctx.fillRect(px[i], py[i], sz, sz)

                if (alive !== i) {
                    px[alive] = px[i]; py[alive] = py[i]
                    pvx[alive] = pvx[i]; pvy[alive] = pvy[i]
                    plife[alive] = plife[i]; pdecay[alive] = pdecay[i]
                    psize[alive] = psize[i]; pseed[alive] = pseed[i]
                    pclr[alive] = pclr[i]; pkind[alive] = pkind[i]
                }
                alive++
            }
            pCount = alive
        }

        raf = requestAnimationFrame(draw)
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return canvasRef
}

// ── Volume fade on sub-routes (unchanged) ─────────────────────────────────────
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
        const isTop = depth <= 1
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
    const [volume, setVolume] = useState(0.10)
    const [muted, setMuted] = useState(false)
    const [ready, setReady] = useState(false)
    const [started, setStarted] = useState(false)

    const FG = '#a8a8a8'
    const PANEL_W = 280, TAB_W = 28, TAB_H = 96, BOTTOM = 80

    useEffect(() => { ensureStyles() }, [])

    useEffect(() => {
        const a = audioRef.current
        if (!a) return
        a.volume = volume
        const onReady = () => setReady(true)
        a.addEventListener('canplay', onReady)
        return () => a.removeEventListener('canplay', onReady)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useRouteFade(audioRef, volume, muted)

    const togglePlay = useCallback(() => {
        const a = audioRef.current
        if (!a || !ready) return
        if (playing) a.pause()
        else a.play().catch(() => { })
    }, [playing, ready])

    const canvasRef = useVisualizer(audioRef, playing)

    const volPct = `${Math.round((muted ? 0 : volume) * 100)}%`

    return (
        <>
            <audio ref={audioRef} id="mp-audio" src={musicConfig.src} autoPlay loop preload="auto"
                onPlay={() => {
                    setPlaying(true)
                    setStarted(true)
                    window.dispatchEvent(new CustomEvent('mp:state', { detail: { playing: true } }))
                }}
                onPause={() => {
                    setPlaying(false)
                    window.dispatchEvent(new CustomEvent('mp:state', { detail: { playing: false } }))
                }} />

            {/* Full-viewport visualizer canvas — behind everything, no pointer events */}
            <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'block', width: '100%', height: '100%' }} />

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
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                onMouseLeave={e => (e.currentTarget.style.background = playing ? '#161616' : '#0f0f0f')}
            >
                <div style={{ color: open ? '#555' : playing ? '#FF8C55' : '#444', transition: 'color 0.15s,transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
                    {open ? <IconClose size={13} /> : <IconMusic size={15} />}
                </div>
                {!open && !started && (
                    <div style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: '#FF8C55',
                        boxShadow: '0 0 8px #FF8C55',
                        animation: 'mp-hint-pulse 1.1s ease-in-out infinite',
                    }} />
                )}
                {!open && started && (
                    <div style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: playing ? '#FF8C55' : '#2a2a2a',
                        boxShadow: playing ? '0 0 6px rgba(255,140,85,0.6)' : 'none',
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