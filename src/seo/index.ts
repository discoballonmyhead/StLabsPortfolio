/**
 * index.ts
 * src/seo/index.ts
 */

export { default as Seo, useSeoOverride } from './Seo'
export {
    resolveMeta,
    absoluteUrl,
    normalisePath,
    allIndexablePaths,
    allPrerenderPaths,
} from './routeMeta'
export type { PageMeta } from './routeMeta'
export {
    graphFor,
    organizationLd,
    websiteLd,
    webPageLd,
    breadcrumbLd,
    softwareApplicationLd,
    faqLd,
    peopleLd,
    ORG_ID,
    SITE_ID,
} from './jsonld'
export type { JsonLd } from './jsonld'