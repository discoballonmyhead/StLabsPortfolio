import { useEffect, useRef } from 'react'
import { sampleShape } from './shapes'
import type { SectionParticleConfig } from './particles.config'

/**
 * ParticleViewer — v2
 *
 * Same visual language as v1 (bloom, depth-tinted dots + rails, spring easing,
 * orbital camera, music-synced morph clock) but restructured for performance:
 *
 *  1. Fused per-particle loop: interpolate + rotY + rotX + project + spring +
 *     depth-bucket in ONE pass (v1 made 4 full passes over 3×n floats).
 *  2. Zero per-frame allocations, zero per-particle string building. Dots are
 *     counting-sorted into 16 depth buckets (O(n), replaces the per-frame
 *     comparator sort) and each bucket is filled with ONE path + ONE fillStyle.
 *     Colors quantize to 16 depth levels — visually indistinguishable, but
 *     ~3500 `rgba(...)` template strings per frame become ~50 cached ones,
 *     rebuilt only while the palette is actually blending.
 *  3. Sub-pixel dots draw as rects (no arc tessellation cost at r < 0.75px).
 *  4. Line crossfade: v1 always stroked `cur.lines` — so after every morph the
 *     wireframe topology belonged to the PREVIOUS shape, and mid-morph the old
 *     topology stretched into spaghetti. Now the outgoing wireframe fades out
 *     while the incoming one fades in, and during holds you always see the
 *     correct mesh for the shape on screen. Lines are batched into 8 depth
 *     buckets (one stroke per bucket) with the same cull rules as v1.
 *  5. Bloom gradient cached; rebuilt only when the color or canvas size changes.
 *  6. IntersectionObserver fully stops the rAF loop when the canvas scrolls
 *     off-screen — with 4 instances on a page this is the single biggest win.
 *  7. The NEXT shape is pre-sampled during idle time in the hold phase, so the
 *     first pass through the playlist never hitches at a morph boundary.
 *  8. Frame deltas are clamped, so returning to a background tab can't fast-
 *     forward the morph clock.
 *
 * Optional config extension (backwards compatible):
 *   morphHoldNext?: number — seconds to hold shapes AFTER the first one
 *   (defaults to 2.5, the previously hardcoded song-phrase length).
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

    const MORPH_F = Math.max(1, Math.round(morphDurSecs * 60))
    const HOLD_MS = morphHoldSecs * 1000        // first shape
    const HOLD_NEXT_MS = holdNextSecs * 1000    // every shape after
    const EASE = 0.055
    const FOV = 3.0
    const MAX_DELTA = 100                       // ms — tab-switch protection

    // ── Music-synced time accumulator ──────────────────────────────────────
    let transitionCount = 0
    let holdStart = 0
    let accumulatedMs = 0
    let lastTickTime = 0
    let isFirstFrame = true
    let musicPaused = false

    const onMpState = (e: Event) => {
      const { playing } = (e as CustomEvent<{ playing: boolean }>).detail
      musicPaused = !playing
    }
    window.addEventListener('mp:state', onMpState)

    // ── Camera / morph state ───────────────────────────────────────────────
    let orbitT = 0
    const ORBIT_SPEED = 0.0004
    let dragRy = 0, dragRx = 0
    let morphT = 0, morphing = false, shapeIdx = 0
    let drag = false, lx = 0, ly = 0, raf = 0

    let cur = sampleShape(shapes[0], n)
    let nxt = sampleShape(shapes[1 % shapes.length], n)
    let cRgb = hexToRgb(colors[0 % colors.length])
    let nRgb = hexToRgb(colors[1 % colors.length])

    // Pre-sample upcoming shapes during idle time so morphs never hitch.
    const idle: (cb: () => void) => void =
      'requestIdleCallback' in window
        ? cb => (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : cb => { setTimeout(cb, 0) }
    const warm = (idx: number) => idle(() => { sampleShape(shapes[idx % shapes.length], n) })
    warm(2)

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
    let visible = true, rafActive = false, justResumed = false
    const io = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      if (visible && !rafActive) {
        rafActive = true; justResumed = true
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

    function draw(wallTime: number) {
      if (!visible) { rafActive = false; return }
      raf = requestAnimationFrame(draw)

      // ── Advance accumulated play time (paused while music is paused) ────
      if (isFirstFrame) {
        lastTickTime = wallTime
        holdStart = 0
        accumulatedMs = 0
        isFirstFrame = false
      } else if (!musicPaused && !justResumed) {
        accumulatedMs += Math.min(wallTime - lastTickTime, MAX_DELTA)
      }
      justResumed = false
      lastTickTime = wallTime

      ctx.clearRect(0, 0, cw, ch)
      const cx = cw / 2, cy = ch / 2, scale = Math.min(cw, ch) * 0.38

      // Orbital camera — always alive, even when paused
      orbitT += drag ? ORBIT_SPEED * 0.3 : ORBIT_SPEED
      const fRy = orbitT * TAU + dragRy
      const fRx = Math.sin(orbitT * TAU) * 0.52 + dragRx

      // ── Morph state machine ─────────────────────────────────────────────
      if (!morphing) {
        const requiredHoldMs = transitionCount === 0 ? HOLD_MS : HOLD_NEXT_MS
        if (accumulatedMs - holdStart >= requiredHoldMs) {
          morphing = true
          morphT = 0
          transitionCount++
          shapeIdx = (shapeIdx + 1) % shapes.length
          cur = nxt; cRgb = nRgb
          nxt = sampleShape(shapes[shapeIdx], n)
          nRgb = hexToRgb(colors[shapeIdx % colors.length])
          warm(shapeIdx + 1)
        }
      } else {
        morphT += 1 / MORPH_F
        if (morphT >= 1) {
          morphT = 1
          morphing = false
          holdStart = accumulatedMs
        }
      }

      const st = smoothstep(clamp(morphT, 0, 1))
      const inv = 1 - st
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
      window.removeEventListener('mp:state', onMpState)
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