/**
 * index.ts
 * src/particles/glb/index.ts
 *
 * The GLB engine's public surface. Import from here rather than reaching into
 * the individual files, so the internals stay free to move.
 */

export { loadModel, evictModel, setModelWorkerFactory, GlbError } from './ModelSource'
export type { ModelSource, ModelClipInfo, LoadModelOptions } from './ModelSource'

export { useModelShape, useModelShapes } from './useModelShape'
export type { UseModelShapeResult } from './useModelShape'

export { parseGlb } from './glb-parse'
export type { GlbDoc, ParsedPrimitive, ParsedAnimation } from './glb-parse'

export { sampleGlb } from './glb-sample'
export type { SampledCloud, SampleOptions } from './glb-sample'

export { createPoseRig } from './glb-pose'
export type { PoseRig, PoseDoc } from './glb-pose'