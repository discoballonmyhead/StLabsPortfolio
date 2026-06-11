/**
 * shapes.ts
 * Base: original proven shapes from document 17.
 * Changes from original:
 * 1. Added _cache so sampleShape never recomputes same (name,n)
 * 2. icosphere/tesseract/dodecahedron: fill dots no longer connected
 * back to structural vertices (removed the spoke lines)
 * 3. androGalaxy: Gaussian bulge dots only, no lines
 * 4. REMOVED ALL INTERNAL/MIDDLE-PLANE SPINES. Lines are now strictly
 * used for outer bounding edges/rails. Volume density is defined purely
 * by floating dots to prevent torsion webbing.
 */

const TAU = Math.PI * 2
const PHI = (1 + Math.sqrt(5)) / 2
// Snaps random values to steps to create a visible dot grid / diamond mesh
const snap = (val: number, steps: number) => Math.floor(val * steps) / steps

export interface ShapeData {
  positions: Float32Array
  lines: Uint32Array
  mesh?: Uint32Array // <-- Added optional mesh array
  coreEnd?: number
}

function makeShape(pts: number[][], lines: number[], coreEnd = 0, mesh: number[] = []): ShapeData {
  return {
    positions: toF32(norm95(pts)),
    lines: new Uint32Array(lines),
    mesh: new Uint32Array(mesh),
    coreEnd
  }
}

function norm95(pts: number[][], target = 0.88): number[][] {
  const rs = pts.map(p => Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2])).sort((a, b) => a - b)
  const p95 = rs[Math.floor(rs.length * 0.95)] || 1
  const s = target / p95
  return pts.map(p => [p[0] * s, p[1] * s, p[2] * s])
}

function toF32(pts: number[][]): Float32Array {
  const o = new Float32Array(pts.length * 3)
  pts.forEach((p, i) => { o[i * 3] = p[0]; o[i * 3 + 1] = p[1]; o[i * 3 + 2] = p[2] })
  return o
}



function rotX(p: number[], deg: number): number[] {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r)
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const _cache = new Map<string, ShapeData>()

// ── 1. GALAXY ─────────────────────────────────────────────────────────────────
function galaxy(n: number): ShapeData {
  const ARMS = 3, SPINE = 80, TILT = 25
  const pts: number[][] = [], lines: number[] = []
  for (let arm = 0; arm < ARMS; arm++) {
    const base = (arm / ARMS) * TAU, start = pts.length
    for (let i = 0; i < SPINE; i++) {
      const t = i / (SPINE - 1), r = 0.04 + Math.pow(t, 1.4) * 0.95, theta = base + t * 3.8
      const y = (Math.random() - .5) * 0.04 * (1 - t)
      pts.push(rotX([r * Math.cos(theta), y, r * Math.sin(theta)], TILT))
    }
    for (let i = 0; i < SPINE - 1; i++) lines.push(start + i, start + i + 1)
  }
  const fill = n - pts.length
  for (let i = 0; i < fill; i++) {
    const arm = Math.floor(Math.random() * ARMS), base = (arm / ARMS) * TAU
    const t = Math.min(-Math.log(Math.random() + 1e-6) * 0.22, 0.98)
    const spread = 0.08 + t * 0.12, theta = base + t * 3.8 + (Math.random() - .5) * spread * 2
    const y = (Math.random() - .5) * 0.12 * (1 - t * 0.7)
    pts.push(rotX([t * Math.cos(theta), y, t * Math.sin(theta)], TILT))
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 2. ANDRO GALAXY ───────────────────────────────────────────────────────────
function androGalaxy(n: number): ShapeData {
  const ARMS = 4, TILT_RAD = 28 * Math.PI / 180
  const cosT = Math.cos(TILT_RAD), sinT = Math.sin(TILT_RAD)
  function tilt(x: number, y: number, z: number): [number, number, number] {
    return [x, y * cosT - z * sinT, y * sinT + z * cosT]
  }
  const pts: number[][] = [], lines: number[] = []

  // Central core (dots only, no lines to prevent webbing)
  const CENTRAL_SPINE = 40
  for (let i = 0; i < CENTRAL_SPINE; i++) {
    const t = i / (CENTRAL_SPINE - 1)
    const r = 0.02 + t * 0.18, wind = t * 1.8 * Math.PI * 2
    pts.push(tilt(r * Math.cos(wind), 0, r * Math.sin(wind)))
  }

  const BULGE = Math.floor(n * 0.08)
  for (let i = 0; i < BULGE; i++) {
    const u1 = Math.random(), u2 = Math.random()
    const mag = Math.sqrt(-2 * Math.log(u1 + 1e-9)) * 0.055, ang = u2 * Math.PI * 2
    pts.push(tilt(mag * Math.cos(ang), mag * Math.sin(ang) * 0.4, (Math.random() - .5) * 0.035))
  }

  // Spiral arm rails
  const SPINE_PTS = 90
  for (let arm = 0; arm < ARMS; arm++) {
    const baseAngle = (arm / ARMS) * Math.PI * 2, spineStart = pts.length
    for (let i = 0; i < SPINE_PTS; i++) {
      const tL = i / (SPINE_PTS - 1), t = Math.pow(tL, 0.7)
      const r = 0.015 + Math.pow(t, 1.2) * 0.92, wind = t * 2.8 * Math.PI * 2, theta = baseAngle + wind
      const z = Math.sin(wind * 0.18) * 0.025 * t
      const [px, py, pz] = tilt(r * Math.cos(theta), z, r * Math.sin(theta))
      pts.push([px, py, pz])
    }
    for (let i = 0; i < SPINE_PTS - 1; i++) lines.push(spineStart + i, spineStart + i + 1)
  }

  const fillCount = n - pts.length
  for (let i = 0; i < fillCount; i++) {
    const arm = Math.floor(Math.random() * ARMS), baseAngle = (arm / ARMS) * Math.PI * 2
    const raw = -Math.log(Math.random() + 1e-9) * 0.18, t = Math.min(raw, 0.99)
    const r = 0.015 + Math.pow(t, 1.2) * 0.92, wind = t * 2.8 * Math.PI * 2, theta = baseAngle + wind
    const spread = 0.018 + t * 0.11, scatter = (Math.random() - .5) * spread * 2, scatterR = r + scatter
    const thickness = 0.022 * (1 - t * 0.65)
    const z = (Math.random() - .5) * thickness * 2 + Math.sin(wind * 0.18) * 0.025 * t
    const [px, py, pz] = tilt(scatterR * Math.cos(theta + scatter * 0.3), z, scatterR * Math.sin(theta + scatter * 0.3))
    pts.push([px, py, pz])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 3. ICOSPHERE ─────────────────────────────────────────────────────────────
function icosphere(n: number): ShapeData {
  const mag = Math.sqrt(1 + PHI * PHI)
  const V: number[][] = [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]]
    .map(v => [v[0] / mag, v[1] / mag, v[2] / mag])
  const FACES = [[0, 1, 8], [0, 8, 4], [0, 4, 5], [0, 5, 9], [0, 9, 1], [1, 6, 8], [8, 6, 10], [8, 10, 4], [4, 10, 2], [4, 2, 5], [5, 2, 11], [5, 11, 9], [9, 11, 7], [9, 7, 1], [1, 7, 6], [3, 6, 7], [3, 7, 11], [3, 11, 2], [3, 2, 10], [3, 10, 6]]
  const edgeSet = new Set<string>(), edges: [number, number][] = []
  for (const [a, b, c] of FACES)
    for (const [p, q] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const key = `${Math.min(p, q)}-${Math.max(p, q)}`
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([p, q]) }
    }
  const pts: number[][] = [], lines: number[] = []
  const CORE = 0.38
  V.forEach(v => pts.push([v[0] * CORE, v[1] * CORE, v[2] * CORE]))
  for (const [a, b] of edges) lines.push(a, b)
  const coreEnd = pts.length
  const outerStart = pts.length
  pts.push(...V)
  for (const [a, b] of edges) lines.push(outerStart + a, outerStart + b)

  while (pts.length < n) {
    const e = edges[Math.floor(Math.random() * edges.length)], t = Math.random()
    pts.push([V[e[0]][0] + (V[e[1]][0] - V[e[0]][0]) * t + (Math.random() - .5) * 0.012,
    V[e[0]][1] + (V[e[1]][1] - V[e[0]][1]) * t + (Math.random() - .5) * 0.012,
    V[e[0]][2] + (V[e[1]][2] - V[e[0]][2]) * t + (Math.random() - .5) * 0.012])
  }
  return makeShape(pts.slice(0, n), lines, coreEnd)
}
// ── 4. TORUS KNOT (2,3) ───────────────────────────────────────────────────────
function torusKnot(n: number): ShapeData {
  const p = 2, q = 3, R = 0.55, r = 0.2, TUBE = 0.09
  const pts: number[][] = [], lines: number[] = []

  const SPINE = Math.floor(n * 0.18)
  for (let ri = 0; ri < 3; ri++) {
    const angleOffset = (ri / 3) * TAU
    const rs = pts.length;
    for (let i = 0; i < SPINE; i++) {
      const t = (i / SPINE) * TAU * p
      const cx = (R + r * Math.cos(q * t / p)) * Math.cos(t)
      const cy = r * Math.sin(q * t / p)
      const cz = (R + r * Math.cos(q * t / p)) * Math.sin(t)

      const nx = Math.cos(t), nz = Math.sin(t)
      pts.push([
        cx + Math.cos(angleOffset) * TUBE * nx,
        cy + Math.sin(angleOffset) * TUBE,
        cz + Math.cos(angleOffset) * TUBE * nz
      ])
    }
    for (let i = 0; i < SPINE - 1; i++) lines.push(rs + i, rs + i + 1)
    lines.push(rs + SPINE - 1, rs)
  }

  // Equidistant Dotted Diamond Mesh
  const remaining = n - pts.length
  const STRANDS = 12 // 6 forward, 6 backward spirals to weave diamonds
  const DOTS_PER = Math.floor(remaining / STRANDS)

  for (let s = 0; s < STRANDS; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (STRANDS / 2))

    for (let i = 0; i < DOTS_PER; i++) {
      const t = (i / DOTS_PER) * TAU * p
      const cx = (R + r * Math.cos(q * t / p)) * Math.cos(t)
      const cy = r * Math.sin(q * t / p)
      const cz = (R + r * Math.cos(q * t / p)) * Math.sin(t)

      const phi = dir * t * 8 + phase // Wraps tightly around the tube
      pts.push([cx + TUBE * Math.cos(phi) * 0.4, cy + TUBE * Math.sin(phi), cz + TUBE * Math.cos(phi) * 0.4])
    }
  }

  // Pad rounding leftovers so array matches exactly
  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 5. SHELL ──────────────────────────────────────────────────────────────────
function shell(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const SPINE = Math.floor(n * 0.28)

  // Edge rim instead of central spine
  const rimStart = pts.length
  for (let i = 0; i < SPINE; i++) {
    const t = (i / (SPINE - 1)) * TAU * 3.5, r = 0.12 * Math.exp(0.17 * t)
    const rr = r * 0.55
    pts.push([(r + rr) * Math.cos(t), r * Math.sin(t) * 0.65, r * 0.1 * t])
  }
  for (let i = 0; i < SPINE - 1; i++) lines.push(rimStart + i, rimStart + i + 1)

  // Dot volume
  while (pts.length < n) {
    const t = Math.min(-Math.log(Math.random() + 1e-6) * 1.2, TAU * 3.5), r = 0.12 * Math.exp(0.17 * t)
    const phi = Math.random() * TAU, off = r * 0.7 * Math.random()
    pts.push([r * Math.cos(t) + off * Math.cos(phi) * 0.3, r * Math.sin(t) * 0.65 + off * Math.sin(phi) * 0.3, r * 0.1 * t + off * 0.1])
  }
  return makeShape(pts.slice(0, n), lines)
}
// ── 6. MÖBIUS TUBE ────────────────────────────────────────────────────────────
function mobiusTube(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const W = 0.32, LOOP = Math.floor(n * 0.25)

  const rail1Start = pts.length
  for (let i = 0; i < LOOP; i++) {
    const t = (i / LOOP) * TAU, c2 = Math.cos(t / 2), s2 = Math.sin(t / 2), ct = Math.cos(t), st = Math.sin(t)
    pts.push([(1 + -W * c2) * ct, -W * s2, (1 + -W * c2) * st])
  }
  const rail2Start = pts.length
  for (let i = 0; i < LOOP; i++) {
    const t = (i / LOOP) * TAU, c2 = Math.cos(t / 2), s2 = Math.sin(t / 2), ct = Math.cos(t), st = Math.sin(t)
    pts.push([(1 + W * c2) * ct, W * s2, (1 + W * c2) * st])
  }

  for (let i = 0; i < LOOP - 1; i++) {
    lines.push(rail1Start + i, rail1Start + i + 1)
    lines.push(rail2Start + i, rail2Start + i + 1)
  }
  lines.push(rail1Start + LOOP - 1, rail1Start)
  lines.push(rail2Start + LOOP - 1, rail2Start)

  // Dotted Diamond Weave on the surface
  const remaining = n - pts.length
  const STRANDS = 16
  const DOTS_PER = Math.floor(remaining / STRANDS)

  for (let s = 0; s < STRANDS; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (STRANDS / 2))

    for (let i = 0; i < DOTS_PER; i++) {
      const u = (i / (DOTS_PER - 1)) * TAU
      const v = Math.sin(dir * u * 4 + phase) * W // Oscillates edge-to-edge

      const c2 = Math.cos(u / 2), s2 = Math.sin(u / 2), ct = Math.cos(u), st = Math.sin(u)
      pts.push([(1 + v * c2) * ct, v * s2, (1 + v * c2) * st])
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}
// ── 7. TESSERACT ──────────────────────────────────────────────────────────────
function tesseract(n: number): ShapeData {
  const proj = (x: number, y: number, z: number, w: number) => { const s = 1 / (2.2 - w); return [x * s, y * s, z * s] }
  const V4: [number, number, number, number][] = []
  for (let a = -1; a <= 1; a += 2) for (let b = -1; b <= 1; b += 2) for (let c = -1; c <= 1; c += 2) for (let d = -1; d <= 1; d += 2) V4.push([a, b, c, d])
  const V3 = V4.map(([a, b, c, d]) => proj(a, b, c, d))
  const edges: [number, number][] = []
  for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++)
    if (V4[i].reduce((s, v, k) => s + (v !== V4[j][k] ? 1 : 0), 0) === 1) edges.push([i, j])

  const pts: number[][] = [], lines: number[] = []
  const inner = V4.map((v, i) => ({ i, w: v[3] })).filter(x => x.w === -1).map(x => x.i)
  const outer = V4.map((v, i) => ({ i, w: v[3] })).filter(x => x.w === 1).map(x => x.i)
  const order = [...inner, ...outer], remap = new Map(order.map((vi, ni) => [vi, ni]))

  order.forEach(vi => pts.push(V3[vi]))
  for (const [a, b] of edges) lines.push(remap.get(a)!, remap.get(b)!)

  // Dotted Lines: Equidistant packing precisely on the edges
  const remaining = n - pts.length
  const DOTS_PER_EDGE = Math.floor(remaining / edges.length)

  for (const e of edges) {
    for (let i = 0; i < DOTS_PER_EDGE; i++) {
      const t = i / (DOTS_PER_EDGE - 1)
      pts.push([
        V3[e[0]][0] + (V3[e[1]][0] - V3[e[0]][0]) * t,
        V3[e[0]][1] + (V3[e[1]][1] - V3[e[0]][1]) * t,
        V3[e[0]][2] + (V3[e[1]][2] - V3[e[0]][2]) * t
      ])
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines, 8)
}
// ── 8. TREFOIL ────────────────────────────────────────────────────────────────
function trefoil(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const TUBE = 0.13, SPINE = Math.floor(n * 0.18)

  const path = (t: number) => [
    (Math.sin(t) + 2 * Math.sin(2 * t)) / 4,
    (Math.cos(t) - 2 * Math.cos(2 * t)) / 4,
    -Math.sin(3 * t) / 4
  ]

  for (let ri = 0; ri < 2; ri++) {
    const sign = ri === 0 ? 1 : -1
    const rs = pts.length
    for (let i = 0; i < SPINE; i++) {
      const t = (i / SPINE) * TAU
      const [cx, cy, cz] = path(t)
      pts.push([cx + Math.cos(t) * TUBE * sign, cy + Math.sin(t) * TUBE * sign, cz])
    }
    for (let i = 0; i < SPINE - 1; i++) lines.push(rs + i, rs + i + 1)
    lines.push(rs + SPINE - 1, rs)
  }

  // Dotted Diamond Wrap
  const remaining = n - pts.length
  const STRANDS = 12
  const DOTS_PER = Math.floor(remaining / STRANDS)

  for (let s = 0; s < STRANDS; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (STRANDS / 2))
    for (let i = 0; i < DOTS_PER; i++) {
      const t = (i / DOTS_PER) * TAU
      const [cx, cy, cz] = path(t)
      const phi = dir * t * 14 + phase // high twist for diamonds
      pts.push([cx + TUBE * Math.cos(phi) * 0.5, cy + TUBE * Math.sin(phi), cz + TUBE * 0.3])
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}
// ── 9. DNA HELIX ──────────────────────────────────────────────────────────────
function dnaHelix(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const TURNS = 3.5, RADIUS = 0.55, HEIGHT = 1.8, RISE = HEIGHT / (TURNS * TAU)
  const OFFSETS = [-30 * Math.PI / 180, 30 * Math.PI / 180, Math.PI]
  const SPP = Math.floor(n * 0.16)

  // Keep outer strands
  for (let s = 0; s < 3; s++) {
    const off = OFFSETS[s], start = pts.length
    for (let i = 0; i < SPP; i++) {
      const t = (i / (SPP - 1)) * TURNS * TAU
      pts.push([RADIUS * Math.cos(t + off), t * RISE - HEIGHT / 2, RADIUS * Math.sin(t + off)])
    }
    for (let i = 0; i < SPP - 1; i++) lines.push(start + i, start + i + 1)
  }

  // Dots for rungs, no connecting lines
  const RUNGS = Math.floor(TURNS * 9)
  for (let ri = 0; ri < RUNGS; ri++) {
    const t = (ri / RUNGS) * TURNS * TAU
    for (let k = 0; k < 3; k++) {
      const frac = k / 2
      const ax = RADIUS * Math.cos(t + OFFSETS[0]), az = RADIUS * Math.sin(t + OFFSETS[0])
      const bx = RADIUS * Math.cos(t + OFFSETS[1]), bz = RADIUS * Math.sin(t + OFFSETS[1])
      pts.push([ax + (bx - ax) * frac, t * RISE - HEIGHT / 2, az + (bz - az) * frac])
    }
    if (ri % 2 === 0) {
      for (let k = 0; k < 3; k++) {
        const frac = k / 2
        const ax = RADIUS * Math.cos(t + OFFSETS[1]), az = RADIUS * Math.sin(t + OFFSETS[1])
        const bx = RADIUS * Math.cos(t + OFFSETS[2]), bz = RADIUS * Math.sin(t + OFFSETS[2])
        pts.push([ax + (bx - ax) * frac, t * RISE - HEIGHT / 2, az + (bz - az) * frac])
      }
    }
  }

  while (pts.length < n) {
    const s = Math.floor(Math.random() * 3), off = OFFSETS[s], t = Math.random() * TURNS * TAU
    pts.push([RADIUS * Math.cos(t + off) + (Math.random() - .5) * 0.055, t * RISE - HEIGHT / 2 + (Math.random() - .5) * 0.03, RADIUS * Math.sin(t + off) + (Math.random() - .5) * 0.055])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 10. HYPERBOLOID ───────────────────────────────────────────────────────────
function hyperboloid(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const a = 0.55, c = 0.85, CP = 32

  // Top and bottom rims
  for (const sign of [-1, 1]) {
    const v = sign * 1.1, r = a * Math.sqrt(1 + (v * v) / (c * c)), cs = pts.length
    for (let i = 0; i < CP; i++) { const th = (i / CP) * TAU; pts.push([r * Math.cos(th), v * 0.72, r * Math.sin(th)]) }
    for (let i = 0; i < CP; i++) lines.push(cs + i, cs + (i + 1) % CP)
  }

  // Waist removed from lines to prevent internal crossing
  const RULED = 24, OFF = Math.floor(CP / 3)
  for (let i = 0; i < RULED; i++) {
    const j = Math.floor((i / RULED) * CP), t2 = (j + OFF) % CP
    const va = pts[j], vb = pts[CP + t2], PR = 8
    for (let k = 0; k < PR; k++) {
      const t = (k + 1) / (PR + 1)
      pts.push([va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t, va[2] + (vb[2] - va[2]) * t])
    }
  }
  while (pts.length < n) {
    const t = Math.random() * TAU, v = (Math.random() - .5) * 2.5, r = a * Math.sqrt(1 + (v * v) / (c * c))
    pts.push([r * Math.cos(t) * 0.9, v * 0.7, r * Math.sin(t) * 0.9])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 11. SUPER-ELLIPSOID ───────────────────────────────────────────────────────
function superEllipsoid(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const e1 = 0.3, e2 = 0.3
  const sg = (x: number) => x < 0 ? -1 : 1, sp = (b: number, e: number) => sg(b) * Math.pow(Math.abs(b) + 1e-9, e)
  const LPL = 48

  // 3 orthogonal rings instead of messy lat/lon grid
  const eqS = pts.length;
  for (let k = 0; k < LPL; k++) { const v = (k / LPL) * TAU; pts.push([sp(Math.cos(v), e2), 0, sp(Math.sin(v), e2)]); }
  for (let k = 0; k < LPL; k++) lines.push(eqS + k, eqS + (k + 1) % LPL);

  const mxS = pts.length;
  for (let k = 0; k < LPL; k++) { const u = (k / LPL) * TAU; pts.push([sp(Math.cos(u), e1), sp(Math.sin(u), e1), 0]); }
  for (let k = 0; k < LPL; k++) lines.push(mxS + k, mxS + (k + 1) % LPL);

  const myS = pts.length;
  for (let k = 0; k < LPL; k++) { const u = (k / LPL) * TAU; pts.push([0, sp(Math.sin(u), e1), sp(Math.cos(u), e1)]); }
  for (let k = 0; k < LPL; k++) lines.push(myS + k, myS + (k + 1) % LPL);

  while (pts.length < n) {
    const u = (Math.random() - .5) * Math.PI, v = (Math.random() - .5) * TAU
    pts.push([sp(Math.cos(u), e1) * sp(Math.cos(v), e2), sp(Math.sin(u), e1), sp(Math.cos(u), e1) * sp(Math.sin(v), e2)])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 12. DODECAHEDRON ──────────────────────────────────────────────────────────
function dodecahedron(n: number): ShapeData {
  const s = 1 / Math.sqrt(3), V: number[][] = []
  for (let a of [-s, s]) for (let b of [-s, s]) for (let c of [-s, s]) V.push([a, b, c])
  const ip = 1 / (PHI * Math.sqrt(3)), pp = PHI / Math.sqrt(3)
  for (let s1 of [-1, 1]) for (let s2 of [-1, 1]) { V.push([0, s1 * ip, s2 * pp]); V.push([s1 * ip, s2 * pp, 0]); V.push([s1 * pp, 0, s2 * ip]) }
  const ELEN = 2 * ip * PHI, edges: [number, number][] = []
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const dx = V[i][0] - V[j][0], dy = V[i][1] - V[j][1], dz = V[i][2] - V[j][2]
    if (Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - ELEN) < 0.05) edges.push([i, j])
  }
  const pts: number[][] = [], lines: number[] = []
  pts.push(...V)
  for (const [a, b] of edges) lines.push(a, b)

  while (pts.length < n) {
    const e = edges[Math.floor(Math.random() * edges.length)], t = Math.random()
    pts.push([V[e[0]][0] + (V[e[1]][0] - V[e[0]][0]) * t + (Math.random() - .5) * 0.01,
    V[e[0]][1] + (V[e[1]][1] - V[e[0]][1]) * t + (Math.random() - .5) * 0.01,
    V[e[0]][2] + (V[e[1]][2] - V[e[0]][2]) * t + (Math.random() - .5) * 0.01])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 13. STELLATED OCTAHEDRON ─────────────────────────────────────────────────
function stellated(n: number): ShapeData {
  const s = 0.55
  const V = [
    [s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s],
    [-s, -s, -s], [-s, s, s], [s, -s, s], [s, s, -s]
  ]
  const edges = [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
    [4, 5], [4, 6], [4, 7], [5, 6], [5, 7], [6, 7]
  ]

  const pts: number[][] = [], lines: number[] = []
  pts.push(...V)
  for (const [a, b] of edges) lines.push(a, b)

  // Equidistant dotted lines reinforcing the tetrahedra
  const remaining = n - pts.length
  const DOTS_PER_EDGE = Math.floor(remaining / edges.length)

  for (const e of edges) {
    for (let i = 0; i < DOTS_PER_EDGE; i++) {
      const t = i / (DOTS_PER_EDGE - 1)
      pts.push([
        V[e[0]][0] + (V[e[1]][0] - V[e[0]][0]) * t,
        V[e[0]][1] + (V[e[1]][1] - V[e[0]][1]) * t,
        V[e[0]][2] + (V[e[1]][2] - V[e[0]][2]) * t
      ])
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}
// ── 14. LISSAJOUS ─────────────────────────────────────────────────────────────
function lissajous(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const a = 3, b = 2, PHASE = Math.PI / 4, TUBE = 0.08
  const SPINE = Math.floor(n * 0.2)

  for (let ri = 0; ri < 2; ri++) {
    const sign = ri === 0 ? 1 : -1
    const rs = pts.length
    for (let i = 0; i < SPINE; i++) {
      const t = (i / SPINE) * TAU
      pts.push([Math.sin(a * t) + Math.cos(a * t) * TUBE * sign, Math.sin(b * t + PHASE), Math.sin(t) + Math.cos(t) * TUBE * sign])
    }
    for (let i = 0; i < SPINE - 1; i++) lines.push(rs + i, rs + i + 1)
    lines.push(rs + SPINE - 1, rs)
  }

  const remaining = n - pts.length
  const STRANDS = 12
  const DOTS_PER = Math.floor(remaining / STRANDS)

  for (let s = 0; s < STRANDS; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (STRANDS / 2))
    for (let i = 0; i < DOTS_PER; i++) {
      const t = (i / DOTS_PER) * TAU
      const cx = Math.sin(a * t), cy = Math.sin(b * t + PHASE), cz = Math.sin(t)
      const phi = dir * t * 10 + phase
      pts.push([cx + TUBE * Math.cos(phi) * 0.4, cy + TUBE * Math.sin(phi), cz + TUBE * Math.cos(phi) * 0.4])
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 15. ROSE CURVE (Clover) ───────────────────────────────────────────────────
function roseCurve(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const LAYERS = 3, PTS_PER = Math.floor(n * 0.15)

  for (let layer = 0; layer < LAYERS; layer++) {
    const z = ((layer / (LAYERS - 1)) - .5) * 0.5, layerStart = pts.length
    for (let i = 0; i < PTS_PER; i++) {
      const t = (i / PTS_PER) * TAU, r = Math.cos(3 * t)
      pts.push([r * Math.cos(t), r * Math.sin(t), z + r * 0.15 * Math.sin(2 * t)])
    }
    for (let i = 0; i < PTS_PER - 1; i++) lines.push(layerStart + i, layerStart + i + 1)
    lines.push(layerStart + PTS_PER - 1, layerStart)
  }

  // Intersecting dotted diagonals traversing the height
  const remaining = n - pts.length
  const STRANDS = 20
  const DOTS_PER = Math.floor(remaining / STRANDS)

  for (let s = 0; s < STRANDS; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (STRANDS / 2))

    for (let i = 0; i < DOTS_PER; i++) {
      const zNorm = i / (DOTS_PER - 1)
      const z = (zNorm - 0.5) * 0.5
      const t = phase + dir * zNorm * TAU * 1.5 // Diagonal wind
      const r = Math.cos(3 * t)
      pts.push([r * Math.cos(t), r * Math.sin(t), z + r * 0.15 * Math.sin(2 * t)])
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}
// ── 16. STATELESS LOGO ────────────────────────────────────────────────────────
function statelessLogo(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  function poly(shape: [number, number][], closed: boolean, steps: number, z = 0) {
    if (shape.length < 2) return
    const s0 = pts.length
    for (let i = 0; i < shape.length - 1; i++) {
      const [ax, ay] = shape[i], [bx, by] = shape[i + 1]
      for (let k = 0; k < steps; k++) {
        const t = k / steps; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t, z])
      }
    }
    pts.push([...shape[shape.length - 1], z] as [number, number, number])
    const cnt = pts.length - s0
    for (let i = 0; i < cnt - 1; i++) lines.push(s0 + i, s0 + i + 1)
    if (closed && cnt > 2) lines.push(s0 + cnt - 1, s0)
  }
  function ring(cx: number, cy: number, r: number, npts: number) {
    const s0 = pts.length
    for (let k = 0; k < npts; k++) {
      const phi = (k / npts) * Math.PI * 2; pts.push([cx + r * Math.cos(phi), cy + r * Math.sin(phi), 0])
    }
    for (let k = 0; k < npts; k++) lines.push(s0 + k, s0 + (k + 1) % npts)
  }
  function coreFill(cx: number, cy: number, r: number, count: number) {
    for (let k = 0; k < count; k++) {
      const ri = r * Math.sqrt(Math.random()), phi = Math.random() * Math.PI * 2
      pts.push([cx + ri * Math.cos(phi), cy + ri * Math.sin(phi), 0])
    }
  }
  const outerV: [number, number][] = [[-0.5, 0.866], [0.5, 0.866], [1.0, 0.0], [0.5, -0.866], [-0.5, -0.866], [-1.0, 0.0]]
  const innerV: [number, number][] = [[-0.454, 0.796], [0.460, 0.796], [0.943, 0.0], [0.460, -0.796], [-0.454, -0.796], [-0.935, 0.0]]
  poly(outerV, true, 14); poly(innerV, true, 12)
  poly([[-0.031, 0.821], [0.0, 0.821], [0.031, 0.821]], false, 3)
  poly([[-0.031, -0.751], [0.0, -0.751], [0.031, -0.751]], false, 3)
  poly([[0.765, 0.267], [0.786, 0.267]], false, 4); poly([[0.774, -0.252], [0.794, -0.252]], false, 4)
  poly([[-0.768, -0.252], [-0.787, -0.252]], false, 4); poly([[-0.778, 0.267], [-0.759, 0.267]], false, 4)
  const iHex: [number, number][] = [[-0.157, 0.271], [-0.315, -0.001], [-0.157, -0.274], [0.157, -0.274], [0.315, -0.001], [0.157, 0.271]]
  poly(iHex, true, 10)
  poly([[-0.391, -0.000], [-0.664, -0.001], [-0.729, -0.080], [-0.428, -0.595], [-0.330, -0.576], [-0.195, -0.340], [-0.392, -0.002]], true, 4)
  poly([[0.198, -0.338], [-0.195, -0.341], [-0.330, -0.576], [-0.294, -0.671], [0.303, -0.668], [0.335, -0.573]], true, 4)
  poly([[0.664, 0.004], [0.391, 0.003], [0.198, -0.338], [0.335, -0.573], [0.435, -0.588], [0.729, -0.073], [0.664, -0.002]], true, 4)
  poly([[0.428, 0.594], [0.194, 0.340], [0.391, 0.003], [0.664, 0.004], [0.727, 0.081], [0.428, 0.594]], true, 4)
  poly([[0.294, 0.671], [-0.300, 0.668], [-0.334, 0.574], [-0.197, 0.338], [0.194, 0.340], [0.329, 0.576], [0.293, 0.665]], true, 4)
  const HC_CENTRES: [number, number, number][] = [[-0.742, 0.000, 0], [-0.369, -0.647, 0], [0.378, -0.643, 0], [0.742, 0.000, 0], [0.370, 0.644, 0], [-0.375, 0.641, 0]]
  for (const [cx, cy] of HC_CENTRES) { ring(cx, cy, 0.082, 36); ring(cx, cy, 0.048, 36); coreFill(cx, cy, 0.048 * 0.85, 5) }
  const hcCoreEnd = pts.length
  poly([[-0.434, 0.590], [-0.487, 0.343], [-0.550, 0.381]], false, 8)
  const DC = [-0.5495, 0.3109] as [number, number]
  ring(DC[0], DC[1], 0.071, 36); ring(DC[0], DC[1], 0.040, 36); coreFill(DC[0], DC[1], 0.035, 8)
  const faceFills: [number, number][][] = [
    [[-0.4, -0.15], [-0.55, -0.28], [-0.5, -0.5], [-0.3, -0.45], [-0.25, -0.2]],
    [[-0.15, -0.35], [0.15, -0.35], [0.2, -0.6], [-0.15, -0.62]],
    [[0.25, -0.2], [0.55, -0.28], [0.5, -0.5], [0.3, -0.48], [0.2, -0.32]],
    [[0.25, 0.2], [0.5, 0.28], [0.5, 0.5], [0.3, 0.48]],
    [[-0.15, 0.35], [0.15, 0.35], [0.2, 0.6], [-0.15, 0.62]],
  ]
  const fillPerFace = Math.floor((n - pts.length) / (faceFills.length + 1))
  for (const face of faceFills) {
    for (let i = 0; i < fillPerFace; i++) {
      const a = face[Math.floor(Math.random() * face.length)], b = face[Math.floor(Math.random() * face.length)]
      const t = Math.random()
      pts.push([a[0] + (b[0] - a[0]) * t + (Math.random() - .5) * 0.06, a[1] + (b[1] - a[1]) * t + (Math.random() - .5) * 0.06, (Math.random() - .5) * 0.008])
    }
  }
  while (pts.length < n) {
    const angle = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.65
    pts.push([r * Math.cos(angle) * 0.9, r * Math.sin(angle) * 0.9, (Math.random() - .5) * 0.01])
  }
  return { positions: toF32(pts.slice(0, n)), lines: new Uint32Array(lines.filter(i => i < n)), coreEnd: hcCoreEnd }
}


// ── BLACK HOLE ─────────────────────────────────────────────────────────────────
function blackHole(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []

  const RS = 0.08
  const DISC_INNER = RS * 3
  const DISC_OUTER = 0.92
  const TILT_RAD = 15 * Math.PI / 180
  const cosT = Math.cos(TILT_RAD), sinT = Math.sin(TILT_RAD)

  const td = (x: number, z: number, yOff = 0): [number, number, number] =>
    [x, x * sinT * 0.3 + yOff, z * cosT]

  const CORE_N = Math.floor(n * 0.06)
  for (let i = 0; i < CORE_N; i++) {
    const u1 = Math.random(), u2 = Math.random()
    const r = Math.sqrt(-2 * Math.log(u1 + 1e-9)) * RS * 0.35
    const phi = u2 * TAU
    const th = Math.acos(2 * Math.random() - 1)
    pts.push([r * Math.sin(th) * Math.cos(phi), r * Math.sin(th) * Math.sin(phi) * 0.5, r * Math.cos(th)])
  }
  const coreEnd = pts.length

  const PHOTON_R = RS * 1.5, PHOTON_N = 48
  const photonStart = pts.length
  for (let i = 0; i < PHOTON_N; i++) {
    const phi = (i / PHOTON_N) * TAU
    const [x, , z] = td(PHOTON_R * Math.cos(phi), PHOTON_R * Math.sin(phi))
    pts.push([x, 0, z])
  }
  for (let i = 0; i < PHOTON_N; i++) lines.push(photonStart + i, photonStart + (i + 1) % PHOTON_N)

  const RING_COUNT = 10, RING_PTS = 40
  for (let ri = 0; ri < RING_COUNT; ri++) {
    const t = ri / (RING_COUNT - 1)
    const r = DISC_INNER + (DISC_OUTER - DISC_INNER) * (1 - Math.exp(-t * 2.5)) / (1 - Math.exp(-2.5))
    const lensWarp = Math.exp(-r / (DISC_INNER * 2)) * 0.12
    const rStart = pts.length
    for (let i = 0; i < RING_PTS; i++) {
      const phi = (i / RING_PTS) * TAU
      const lensY = lensWarp * Math.sin(phi)
      const [x, y, z] = td(r * Math.cos(phi), r * Math.sin(phi), lensY)
      pts.push([x, y, z])
    }
    for (let i = 0; i < RING_PTS; i++) lines.push(rStart + i, rStart + (i + 1) % RING_PTS)
  }

  // Spiral inflows - dots only to prevent inner web crossing
  const SPIRAL_ARMS = 2, SPIRAL_PTS = 60
  for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
    const baseAngle = (arm / SPIRAL_ARMS) * Math.PI
    for (let i = 0; i < SPIRAL_PTS; i++) {
      const t = i / (SPIRAL_PTS - 1)
      const r = DISC_OUTER * Math.exp(-t * 1.8) * (1 - 0.15 * Math.sin(t * TAU))
      if (r < DISC_INNER) break
      const omega = Math.sqrt(1 / Math.max(r, DISC_INNER)) * 2.2
      const phi = baseAngle + t * omega * TAU * 0.8
      const [x, y, z] = td(r * Math.cos(phi), r * Math.sin(phi))
      pts.push([x, y, z])
    }
  }

  const JET_PTS = 30, JET_LEN = 0.85
  for (const sign of [-1, 1]) {
    const jStart = pts.length
    for (let i = 0; i < JET_PTS; i++) {
      const t = i / (JET_PTS - 1)
      const width = RS * 0.4 * Math.pow(t, 0.3) * (1 + t * 0.8)
      const phi = i * 2.4
      pts.push([width * Math.cos(phi), sign * t * JET_LEN, width * Math.sin(phi)])
    }
    for (let i = 0; i < JET_PTS - 1; i++) lines.push(jStart + i, jStart + i + 1)
  }

  while (pts.length < n) {
    const phi = Math.random() * TAU
    const u = Math.random()
    const r = DISC_INNER + (DISC_OUTER - DISC_INNER) * (-Math.log(1 - u * 0.95))
    if (r > DISC_OUTER * 1.1) continue
    if (Math.cos(phi) >= 0 && Math.random() < 0.55) continue
    const discH = RS * 0.15 + r * 0.04
    const yOff = (Math.random() - 0.5) * discH * 2
    const lensWarp = Math.exp(-r / (DISC_INNER * 2)) * 0.1 * Math.sin(phi)
    const [x, y, z] = td(r * Math.cos(phi), r * Math.sin(phi), yOff + lensWarp)
    pts.push([x, y, z])
  }

  return makeShape(pts.slice(0, n), lines, coreEnd)
}

// ── Registry + cache ──────────────────────────────────────────────────────────
export type ShapeName =
  | 'galaxy' | 'androGalaxy' | 'icosphere' | 'torusKnot' | 'shell'
  | 'mobiusTube' | 'tesseract' | 'trefoil' | 'dnaHelix' | 'hyperboloid'
  | 'superEllipsoid' | 'dodecahedron' | 'stellated' | 'lissajous'
  | 'roseCurve' | 'statelessLogo' | 'blackHole'

export const SHAPE_NAMES: ShapeName[] = [
  'galaxy', 'androGalaxy', 'icosphere', 'torusKnot', 'shell', 'mobiusTube',
  'tesseract', 'trefoil', 'dnaHelix', 'hyperboloid', 'superEllipsoid',
  'dodecahedron', 'stellated', 'lissajous', 'roseCurve', 'statelessLogo', 'blackHole',
]

export function sampleShape(name: ShapeName, n: number): ShapeData {
  const key = `${name}:${n}`
  const hit = _cache.get(key); if (hit) return hit
  let data: ShapeData
  switch (name) {
    case 'galaxy': data = galaxy(n); break
    case 'androGalaxy': data = androGalaxy(n); break
    case 'icosphere': data = icosphere(n); break
    case 'torusKnot': data = torusKnot(n); break
    case 'shell': data = shell(n); break
    case 'mobiusTube': data = mobiusTube(n); break
    case 'blackHole': data = blackHole(n); break
    case 'tesseract': data = tesseract(n); break
    case 'trefoil': data = trefoil(n); break
    case 'dnaHelix': data = dnaHelix(n); break
    case 'hyperboloid': data = hyperboloid(n); break
    case 'superEllipsoid': data = superEllipsoid(n); break
    case 'dodecahedron': data = dodecahedron(n); break
    case 'stellated': data = stellated(n); break
    case 'lissajous': data = lissajous(n); break
    case 'roseCurve': data = roseCurve(n); break
    case 'statelessLogo': data = statelessLogo(n); break
    default: data = icosphere(n)
  }
  _cache.set(key, data)
  return data
}