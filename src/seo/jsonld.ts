/**
 * jsonld.ts
 * src/seo/jsonld.ts
 *
 * Structured data: the JSON-LD blocks that tell a search engine what a page is
 * about without making it infer anything from the prose.
 *
 * ─── WHY BOTHER ──────────────────────────────────────────────────────────────
 *
 * For search, structured data is what produces a rich result rather than a
 * plain blue link: the breadcrumb trail under a result, an app's rating, an FAQ
 * that expands in place.
 *
 * For generative engines it does something more useful. A model answering
 * "who builds X" has to decide what this site is and who runs it. Prose makes
 * that an inference. `{"@type": "Organization", "name": "...", "sameAs": [...]}`
 * makes it a fact it can read directly, and it is the same fact every time
 * rather than whatever the crawler happened to pick up from a hero heading.
 *
 * ─── THE ONE RULE ────────────────────────────────────────────────────────────
 *
 * Only claim what is on the page. Structured data that disagrees with the
 * visible content is a manual action from Google, not a clever trick, and a
 * fabricated rating or a review count pulled out of nowhere is exactly the sort
 * of thing that gets a site's rich results switched off permanently.
 *
 * Everything below is built from site.config.ts, which is also what the pages
 * render from, so the two cannot drift.
 */

import { brand, leadership, projects, type ProjectConfig } from '@/config'
import { absoluteUrl } from './routeMeta'
import type { PageMeta } from './routeMeta'
import { seo } from '@/config/site.config.seo'

/** A JSON-LD node. Loose on purpose: the shape varies per @type. */
export type JsonLd = Record<string, unknown>

/** Drop empty strings, empty arrays and undefined, recursively. */
function prune<T extends JsonLd>(node: T): T {
    for (const key of Object.keys(node)) {
        const v = node[key]
        if (v === undefined || v === null || v === '') {
            delete node[key]
        } else if (Array.isArray(v)) {
            if (v.length === 0) delete node[key]
        } else if (typeof v === 'object') {
            prune(v as JsonLd)
            if (Object.keys(v as JsonLd).length === 0) delete node[key]
        }
    }
    return node
}

/**
 * A stable @id for the organisation.
 *
 * Giving the organisation one identifier that every page refers to is what lets
 * a search engine understand the whole site as one entity's property, rather
 * than as a dozen pages that each happen to mention the same name. The `#`
 * fragment is the convention: it is an identifier, not a fetchable URL.
 */
export const ORG_ID = `${absoluteUrl('/')}#organization`
export const SITE_ID = `${absoluteUrl('/')}#website`

export function organizationLd(): JsonLd {
    const { entity } = seo

    const address = entity.locality || entity.country
        ? {
            '@type': 'PostalAddress',
            addressLocality: entity.locality,
            addressCountry: entity.country,
        }
        : undefined

    return prune({
        '@type': 'Organization',
        '@id': ORG_ID,
        name: brand.name,
        alternateName: brand.shortName,
        url: absoluteUrl('/'),
        description: entity.summary || brand.description,
        slogan: brand.tagline,
        email: brand.email,
        logo: {
            '@type': 'ImageObject',
            url: absoluteUrl(seo.ogImage),
        },
        image: absoluteUrl(seo.ogImage),
        foundingDate: entity.founded,
        areaServed: entity.areaServed,
        address,
        sameAs: [...entity.sameAs],
        knowsAbout: [...entity.services],
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: brand.email,
            availableLanguage: 'English',
        },
    })
}

export function websiteLd(): JsonLd {
    return prune({
        '@type': 'WebSite',
        '@id': SITE_ID,
        url: absoluteUrl('/'),
        name: brand.name,
        description: seo.entity.summary || brand.description,
        publisher: { '@id': ORG_ID },
        inLanguage: seo.lang,
        // No SearchAction. That property declares a site search endpoint, and
        // claiming one this site does not have is a claim a crawler can and
        // will check.
    })
}

export function webPageLd(meta: PageMeta): JsonLd {
    return prune({
        '@type': 'WebPage',
        '@id': `${meta.canonical}#webpage`,
        url: meta.canonical,
        name: meta.title,
        description: meta.description,
        isPartOf: { '@id': SITE_ID },
        about: { '@id': ORG_ID },
        inLanguage: seo.lang,
        primaryImageOfPage: meta.ogImage
            ? { '@type': 'ImageObject', url: meta.ogImage }
            : undefined,
    })
}

export function breadcrumbLd(meta: PageMeta): JsonLd | null {
    // A one-item trail is not a trail.
    if (meta.breadcrumbs.length < 2) return null
    return {
        '@type': 'BreadcrumbList',
        '@id': `${meta.canonical}#breadcrumb`,
        itemListElement: meta.breadcrumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.name,
            item: absoluteUrl(crumb.path),
        })),
    }
}

/**
 * Map a project's platform onto a schema.org application category.
 *
 * `applicationCategory` is a free-text field in practice, but the handful of
 * values Google recognises produce better results, so these map onto those.
 */
function appCategory(p: ProjectConfig): string {
    switch (p.platform) {
        case 'Mobile': return 'MobileApplication'
        case 'Web': return 'WebApplication'
        case 'Desktop': return 'DesktopApplication'
        default: return 'SoftwareApplication'
    }
}

function operatingSystem(p: ProjectConfig): string | undefined {
    switch (p.platform) {
        case 'Mobile': return 'Android, iOS'
        case 'Web': return 'Any'
        case 'Desktop': return 'Windows, macOS, Linux'
        case 'Cross-platform': return 'Android, iOS, Web'
        default: return undefined
    }
}

export function softwareApplicationLd(p: ProjectConfig): JsonLd {
    const url = absoluteUrl(`/projects/${p.slug}`)

    // Every real outbound link, as sameAs. This is how a search engine connects
    // a store listing to the page describing it.
    const sameAs: string[] = []
    const push = (href?: string) => {
        if (href && href !== '#' && !href.toUpperCase().startsWith('REPLACE_') && !href.startsWith('/')) {
            sameAs.push(href)
        }
    }
    push(p.stores?.googlePlay)
    push(p.stores?.appStore)
    push(p.stores?.web)
    push(p.stores?.github)
    push(p.build?.github)
    push(p.build?.itch)

    return prune({
        '@type': 'SoftwareApplication',
        '@id': `${url}#software`,
        name: p.name,
        url,
        description: p.tagline || p.about?.[0],
        applicationCategory: appCategory(p),
        operatingSystem: operatingSystem(p),
        softwareVersion: undefined,
        datePublished: /^\d{4}$/.test(p.year) ? p.year : undefined,
        author: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        image: p.coverImage ? absoluteUrl(p.coverImage) : undefined,
        screenshot: (p.screenshots ?? []).map(s => absoluteUrl(s)),
        featureList: [...(p.features ?? [])],
        keywords: [...p.tech].join(', '),
        sameAs,
        // No aggregateRating and no offers. There are no ratings and no price,
        // and inventing either is the fastest way to lose rich results for the
        // whole domain.
    })
}

export function faqLd(): JsonLd | null {
    if (seo.faq.length === 0) return null
    return {
        '@type': 'FAQPage',
        '@id': `${absoluteUrl('/')}#faq`,
        mainEntity: seo.faq.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
    }
}

/**
 * Shape of a leadership entry, declared locally.
 *
 * `leadership` in site.config.ts is cast `as any`, so every field read off it
 * is unchecked, including on the team page. Rather than inherit that, this
 * narrows it to the fields used here and tolerates all of them being absent.
 * Worth fixing at the source: see the note in SEO-AND-GEO.md.
 */
interface LeadershipLike {
    name?: string
    role?: string
    title?: string
    bio?: string
    image?: string
    linkedin?: string
    github?: string
}

export function peopleLd(): JsonLd[] {
    const roster = (leadership as LeadershipLike[]) ?? []
    return roster.filter(p => !!p?.name).map(person => prune({
        '@type': 'Person',
        '@id': `${absoluteUrl('/team')}#${person.name!.toLowerCase().replace(/\s+/g, '-')}`,
        name: person.name!,
        jobTitle: person.title || person.role,
        description: person.bio,
        worksFor: { '@id': ORG_ID },
        image: person.image ? absoluteUrl(person.image) : undefined,
        sameAs: [person.linkedin, person.github].filter(Boolean) as string[],
    }))
}

/**
 * Everything that belongs on one page, as a single @graph.
 *
 * One graph rather than several separate script tags. Separate blocks make each
 * node an island, and a parser then has to guess that the Organization in one
 * and the `publisher` reference in another are the same thing. In a graph with
 * `@id` references it does not have to guess.
 */
export function graphFor(meta: PageMeta): JsonLd {
    const nodes: JsonLd[] = [organizationLd(), websiteLd(), webPageLd(meta)]

    const crumbs = breadcrumbLd(meta)
    if (crumbs) nodes.push(crumbs)

    if (meta.path === '/') {
        const faq = faqLd()
        if (faq) nodes.push(faq)
    }

    if (meta.path === '/team') {
        nodes.push(...peopleLd())
    }

    // The project's own entry, on its page and on its legal pages, since a
    // privacy policy is about the app rather than about the studio.
    if (meta.project) {
        const hidden = meta.project.classified === true
        if (!hidden) nodes.push(softwareApplicationLd(meta.project))
    }

    if (meta.path === '/projects') {
        const listed = projects.filter(p => !p.classified && !resolveHidden(p))
        nodes.push({
            '@type': 'CollectionPage',
            '@id': `${meta.canonical}#collection`,
            url: meta.canonical,
            name: meta.title,
            isPartOf: { '@id': SITE_ID },
            mainEntity: {
                '@type': 'ItemList',
                numberOfItems: listed.length,
                itemListElement: listed.map((p, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: p.name,
                    url: absoluteUrl(`/projects/${p.slug}`),
                })),
            },
        })
    }

    return { '@context': 'https://schema.org', '@graph': nodes }
}

function resolveHidden(p: ProjectConfig): boolean {
    return p.visibility === 'Internal'
        || p.visibility === 'Internal Testing'
        || p.visibility === 'Restricted'
}