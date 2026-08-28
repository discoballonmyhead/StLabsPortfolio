import { useEffect, useRef } from 'react'
import { sampleShape } from './shapes'
import type { ShapeName } from './shapes'
import type { SectionParticleConfig, ShapeTimelineEntry } from './particles.config'

/**
 * ParticleViewer — v4
 *
 * Same renderer as v3 (fused loop, counting-sorted depth buckets, cached LUTs,
 * bloom cache, IntersectionObserver, idle pre-sampling). What changed is the
 * MORPH CLOCK:
 *
 *  TIMELINE MODE (new, preferred) — config.timeline is an explicit list of
 *    { at, shape, color? } entries authored in site.config.ts. Each shape is
 *    FULLY FORMED at its `at` timestamp; the morph into it occupies the
 *    `morphDuration` seconds immediately before `at`. This is the "I decide
 *    the timestamps" mode: nothing is derived from hold/cycle arithmetic.
 *
 *    Efficiency: the per-frame resolve is O(1) amortized. A segment CURSOR
 *    remembers which timeline entry we're inside and only steps forward when
 *    currentTime crosses the next boundary (one comparison per frame in the
 *    steady state). Seeks backwards and the track's loop wrap are detected
 *    (t dropped by >0.25s) and reset the cursor. No unbounded index growth,
 *    no per-frame floor/div cycle math, no modulo chains — v3 accumulated
 *    baseIdx forever and re-derived it from scratch every frame.
 *
 *  LEGACY CYCLE MODE — if no timeline is provided (the section configs),
 *    the old morphHold / morphHoldNext / morphDuration cycle still applies,
 *    so nothing else on the site changes.
 *
 * Both modes are pure functions of the <audio id="mp-audio"> currentTime, so
 * pausing the song pauses the shapes, mid-song mounts land on the correct
 * shape, and morph speed is refresh-rate independent — all unchanged from v3.
 */

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
const DOT_B = 16                      // dot depth buckets
const LINE_B = 8                      // line depth buckets
const ALPHA_REP = [0.54, 0.73, 0.91]  // quantized per-particle alpha classes

export default function ParticleViewer({ config, style, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    const {
      shapes, colors,
      particleCount: n = 700,
      morphHold: morphHoldSecs = 3.0,
      morphDuration: morphDurSecs = 1.5,
    } = config
    const holdNextSecs = (config as { morphHoldNext?: number }).morphHoldNext ?? 2.8

    const farRgb = hexToRgb(config.colorFar ?? '#050810')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    // Spring chase rates (per frame): EASE at rest, MORPH_EASE while a morph
    // is in flight. THIS was why fast timelines felt sluggish — the blend
    // finished on schedule, but at 0.055 the dots were still drifting toward
    // it long after, smearing every 2.8s step into the next. During a morph
    // (and a short tail after) the spring now chases ~3× harder so shapes
    // LAND on their timestamp, then relaxes back for the buttery hold drift.
    const HOLD_EASE = config.holdEase ?? 0.055
    const MORPH_EASE = config.morphEase ?? 0.17
    let snapEnv = 0        // 1 while morphing, decays after → blends the two rates
    const FOV = 3.0

    // ── Song-position clock ─────────────────────────────────────────────
    let audioEl: HTMLAudioElement | null = null
    function getSongTime(): number {
      if (!audioEl) audioEl = document.getElementById('mp-audio') as HTMLAudioElement | null
      return audioEl?.currentTime ?? 0
    }

    // ── Timeline (site.config.ts-authored) vs legacy cycle ─────────────
    const timeline: ShapeTimelineEntry[] | null =
      config.timeline && config.timeline.length > 0
        ? [...config.timeline].sort((a, b) => a.at - b.at)
        : null
    const lastSeg = timeline ? timeline.length - 1 : 0

    /** Shape name for a resolved index (timeline entries clamp at the end;
     *  legacy mode cycles through the shapes array). */
    const shapeNameAt = (i: number): ShapeName =>
      timeline ? timeline[Math.min(i, lastSeg)].shape : shapes[i % shapes.length]
    const colorHexAt = (i: number): string =>
      (timeline && timeline[Math.min(i, lastSeg)].color) ?? colors[i % colors.length]

    // Legacy cycle constants
    const FIRST_CYCLE_S = morphHoldSecs + morphDurSecs
    const LATER_CYCLE_S = holdNextSecs + morphDurSecs

    // Timeline cursor — O(1) amortized per frame
    let segCursor = 0
    let lastSongT = 0

    /** Pure w.r.t. song time (cursor is just a cache): resolves the shape
     *  we're holding-on-or-morphing-FROM and the morph progress. In timeline
     *  mode, the morph into entry k+1 fills the morphDuration seconds BEFORE
     *  timeline[k+1].at, so each shape is fully formed exactly at its own
     *  timestamp. */
    function resolveMorphState(t: number): { baseIdx: number; morphT: number } {
      if (timeline) {
        if (t < lastSongT - 0.25) segCursor = 0          // loop wrap / seek back
        lastSongT = t
        while (segCursor > 0 && t < timeline[segCursor].at) segCursor--
        while (segCursor < lastSeg && t >= timeline[segCursor + 1].at) segCursor++
        const next = timeline[segCursor + 1]
        if (!next) return { baseIdx: segCursor, morphT: 0 }
        const start = Math.max(next.at - morphDurSecs, timeline[segCursor].at)
        const denom = next.at - start
        if (denom <= 0) return { baseIdx: segCursor, morphT: 1 }
        if (t < start) return { baseIdx: segCursor, morphT: 0 }
        return { baseIdx: segCursor, morphT: (t - start) / denom }
      }
      // Legacy cycle mode (section configs without a timeline)
      if (t < morphHoldSecs) return { baseIdx: 0, morphT: 0 }
      if (t < FIRST_CYCLE_S) return { baseIdx: 0, morphT: (t - morphHoldSecs) / morphDurSecs }
      const rel = t - FIRST_CYCLE_S
      const cycle = Math.floor(rel / LATER_CYCLE_S)
      const within = rel - cycle * LATER_CYCLE_S
      const baseIdx = 1 + cycle
      if (within < holdNextSecs) return { baseIdx, morphT: 0 }
      return { baseIdx, morphT: (within - holdNextSecs) / morphDurSecs }
    }

    // ── Camera / morph state ───────────────────────────────────────────────
    let orbitT = 0
    const ORBIT_SPEED = 0.0004
    let dragRy = 0, dragRx = 0
    let drag = false, lx = 0, ly = 0, raf = 0

    const initial = resolveMorphState(getSongTime())
    let curIdx = initial.baseIdx
    let cur = sampleShape(shapeNameAt(curIdx), n)
    let nxt = sampleShape(shapeNameAt(curIdx + 1), n)
    let cRgb = hexToRgb(colorHexAt(curIdx))
    let nRgb = hexToRgb(colorHexAt(curIdx + 1))

    // Pre-sample upcoming shapes during idle time so morphs never hitch.
    // In timeline mode indices past the last entry are skipped (they'd just
    // clamp to a shape that's already cached anyway).
    const idle: (cb: () => void) => void =
      'requestIdleCallback' in window
        ? cb => (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : cb => { setTimeout(cb, 0) }
    const warm = (idx: number) => {
      if (timeline && idx > lastSeg) return
      idle(() => { sampleShape(shapeNameAt(idx), n) })
    }
    warm(curIdx + 2)

    // ── Per-particle buffers (allocated once) ──────────────────────────────
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

    // Counting-sort scratch
    const dotBucket = new Uint8Array(n)
    const counts = new Uint32Array(DOT_B)
    const bStart = new Uint32Array(DOT_B)
    const cursor = new Uint32Array(DOT_B)
    const sorted = new Uint32Array(n)
    let lineScratch = new Uint8Array(1024)

    // ── Cached styles — rebuilt only when the foreground color changes ─────
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

    // Bloom gradient cache
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

    // ── Visibility: fully stop the loop when scrolled off-screen ──────────
    let visible = true, rafActive = false
    const io = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      if (visible && !rafActive) {
        rafActive = true
        raf = requestAnimationFrame(draw)
      }
    })
    io.observe(canvas)

    /** Batched wireframe pass for one shape's line set, at a crossfade weight. */
    function drawLineSet(lines: Uint32Array, weight: number, scale: number) {
      const L = lines.length >> 1
      if (weight < 0.04 || L === 0) return
      if (lineScratch.length < L) lineScratch = new Uint8Array(L)
      const longLen2 = (scale * 0.18) * (scale * 0.18)

      // Pass 1: cull + classify into depth buckets
      for (let li = 0; li < L; li++) {
        const ia = lines[li * 2], ib = lines[li * 2 + 1]
        if (ia >= n || ib >= n) { lineScratch[li] = 255; continue }
        const za = pz[ia], zb = pz[ib]
        if (za > 0.5 && zb > 0.5) { lineScratch[li] = 255; continue }
        const zmid = (za + zb) * 0.5
        const dx = px[ia] - px[ib], dy = py[ia] - py[ib]
        if (dx * dx + dy * dy > longLen2 && zmid > -0.1) { lineScratch[li] = 255; continue }
        const tD = clamp((-zmid + 0.5) / 1.5, 0, 1)
        let b = (tD * LINE_B) | 0
        if (b >= LINE_B) b = LINE_B - 1
        lineScratch[li] = LINE_ALPHA[b] * weight < 0.012 ? 255 : b
      }
      // Pass 2: one stroke per bucket
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
      if (!visible) { rafActive = false; return }
      raf = requestAnimationFrame(draw)

      ctx.clearRect(0, 0, cw, ch)
      const cx = cw / 2, cy = ch / 2, scale = Math.min(cw, ch) * 0.38

      // Orbital camera — always alive, even when paused
      orbitT += drag ? ORBIT_SPEED * 0.3 : ORBIT_SPEED
      const fRy = orbitT * TAU + dragRy
      const fRx = Math.sin(orbitT * TAU) * 0.52 + dragRx

      // ── Morph state — resolved directly from the song's actual position ──
      const { baseIdx, morphT: rawMorphT } = resolveMorphState(getSongTime())
      if (baseIdx !== curIdx) {
        if (baseIdx === curIdx + 1) {
          cur = nxt; cRgb = nRgb
        } else {
          // mid-song mount, a loop wrap, a seek, or a long pause — jump there
          cur = sampleShape(shapeNameAt(baseIdx), n)
          cRgb = hexToRgb(colorHexAt(baseIdx))
        }
        nxt = sampleShape(shapeNameAt(baseIdx + 1), n)
        nRgb = hexToRgb(colorHexAt(baseIdx + 1))
        warm(baseIdx + 2)
        curIdx = baseIdx
      }

      const st = smoothstep(clamp(rawMorphT, 0, 1))
      const inv = 1 - st
      // Snap envelope: pinned to 1 while a morph is in flight, then decays
      // over ~10 frames so dots finish settling fast before relaxing back
      // to the floaty hold spring.
      snapEnv = st > 0 && st < 1 ? 1 : snapEnv * 0.82
      const EASE = HOLD_EASE + (MORPH_EASE - HOLD_EASE) * snapEnv
      const fg: [number, number, number] = [
        Math.round(lerp(cRgb[0], nRgb[0], st)),
        Math.round(lerp(cRgb[1], nRgb[1], st)),
        Math.round(lerp(cRgb[2], nRgb[2], st)),
      ]
      const fgKey = (fg[0] << 16) | (fg[1] << 8) | fg[2]
      if (fgKey !== lutFgKey) { rebuildLUT(fg); lutFgKey = fgKey; bloomKey = '' }

      // ── Fused loop: interp → rotY → rotX → project → spring → bucket ────
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

      // ── Bloom (cached gradient) ─────────────────────────────────────────
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

      // ── Wireframes: crossfade outgoing → incoming topology ──────────────
      drawLineSet(cur.lines, inv, scale)
      drawLineSet(nxt.lines, st, scale)

      // ── Dots — near buckets first, far on top (matches v1 draw order) ───
      for (let b = DOT_B - 1; b >= 0; b--) {
        const s0 = bStart[b], s1 = s0 + counts[b]
        if (s0 === s1) continue
        const tDb = (b + 0.5) / DOT_B
        const persp = 0.7 + tDb * 0.3

        if (tDb < 0.15) {
          // Very far: dim, shrunken, one batch
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

        // Soft halo around large near dots
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

        // Main dots, batched per alpha class: one path + one fill each
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

    rafActive = true
    raf = requestAnimationFrame(draw)

    const onDown = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY }
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      dragRy += (e.clientX - lx) * 0.004
      dragRx += (e.clientY - ly) * 0.004
      lx = e.clientX; ly = e.clientY
    }
    const onUp = () => { drag = false }

    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [config])

  return (
    <canvas ref={canvasRef} className={className}
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab', touchAction: 'none', ...style }}
    />
  )
}