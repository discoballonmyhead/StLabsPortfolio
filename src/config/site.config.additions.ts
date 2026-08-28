/**
 * shape-timeline.config.ts
 * Lives in src/config/ next to site.config.ts.
 *
 * All song-time intervals in one place:
 *   timelineConfig    — the rhythm knobs (first hold, interval, morph length)
 *   shapeTimeline     — GENERATED from those knobs: logo holds `firstHold`
 *                       seconds, then a new shape every `interval` seconds,
 *                       cycling the SEQUENCE for the whole track. Never stops
 *                       transitioning; when the track loops, it restarts too.
 *   visualizerWindows — MusicPlayer retro/glitch boom phases
 *
 * Import by explicit path — no barrel needed:
 *   import { shapeTimeline } from '@/config/shape-timeline.config'
 *
 * Want full manual control instead? Delete the generator call and export a
 * hand-written ShapeTimelineEntry[] — the viewer doesn't care where the
 * entries came from. (Semantics: each shape is FULLY FORMED at its `at`
 * second; the morph into it fills `morphDuration` seconds right before.)
 *
 * The ShapeName import below is TYPE-ONLY (erased at compile time), so there
 * is no runtime import cycle with the particles system and no Strudel risk.
 */

import type { ShapeName } from '@/particles/shapes'

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE RHYTHM  — the numbers you asked for
// ─────────────────────────────────────────────────────────────────────────────

export const timelineConfig = {
  firstHold: 4.5,      // seconds the STLABS logo stays fully intact at the start
  interval: 2.8,       // seconds between each subsequent shape's arrival
  morphDuration: 0.8,  // seconds each transition takes (heroParticleConfig reads this)
  trackLength: 240,    // generate entries up to here; entries past the song's
  // end are harmless (the audio loops → timeline restarts)
} as const

// The order shapes cycle in — repeats for as long as the track runs.
export const SEQUENCE: ShapeName[] = [
  'statelessLogo',
  'icosphere',
  'tesseract',
  'dodecahedron',
  'galaxy',
  'blackHole',
  'androGalaxy',
  'dnaHelix',
  'torusKnot',
  'stellated',
  'hyperboloid',
  'superEllipsoid',
  'trefoil',
  'lissajous',
  'mobiusTube',
  'shell',
  'roseCurve',
]

// ─────────────────────────────────────────────────────────────────────────────
// GENERATED SHAPE TIMELINE
// ─────────────────────────────────────────────────────────────────────────────
// Entry 0: logo at t=0. Entry 1 arrives at firstHold + morphDuration — i.e.
// the logo sits untouched for exactly `firstHold` seconds, THEN the first
// transition plays. Every later entry arrives `interval` seconds after the
// previous one, cycling SEQUENCE until trackLength. ~80 entries; the viewer's
// cursor-based resolver handles any count at O(1) per frame.

export interface ShapeTimelineEntry {
  at: number          // seconds into the track — shape fully formed here
  shape: ShapeName
  color?: string      // optional per-shape colour override
}

function buildTimeline(): ShapeTimelineEntry[] {
  const { firstHold, interval, morphDuration, trackLength } = timelineConfig
  const out: ShapeTimelineEntry[] = [{ at: 0, shape: SEQUENCE[0] }]
  let t = firstHold + morphDuration
  let i = 1
  while (t < trackLength) {
    out.push({ at: Math.round(t * 100) / 100, shape: SEQUENCE[i % SEQUENCE.length] })
    t += interval
    i++
  }
  return out
}

export const shapeTimeline: ShapeTimelineEntry[] = buildTimeline()

// ─────────────────────────────────────────────────────────────────────────────
// MUSIC VISUALIZER WINDOWS  (bars / embers / waves boom phases)
// ─────────────────────────────────────────────────────────────────────────────
//   'retro'  = calm phase  (bars + peaks only)
//   'glitch' = BOOM phase  (embers, lingering motes, waves, RGB shift)

export interface VisualizerWindow {
  start: number
  end: number
  type: 'retro' | 'glitch'
}

export const visualizerWindows: VisualizerWindow[] = [
  { start: 52, end: 99, type: 'retro' },    // 0:52–1:39
  { start: 172, end: 222, type: 'glitch' },   // 2:52–3:37
]