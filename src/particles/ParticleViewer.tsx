import { useEffect, useRef } from 'react'
import { sampleShape } from './shapes'
import type { SectionParticleConfig } from './particles.config'

interface Props {
  config: SectionParticleConfig
  style?: React.CSSProperties
  className?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '').padEnd(6, '0')
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function smoothstep(t: number) { return t * t * (3 - 2 * t) }
function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v }

export default function ParticleViewer({ config, style, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    // Restored standard context so your CSS background and glow works properly
    const ctx = canvas.getContext('2d')!

    const {
      shapes, colors,
      particleCount: n = 700,
    } = config

    const farRgb = hexToRgb(config.colorFar ?? '#050810')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const MORPH_F = 100
    const EASE = 0.055
    const FOV = 3.0

    // Audio Sync State
    let isPlaying = (window as any).__MUSIC_PLAYING__ === true
    const handlePlayState = (e: any) => { isPlaying = e.detail.playing }
    window.addEventListener('mp:playstate', handlePlayState)

    // Strict Time-Based Logic
    let transitionCount = 0
    let holdStart = 0
    let isFirstFrame = true
    let lastTime = 0
    let runningTime = 0
    let orbitT = 0
    const ORBIT_SPEED = 0.0004
    let dragRy = 0, dragRx = 0

    let morphT = 0, morphing = false, shapeIdx = 0
    let drag = false, lx = 0, ly = 0, raf = 0

    // ── NEW: Strict Line Visibility Toggle ──
    let lineGlobalAlpha = 1

    let cur = sampleShape(shapes[0], n)
    let nxt = sampleShape(shapes[1 % shapes.length], n)
    let cRgb = hexToRgb(colors[0 % colors.length])
    let nRgb = hexToRgb(colors[1 % colors.length])

    const px = new Float32Array(n), py = new Float32Array(n)
    const ptx = new Float32Array(n), pty = new Float32Array(n), pz = new Float32Array(n)
    const int3 = new Float32Array(n * 3), bufA = new Float32Array(n * 3), bufB = new Float32Array(n * 3)

    // Dot sizing tiers
    const psz = Float32Array.from({ length: n }, () => {
      const r = Math.random()
      if (r < 0.60) return 0.5 + Math.random() * 0.3
      if (r < 0.88) return 0.9 + Math.random() * 0.4
      return 1.4 + Math.random() * 0.4
    })
    const palpha = Float32Array.from({ length: n }, () => 0.5 + Math.random() * 0.5)

    let cw = 0, ch = 0

    function resize() {
      cw = canvas.offsetWidth; ch = canvas.offsetHeight
      canvas.width = cw * dpr; canvas.height = ch * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (let i = 0; i < n; i++) if (px[i] === 0) { px[i] = Math.random() * cw; py[i] = Math.random() * ch }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function buildInterp(t: number) {
      const st = smoothstep(clamp(t, 0, 1)), inv = 1 - st
      for (let i = 0; i < n * 3; i++) int3[i] = cur.positions[i] * inv + nxt.positions[i] * st
    }

    function lerpRgb(t: number): [number, number, number] {
      const st = smoothstep(clamp(t, 0, 1))
      return [
        Math.round(lerp(cRgb[0], nRgb[0], st)),
        Math.round(lerp(cRgb[1], nRgb[1], st)),
        Math.round(lerp(cRgb[2], nRgb[2], st)),
      ]
    }

    function doRotY(src: Float32Array, dst: Float32Array, a: number) {
      const cos = Math.cos(a), sin = Math.sin(a)
      for (let i = 0; i < n * 3; i += 3) {
        dst[i] = src[i] * cos + src[i + 2] * sin
        dst[i + 1] = src[i + 1]
        dst[i + 2] = -src[i] * sin + src[i + 2] * cos
      }
    }
    function doRotX(src: Float32Array, dst: Float32Array, a: number) {
      const cos = Math.cos(a), sin = Math.sin(a)
      for (let i = 0; i < n * 3; i += 3) {
        dst[i] = src[i]
        dst[i + 1] = src[i + 1] * cos - src[i + 2] * sin
        dst[i + 2] = src[i + 1] * sin + src[i + 2] * cos
      }
    }

    function draw(time: number) {
      raf = requestAnimationFrame(draw)

      const dt = time - (lastTime || time)
      lastTime = time

      if (isPlaying) runningTime += dt

      if (isFirstFrame && isPlaying) {
        holdStart = runningTime
        isFirstFrame = false
      }

      // Restored transparent clear so your background glows work
      ctx.clearRect(0, 0, cw, ch)

      const cx = cw / 2, cy = ch / 2, scale = Math.min(cw, ch) * 0.38

      if (!drag) orbitT += ORBIT_SPEED
      else orbitT += ORBIT_SPEED * 0.3

      const baseRy = orbitT * Math.PI * 2
      const baseRx = Math.sin(orbitT * Math.PI * 2) * 0.52
      const fRy = baseRy + dragRy
      const fRx = baseRx + dragRx

      if (!morphing) {
        if (!isFirstFrame) {
          const requiredHoldMs = transitionCount === 0 ? 4500 : 2150
          if (runningTime - holdStart >= requiredHoldMs) {
            morphing = true
            morphT = 0
            transitionCount++
            shapeIdx = (shapeIdx + 1) % shapes.length
            cur = nxt; cRgb = nRgb
            nxt = sampleShape(shapes[shapeIdx], n)
            nRgb = hexToRgb(colors[shapeIdx % colors.length])
          }
        }
      } else {
        if (isPlaying) {
          morphT += 1 / MORPH_F
          if (morphT >= 1) {
            morphT = 1
            morphing = false
            holdStart = runningTime
          }
        }
      }

      // ── LINE VISIBILITY TOGGLE ──
      if (morphing) {
        lineGlobalAlpha = 0 // Instant cut to zero during transition (NO spiderwebs)
      } else {
        lineGlobalAlpha += (1 - lineGlobalAlpha) * 0.08 // Fade in smoothly when stable
      }

      buildInterp(morphT)
      const fg = lerpRgb(morphT)

      doRotY(int3, bufA, fRy)
      doRotX(bufA, bufB, fRx)

      for (let i = 0; i < n; i++) {
        const x = bufB[i * 3], y = bufB[i * 3 + 1], z = bufB[i * 3 + 2]
        const d = FOV / (FOV + z + 0.0001)
        ptx[i] = cx + x * scale * d
        pty[i] = cy + y * scale * d
        pz[i] = z
        px[i] += (ptx[i] - px[i]) * EASE
        py[i] += (pty[i] - py[i]) * EASE
      }

      const br = scale * 1.6
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, br)
      bloom.addColorStop(0, `rgba(${fg[0]},${fg[1]},${fg[2]},0.10)`)
      bloom.addColorStop(0.35, `rgba(${fg[0]},${fg[1]},${fg[2]},0.04)`)
      bloom.addColorStop(1, `rgba(${fg[0]},${fg[1]},${fg[2]},0.00)`)
      ctx.beginPath(); ctx.arc(cx, cy, br, 0, Math.PI * 2)
      ctx.fillStyle = bloom; ctx.fill()

      // ── DRAW HARD STRUCTURAL LINES ONLY ──
      // Only draw lines if we are NOT morphing.
      if (lineGlobalAlpha > 0.01) {
        const lines = cur.lines
        for (let i = 0; i < lines.length; i += 2) {
          const ia = lines[i], ib = lines[i + 1]
          if (ia >= n || ib >= n) continue

          const za = pz[ia], zb = pz[ib]
          if (za > 0.5 && zb > 0.5) continue
          const zmid = (za + zb) * 0.5

          const dx = px[ia] - px[ib], dy = py[ia] - py[ib]
          const screenLen = Math.sqrt(dx * dx + dy * dy)

          // Drop long glitchy lines completely
          if (screenLen > scale * 0.5) continue

          const tD = clamp((-zmid + 0.5) / 1.5, 0, 1)

          // Hard opacity, completely synced with the line fade toggle
          const alpha = (0.3 + tD * 0.7) * lineGlobalAlpha

          const r = Math.round(lerp(farRgb[0], fg[0], tD))
          const g = Math.round(lerp(farRgb[1], fg[1], tD))
          const b = Math.round(lerp(farRgb[2], fg[2], tD))

          ctx.beginPath()
          ctx.moveTo(px[ia], py[ia])
          ctx.lineTo(px[ib], py[ib])
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
          ctx.lineWidth = 1.2 // Constant hard thickness
          ctx.stroke()
        }
      }

      // ── DRAW DISTINCT DOTS (NO FAINT DUST) ──
      const order = new Uint16Array(n)
      for (let i = 0; i < n; i++) order[i] = i
      order.sort((a, b) => pz[a] - pz[b])

      for (let si = 0; si < n; si++) {
        const i = order[si]
        const z = pz[i], tD = clamp((-z + 1) / 2, 0, 1)
        const r = Math.round(lerp(farRgb[0], fg[0], tD))
        const g = Math.round(lerp(farRgb[1], fg[1], tD))
        const b = Math.round(lerp(farRgb[2], fg[2], tD))

        const sz = psz[i] * (0.8 + tD * 0.2)

        // Make dots crisp and distinct instead of fading them into oblivion
        const a = palpha[i] * (0.4 + tD * 0.6)
        ctx.beginPath(); ctx.arc(px[i], py[i], sz, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`; ctx.fill()
      }
    }

    raf = requestAnimationFrame(draw)

    const onDown = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY }
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      dragRy += (e.clientX - lx) * 0.004; dragRx += (e.clientY - ly) * 0.004
      lx = e.clientX; ly = e.clientY
    }
    const onUp = () => { drag = false }

    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('mp:playstate', handlePlayState)
    }
  }, [config])

  return (
    <canvas ref={canvasRef} className={className}
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab', touchAction: 'none', ...style }}
    />
  )
}