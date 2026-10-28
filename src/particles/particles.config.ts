/**
 * particles.config.ts
 * src/particles/particles.config.ts
 *
 * Config data only. No React, no canvas, no Strudel.
 *
 * ─── WHAT CHANGED, AND WHY ───────────────────────────────────────────────────
 *
 * heroParticleConfig had been locked to shapes: ['wave'] with morphHold at
 * 99999, because the status pages were rendering their wave by pointing
 * ParticleViewer at this same config. That froze the home page on one shape.
 *
 * The status pages now use WaveField, which is its own component, so this is
 * back to the full morph sequence. Nothing on a status page reads this file.
 *
 * Two other things that were wrong here:
 *
 *   morphDuration: 0  divides by zero inside resolveMorphState. It was only
 *                     masked because morphHold was 99999, so the code never
 *                     reached the division. ParticleViewer now floors it, but
 *                     a real duration belongs here anyway.
 *
 *   The unused shapeTimeline / timelineConfig imports fail a build with
 *     noUnusedLocals, which is on in most Vite TS templates. Removed.
 *
 * ─── THE HERO CLOCK ──────────────────────────────────────────────────────────
 *
 * clock: 'song' reads the real playback position from the #mp-audio element,
 * so the shapes advance with the track and freeze when it is paused. Because
 * MusicPlayer starts the audio on the visitor's first click anywhere, the hero
 * holds the logo until that click and then runs. The <audio> element has loop
 * set, so currentTime returns to 0 at the end of the track and the sequence
 * starts over by itself. That is the loop.
 *
 * clock: 'wall' uses wall-clock time instead and ignores the music entirely.
 * Use it for any viewer on a page that has no music player.
 */

import type { ShapeName } from './shapes'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SectionParticleConfig {
  sectionId: string
  shapes: ShapeName[]
  colors: string[]
  colorFar?: string
  particleCount?: number
  particleSize?: number
  /** Seconds the FIRST shape holds before the first morph. */
  morphHold?: number
  /** Seconds each morph takes. Values below 0.05 are floored by the viewer. */
  morphDuration?: number
  /** Seconds every LATER shape holds. Defaults to 2.8 in the viewer. */
  morphHoldNext?: number
  autoRotateSpeed?: number
  holdEase?: number
  morphEase?: number
  /**
   * 'song' follows #mp-audio and freezes with the music. 'wall' runs on its
   * own clock. Defaults to 'song', falling back to wall time when no audio
   * element is on the page.
   */
  clock?: 'song' | 'wall'
}

// Minimalist black and white palette.
export const COSMIC_COLORS = [
  '#FFFFFF', '#FAFAFA', '#E5E7EB', '#D1D5DB', '#9CA3AF',
]

// ── Home page hero ────────────────────────────────────────────────────────────
// Morphs through the sequence in order, looping with the track. Add, remove or
// reorder shapes freely; the viewer walks the array and wraps at the end.

export const heroParticleConfig: SectionParticleConfig = {
  sectionId: 'hero',
  shapes: [
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
  ],
  colors: COSMIC_COLORS,
  colorFar: '#000000',
  particleCount: 3500,
  particleSize: 1.5,

  morphHold: 4.5,       // logo sits intact for this long at the start
  morphHoldNext: 2.8,   // every shape after that
  morphDuration: 0.2,   // length of each transition

  holdEase: 0.06,
  morphEase: 0.22,
  autoRotateSpeed: 0.0008,
  clock: 'song',
}

// ── Status page wave ──────────────────────────────────────────────────────────
// Read by WaveField, not by ParticleViewer. Kept here so every particle
// setting lives in one file.

export const statusWaveConfig = {
  /** Multiplies the area-derived particle count. */
  density: 1,
  /** 'auto' gives portrait viewports the vertical wave. */
  orientation: 'auto' as 'horizontal' | 'vertical' | 'auto',
  /**
   * Status types that get the travelling crest. These are the screens where
   * something is genuinely in transit, so the motion matches the message.
   */
  pulseOn: [
    'email-sent',
    'email-confirmed',
    'reset-sent',
  ] as const,

  /**
   * Wave colour per status type.
   *
   * This lives here rather than on StatusPageConfig because not every copy of
   * site.config.ts has an `accent` field on that interface, and the wave should
   * not depend on whether it does. StatusPage still prefers a project's own
   * `theme.accent`, then `statusPages[type].accent` if your config happens to
   * define one, and falls back to this map.
   *
   * Green reads as done, amber as in flight, red as failed. Keep it that way
   * and the screen is legible before anyone has read a word of it.
   */
  accents: {
    'auth-success': '#4ade80',
    'auth-failed': '#f87171',
    'email-sent': '#fbbf24',
    'email-confirmed': '#4ade80',
    'email-failed': '#f87171',
    'reset-sent': '#fbbf24',
    'reset-success': '#4ade80',
    'reset-failed': '#f87171',
  } as Record<string, string | undefined>,

  /** Used when the status type is not in the map above. */
  fallbackAccent: '#FF8C55',
}

// ── Section configs ───────────────────────────────────────────────────────────
// No music on these sections, so they run on wall-clock time.

export const sectionParticles: SectionParticleConfig[] = [
  {
    sectionId: 'service-analytics',
    shapes: ['galaxy', 'hyperboloid', 'superEllipsoid'],
    colors: ['#FFFFFF', '#D1D5DB', '#E5E7EB'],
    colorFar: '#050505',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 1.8,
    morphHoldNext: 1.8,
    morphDuration: 1.0,
    autoRotateSpeed: 0.16,
    clock: 'wall',
  },
  {
    sectionId: 'service-intelligence',
    shapes: ['tesseract', 'icosphere', 'roseCurve'],
    colors: ['#D1D5DB', '#FFFFFF', '#9CA3AF'],
    colorFar: '#0A0A0A',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 1.8,
    morphHoldNext: 1.8,
    morphDuration: 1.0,
    autoRotateSpeed: 0.14,
    clock: 'wall',
  },
  {
    sectionId: 'service-ai',
    shapes: ['dnaHelix', 'dodecahedron', 'stellated'],
    colors: ['#E5E7EB', '#FAFAFA', '#FFFFFF'],
    colorFar: '#000000',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 1.8,
    morphHoldNext: 1.8,
    morphDuration: 1.0,
    autoRotateSpeed: 0.18,
    clock: 'wall',
  },
]