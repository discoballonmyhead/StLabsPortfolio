/**
 * particles.config.ts
 *
 * Configuration for all ParticleViewer instances.
 * This file is pure config data — no Strudel imports, no React, no canvas.
 *
 * Strudel is a separate system in src/strudel/ and must never be imported here.
 * To switch the home page hero to a Strudel visualizer instead of particles:
 *   1. Set flags.showParticleBackground = false in site.config.ts
 *   2. Render your <StrudelVisualizer /> component in Home.tsx in its slot
 *   That is all. Do not touch this file for that.
 *
 * v2: the hero morph sequence is no longer derived from morphHold cycles —
 * it now consumes `shapeTimeline` from site.config.ts, where every shape has
 * an explicit song timestamp. Edit the timeline THERE, not here. The section
 * configs (no timeline) keep the old hold/duration cycle behaviour.
 */

import type { ShapeName } from './shapes'
import { shapeTimeline, timelineConfig, type ShapeTimelineEntry } from '@/config/site.config.additions'

export type { ShapeTimelineEntry }
// ── Types ─────────────────────────────────────────────────────────────────────

export interface SectionParticleConfig {
  sectionId: string
  shapes: ShapeName[]
  colors: string[]
  colorFar?: string
  particleCount?: number
  particleSize?: number
  morphHold?: number
  morphDuration?: number
  autoRotateSpeed?: number
  holdEase?: number
  morphEase?: number
}

// Minimalist Black & White Palette
export const COSMIC_COLORS = [
  '#FFFFFF', '#FAFAFA', '#E5E7EB', '#D1D5DB', '#9CA3AF'
]

export const heroParticleConfig: SectionParticleConfig = {
  sectionId: 'hero',
  // 1. Lock it strictly to the wave
  shapes: ['wave'],
  colors: COSMIC_COLORS,
  colorFar: '#000000',
  particleCount: 3500,
  particleSize: 1.5,
  // 2. Slow auto-rotation so the wave drifts nicely
  autoRotateSpeed: 0.0002,
  // 3. Make the hold time massive so it never tries to morph
  morphHold: 99999,
  morphDuration: 0,
  holdEase: 0.06,
  morphEase: 0.22,
  // 4. NO TIMELINE PROPERTY HERE AT ALL
}
// export const heroParticleConfig: SectionParticleConfig = {
//   sectionId: 'hero',
//   shapes: [
//     'statelessLogo',
//     'icosphere',
//     'tesseract',
//     'dodecahedron',
//     'galaxy',
//     'blackHole',
//     'androGalaxy',
//     'dnaHelix',
//     'torusKnot',
//     'stellated',
//     'hyperboloid',
//     'superEllipsoid',
//     'trefoil',
//     'lissajous',
//     'mobiusTube',
//     'shell',
//     'roseCurve',
//   ],
//   colors: COSMIC_COLORS,
//   colorFar: '#000000', // Deep black background
//   particleCount: 3500,
//   particleSize: 1.5,
//   morphDuration: timelineConfig.morphDuration,
//   holdEase: 0.06,
//   morphEase: 0.22,
//   autoRotateSpeed: 0.008,
//   timeline: shapeTimeline,
// }

// ── Section configs — other page sections ─────────────────────────────────────

export const sectionParticles: SectionParticleConfig[] = [
  {
    sectionId: 'service-analytics',
    shapes: ['galaxy', 'hyperboloid', 'superEllipsoid'],
    colors: ['#FFFFFF', '#D1D5DB', '#E5E7EB'],
    colorFar: '#050505', // Near-black for subtle section contrast
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 1.8,
    morphDuration: 1.0,
    autoRotateSpeed: 0.16,
  },
  {
    sectionId: 'service-intelligence',
    shapes: ['tesseract', 'icosphere', 'roseCurve'],
    colors: ['#D1D5DB', '#FFFFFF', '#9CA3AF'],
    colorFar: '#0A0A0A',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 1.8,
    morphDuration: 1.0,
    autoRotateSpeed: 0.14,
  },
  {
    sectionId: 'service-ai',
    shapes: ['dnaHelix', 'dodecahedron', 'stellated'],
    colors: ['#E5E7EB', '#FAFAFA', '#FFFFFF'],
    colorFar: '#000000',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 1.8,
    morphDuration: 1.0,
    autoRotateSpeed: 0.18,
  },
]