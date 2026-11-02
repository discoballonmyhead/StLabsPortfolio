/**
 * Seo.tsx
 * src/seo/Seo.tsx
 *
 * Keeps the document head in step with the current route.
 *
 * ─── WHY NOT react-helmet ────────────────────────────────────────────────────
 *
 * react-helmet-async is the usual answer and it is a perfectly good library.
 * It is also a dependency, a provider to wrap the tree in, and a second
 * rendering pass, in exchange for a job that is one effect and about sixty
 * lines of DOM calls. On a site whose whole point is not carrying weight it
 * does not need, this is the cheaper side of the trade.
 *
 * ─── HOW IT AVOIDS DUPLICATE TAGS ────────────────────────────────────────────
 *
 * Every element this file manages carries `data-seo="<key>"`. On each route
 * change it upserts by key and then removes any managed element whose key is
 * not in the new set.
 *
 * That matters most for the prerendered HTML. scripts/prerender.mjs writes the
 * same tags with the same keys, so when the bundle boots this file finds them
 * and updates them in place. Without the keys it would append a second
 * canonical link and a second description next to the static ones, and two
 * canonicals on a page means a search engine picks one at random or ignores
 * both.
 *
 * ─── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
 *
 * It does not help a crawler that does not run JavaScript, which is most of the
 * AI crawlers. Nothing done at runtime can. That is prerender.mjs's job, and
 * this component exists to keep the head correct during client side navigation
 * after the first paint.
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { resolveMeta } from './routeMeta'
import type { PageMeta } from './routeMeta'
import { graphFor } from './jsonld'
import { brand } from '@/config'
import { seo } from '@/config/site.config.seo'

const MANAGED = 'data-seo'

interface MetaSpec {
    key: string
    /** `name` for standard meta, `property` for Open Graph. */
    attr: 'name' | 'property'
    value: string
    content: string
}

function upsertMeta(spec: MetaSpec): void {
    let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${MANAGED}="${spec.key}"]`,
    )
    if (!el) {
        // Adopt a tag the prerender wrote without the marker, rather than
        // adding a second one beside it.
        el = document.head.querySelector<HTMLMetaElement>(
            `meta[${spec.attr}="${spec.value}"]`,
        )
    }
    if (!el) {
        el = document.createElement('meta')
        document.head.appendChild(el)
    }
    el.setAttribute(MANAGED, spec.key)
    el.setAttribute(spec.attr, spec.value)
    el.setAttribute('content', spec.content)
}

function upsertLink(key: string, rel: string, href: string): void {
    let el = document.head.querySelector<HTMLLinkElement>(`link[${MANAGED}="${key}"]`)
    if (!el) el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
    if (!el) {
        el = document.createElement('link')
        document.head.appendChild(el)
    }
    el.setAttribute(MANAGED, key)
    el.setAttribute('rel', rel)
    el.setAttribute('href', href)
}

function upsertJsonLd(key: string, data: unknown): void {
    let el = document.head.querySelector<HTMLScriptElement>(`script[${MANAGED}="${key}"]`)
    if (!el) {
        el = document.createElement('script')
        el.type = 'application/ld+json'
        document.head.appendChild(el)
    }
    el.setAttribute(MANAGED, key)
    // textContent, never innerHTML. The payload is built from config rather
    // than from anything a visitor typed, but a script tag written with
    // innerHTML is a habit worth not having.
    el.textContent = JSON.stringify(data)
}

/** Build the full tag set for a page. */
function specsFor(meta: PageMeta): MetaSpec[] {
    const specs: MetaSpec[] = [
        { key: 'description', attr: 'name', value: 'description', content: meta.description },
        {
            key: 'robots',
            attr: 'name',
            value: 'robots',
            content: meta.noindex
                ? 'noindex, nofollow'
                // max-image-preview:large is what allows a full size image in a
                // result rather than a thumbnail. The snippet limits being
                // unset means "no limit", which is what you want.
                : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
        },

        // ── Open Graph, used by every link preview worth having ──────────────
        { key: 'og:type', attr: 'property', value: 'og:type', content: meta.ogType },
        { key: 'og:title', attr: 'property', value: 'og:title', content: meta.title },
        { key: 'og:description', attr: 'property', value: 'og:description', content: meta.description },
        { key: 'og:url', attr: 'property', value: 'og:url', content: meta.canonical },
        { key: 'og:site_name', attr: 'property', value: 'og:site_name', content: brand.name },
        { key: 'og:locale', attr: 'property', value: 'og:locale', content: seo.locale },
        { key: 'og:image', attr: 'property', value: 'og:image', content: meta.ogImage },
        { key: 'og:image:alt', attr: 'property', value: 'og:image:alt', content: seo.ogImageAlt },

        // ── Twitter, which ignores og: for a couple of fields ────────────────
        { key: 'twitter:card', attr: 'name', value: 'twitter:card', content: seo.twitterCard },
        { key: 'twitter:title', attr: 'name', value: 'twitter:title', content: meta.title },
        { key: 'twitter:description', attr: 'name', value: 'twitter:description', content: meta.description },
        { key: 'twitter:image', attr: 'name', value: 'twitter:image', content: meta.ogImage },
    ]

    if (seo.twitterSite) {
        specs.push({
            key: 'twitter:site', attr: 'name', value: 'twitter:site', content: seo.twitterSite,
        })
    }

    return specs
}

/**
 * Drop in once, inside the router.
 *
 * It renders nothing. Everything it does happens in an effect against
 * document.head.
 */
export default function Seo() {
    const location = useLocation()

    useEffect(() => {
        const meta = resolveMeta(location.pathname)

        document.title = meta.title
        document.documentElement.lang = seo.lang

        const specs = specsFor(meta)
        for (const spec of specs) upsertMeta(spec)

        upsertLink('canonical', 'canonical', meta.canonical)
        upsertJsonLd('jsonld', graphFor(meta))

        // Remove managed tags this page does not want. Without this, navigating
        // from a page with a twitter:site to one without would leave the old
        // one behind, and the head would slowly accumulate whatever every page
        // visited so far happened to set.
        const wanted = new Set<string>([
            ...specs.map(s => s.key), 'canonical', 'jsonld',
        ])
        document.head.querySelectorAll(`[${MANAGED}]`).forEach(el => {
            const key = el.getAttribute(MANAGED)
            if (key && !wanted.has(key)) el.remove()
        })
    }, [location.pathname])

    return null
}

/**
 * The same work, as a hook, for a page that needs to override something.
 *
 * Rarely needed: resolveMeta already derives titles from the config. Use it for
 * a page whose title depends on something fetched at runtime.
 */
export function useSeoOverride(partial: Partial<PageMeta>): void {
    const location = useLocation()
    const json = JSON.stringify(partial)

    useEffect(() => {
        const meta = { ...resolveMeta(location.pathname), ...JSON.parse(json) as Partial<PageMeta> }
        document.title = meta.title
        for (const spec of specsFor(meta)) upsertMeta(spec)
        upsertLink('canonical', 'canonical', meta.canonical)
        upsertJsonLd('jsonld', graphFor(meta))
        // Serialised rather than passed as an object, so an inline object
        // literal at the call site does not re-run this on every render.
    }, [location.pathname, json])
}