/**
 * shapes.ts, v2
 *
 * Design rules (strict):
 *   LINES  = outer bounding edges / rails ONLY. They define the mesh silhouette.
 *   DOTS   = everything else: surface lattices, volume density, corners, face fills.
 *
 * Improvements over v1:
 *   1. Deterministic seeded RNG per (shape, n): cache-stable, reproducible morphs,
 *      identical output on every mount.
 *   2. Rotation-minimizing frames (parallel transport + holonomy correction) for all
 *      tube curves (torusKnot, trefoil, lissajous). Tubes no longer pinch or shear;
 *      diamond lattices are geometrically correct and seam-free.
 *   3. Edge dots distributed proportional to edge LENGTH (tesseract's projected inner
 *      cube edges are much shorter than outer ones. v1 packed them with the same dot
 *      count, over-densifying the core). Even (k+0.5)/m spacing, no doubled endpoints.
 *   4. Superellipsoid fill sampled uniformly via random sphere directions scaled by
 *      the implicit function (degree-1 homogeneous), instead of pole-clustered u/v.
 *   5. Hyperboloid gets BOTH ruling families (the classic double-ruled weave), dots only.
 *   6. Canonical fill ordering: non-structural dots are sorted by azimuth (then height)
 *      in every shape, so during a morph each dot travels to a nearby angular position
 *      instead of criss-crossing the whole volume. Structural (line-indexed) points are
 *      never reordered, so wireframes stay intact.
 *
 * Public API is unchanged: ShapeData, ShapeName, SHAPE_NAMES, sampleShape.
 */

const TAU = Math.PI * 2
const PHI = (1 + Math.sqrt(5)) / 2

export interface ShapeData {
  positions: Float32Array
  lines: Uint32Array
  mesh?: Uint32Array
  coreEnd?: number
}

// ── Deterministic RNG ─────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
type Rng = () => number

// ── Small vector helpers ──────────────────────────────────────────────────────
type V3 = [number, number, number]
const vsub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const vdot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const vcross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const vscale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
const vlen = (a: V3) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
const vnorm = (a: V3): V3 => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }

// ── Shape assembly ────────────────────────────────────────────────────────────
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

/**
 * Canonical fill ordering. Points past `structEnd` (never referenced by lines)
 * are sorted by azimuth, then height. Because every shape orders its fill the
 * same way, dot index k sits at a similar angular position in every shape and
 * morph paths become short, coherent sweeps instead of random volume crossings.
 */
function sortFill(pts: number[][], structEnd: number): number[][] {
  if (structEnd >= pts.length) return pts
  const head = pts.slice(0, structEnd)
  const tail = pts.slice(structEnd)
  tail.sort((p, q) => {
    const ta = Math.atan2(p[2], p[0]), tb = Math.atan2(q[2], q[0])
    return ta !== tb ? ta - tb : p[1] - q[1]
  })
  return head.concat(tail)
}

/**
 * Assemble a shape: normalise, order the fill, and emit the typed arrays.
 *
 * The line filtering is not cosmetic. Every shape builds its structure first
 * and then calls this with `pts.slice(0, n)`, so at a small `n` the slice can
 * cut into the structure itself while the line array still refers to the points
 * it removed. The renderer reads `positions[idx * 3]` without bounds checking,
 * a Float32Array returns 0 past its end, and the result is a fan of segments
 * drawn to the origin. It showed up at n = 320 on three shapes and was
 * invisible at the 720 the orb happens to use.
 *
 * Fixing it here rather than in each shape means it is fixed for every shape,
 * including any added later.
 *
 * `coreEnd` is clamped for the same reason: one shape was reporting a core of
 * 796 points out of 720.
 */
function makeShape(ptsIn: number[][], linesIn: number[], coreEnd = 0): ShapeData {
  const limit = ptsIn.length

  const lines: number[] = []
  for (let i = 0; i + 1 < linesIn.length; i += 2) {
    const a = linesIn[i], b = linesIn[i + 1]
    if (a < limit && b < limit) lines.push(a, b)
  }

  const core = coreEnd > limit ? limit : coreEnd
  let structEnd = core
  for (let i = 0; i < lines.length; i++) if (lines[i] + 1 > structEnd) structEnd = lines[i] + 1

  const pts = sortFill(norm95(ptsIn), structEnd)
  return { positions: toF32(pts), lines: new Uint32Array(lines), coreEnd: core }
}

function rotXdeg(p: number[], deg: number): number[] {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r)
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]
}

// ── Rotation-minimizing frames for closed space curves ────────────────────────
interface Frames { C: V3[]; N: V3[]; B: V3[] }

function rmfFrames(path: (u: number) => V3, steps: number): Frames {
  const C: V3[] = [], T: V3[] = []
  for (let i = 0; i < steps; i++) C.push(path(i / steps))
  for (let i = 0; i < steps; i++) T.push(vnorm(vsub(C[(i + 1) % steps], C[i])))

  // parallel-transport an initial normal along the curve
  let nv: V3 = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  nv = vnorm(vsub(nv, vscale(T[0], vdot(nv, T[0]))))
  const N: V3[] = [], B: V3[] = []
  for (let i = 0; i < steps; i++) {
    nv = vnorm(vsub(nv, vscale(T[i], vdot(nv, T[i]))))
    N.push(nv); B.push(vcross(T[i], nv))
  }
  // holonomy correction: the transported frame doesn't quite close after a full
  // loop; measure the mismatch angle and unwind it linearly so lattices weave
  // seamlessly across the seam.
  const nEnd = vnorm(vsub(N[steps - 1], vscale(T[0], vdot(N[steps - 1], T[0]))))
  const ang = Math.atan2(vdot(vcross(N[0], nEnd), T[0]), vdot(N[0], nEnd))
  for (let i = 0; i < steps; i++) {
    const th = -ang * (i / steps), c = Math.cos(th), s = Math.sin(th)
    const ni = N[i], bi = B[i]
    N[i] = [ni[0] * c + bi[0] * s, ni[1] * c + bi[1] * s, ni[2] * c + bi[2] * s]
    B[i] = [bi[0] * c - ni[0] * s, bi[1] * c - ni[1] * s, bi[2] * c - ni[2] * s]
  }
  return { C, N, B }
}

/**
 * Generic tube: line rails on the surface + a dotted diamond lattice.
 * rails:        number of longitudinal rails (LINES)
 * perRailFrac:  fraction of n spent per rail
 * tube:         tube radius
 * strands:      helical dot strands (half wind +, half wind -  → diamonds)
 * twist:        integer full turns each strand makes (integer ⇒ closes cleanly)
 */
function tubeShape(
  n: number, path: (u: number) => V3,
  opt: { rails: number; perRailFrac: number; tube: number; strands: number; twist: number },
): ShapeData {
  const FR = 360
  const { C, N, B } = rmfFrames(path, FR)
  const surf = (u: number, phi: number): V3 => {
    const i = ((Math.round(u * FR) % FR) + FR) % FR
    const c = C[i], nn = N[i], bb = B[i]
    const cp = Math.cos(phi) * opt.tube, sp = Math.sin(phi) * opt.tube
    return [c[0] + cp * nn[0] + sp * bb[0], c[1] + cp * nn[1] + sp * bb[1], c[2] + cp * nn[2] + sp * bb[2]]
  }

  const pts: number[][] = [], lines: number[] = []
  const perRail = Math.max(8, Math.floor(n * opt.perRailFrac))
  for (let k = 0; k < opt.rails; k++) {
    const phi = (k / opt.rails) * TAU
    const rs = pts.length
    for (let i = 0; i < perRail; i++) pts.push(surf(i / perRail, phi))
    for (let i = 0; i < perRail - 1; i++) lines.push(rs + i, rs + i + 1)
    lines.push(rs + perRail - 1, rs)
  }

  const remaining = n - pts.length
  const per = Math.max(2, Math.floor(remaining / opt.strands))
  for (let s = 0; s < opt.strands; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (opt.strands / 2))
    for (let i = 0; i < per; i++) {
      const u = i / per
      pts.push(surf(u, dir * u * opt.twist * TAU + phase))
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

/** Dots along wireframe edges, distributed proportional to edge length. */
function edgeDots(
  pts: number[][], V: number[][], edges: [number, number][],
  count: number, jitter: number, rng: Rng,
) {
  const lens = edges.map(([a, b]) => Math.sqrt(
    (V[a][0] - V[b][0]) ** 2 + (V[a][1] - V[b][1]) ** 2 + (V[a][2] - V[b][2]) ** 2))
  const total = lens.reduce((s, l) => s + l, 0) || 1
  edges.forEach(([a, b], ei) => {
    const m = Math.max(1, Math.round(count * lens[ei] / total))
    for (let k = 0; k < m; k++) {
      const t = (k + 0.5) / m
      pts.push([
        V[a][0] + (V[b][0] - V[a][0]) * t + (jitter ? (rng() - 0.5) * jitter : 0),
        V[a][1] + (V[b][1] - V[a][1]) * t + (jitter ? (rng() - 0.5) * jitter : 0),
        V[a][2] + (V[b][2] - V[a][2]) * t + (jitter ? (rng() - 0.5) * jitter : 0),
      ])
    }
  })
}

// ── 1. GALAXY ─────────────────────────────────────────────────────────────────
function galaxy(n: number, rng: Rng): ShapeData {
  const ARMS = 3, SPINE = 80, TILT = 25
  const pts: number[][] = [], lines: number[] = []
  for (let arm = 0; arm < ARMS; arm++) {
    const base = (arm / ARMS) * TAU, start = pts.length
    for (let i = 0; i < SPINE; i++) {
      const t = i / (SPINE - 1), r = 0.04 + Math.pow(t, 1.4) * 0.95, theta = base + t * 3.8
      const y = (rng() - 0.5) * 0.04 * (1 - t)
      pts.push(rotXdeg([r * Math.cos(theta), y, r * Math.sin(theta)], TILT))
    }
    for (let i = 0; i < SPINE - 1; i++) lines.push(start + i, start + i + 1)
  }
  const fill = n - pts.length
  for (let i = 0; i < fill; i++) {
    const arm = Math.floor(rng() * ARMS), base = (arm / ARMS) * TAU
    const t = Math.min(-Math.log(rng() + 1e-6) * 0.22, 0.98)
    const spread = 0.08 + t * 0.12, theta = base + t * 3.8 + (rng() - 0.5) * spread * 2
    const y = (rng() - 0.5) * 0.12 * (1 - t * 0.7)
    pts.push(rotXdeg([t * Math.cos(theta), y, t * Math.sin(theta)], TILT))
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 2. ANDRO GALAXY ───────────────────────────────────────────────────────────
function androGalaxy(n: number, rng: Rng): ShapeData {
  const ARMS = 4, TILT_RAD = 28 * Math.PI / 180
  const cosT = Math.cos(TILT_RAD), sinT = Math.sin(TILT_RAD)
  const tilt = (x: number, y: number, z: number): V3 => [x, y * cosT - z * sinT, y * sinT + z * cosT]
  const pts: number[][] = [], lines: number[] = []

  const CENTRAL_SPINE = 40
  for (let i = 0; i < CENTRAL_SPINE; i++) {
    const t = i / (CENTRAL_SPINE - 1)
    const r = 0.02 + t * 0.18, wind = t * 1.8 * TAU
    pts.push(tilt(r * Math.cos(wind), 0, r * Math.sin(wind)))
  }
  const BULGE = Math.floor(n * 0.08)
  for (let i = 0; i < BULGE; i++) {
    const mag = Math.sqrt(-2 * Math.log(rng() + 1e-9)) * 0.055, angA = rng() * TAU
    pts.push(tilt(mag * Math.cos(angA), mag * Math.sin(angA) * 0.4, (rng() - 0.5) * 0.035))
  }

  const SPINE_PTS = 90
  for (let arm = 0; arm < ARMS; arm++) {
    const baseAngle = (arm / ARMS) * TAU, spineStart = pts.length
    for (let i = 0; i < SPINE_PTS; i++) {
      const tL = i / (SPINE_PTS - 1), t = Math.pow(tL, 0.7)
      const r = 0.015 + Math.pow(t, 1.2) * 0.92, wind = t * 2.8 * TAU, theta = baseAngle + wind
      const z = Math.sin(wind * 0.18) * 0.025 * t
      pts.push(tilt(r * Math.cos(theta), z, r * Math.sin(theta)) as number[])
    }
    for (let i = 0; i < SPINE_PTS - 1; i++) lines.push(spineStart + i, spineStart + i + 1)
  }

  const fillCount = n - pts.length
  for (let i = 0; i < fillCount; i++) {
    const arm = Math.floor(rng() * ARMS), baseAngle = (arm / ARMS) * TAU
    const t = Math.min(-Math.log(rng() + 1e-9) * 0.18, 0.99)
    const r = 0.015 + Math.pow(t, 1.2) * 0.92, wind = t * 2.8 * TAU, theta = baseAngle + wind
    const spread = 0.018 + t * 0.11, scatter = (rng() - 0.5) * spread * 2, scatterR = r + scatter
    const thickness = 0.022 * (1 - t * 0.65)
    const z = (rng() - 0.5) * thickness * 2 + Math.sin(wind * 0.18) * 0.025 * t
    pts.push(tilt(scatterR * Math.cos(theta + scatter * 0.3), z, scatterR * Math.sin(theta + scatter * 0.3)) as number[])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 3. ICOSPHERE ─────────────────────────────────────────────────────────────
function icosphere(n: number, rng: Rng): ShapeData {
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

  edgeDots(pts, V, edges, n - pts.length, 0.012, rng)
  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines, coreEnd)
}

// ── 4. TORUS KNOT (2,3), RMF tube ───────────────────────────────────────────
function torusKnot(n: number): ShapeData {
  const p = 2, q = 3, R = 0.55, r = 0.2
  const path = (u: number): V3 => {
    const t = u * TAU * p
    const w = q * t / p
    return [(R + r * Math.cos(w)) * Math.cos(t), r * Math.sin(w), (R + r * Math.cos(w)) * Math.sin(t)]
  }
  return tubeShape(n, path, { rails: 3, perRailFrac: 0.18, tube: 0.09, strands: 12, twist: 16 })
}

// ── 5. SHELL ──────────────────────────────────────────────────────────────────
function shell(n: number, rng: Rng): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const SPINE = Math.floor(n * 0.28)

  const rimStart = pts.length
  for (let i = 0; i < SPINE; i++) {
    const t = (i / (SPINE - 1)) * TAU * 3.5, r = 0.12 * Math.exp(0.17 * t)
    const rr = r * 0.55
    pts.push([(r + rr) * Math.cos(t), r * Math.sin(t) * 0.65, r * 0.1 * t])
  }
  for (let i = 0; i < SPINE - 1; i++) lines.push(rimStart + i, rimStart + i + 1)

  while (pts.length < n) {
    const t = Math.min(-Math.log(rng() + 1e-6) * 1.2, TAU * 3.5), r = 0.12 * Math.exp(0.17 * t)
    const phi = rng() * TAU, off = r * 0.7 * rng()
    pts.push([r * Math.cos(t) + off * Math.cos(phi) * 0.3, r * Math.sin(t) * 0.65 + off * Math.sin(phi) * 0.3, r * 0.1 * t + off * 0.1])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 6. MÖBIUS TUBE ────────────────────────────────────────────────────────────
// Kept explicit: the strip is non-orientable, so the closed-frame machinery
// doesn't apply: the two "rails" are actually one edge traversed twice.
function mobiusTube(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const W = 0.32, LOOP = Math.floor(n * 0.25)

  const rail1Start = pts.length
  for (let i = 0; i < LOOP; i++) {
    const t = (i / LOOP) * TAU, c2 = Math.cos(t / 2), s2 = Math.sin(t / 2), ct = Math.cos(t), st = Math.sin(t)
    pts.push([(1 - W * c2) * ct, -W * s2, (1 - W * c2) * st])
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
  lines.push(rail1Start + LOOP - 1, rail2Start)   // half-twist: edge continues onto the other rail
  lines.push(rail2Start + LOOP - 1, rail1Start)

  const remaining = n - pts.length
  const STRANDS = 16
  const DOTS_PER = Math.floor(remaining / STRANDS)
  for (let s = 0; s < STRANDS; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (STRANDS / 2))
    for (let i = 0; i < DOTS_PER; i++) {
      const u = (i / (DOTS_PER - 1)) * TAU
      const v = Math.sin(dir * u * 4 + phase) * W
      const c2 = Math.cos(u / 2), s2 = Math.sin(u / 2), ct = Math.cos(u), st = Math.sin(u)
      pts.push([(1 + v * c2) * ct, v * s2, (1 + v * c2) * st])
    }
  }
  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 7. TESSERACT ──────────────────────────────────────────────────────────────
function tesseract(n: number, rng: Rng): ShapeData {
  const proj = (x: number, y: number, z: number, w: number) => { const s = 1 / (2.2 - w); return [x * s, y * s, z * s] }
  const V4: [number, number, number, number][] = []
  for (let a = -1; a <= 1; a += 2) for (let b = -1; b <= 1; b += 2) for (let c = -1; c <= 1; c += 2) for (let d = -1; d <= 1; d += 2) V4.push([a, b, c, d])
  const V3p = V4.map(([a, b, c, d]) => proj(a, b, c, d))
  const edges: [number, number][] = []
  for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++)
    if (V4[i].reduce((s, v, k) => s + (v !== V4[j][k] ? 1 : 0), 0) === 1) edges.push([i, j])

  const pts: number[][] = [], lines: number[] = []
  const inner = V4.map((v, i) => ({ i, w: v[3] })).filter(x => x.w === -1).map(x => x.i)
  const outer = V4.map((v, i) => ({ i, w: v[3] })).filter(x => x.w === 1).map(x => x.i)
  const order = [...inner, ...outer], remap = new Map(order.map((vi, ni) => [vi, ni]))

  order.forEach(vi => pts.push(V3p[vi]))
  for (const [a, b] of edges) lines.push(remap.get(a)!, remap.get(b)!)

  // Dotted edges packed proportional to projected edge length. The inner cube's
  // short edges no longer hoard the same dot count as the long outer ones.
  edgeDots(pts, V3p, edges, n - pts.length, 0, rng)
  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines, 8)
}

// ── 8. TREFOIL, RMF tube ─────────────────────────────────────────────────────
function trefoil(n: number): ShapeData {
  const path = (u: number): V3 => {
    const t = u * TAU
    return [
      (Math.sin(t) + 2 * Math.sin(2 * t)) / 4,
      (Math.cos(t) - 2 * Math.cos(2 * t)) / 4,
      -Math.sin(3 * t) / 4,
    ]
  }
  return tubeShape(n, path, { rails: 2, perRailFrac: 0.18, tube: 0.13, strands: 12, twist: 14 })
}

// ── 9. DNA HELIX ──────────────────────────────────────────────────────────────
function dnaHelix(n: number, rng: Rng): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const TURNS = 3.5, RADIUS = 0.55, HEIGHT = 1.8, RISE = HEIGHT / (TURNS * TAU)
  const OFFSETS = [-30 * Math.PI / 180, 30 * Math.PI / 180, Math.PI]
  const SPP = Math.floor(n * 0.16)

  for (let s = 0; s < 3; s++) {
    const off = OFFSETS[s], start = pts.length
    for (let i = 0; i < SPP; i++) {
      const t = (i / (SPP - 1)) * TURNS * TAU
      pts.push([RADIUS * Math.cos(t + off), t * RISE - HEIGHT / 2, RADIUS * Math.sin(t + off)])
    }
    for (let i = 0; i < SPP - 1; i++) lines.push(start + i, start + i + 1)
  }

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
    const s = Math.floor(rng() * 3), off = OFFSETS[s], t = rng() * TURNS * TAU
    pts.push([RADIUS * Math.cos(t + off) + (rng() - 0.5) * 0.055, t * RISE - HEIGHT / 2 + (rng() - 0.5) * 0.03, RADIUS * Math.sin(t + off) + (rng() - 0.5) * 0.055])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 10. HYPERBOLOID, double ruled ────────────────────────────────────────────
function hyperboloid(n: number, rng: Rng): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const a = 0.55, c = 0.85, CP = 32

  for (const sign of [-1, 1]) {
    const v = sign * 1.1, r = a * Math.sqrt(1 + (v * v) / (c * c)), cs = pts.length
    for (let i = 0; i < CP; i++) { const th = (i / CP) * TAU; pts.push([r * Math.cos(th), v * 0.72, r * Math.sin(th)]) }
    for (let i = 0; i < CP; i++) lines.push(cs + i, cs + (i + 1) % CP)
  }

  // Both ruling families (the surface is doubly ruled) as dotted straight lines.
  // Dots only, no strokes, so the waist stays clean with zero webbing.
  const RULED = 14, OFF = Math.floor(CP / 3), PR = 8
  for (const fam of [1, -1]) {
    for (let i = 0; i < RULED; i++) {
      const j = Math.floor((i / RULED) * CP)
      const t2 = (((j + fam * OFF) % CP) + CP) % CP
      const va = pts[j], vb = pts[CP + t2]
      for (let k = 0; k < PR; k++) {
        const t = (k + 1) / (PR + 1)
        pts.push([va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t, va[2] + (vb[2] - va[2]) * t])
      }
    }
  }
  while (pts.length < n) {
    const t = rng() * TAU, v = (rng() - 0.5) * 2.5, r = a * Math.sqrt(1 + (v * v) / (c * c))
    pts.push([r * Math.cos(t) * 0.9, v * 0.7, r * Math.sin(t) * 0.9])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 11. SUPER-ELLIPSOID ───────────────────────────────────────────────────────
function superEllipsoid(n: number, rng: Rng): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const e1 = 0.3, e2 = 0.3
  const sg = (x: number) => (x < 0 ? -1 : 1), sp = (b: number, e: number) => sg(b) * Math.pow(Math.abs(b) + 1e-9, e)
  const LPL = 48

  const eqS = pts.length
  for (let k = 0; k < LPL; k++) { const v = (k / LPL) * TAU; pts.push([sp(Math.cos(v), e2), 0, sp(Math.sin(v), e2)]) }
  for (let k = 0; k < LPL; k++) lines.push(eqS + k, eqS + (k + 1) % LPL)
  const mxS = pts.length
  for (let k = 0; k < LPL; k++) { const u = (k / LPL) * TAU; pts.push([sp(Math.cos(u), e1), sp(Math.sin(u), e1), 0]) }
  for (let k = 0; k < LPL; k++) lines.push(mxS + k, mxS + (k + 1) % LPL)
  const myS = pts.length
  for (let k = 0; k < LPL; k++) { const u = (k / LPL) * TAU; pts.push([0, sp(Math.sin(u), e1), sp(Math.cos(u), e1)]) }
  for (let k = 0; k < LPL; k++) lines.push(myS + k, myS + (k + 1) % LPL)

  // Uniform surface fill: random sphere direction d, scaled onto the surface by
  // the implicit function (homogeneous of degree 1 → surface point = d / F(d)).
  // No more clustering at the poles / corners.
  const F = (x: number, y: number, z: number) => {
    const ring = Math.pow(Math.abs(x), 2 / e2) + Math.pow(Math.abs(z), 2 / e2)
    const w = Math.pow(ring, e2 / e1) + Math.pow(Math.abs(y), 2 / e1)
    return Math.pow(w, e1 / 2)
  }
  const gauss = () => Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(TAU * rng())
  while (pts.length < n) {
    let dx = gauss(), dy = gauss(), dz = gauss()
    const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
    dx /= l; dy /= l; dz /= l
    const f = F(dx, dy, dz) || 1
    pts.push([dx / f, dy / f, dz / f])
  }
  return makeShape(pts.slice(0, n), lines)
}

// ── 12. DODECAHEDRON ──────────────────────────────────────────────────────────
function dodecahedron(n: number, rng: Rng): ShapeData {
  const s = 1 / Math.sqrt(3), V: number[][] = []
  for (const a of [-s, s]) for (const b of [-s, s]) for (const c of [-s, s]) V.push([a, b, c])
  const ip = 1 / (PHI * Math.sqrt(3)), pp = PHI / Math.sqrt(3)
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) { V.push([0, s1 * ip, s2 * pp]); V.push([s1 * ip, s2 * pp, 0]); V.push([s1 * pp, 0, s2 * ip]) }
  const ELEN = 2 * ip * PHI, edges: [number, number][] = []
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const dx = V[i][0] - V[j][0], dy = V[i][1] - V[j][1], dz = V[i][2] - V[j][2]
    if (Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - ELEN) < 0.05) edges.push([i, j])
  }
  const pts: number[][] = [], lines: number[] = []
  pts.push(...V)
  for (const [a, b] of edges) lines.push(a, b)

  edgeDots(pts, V, edges, n - pts.length, 0.01, rng)
  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 13. STELLATED OCTAHEDRON ─────────────────────────────────────────────────
function stellated(n: number, rng: Rng): ShapeData {
  const s = 0.55
  const V = [
    [s, s, s], [s, -s, -s], [-s, s, -s], [-s, -s, s],
    [-s, -s, -s], [-s, s, s], [s, -s, s], [s, s, -s],
  ]
  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
    [4, 5], [4, 6], [4, 7], [5, 6], [5, 7], [6, 7],
  ]
  const pts: number[][] = [], lines: number[] = []
  pts.push(...V)
  for (const [a, b] of edges) lines.push(a, b)

  edgeDots(pts, V, edges, n - pts.length, 0, rng)
  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 14. LISSAJOUS, RMF tube ──────────────────────────────────────────────────
function lissajous(n: number): ShapeData {
  const a = 3, b = 2, PHASE = Math.PI / 4
  const path = (u: number): V3 => {
    const t = u * TAU
    return [Math.sin(a * t), Math.sin(b * t + PHASE), Math.sin(t)]
  }
  return tubeShape(n, path, { rails: 2, perRailFrac: 0.2, tube: 0.08, strands: 12, twist: 10 })
}

// ── 15. ROSE CURVE (Clover) ───────────────────────────────────────────────────
function roseCurve(n: number): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const LAYERS = 3, PTS_PER = Math.floor(n * 0.15)

  for (let layer = 0; layer < LAYERS; layer++) {
    const z = (layer / (LAYERS - 1) - 0.5) * 0.5, layerStart = pts.length
    for (let i = 0; i < PTS_PER; i++) {
      const t = (i / PTS_PER) * TAU, r = Math.cos(3 * t)
      pts.push([r * Math.cos(t), r * Math.sin(t), z + r * 0.15 * Math.sin(2 * t)])
    }
    for (let i = 0; i < PTS_PER - 1; i++) lines.push(layerStart + i, layerStart + i + 1)
    lines.push(layerStart + PTS_PER - 1, layerStart)
  }

  const remaining = n - pts.length
  const STRANDS = 20
  const DOTS_PER = Math.floor(remaining / STRANDS)
  for (let s = 0; s < STRANDS; s++) {
    const dir = s % 2 === 0 ? 1 : -1
    const phase = Math.floor(s / 2) * (TAU / (STRANDS / 2))
    for (let i = 0; i < DOTS_PER; i++) {
      const zNorm = i / (DOTS_PER - 1)
      const z = (zNorm - 0.5) * 0.5
      const t = phase + dir * zNorm * TAU * 1.5
      const r = Math.cos(3 * t)
      pts.push([r * Math.cos(t), r * Math.sin(t), z + r * 0.15 * Math.sin(2 * t)])
    }
  }
  while (pts.length < n) pts.push(pts[pts.length - 1] || [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 16. STATELESS LOGO ────────────────────────────────────────────────────────
function statelessLogo(n: number, rng: Rng): ShapeData {
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
      const phi = (k / npts) * TAU; pts.push([cx + r * Math.cos(phi), cy + r * Math.sin(phi), 0])
    }
    for (let k = 0; k < npts; k++) lines.push(s0 + k, s0 + (k + 1) % npts)
  }
  function coreFill(cx: number, cy: number, r: number, count: number) {
    for (let k = 0; k < count; k++) {
      const ri = r * Math.sqrt(rng()), phi = rng() * TAU
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
      const a = face[Math.floor(rng() * face.length)], b = face[Math.floor(rng() * face.length)]
      const t = rng()
      pts.push([a[0] + (b[0] - a[0]) * t + (rng() - 0.5) * 0.06, a[1] + (b[1] - a[1]) * t + (rng() - 0.5) * 0.06, (rng() - 0.5) * 0.008])
    }
  }
  while (pts.length < n) {
    const angle = rng() * TAU, r = 0.3 + rng() * 0.65
    pts.push([r * Math.cos(angle) * 0.9, r * Math.sin(angle) * 0.9, (rng() - 0.5) * 0.01])
  }
  // No norm95 here: the logo is authored at final scale.
  const flines = lines.filter(i => i < n)
  let structEnd = hcCoreEnd
  for (const idx of flines) if (idx + 1 > structEnd) structEnd = idx + 1
  const sorted = sortFill(pts.slice(0, n), Math.min(structEnd, n))
  return { positions: toF32(sorted), lines: new Uint32Array(flines), coreEnd: hcCoreEnd }
}

// ── 17. BLACK HOLE ────────────────────────────────────────────────────────────
function blackHole(n: number, rng: Rng): ShapeData {
  const pts: number[][] = [], lines: number[] = []

  const RS = 0.08
  const DISC_INNER = RS * 3
  const DISC_OUTER = 0.92
  const TILT_RAD = 15 * Math.PI / 180
  const cosT = Math.cos(TILT_RAD)

  const td = (x: number, z: number, yOff = 0): V3 =>
    [x, x * Math.sin(TILT_RAD) * 0.3 + yOff, z * cosT]

  const CORE_N = Math.floor(n * 0.06)
  for (let i = 0; i < CORE_N; i++) {
    const r = Math.sqrt(-2 * Math.log(rng() + 1e-9)) * RS * 0.35
    const phi = rng() * TAU
    const th = Math.acos(2 * rng() - 1)
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
      const [x, y, z] = td(r * Math.cos(phi), r * Math.sin(phi), lensWarp * Math.sin(phi))
      pts.push([x, y, z])
    }
    for (let i = 0; i < RING_PTS; i++) lines.push(rStart + i, rStart + (i + 1) % RING_PTS)
  }

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
    const phi = rng() * TAU
    const u = rng()
    const r = DISC_INNER + (DISC_OUTER - DISC_INNER) * (-Math.log(1 - u * 0.95))
    if (r > DISC_OUTER * 1.1) continue
    if (Math.cos(phi) >= 0 && rng() < 0.55) continue
    const discH = RS * 0.15 + r * 0.04
    const yOff = (rng() - 0.5) * discH * 2
    const lensWarp = Math.exp(-r / (DISC_INNER * 2)) * 0.1 * Math.sin(phi)
    const [x, y, z] = td(r * Math.cos(phi), r * Math.sin(phi), yOff + lensWarp)
    pts.push([x, y, z])
  }
  return makeShape(pts.slice(0, n), lines, coreEnd)
}



// ── 18. END-TO-END WAVE ────────────────────────────────────────────────────────
function wave(n: number, rng: Rng, time: number = 0, stretch: number = 5.0): ShapeData {
  const pts: number[][] = [], lines: number[] = []
  const length = stretch // Length is now dynamically set by the viewport!
  const width = 1.5
  const strands = 12
  const ptsPerStrand = Math.floor((n * 0.4) / strands)

  const phaseOffset = time * Math.PI * 2

  for (let s = 0; s < strands; s++) {
    const z = (s / (strands - 1) - 0.5) * width
    const startIdx = pts.length
    for (let i = 0; i < ptsPerStrand; i++) {
      const t = i / (ptsPerStrand - 1)
      const x = (t - 0.5) * length
      const y = Math.sin(t * Math.PI * 3 + phaseOffset) * 0.4 +
        Math.sin(t * Math.PI * 1.5 + z * 4 - phaseOffset * 0.5) * 0.2
      pts.push([x, y, z])
    }
    for (let i = 0; i < ptsPerStrand - 1; i++) {
      lines.push(startIdx + i, startIdx + i + 1)
    }
  }

  while (pts.length < n) {
    const t = rng()
    const x = (t - 0.5) * length
    const z = (rng() - 0.5) * width * 1.5
    const baseY = Math.sin(t * Math.PI * 3 + phaseOffset) * 0.4 +
      Math.sin(t * Math.PI * 1.5 + z * 4 - phaseOffset * 0.5) * 0.2
    const y = baseY + (rng() - 0.5) * 0.6
    pts.push([x, y, z])
  }

  return makeShape(pts.slice(0, n), lines)
}
// ── 19. GYROID ────────────────────────────────────────────────────────────────
/**
 * A triply periodic minimal surface, clipped to a ball.
 *
 * The gyroid is the implicit surface sin x cos y + sin y cos z + sin z cos x = 0.
 * It has no straight lines and no planes of symmetry, which is exactly why it
 * reads as something grown rather than something modelled, and why it does not
 * resemble any other shape in this set.
 *
 * Sampled by rejection plus Newton projection rather than by marching cubes:
 * pick a point in the ball, then walk it onto the surface along the gradient
 * three times. Three steps is enough because the surface is smooth and the
 * starting point is never far from it, and it is a few hundred multiplies
 * against the tens of thousands a marching-cubes grid would cost.
 */
function gyroid(n: number, rng: Rng): ShapeData {
  const K = 2.15            // spatial frequency: how many cells fit in the ball
  const R = 2.5             // clip radius, in the same units
  const pts: number[][] = []

  const f = (x: number, y: number, z: number) =>
    Math.sin(K * x) * Math.cos(K * y) +
    Math.sin(K * y) * Math.cos(K * z) +
    Math.sin(K * z) * Math.cos(K * x)

  let guard = 0
  while (pts.length < n && guard < n * 60) {
    guard++
    // Uniform in the ball, by rejection. Cheaper than the cube-root method and
    // the rejection rate is only 48%.
    let x = (rng() * 2 - 1) * R
    let y = (rng() * 2 - 1) * R
    let z = (rng() * 2 - 1) * R
    if (x * x + y * y + z * z > R * R) continue

    for (let it = 0; it < 3; it++) {
      const v = f(x, y, z)
      // Analytic gradient. Finite differences would need three extra evaluations
      // per step and lose precision near the thin parts of the surface.
      const gx = K * (Math.cos(K * x) * Math.cos(K * y) - Math.sin(K * z) * Math.sin(K * x))
      const gy = K * (Math.cos(K * y) * Math.cos(K * z) - Math.sin(K * x) * Math.sin(K * y))
      const gz = K * (Math.cos(K * z) * Math.cos(K * x) - Math.sin(K * y) * Math.sin(K * z))
      const g2 = gx * gx + gy * gy + gz * gz
      if (g2 < 1e-6) break
      const step = v / g2
      x -= gx * step; y -= gy * step; z -= gz * step
    }

    // Converged, and still inside the clip ball.
    if (Math.abs(f(x, y, z)) > 0.06) continue
    if (x * x + y * y + z * z > R * R) continue
    pts.push([x, y, z])
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] ?? [0, 0, 0])
  return makeShape(pts.slice(0, n), [])
}

// ── 20. KLEIN BOTTLE ──────────────────────────────────────────────────────────
/**
 * The figure-eight immersion of a Klein bottle.
 *
 * A Klein bottle has no embedding in three dimensions, so any version of it you
 * can look at is an immersion: a surface that passes through itself. The
 * figure-eight immersion is the one that reads clearly as a single continuous
 * sheet with no edge, which is the interesting property, and it pairs with the
 * Mobius tube already in this set without duplicating it.
 */
function kleinBottle(n: number): ShapeData {
  const A = 2.1
  const pts: number[][] = []
  const lines: number[] = []

  const surf = (u: number, v: number): number[] => {
    const hv = v / 2
    const r = A + Math.cos(hv) * Math.sin(u) - Math.sin(hv) * Math.sin(2 * u)
    return [
      r * Math.cos(v),
      r * Math.sin(v),
      Math.sin(hv) * Math.sin(u) + Math.cos(hv) * Math.sin(2 * u),
    ]
  }

  // Rails along v at fixed u. Each is closed only after v runs twice round,
  // which is the whole point of the surface: follow a rail and you come back
  // on the other side of the sheet.
  const RAILS = 7
  const perRail = Math.max(10, Math.floor((n * 0.42) / RAILS))
  for (let k = 0; k < RAILS; k++) {
    const u = (k / RAILS) * TAU
    const start = pts.length
    for (let i = 0; i < perRail; i++) {
      pts.push(surf(u, (i / perRail) * TAU))
    }
    for (let i = 0; i < perRail - 1; i++) lines.push(start + i, start + i + 1)
    lines.push(start + perRail - 1, start)
  }

  // Fill: a low-discrepancy sweep over the parameter square, so the dots land
  // evenly on the sheet instead of banding along the rails.
  let i = 0
  while (pts.length < n) {
    i++
    const u = ((i * 0.7548776662466927) % 1) * TAU
    const v = ((i * 0.5698402909980532) % 1) * TAU
    pts.push(surf(u, v))
  }

  return makeShape(pts.slice(0, n), lines)
}

// ── 21. SUPERTOROID ───────────────────────────────────────────────────────────
/**
 * A torus with its circular cross-section replaced by a superellipse, so the
 * tube squares off and the hole becomes a rounded rectangle.
 *
 * Worth having next to the plain torus knot because the squared profile catches
 * the structure lines along flat faces, which is a completely different read
 * from a smooth tube even though the topology is the same.
 */
function superToroid(n: number, rng: Rng): ShapeData {
  const R = 1.0, r = 0.42
  const E1 = 0.55, E2 = 0.55     // below 1 squares the profile off
  const pts: number[][] = []
  const lines: number[] = []

  // Signed power, so the superellipse keeps its sign through a fractional
  // exponent. Math.pow of a negative base and a fractional exponent is NaN,
  // which would silently void half the shape.
  const sp = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)

  const surf = (u: number, v: number): number[] => {
    const cu = sp(Math.cos(u), E1), su = sp(Math.sin(u), E1)
    const cv = sp(Math.cos(v), E2), sv = sp(Math.sin(v), E2)
    return [(R + r * cv) * cu, (R + r * cv) * su, r * sv]
  }

  const RAILS = 8
  const perRail = Math.max(12, Math.floor((n * 0.34) / RAILS))
  for (let k = 0; k < RAILS; k++) {
    const v = (k / RAILS) * TAU
    const start = pts.length
    for (let i = 0; i < perRail; i++) pts.push(surf((i / perRail) * TAU, v))
    for (let i = 0; i < perRail - 1; i++) lines.push(start + i, start + i + 1)
    lines.push(start + perRail - 1, start)
  }

  while (pts.length < n) {
    pts.push(surf(rng() * TAU, rng() * TAU))
  }

  return makeShape(pts.slice(0, n), lines)
}

// ── 22. MENGER SPONGE ─────────────────────────────────────────────────────────
/**
 * Three levels of a Menger sponge, as the surface cells only.
 *
 * The survival test is the neat part: write a cell's coordinate in base three,
 * and the cell is removed exactly when two or more of its three digits are 1,
 * at any level. So the whole fractal is a digit test and needs no recursion.
 *
 * Only cells with an exposed face are kept. The interior of a level-3 sponge is
 * 8,000 cells, most of them buried where no dot would ever be visible, and
 * spending the budget on them would leave the silhouette thin.
 */
function mengerSponge(n: number, rng: Rng): ShapeData {
  const LEVELS = 3
  const SIZE = Math.pow(3, LEVELS)      // 27 cells per axis
  const pts: number[][] = []
  const lines: number[] = []

  const alive = (i: number, j: number, k: number): boolean => {
    if (i < 0 || j < 0 || k < 0 || i >= SIZE || j >= SIZE || k >= SIZE) return false
    let a = i, b = j, c = k
    for (let l = 0; l < LEVELS; l++) {
      const da = a % 3, db = b % 3, dc = c % 3
      const ones = (da === 1 ? 1 : 0) + (db === 1 ? 1 : 0) + (dc === 1 ? 1 : 0)
      if (ones >= 2) return false
      a = (a / 3) | 0; b = (b / 3) | 0; c = (c / 3) | 0
    }
    return true
  }

  // Structure: the outer cube's twelve edges, which is what holds the silhouette
  // together visually once the faces are only dots.
  const h = 1
  const V: number[][] = [
    [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
    [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h],
  ]
  const E: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  const perEdge = Math.max(4, Math.floor((n * 0.16) / E.length))
  for (const [a, b] of E) {
    const start = pts.length
    for (let s = 0; s < perEdge; s++) {
      const t = s / (perEdge - 1)
      pts.push([
        V[a][0] + (V[b][0] - V[a][0]) * t,
        V[a][1] + (V[b][1] - V[a][1]) * t,
        V[a][2] + (V[b][2] - V[a][2]) * t,
      ])
    }
    for (let s = 0; s < perEdge - 1; s++) lines.push(start + s, start + s + 1)
  }

  // Surface cells: alive, with at least one dead or outside neighbour.
  const cells: number[][] = []
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      for (let k = 0; k < SIZE; k++) {
        if (!alive(i, j, k)) continue
        if (
          alive(i + 1, j, k) && alive(i - 1, j, k) &&
          alive(i, j + 1, k) && alive(i, j - 1, k) &&
          alive(i, j, k + 1) && alive(i, j, k - 1)
        ) continue
        cells.push([i, j, k])
      }
    }
  }

  // Strided rather than shuffled, so thinning keeps the cells spread over the
  // whole sponge instead of taking one corner of it.
  const want = n - pts.length
  const cell = 2 / SIZE
  for (let s = 0; s < want; s++) {
    const c = cells[Math.floor((s * cells.length) / want) % cells.length]
    if (!c) break
    pts.push([
      -1 + (c[0] + 0.5) * cell + (rng() - 0.5) * cell * 0.7,
      -1 + (c[1] + 0.5) * cell + (rng() - 0.5) * cell * 0.7,
      -1 + (c[2] + 0.5) * cell + (rng() - 0.5) * cell * 0.7,
    ])
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] ?? [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 23. LORENZ ATTRACTOR ──────────────────────────────────────────────────────
/**
 * The Lorenz attractor, integrated rather than approximated.
 *
 * Two lobes that a trajectory crosses between unpredictably, which is the
 * original picture of deterministic chaos. It is the only shape in this set
 * that is a path through time rather than a surface, and it shows: the lines
 * read as one continuous ribbon.
 *
 * RK4 rather than Euler. Euler at a step size large enough to be cheap drifts
 * off the attractor entirely and spirals away, which is not an aesthetic choice
 * but a broken integrator.
 */
function lorenzAttractor(n: number, rng: Rng): ShapeData {
  const SIGMA = 10, RHO = 28, BETA = 8 / 3
  const DT = 0.005
  const pts: number[][] = []
  const lines: number[] = []

  const deriv = (s: number[], out: number[]) => {
    out[0] = SIGMA * (s[1] - s[0])
    out[1] = s[0] * (RHO - s[2]) - s[1]
    out[2] = s[0] * s[1] - BETA * s[2]
  }

  const step = (s: number[]) => {
    const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0]
    const t = [0, 0, 0]
    deriv(s, k1)
    for (let i = 0; i < 3; i++) t[i] = s[i] + (DT / 2) * k1[i]
    deriv(t, k2)
    for (let i = 0; i < 3; i++) t[i] = s[i] + (DT / 2) * k2[i]
    deriv(t, k3)
    for (let i = 0; i < 3; i++) t[i] = s[i] + DT * k3[i]
    deriv(t, k4)
    for (let i = 0; i < 3; i++) {
      s[i] += (DT / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
    }
  }

  // The attractor is centred near z = 27, so shift it down to the origin.
  const map = (s: number[]): number[] => [s[0] * 0.055, s[2] * 0.055 - 1.5, s[1] * 0.055]

  const trace = (seed: number[], count: number, connect: boolean) => {
    const s = seed.slice()
    // Burn in. The first few hundred steps are the transient on the way to the
    // attractor, and drawing them puts a stray tail through the middle.
    for (let i = 0; i < 400; i++) step(s)
    const start = pts.length
    for (let i = 0; i < count; i++) {
      step(s)
      pts.push(map(s))
      if (connect && i > 0) lines.push(start + i - 1, start + i)
    }
  }

  const spine = Math.min(Math.floor(n * 0.45), n)
  trace([0.1, 0, 1.05], spine, true)

  // More trajectories from nearby starts, as unconnected dots. Nearby starts
  // diverge, which is the point of the thing, so these fill the lobes rather
  // than retracing the spine.
  while (pts.length < n) {
    const left = n - pts.length
    trace(
      [0.1 + (rng() - 0.5) * 4, (rng() - 0.5) * 4, 1.05 + (rng() - 0.5) * 4],
      Math.min(left, 260),
      false,
    )
  }

  return makeShape(pts.slice(0, n), lines)
}

// ── 24. HOPF FIBRATION ────────────────────────────────────────────────────────
/**
 * The Hopf fibration, stereographically projected.
 *
 * Every point of a sphere corresponds to a circle in four dimensions, and no
 * two of those circles ever intersect while every pair is linked. Projected
 * down to three dimensions you get a nest of interlocking rings, which is a
 * thing you cannot design by hand and cannot quite believe when you first see
 * it rotate.
 *
 * Base points come from the Fibonacci sphere, so the ring family is evenly
 * spread. Points too near the south pole are skipped: the projection sends them
 * to infinity, and one ring heading off the canvas ruins the frame.
 */
function hopfFibration(n: number, rng: Rng): ShapeData {
  const pts: number[][] = []
  const lines: number[] = []

  // Radial compression. The projection is unbounded, so even with the pole
  // excluded the outermost rings reach several times the radius of the inner
  // ones, and norm95 then shrinks the whole picture to fit them. tanh is
  // monotonic in r, so the linking is preserved exactly; it just stops one ring
  // from deciding the scale of the frame.
  const R_SOFT = 1.5

  const fiber = (a: number, b: number, c: number, theta: number): number[] => {
    const k = 1 / Math.sqrt(2 * (1 + c))
    const q1 = k * (1 + c) * Math.cos(theta)
    const q2 = k * (a * Math.sin(theta) + b * Math.cos(theta))
    const q3 = k * (b * Math.sin(theta) - a * Math.cos(theta))
    const q4 = k * (1 + c) * Math.sin(theta)

    // Stereographic projection from q1 = 1. Note which pole that is: q1 reaches
    // 1 as c approaches +1, not -1, so it is the NORTH cap of the base sphere
    // that has to be excluded. Guarding the south pole instead, which is the
    // intuitive reading of the 1 + c in the denominator, leaves the singular
    // rings in and sends points off to a radius of five and beyond.
    const d = 1 - q1
    const s = d < 1e-3 ? 1e-3 : d
    let x = q2 / s, y = q3 / s, z = q4 / s

    const r = Math.sqrt(x * x + y * y + z * z)
    if (r > 1e-6) {
      const f = (R_SOFT * Math.tanh(r / R_SOFT)) / r
      x *= f; y *= f; z *= f
    }
    return [x, y, z]
  }

  // Base points on the sphere, golden-angle spaced.
  const base: number[][] = []
  const BASE_N = 54
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < BASE_N; i++) {
    const c = 1 - (2 * (i + 0.5)) / BASE_N
    if (c > 0.45) continue           // the north cap is where the projection blows up
    const r = Math.sqrt(Math.max(0, 1 - c * c))
    const phi = i * ga
    base.push([Math.cos(phi) * r, Math.sin(phi) * r, c])
  }

  // A dozen rings drawn as lines: enough for the linking to be legible, few
  // enough that the picture does not turn into wool.
  const RINGS = 12
  const perRing = Math.max(16, Math.floor((n * 0.4) / RINGS))
  for (let k = 0; k < RINGS; k++) {
    const p = base[Math.floor((k * base.length) / RINGS)]
    if (!p) continue
    const start = pts.length
    for (let i = 0; i < perRing; i++) {
      pts.push(fiber(p[0], p[1], p[2], (i / perRing) * TAU))
    }
    for (let i = 0; i < perRing - 1; i++) lines.push(start + i, start + i + 1)
    lines.push(start + perRing - 1, start)
  }

  // The rest of the family as dots.
  while (pts.length < n) {
    const p = base[Math.floor(rng() * base.length)]
    if (!p) break
    pts.push(fiber(p[0], p[1], p[2], rng() * TAU))
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] ?? [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 25. NEURAL LATTICE ────────────────────────────────────────────────────────
/**
 * A layered network: nodes in rings, edges between consecutive layers, and dots
 * travelling along the edges.
 *
 * Unlike the rest of this set, this one is representational. It is here because
 * a site that talks about data and models benefits from one shape in the
 * sequence that is legible as what it is, and because the travelling dots give
 * the morph sequence a moment of direction rather than rotation.
 */
function neuralLattice(n: number, rng: Rng): ShapeData {
  const LAYERS = [4, 8, 11, 8, 4]
  const SPAN = 1.9
  const pts: number[][] = []
  const lines: number[] = []

  // Nodes first, so they are the structural core.
  const nodeIdx: number[][] = []
  for (let l = 0; l < LAYERS.length; l++) {
    const count = LAYERS[l]
    const x = -SPAN / 2 + (l / (LAYERS.length - 1)) * SPAN
    // Radius bulges in the middle, so the net reads as a shape and not a slab.
    const radius = 0.35 + 0.55 * Math.sin((l / (LAYERS.length - 1)) * Math.PI)
    const row: number[] = []
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + l * 0.4
      row.push(pts.length)
      pts.push([x, Math.cos(a) * radius, Math.sin(a) * radius])
    }
    nodeIdx.push(row)
  }
  const nodeCount = pts.length

  // Edges: each node to the three nearest in the next layer. Fully connecting
  // the layers is 300 edges and reads as a solid block.
  const edges: [number, number][] = []
  for (let l = 0; l < nodeIdx.length - 1; l++) {
    for (const a of nodeIdx[l]) {
      const scored = nodeIdx[l + 1]
        .map(b => ({
          b,
          d: Math.hypot(
            pts[a][1] - pts[b][1],
            pts[a][2] - pts[b][2],
          ),
        }))
        .sort((p, q) => p.d - q.d)
      for (let k = 0; k < Math.min(3, scored.length); k++) {
        edges.push([a, scored[k].b])
        lines.push(a, scored[k].b)
      }
    }
  }

  // Signal dots along the edges, biased toward the middle so the connections
  // read as carrying something rather than as beads on a string.
  const want = n - nodeCount
  for (let s = 0; s < want; s++) {
    const [a, b] = edges[Math.floor(rng() * edges.length)] ?? [0, 0]
    const t = 0.5 + (rng() - 0.5) * 0.9
    pts.push([
      pts[a][0] + (pts[b][0] - pts[a][0]) * t,
      pts[a][1] + (pts[b][1] - pts[a][1]) * t + (rng() - 0.5) * 0.02,
      pts[a][2] + (pts[b][2] - pts[a][2]) * t + (rng() - 0.5) * 0.02,
    ])
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] ?? [0, 0, 0])
  return makeShape(pts.slice(0, n), lines, nodeCount)
}

// ── 26. CITY GRID ─────────────────────────────────────────────────────────────
/**
 * A block of towers on a grid, with dotted faces and lit vertical edges.
 *
 * Heights come from a hash of the cell rather than the RNG, so the skyline is
 * identical on every load. A skyline that reshuffles itself between visits
 * looks like a bug even when it is not.
 */
function cityGrid(n: number, rng: Rng): ShapeData {
  const GRID = 7
  const CELL = 2 / GRID
  const pts: number[][] = []
  const lines: number[] = []

  // Deterministic height per cell.
  const heightAt = (i: number, j: number): number => {
    let h = 2166136261
    h ^= i * 374761393; h = Math.imul(h, 16777619)
    h ^= j * 668265263; h = Math.imul(h, 16777619)
    h ^= h >>> 13
    const u = (h >>> 0) / 4294967296
    // Centre blocks run taller, so the mass has a shape.
    const d = Math.hypot(i - (GRID - 1) / 2, j - (GRID - 1) / 2) / GRID
    return 0.18 + Math.pow(u, 1.7) * 1.25 * (1.15 - d)
  }

  interface Tower { x: number; z: number; h: number; w: number }
  const towers: Tower[] = []
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      // A few gaps, so it is a city and not a bar chart.
      if (((i * 7 + j * 13) % 11) === 0) continue
      towers.push({
        x: -1 + (i + 0.5) * CELL,
        z: -1 + (j + 0.5) * CELL,
        h: heightAt(i, j),
        w: CELL * 0.34,
      })
    }
  }

  // Vertical corner edges as structure.
  const perEdge = Math.max(3, Math.floor((n * 0.28) / (towers.length * 4)))
  for (const t of towers) {
    for (let c = 0; c < 4; c++) {
      const sx = c === 0 || c === 3 ? -1 : 1
      const sz = c < 2 ? -1 : 1
      const start = pts.length
      for (let s = 0; s < perEdge; s++) {
        const f = s / (perEdge - 1)
        pts.push([t.x + sx * t.w, -0.75 + f * t.h, t.z + sz * t.w])
      }
      for (let s = 0; s < perEdge - 1; s++) lines.push(start + s, start + s + 1)
    }
  }

  // Dotted faces and roofs.
  while (pts.length < n) {
    const t = towers[Math.floor(rng() * towers.length)]
    if (!t) break
    if (rng() < 0.18) {
      // Roof.
      pts.push([
        t.x + (rng() * 2 - 1) * t.w,
        -0.75 + t.h,
        t.z + (rng() * 2 - 1) * t.w,
      ])
    } else {
      // One of the four walls.
      const side = Math.floor(rng() * 4)
      const u = (rng() * 2 - 1) * t.w
      const y = -0.75 + rng() * t.h
      if (side === 0) pts.push([t.x + u, y, t.z - t.w])
      else if (side === 1) pts.push([t.x + t.w, y, t.z + u])
      else if (side === 2) pts.push([t.x + u, y, t.z + t.w])
      else pts.push([t.x - t.w, y, t.z + u])
    }
  }

  while (pts.length < n) pts.push(pts[pts.length - 1] ?? [0, 0, 0])
  return makeShape(pts.slice(0, n), lines)
}

// ── 27. SPHERICAL HARMONIC ────────────────────────────────────────────────────
/**
 * A radial function on the sphere with eight integer parameters, the form used
 * for the classic spherical-harmonic plots.
 *
 * The parameters are the whole shape. The set below gives a six-lobed bloom
 * with a pinched waist; change any one integer and you get a different object
 * entirely, which makes this the cheapest shape in the file to get variations
 * out of.
 */
function sphericalHarmonic(n: number, rng: Rng): ShapeData {
  const M = [4, 3, 2, 3, 6, 2, 4, 1]
  const pts: number[][] = []
  const lines: number[] = []

  const radius = (theta: number, phi: number): number => {
    let r = 0
    r += Math.pow(Math.abs(Math.sin(M[0] * phi)), M[1])
    r += Math.pow(Math.abs(Math.cos(M[2] * phi)), M[3])
    r += Math.pow(Math.abs(Math.sin(M[4] * theta)), M[5])
    r += Math.pow(Math.abs(Math.cos(M[6] * theta)), M[7])
    return 0.35 + r * 0.26
  }

  const surf = (theta: number, phi: number): number[] => {
    const r = radius(theta, phi)
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    ]
  }

  // Latitude rails, which trace the lobes and make the form readable while it
  // rotates.
  const RAILS = 9
  const perRail = Math.max(24, Math.floor((n * 0.36) / RAILS))
  for (let k = 0; k < RAILS; k++) {
    const phi = ((k + 0.5) / RAILS) * Math.PI
    const start = pts.length
    for (let i = 0; i < perRail; i++) pts.push(surf((i / perRail) * TAU, phi))
    for (let i = 0; i < perRail - 1; i++) lines.push(start + i, start + i + 1)
    lines.push(start + perRail - 1, start)
  }

  while (pts.length < n) {
    // Area-correct sampling in phi, so the poles do not end up denser than the
    // equator. Sampling phi uniformly is the usual mistake here.
    const phi = Math.acos(1 - 2 * rng())
    pts.push(surf(rng() * TAU, phi))
  }

  return makeShape(pts.slice(0, n), lines)
}

// ── Registry + cache ──────────────────────────────────────────────────────────
export type ShapeName =
  | 'galaxy' | 'androGalaxy' | 'icosphere' | 'torusKnot' | 'shell'
  | 'mobiusTube' | 'tesseract' | 'trefoil' | 'dnaHelix' | 'hyperboloid'
  | 'superEllipsoid' | 'dodecahedron' | 'stellated' | 'lissajous'
  | 'roseCurve' | 'statelessLogo' | 'blackHole' | 'wave'
  // Added later. Kept in their own block so the original seventeen stay in
  // the order the hero sequence was authored against.
  | 'gyroid' | 'kleinBottle' | 'superToroid' | 'mengerSponge'
  | 'lorenzAttractor' | 'hopfFibration' | 'neuralLattice' | 'cityGrid'
  | 'sphericalHarmonic'

/**
 * A shape the engine can sample: either a built-in name, or a loaded .glb
 * referred to as `model:<id>`.
 *
 * Model shapes resolve through a registry that `useModelShape` fills in once
 * the file has been fetched and sampled. Until then they fall back to a
 * stand-in, because `sampleShape` is called mid-frame and has nowhere to wait.
 */
export type ShapeRef = ShapeName | `model:${string}`

export const SHAPE_NAMES: ShapeName[] = [
  'galaxy', 'androGalaxy', 'icosphere', 'torusKnot', 'shell', 'mobiusTube',
  'tesseract', 'trefoil', 'dnaHelix', 'hyperboloid', 'superEllipsoid',
  'dodecahedron', 'stellated', 'lissajous', 'roseCurve', 'statelessLogo',
  'blackHole', 'wave',
  'gyroid', 'kleinBottle', 'superToroid', 'mengerSponge', 'lorenzAttractor',
  'hopfFibration', 'neuralLattice', 'cityGrid', 'sphericalHarmonic',
]

/**
 * Shapes worth putting in front of someone cycling through with the keyboard,
 * in an order that alternates between kinds so consecutive presses never give
 * two near-identical objects.
 *
 * `wave` is deliberately absent: it is a flat band built for the status page
 * background and makes no sense as an orb. `SHAPE_NAMES` still reaches
 * everything, so nothing is unreachable.
 */
export const ORB_SHAPE_CYCLE: ShapeName[] = [
  'statelessLogo', 'icosphere', 'gyroid', 'torusKnot', 'neuralLattice',
  'hopfFibration', 'dnaHelix', 'mengerSponge', 'roseCurve', 'kleinBottle',
  'galaxy', 'cityGrid', 'trefoil', 'sphericalHarmonic', 'tesseract',
  'lorenzAttractor', 'superToroid', 'stellated', 'mobiusTube', 'blackHole',
  'hyperboloid', 'dodecahedron', 'superEllipsoid', 'lissajous', 'shell',
  'androGalaxy',
]

/** Human-readable labels, for the orb's shape indicator. */
export const SHAPE_LABELS: Record<ShapeName, string> = {
  galaxy: 'Galaxy',
  androGalaxy: 'Andromeda',
  icosphere: 'Icosphere',
  torusKnot: 'Torus knot',
  shell: 'Shell',
  mobiusTube: 'Mobius tube',
  tesseract: 'Tesseract',
  trefoil: 'Trefoil',
  dnaHelix: 'Helix',
  hyperboloid: 'Hyperboloid',
  superEllipsoid: 'Superellipsoid',
  dodecahedron: 'Dodecahedron',
  stellated: 'Stellated',
  lissajous: 'Lissajous',
  roseCurve: 'Rose curve',
  statelessLogo: 'Stateless',
  blackHole: 'Black hole',
  wave: 'Wave',
  gyroid: 'Gyroid',
  kleinBottle: 'Klein bottle',
  superToroid: 'Supertoroid',
  mengerSponge: 'Menger sponge',
  lorenzAttractor: 'Lorenz',
  hopfFibration: 'Hopf fibration',
  neuralLattice: 'Neural lattice',
  cityGrid: 'City grid',
  sphericalHarmonic: 'Harmonic',
}

// ── Loaded .glb models ────────────────────────────────────────────────────────
/**
 * Models that have finished loading, keyed by their registry id.
 *
 * `sampleShape` has to be synchronous, because ParticleViewer calls it in the
 * middle of a frame when a morph crosses into the next shape. A .glb needs a
 * fetch and a sampling pass, which is not something that can happen there. So
 * loading is done out of band by `useModelShape`, which calls
 * `registerModelShape` when the cloud is ready, and from that point on the
 * lookup here is a Map hit.
 *
 * The data is stored per point count, because the engine reads exactly
 * `particleCount` points out of whatever shape it is given and a mismatch would
 * read past the end of the array.
 */
const _models = new Map<string, Map<number, ShapeData>>()

/** The shape a model stands in as while its file is still downloading. */
const MODEL_PLACEHOLDER: ShapeName = 'icosphere'

export function registerModelShape(id: string, data: ShapeData): void {
  const n = data.positions.length / 3
  let byCount = _models.get(id)
  if (!byCount) {
    byCount = new Map()
    _models.set(id, byCount)
  }
  byCount.set(n, data)
}

export function hasModelShape(id: string, n: number): boolean {
  return _models.get(id)?.has(n) ?? false
}

export function clearModelShapes(): void {
  _models.clear()
}

/** 'model:mascot' -> 'mascot'. Returns null for a built-in shape name. */
export function modelIdOf(name: string): string | null {
  return name.startsWith('model:') ? name.slice(6) : null
}

// ── Registry + cache ──────────────────────────────────────────────────────────

const _cache = new Map<string, ShapeData>()

export function sampleShape(
  name: ShapeRef, n: number, time: number = 0, stretch: number = 5.0,
): ShapeData {
  // A loaded model, or its stand-in. Checked first, because a model name never
  // matches a built-in case and would otherwise fall through to the default.
  const modelId = modelIdOf(name)
  if (modelId !== null) {
    const byCount = _models.get(modelId)
    const exact = byCount?.get(n)
    if (exact) return exact
    // Registered at a different count: refit by striding, rather than making
    // the caller deal with a mismatch.
    if (byCount && byCount.size > 0) {
      const [srcN, src] = [...byCount.entries()][0]
      const fitted = refit(src, srcN, n)
      byCount.set(n, fitted)
      return fitted
    }
    return sampleShape(MODEL_PLACEHOLDER, n, time, stretch)
  }

  // The wave animates, so it is rebuilt every call rather than cached. It is
  // the only shape that does, and WaveField exists precisely so the status
  // pages do not pay for it.
  if (name === 'wave') {
    const rng = mulberry32(hashStr(name) ^ (n * 2654435761))
    return wave(n, rng, time, stretch)
  }

  const key = `${name}:${n}`
  const hit = _cache.get(key); if (hit) return hit
  const rng = mulberry32(hashStr(name) ^ (n * 2654435761))
  let data: ShapeData
  switch (name) {
    case 'galaxy': data = galaxy(n, rng); break
    case 'androGalaxy': data = androGalaxy(n, rng); break
    case 'icosphere': data = icosphere(n, rng); break
    case 'torusKnot': data = torusKnot(n); break
    case 'shell': data = shell(n, rng); break
    case 'mobiusTube': data = mobiusTube(n); break
    case 'blackHole': data = blackHole(n, rng); break
    case 'tesseract': data = tesseract(n, rng); break
    case 'trefoil': data = trefoil(n); break
    case 'dnaHelix': data = dnaHelix(n, rng); break
    case 'hyperboloid': data = hyperboloid(n, rng); break
    case 'superEllipsoid': data = superEllipsoid(n, rng); break
    case 'dodecahedron': data = dodecahedron(n, rng); break
    case 'stellated': data = stellated(n, rng); break
    case 'lissajous': data = lissajous(n); break
    case 'roseCurve': data = roseCurve(n); break
    case 'statelessLogo': data = statelessLogo(n, rng); break
    case 'gyroid': data = gyroid(n, rng); break
    case 'kleinBottle': data = kleinBottle(n); break
    case 'superToroid': data = superToroid(n, rng); break
    case 'mengerSponge': data = mengerSponge(n, rng); break
    case 'lorenzAttractor': data = lorenzAttractor(n, rng); break
    case 'hopfFibration': data = hopfFibration(n, rng); break
    case 'neuralLattice': data = neuralLattice(n, rng); break
    case 'cityGrid': data = cityGrid(n, rng); break
    case 'sphericalHarmonic': data = sphericalHarmonic(n, rng); break
    default: data = icosphere(n, rng)
  }
  _cache.set(key, data)
  return data
}

/**
 * Resize a ShapeData to exactly `n` points.
 *
 * Structural points come first and are kept whole where they fit, because they
 * carry the wireframe. Fill points are strided rather than truncated, so a
 * thinned shape stays spread across its whole volume instead of keeping one
 * dense region and dropping the rest. Line segments survive only if both of
 * their endpoints did.
 */
function refit(src: ShapeData, srcN: number, n: number): ShapeData {
  const positions = new Float32Array(n * 3)
  const core = Math.min(src.coreEnd ?? 0, Math.floor(n * 0.5))

  for (let i = 0; i < core; i++) {
    positions[i * 3] = src.positions[i * 3]
    positions[i * 3 + 1] = src.positions[i * 3 + 1]
    positions[i * 3 + 2] = src.positions[i * 3 + 2]
  }

  const availFill = Math.max(1, srcN - core)
  const wantFill = n - core
  for (let k = 0; k < wantFill; k++) {
    const s = core + Math.floor((k * availFill) / wantFill)
    const d = core + k
    positions[d * 3] = src.positions[s * 3]
    positions[d * 3 + 1] = src.positions[s * 3 + 1]
    positions[d * 3 + 2] = src.positions[s * 3 + 2]
  }

  const lines: number[] = []
  for (let i = 0; i + 1 < src.lines.length; i += 2) {
    const a = src.lines[i], b = src.lines[i + 1]
    if (a < core && b < core) lines.push(a, b)
  }

  return { positions, lines: new Uint32Array(lines), coreEnd: core }
}