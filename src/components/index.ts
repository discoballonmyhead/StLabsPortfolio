/**
 * index.ts
 * src/components/index.ts
 *
 * The components barrel. Anything imported as
 *
 *   import { Layout, FadeUp } from '@/components'
 *
 * has to be re-exported from this file first. A component that only ever gets
 * imported by relative path, the way Layout pulls in Nav with './Nav', does
 * not need a line here. That is why Layout built fine while FadeUp, CountUp,
 * and BuildSequence did not: they were only ever reached through the barrel.
 */

export { default as Layout } from './Layout'
export { default as Nav } from './Nav'
export { default as Breadcrumb } from './Breadcrumb'
export { default as Resolve } from './Resolve'
export { default as MusicPlayer } from './MusicPlayer'
export { default as ImageCarousel } from './ImageCarousel'

export {
  Divider,
  SectionLabel,
  AppHeader,
  TechBadge,
  StoreButton,
  PolicyLink,
} from './UI'

// ── Animation pieces ─────────────────────────────────────────────────────────
export { FadeUp } from './FadeUp'
export { CountUp } from './CountUp'
export { BuildSequence } from './BuildSequence'

// VoiceOrb stays a direct import in Home.tsx as '@/components/Voiceorb'.
// Adding it here as well would be harmless, but it is only used in one place.