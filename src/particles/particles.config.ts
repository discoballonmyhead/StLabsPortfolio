import type { ShapeName } from './shapes'

export interface SectionParticleConfig {
  sectionId: string
  shapes: ShapeName[]
  colors: string[]   // one color per shape, cycles with each morph
  colorFar?: string
  particleCount?: number
  particleSize?: number
  morphHold?: number
  morphDuration?: number
  autoRotateSpeed?: number
}

// Cosmic palette: orange, green, white cycling with each shape
// Cosmic palette: 17 colors for 17 shapes
export const COSMIC_COLORS = [
  '#FF6B2B',   // cosmic orange
  '#00FFB2',   // cosmic green
  '#E8E8E8',   // near white
  '#FF9A5C',   // warm orange
  '#4DFFCF',   // cyan green
  '#FFFFFF',   // pure white
  '#FF5500',   // deep orange
  '#00E5A0',   // deep green
  '#C8C8FF',   // cool white
  '#FFB347',   // amber orange
  '#00FFC8',   // mint green
  '#F0F0F0',   // soft white
  '#FF4500',   // red orange
  '#39FF14',   // neon green
  '#FAFAFA',   // white
  '#FF7A00',   // orange
  '#B2FF4D',   // **NEW**: electric lime/green
]

// All 16 shapes cycling, each gets its own cosmic color
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
  colorFar: '#050810',
  particleCount: 3500,
  particleSize: 1.5,
  morphHold: 1.0,
  morphDuration: 0.8,
  autoRotateSpeed: 0.008,
}

export const sectionParticles: SectionParticleConfig[] = [
  {
    sectionId: 'service-analytics',
    shapes: ['galaxy', 'hyperboloid', 'superEllipsoid'],
    colors: ['#61daff', '#00FFB2', '#1bcaff'],
    colorFar: '#002244',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 3.0,
    morphDuration: 1.8,
    autoRotateSpeed: 0.16,
  },
  {
    sectionId: 'service-intelligence',
    shapes: ['tesseract', 'icosphere', 'roseCurve'],
    colors: ['#00FFB2', '#61daff', '#00E5A0'],
    colorFar: '#004D33',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 3.0,
    morphDuration: 1.8,
    autoRotateSpeed: 0.14,
  },
  {
    sectionId: 'service-ai',
    shapes: ['dnaHelix', 'dodecahedron', 'stellated'],
    colors: ['#1bcaff', '#00FFB2', '#61daff'],
    colorFar: '#002244',
    particleCount: 4000,
    particleSize: 3.0,
    morphHold: 2.8,
    morphDuration: 1.8,
    autoRotateSpeed: 0.18,
  },
]