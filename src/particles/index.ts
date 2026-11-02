/**
 * index.ts
 * src/particles/index.ts
 *
 * The particles barrel. Anything imported as
 *
 *   import { ModelField, sampleShape } from '@/particles'
 *
 * has to be re-exported here first.
 */

export { default as ParticleViewer } from './ParticleViewer' // Remove .tsx
export { default as WaveField } from './WaveField'           // Remove .tsx
export { default as ModelField } from './ModelField'

export {
    sampleShape,
    SHAPE_NAMES,
    SHAPE_LABELS,
    ORB_SHAPE_CYCLE,
    registerModelShape,
    hasModelShape,
    clearModelShapes,
    modelIdOf,
} from './shapes'
export type { ShapeName, ShapeRef, ShapeData } from './shapes'

export {
    heroParticleConfig,
    sectionParticles,
    statusWaveConfig,
    COSMIC_COLORS,
} from './particles.config'
export type { SectionParticleConfig } from './particles.config'

export { modelRegistry, modelDefaults, MODEL_IDS, modelShapeName } from './models.config'
export type { ModelEntry } from './models.config'

// ── The .glb engine ──────────────────────────────────────────────────────────
// Re-exported through its own barrel, so `import { loadModel } from '@/particles'`
// works and the engine's internals stay free to move.
export {
    loadModel,
    evictModel,
    setModelWorkerFactory,
    GlbError,
    useModelShape,
    useModelShapes,
} from './glb'
export type { ModelSource, ModelClipInfo, SampledCloud } from './glb'