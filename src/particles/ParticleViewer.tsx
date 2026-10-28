import { useEffect, useRef } from 'react'
import { sampleShape } from './shapes'
import type { ShapeName } from './shapes'
import type { SectionParticleConfig } from './particles.config'
import { useSystemTheme } from '../hooks/useSystemTheme'

interface Props {
  config: SectionParticleConfig
  style?: React.CSSProperties
  className?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '').padEnd(6, '0')
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

const TAU = Math.PI * 2
const DOT_B = 16
const LINE_B = 8
const ALPHA_REP = [0.54, 0.73, 0.91]

// Deepest z a wave point can reach after the 0.12 tilt (fill points go to ±1.125).
// Used so even the farthest, most perspective-shrunk points still reach the screen edges.
const WAVE_Z_MAX = 1.2
// Extra bleed past the screen edges so the wave never visibly ends.
const WAVE_BLEED = 1.1

export default function ParticleViewer({ config, style, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const theme = useSystemTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    const {
      shapes, colors,
      particleCount: n = 500,
      morphHold: rawHoldSecs = 3.0,
      morphDuration: rawDurSecs = 1.5,
    } = config
    const holdNextSecs = Math.max(0.1, config.morphHoldNext ?? 2.5)

    // morphDuration must never be 0: resolveMorphState divides by it. The old
    // hero config shipped morphDuration: 0 and only avoided the divide because
    // morphHold was 99999, so the branch was unreachable. Floor it here so a
    // bad config degrades to a fast morph instead of producing Infinity and
    // freezing every particle at NaN.
    const morphDurSecs = Math.max(0.05, rawDurSecs)
    const morphHoldSecs = Math.max(0, rawHoldSecs)

    const activeColorFar = isDark ? (config.colorFar ?? '#000000') : '#FAFAFA'
    const activeColors = isDark
      ? colors
      : ['#111827', '#374151', '#4B5563', '#6B7280', '#000000']

    const farRgb = hexToRgb(activeColorFar)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const HOLD_EASE = config.holdEase ?? 0.055
    const MORPH_EASE = config.morphEase ?? 0.17
    let snapEnv = 0
    const FOV = 3.0

    // ── The clock ────────────────────────────────────────────────────────────
    // 'song' reads the real playback position off the music player, so shapes
    // advance with the track and hold still while it is paused. The <audio>
    // element loops, so currentTime returns to 0 at the end of the track and
    // the sequence starts over on its own.
    //
    // The lookup is retried until it succeeds rather than cached as null,
    // because this viewer can mount before MusicPlayer does. Caching the miss
    // was what left the hero frozen on the logo.
    //
    // If the page genuinely has no player, song time would sit at 0 forever
    // and nothing would ever morph, so that case falls through to wall time.
    const useSongClock = (config.clock ?? 'song') === 'song'
    const bootedAt = performance.now()

    let audioEl: HTMLAudioElement | null = null
    function wallTime(): number {
      return (performance.now() - bootedAt) / 1000
    }
    function getClockTime(): number {
      if (!useSongClock) return wallTime()
      if (!audioEl) {
        audioEl = document.getElementById('mp-audio') as HTMLAudioElement | null
      }
      if (!audioEl) return wallTime()
      return audioEl.currentTime
    }

    const shapeNameAt = (i: number): ShapeName => shapes[i % shapes.length]
    const colorHexAt = (i: number): string => activeColors[i % activeColors.length]

    const FIRST_CYCLE_S = morphHoldSecs + morphDurSecs
    const LATER_CYCLE_S = holdNextSecs + morphDurSecs

    function resolveMorphState(t: number): { baseIdx: number; morphT: number } {
      if (t < morphHoldSecs) return { baseIdx: 0, morphT: 0 }
      if (t < FIRST_CYCLE_S) return { baseIdx: 0, morphT: (t - morphHoldSecs) / morphDurSecs }
      const rel = t - FIRST_CYCLE_S
      const cycle = Math.floor(rel / LATER_CYCLE_S)
      const within = rel - cycle * LATER_CYCLE_S
      const baseIdx = 1 + cycle
      if (within < holdNextSecs) return { baseIdx, morphT: 0 }
      return { baseIdx, morphT: (within - holdNextSecs) / morphDurSecs }
    }

    let orbitT = 0
    const ORBIT_SPEED = config.autoRotateSpeed ?? 0.0004
    const dragRy = 0, dragRx = 0
    const drag = false
    let raf = 0

    let waveTime = 0
    const WAVE_SPEED = 0.002

    const initial = resolveMorphState(getClockTime())
    let curIdx = initial.baseIdx
    let cur = sampleShape(shapeNameAt(curIdx), n)
    let nxt = sampleShape(shapeNameAt(curIdx + 1), n)
    let cRgb = hexToRgb(colorHexAt(curIdx))
    let nRgb = hexToRgb(colorHexAt(curIdx + 1))

    const idle: (cb: () => void) => void =
      'requestIdleCallback' in window
        ? cb => (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : cb => { setTimeout(cb, 0) }
    const warm = (idx: number) => {
      idle(() => { sampleShape(shapeNameAt(idx), n) })
    }
    warm(curIdx + 2)

    const px = new Float32Array(n)
    const py = new Float32Array(n)
    const pz = new Float32Array(n)

    const psz = Float32Array.from({ length: n }, () => {
      const r = Math.random()
      if (r < 0.60) return 0.4 + Math.random() * 0.4
      if (r < 0.88) return 0.8 + Math.random() * 0.5
      return 1.3 + Math.random() * 0.5
    })
    const pclass = Uint8Array.from({ length: n }, () => (Math.random() * 3) | 0)

    const dotBucket = new Uint8Array(n)
    const counts = new Uint32Array(DOT_B)
    const bStart = new Uint32Array(DOT_B)
    const cursor = new Uint32Array(DOT_B)
    const sorted = new Uint32Array(n)
    let lineScratch = new Uint8Array(1024)

    let lutFgKey = -1
    const dotStyle = new Array<string>(DOT_B * 3)
    const dimStyle = new Array<string>(DOT_B)
    const haloStyle = new Array<string>(DOT_B)
    const lineR = new Uint8Array(LINE_B)
    const lineG = new Uint8Array(LINE_B)
    const lineBl = new Uint8Array(LINE_B)
    const LINE_ALPHA = new Float32Array(LINE_B)
    const LINE_W = new Float32Array(LINE_B)

    for (let b = 0; b < LINE_B; b++) {
      const tD = (b + 0.5) / LINE_B
      LINE_ALPHA[b] = Math.pow(tD, 1.5) * 0.52
      LINE_W[b] = lerp(0.25, 0.85, tD)
    }

    function rebuildLUT(fg: [number, number, number]) {
      for (let b = 0; b < DOT_B; b++) {
        const tD = (b + 0.5) / DOT_B
        const r = Math.round(lerp(farRgb[0], fg[0], tD))
        const g = Math.round(lerp(farRgb[1], fg[1], tD))
        const bl = Math.round(lerp(farRgb[2], fg[2], tD))
        dimStyle[b] = `rgba(${r},${g},${bl},0.06)`
        haloStyle[b] = `rgba(${r},${g},${bl},${(tD * 0.03).toFixed(4)})`
        for (let c = 0; c < 3; c++) {
          const a = ALPHA_REP[c] * (0.12 + tD * 0.88)
          dotStyle[b * 3 + c] = `rgba(${r},${g},${bl},${a.toFixed(3)})`
        }
      }
      for (let b = 0; b < LINE_B; b++) {
        const tD = (b + 0.5) / LINE_B
        lineR[b] = Math.round(lerp(farRgb[0], fg[0], tD))
        lineG[b] = Math.round(lerp(farRgb[1], fg[1], tD))
        lineBl[b] = Math.round(lerp(farRgb[2], fg[2], tD))
      }
    }

    let bloomGrad: CanvasGradient | null = null
    let bloomKey = ''

    let cw = 0, ch = 0
    function resize() {
      cw = canvas.offsetWidth; ch = canvas.offsetHeight
      canvas.width = cw * dpr; canvas.height = ch * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bloomKey = ''
      for (let i = 0; i < n; i++) if (px[i] === 0) { px[i] = Math.random() * cw; py[i] = Math.random() * ch }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let disposed = false
    let visible = true, rafActive = false
    const io = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      if (visible && !rafActive && !disposed) {
        rafActive = true
        raf = requestAnimationFrame(draw)
      }
    })
    io.observe(canvas)

    // cullLong = false keeps long segments (needed for the stretched wave, whose
    // strand segments get longer than the normal cull threshold on wide screens).
    function drawLineSet(lines: Uint32Array, weight: number, scale: number, cullLong = true) {
      const L = lines.length >> 1
      if (weight < 0.04 || L === 0) return
      if (lineScratch.length < L) lineScratch = new Uint8Array(L)
      const longLen2 = (scale * 0.18) * (scale * 0.18)

      for (let li = 0; li < L; li++) {
        const ia = lines[li * 2], ib = lines[li * 2 + 1]
        if (ia >= n || ib >= n) { lineScratch[li] = 255; continue }
        const za = pz[ia], zb = pz[ib]
        if (za > 0.5 && zb > 0.5) { lineScratch[li] = 255; continue }
        const zmid = (za + zb) * 0.5
        if (cullLong) {
          const dx = px[ia] - px[ib], dy = py[ia] - py[ib]
          if (dx * dx + dy * dy > longLen2 && zmid > -0.1) { lineScratch[li] = 255; continue }
        }
        const tD = clamp((-zmid + 0.5) / 1.5, 0, 1)
        let b = (tD * LINE_B) | 0
        if (b >= LINE_B) b = LINE_B - 1
        lineScratch[li] = LINE_ALPHA[b] * weight < 0.012 ? 255 : b
      }
      for (let b = 0; b < LINE_B; b++) {
        let any = false
        ctx.beginPath()
        for (let li = 0; li < L; li++) {
          if (lineScratch[li] !== b) continue
          const ia = lines[li * 2], ib = lines[li * 2 + 1]
          ctx.moveTo(px[ia], py[ia])
          ctx.lineTo(px[ib], py[ib])
          any = true
        }
        if (!any) continue
        ctx.strokeStyle = `rgba(${lineR[b]},${lineG[b]},${lineBl[b]},${(LINE_ALPHA[b] * weight).toFixed(4)})`
        ctx.lineWidth = LINE_W[b]
        ctx.stroke()
      }
    }

    function draw() {
      if (disposed || !visible) { rafActive = false; return }
      raf = requestAnimationFrame(draw)

      waveTime += WAVE_SPEED

      ctx.clearRect(0, 0, cw, ch)
      const cx = cw / 2, cy = ch / 2, scale = Math.min(cw, ch) * 0.38

      // Wave length in world units so that it spans the FULL canvas width.
      // Divide by the smallest perspective factor (deepest point) so even the
      // back of the wave reaches both edges, then add a little bleed.
      const waveStretch = cw > 0
        ? (cw / scale) * ((FOV + WAVE_Z_MAX) / FOV) * WAVE_BLEED
        : 5.0

      orbitT += drag ? ORBIT_SPEED * 0.3 : ORBIT_SPEED

      const rawFRy = orbitT * TAU + dragRy
      const rawFRx = Math.sin(orbitT * TAU) * 0.52 + dragRx

      const { baseIdx, morphT: rawMorphT } = resolveMorphState(getClockTime())

      const curIsWave = shapeNameAt(baseIdx) === 'wave'
      const nxtIsWave = shapeNameAt(baseIdx + 1) === 'wave'

      const st = smoothstep(clamp(rawMorphT, 0, 1))
      const inv = 1 - st

      let waveLock = 0
      if (curIsWave && nxtIsWave) waveLock = 1
      else if (curIsWave) waveLock = inv
      else if (nxtIsWave) waveLock = st

      const fRy = lerp(rawFRy, 0, waveLock)
      const fRx = lerp(rawFRx, 0.12, waveLock)

      if (baseIdx !== curIdx) {
        if (baseIdx === curIdx + 1) {
          cur = nxt; cRgb = nRgb
        } else {
          cur = curIsWave
            ? sampleShape('wave', n, waveTime, waveStretch)
            : sampleShape(shapeNameAt(baseIdx), n)
          cRgb = hexToRgb(colorHexAt(baseIdx))
        }
        nxt = nxtIsWave
          ? sampleShape('wave', n, waveTime, waveStretch)
          : sampleShape(shapeNameAt(baseIdx + 1), n)
        nRgb = hexToRgb(colorHexAt(baseIdx + 1))
        warm(baseIdx + 2)
        curIdx = baseIdx
      }

      // The 'wave' shape is deliberately uncached because it animates, so each
      // of these calls rebuilds n point arrays and copies them into fresh
      // Float32Arrays. At n=3500 that is roughly 200k allocations a second and
      // the GC pauses are visible.
      //
      // It is left in place so 'wave' keeps working inside a morph sequence,
      // but for a page whose whole background IS a wave, use WaveField
      // instead: it allocates once and writes numbers into the same buffers
      // every frame. That is what the status pages render.
      if (curIsWave) cur = sampleShape('wave', n, waveTime, waveStretch)
      if (nxtIsWave) nxt = sampleShape('wave', n, waveTime, waveStretch)

      snapEnv = st > 0 && st < 1 ? 1 : snapEnv * 0.82
      const EASE = HOLD_EASE + (MORPH_EASE - HOLD_EASE) * snapEnv
      const fg: [number, number, number] = [
        Math.round(lerp(cRgb[0], nRgb[0], st)),
        Math.round(lerp(cRgb[1], nRgb[1], st)),
        Math.round(lerp(cRgb[2], nRgb[2], st)),
      ]
      const fgKey = (fg[0] << 16) | (fg[1] << 8) | fg[2]
      if (fgKey !== lutFgKey) { rebuildLUT(fg); lutFgKey = fgKey; bloomKey = '' }

      const cosY = Math.cos(fRy), sinY = Math.sin(fRy)
      const cosX = Math.cos(fRx), sinX = Math.sin(fRx)
      const A = cur.positions, Bp = nxt.positions
      counts.fill(0)

      for (let i = 0; i < n; i++) {
        const j = i * 3
        let x: number, y: number, z: number
        if (st === 1) { x = Bp[j]; y = Bp[j + 1]; z = Bp[j + 2] }
        else if (st === 0) { x = A[j]; y = A[j + 1]; z = A[j + 2] }
        else {
          x = A[j] * inv + Bp[j] * st
          y = A[j + 1] * inv + Bp[j + 1] * st
          z = A[j + 2] * inv + Bp[j + 2] * st
        }
        const x1 = x * cosY + z * sinY
        const z1 = -x * sinY + z * cosY
        const y2 = y * cosX - z1 * sinX
        const z2 = y * sinX + z1 * cosX

        const d = FOV / (FOV + z2 + 0.0001)
        px[i] += (cx + x1 * scale * d - px[i]) * EASE
        py[i] += (cy + y2 * scale * d - py[i]) * EASE
        pz[i] = z2

        const tD = (1 - z2) * 0.5
        let b = tD <= 0 ? 0 : (tD * DOT_B) | 0
        if (b >= DOT_B) b = DOT_B - 1
        dotBucket[i] = b
        counts[b]++
      }

      let acc = 0
      for (let b = 0; b < DOT_B; b++) { bStart[b] = acc; cursor[b] = acc; acc += counts[b] }
      for (let i = 0; i < n; i++) sorted[cursor[dotBucket[i]]++] = i

      const br = scale * 1.6
      const key = `${fgKey}:${cw}x${ch}`
      if (key !== bloomKey || !bloomGrad) {
        bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, br)
        bloomGrad.addColorStop(0, `rgba(${fg[0]},${fg[1]},${fg[2]},0.10)`)
        bloomGrad.addColorStop(0.35, `rgba(${fg[0]},${fg[1]},${fg[2]},0.04)`)
        bloomGrad.addColorStop(0.7, `rgba(${fg[0]},${fg[1]},${fg[2]},0.01)`)
        bloomGrad.addColorStop(1, `rgba(${fg[0]},${fg[1]},${fg[2]},0.00)`)
        bloomKey = key
      }
      ctx.beginPath(); ctx.arc(cx, cy, br, 0, TAU)
      ctx.fillStyle = bloomGrad; ctx.fill()

      drawLineSet(cur.lines, inv, scale, !curIsWave)
      drawLineSet(nxt.lines, st, scale, !nxtIsWave)

      for (let b = DOT_B - 1; b >= 0; b--) {
        const s0 = bStart[b], s1 = s0 + counts[b]
        if (s0 === s1) continue
        const tDb = (b + 0.5) / DOT_B
        const persp = 0.7 + tDb * 0.3

        if (tDb < 0.15) {
          ctx.beginPath()
          for (let si = s0; si < s1; si++) {
            const i = sorted[si]
            const r = psz[i] * persp * 0.6
            if (r < 0.75) ctx.rect(px[i] - r, py[i] - r, r * 2, r * 2)
            else { ctx.moveTo(px[i] + r, py[i]); ctx.arc(px[i], py[i], r, 0, TAU) }
          }
          ctx.fillStyle = dimStyle[b]
          ctx.fill()
          continue
        }

        if (tDb > 0.65) {
          let any = false
          ctx.beginPath()
          for (let si = s0; si < s1; si++) {
            const i = sorted[si]
            if (psz[i] <= 1.0) continue
            const r = psz[i] * persp * 2.2
            ctx.moveTo(px[i] + r, py[i]); ctx.arc(px[i], py[i], r, 0, TAU)
            any = true
          }
          if (any) { ctx.fillStyle = haloStyle[b]; ctx.fill() }
        }

        for (let c = 0; c < 3; c++) {
          let any = false
          ctx.beginPath()
          for (let si = s0; si < s1; si++) {
            const i = sorted[si]
            if (pclass[i] !== c) continue
            const r = psz[i] * persp
            if (r < 0.75) ctx.rect(px[i] - r, py[i] - r, r * 2, r * 2)
            else { ctx.moveTo(px[i] + r, py[i]); ctx.arc(px[i], py[i], r, 0, TAU) }
            any = true
          }
          if (any) { ctx.fillStyle = dotStyle[b * 3 + c]; ctx.fill() }
        }
      }
    }

    // Stop this loop when config/theme changes or the component unmounts,
    // otherwise an old loop keeps drawing over the new one.
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [config, isDark])

  return (
    <div style={{ background: 'transparent', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} className={className}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', ...style }}
      />
    </div>
  )
}