/**
 * routeMeta.ts
 * src/seo/routeMeta.ts
 *
 * One function that turns a path into everything the head needs.
 *
 * Shared by the `Seo` component at runtime and by scripts/prerender.mjs at
 * build time, which is the point: if the two disagreed about a page's title or
 * canonical URL, search engines would see one thing in the static HTML and
 * another after the page booted, and treat the mismatch as a reason to trust
 * neither.
 *
 * It takes a plain path and nothing else. No hooks, no router, no DOM, so it
 * runs in Node during the build without any of it being stubbed out.
 */

import { brand, leadership, projects, statusPages, type ProjectConfig, type StatusPageType } from '@/config'
import { seo } from '@/config/site.config.seo'

export interface PageMeta {
    /** The full document title, template already applied. */
    title: string
    description: string
    /** Absolute canonical URL. */
    canonical: string
    /** Path without the origin, always with a leading slash and no trailing one. */
    path: string
    noindex: boolean
    ogType: 'website' | 'article' | 'profile'
    ogImage: string
    /** Trail from the home page to here, for BreadcrumbList and the UI. */
    breadcrumbs: { name: string; path: string }[]
    /** The project this page belongs to, when it is a project page. */
    project?: ProjectConfig
    /** Sitemap hints. A noindex page is excluded from the sitemap entirely. */
    priority: number
    changefreq: string
}

/** Leading slash, no trailing slash, no query, no hash. '/' stays '/'. */
export function normalisePath(input: string): string {
    let p = (input || '/').split('?')[0].split('#')[0]
    if (!p.startsWith('/')) p = `/${p}`
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
    return p
}

/**
 * Absolute URL for a path, honouring seo.base for a subdirectory deploy.
 *
 * The root keeps its trailing slash, because that is the URL a server actually
 * serves the home page at. A canonical of `https://example.com` pointing at a
 * page served from `https://example.com/` is a mismatch, and a search engine
 * resolving it has to decide which of the two is the real address.
 */
export function absoluteUrl(path: string): string {
    const origin = seo.origin.replace(/\/+$/, '')
    const base = seo.base.replace(/\/+$/, '')
    const p = normalisePath(path)
    if (p === '/') return `${origin}${base}/`
    return `${origin}${base}${p}`
}

function titleWith(title: string): string {
    return seo.titleTemplate.includes('%s')
        ? seo.titleTemplate.replace('%s', title)
        : `${title} | ${brand.name}`
}

/** First sentence, or the whole thing if it is already short enough. */
function firstSentence(text: string, max = 160): string {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (clean.length <= max) return clean
    const cut = clean.slice(0, max)
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    if (stop > 60) return cut.slice(0, stop + 1)
    const space = cut.lastIndexOf(' ')
    return `${cut.slice(0, space > 60 ? space : max)}...`
}

function matchesNoindex(path: string): boolean {
    return seo.noindexPatterns.some(pattern => path.includes(pattern))
}

/**
 * The status page types, mapped from the URL segments the routes use.
 *
 * Kept as a table rather than derived, because the URL wording and the status
 * type deliberately differ: /confirm/success is the `email-confirmed` type.
 */
const STATUS_BY_SUFFIX: Record<string, StatusPageType> = {
    'auth/success': 'auth-success',
    'auth/failed': 'auth-failed',
    'confirm/sent': 'email-sent',
    'confirm/success': 'email-confirmed',
    'confirm/failed': 'email-failed',
    'reset/sent': 'reset-sent',
    'reset/success': 'reset-success',
    'reset/failed': 'reset-failed',
}

const LEGAL_LABELS: Record<string, string> = {
    'privacy-policy': 'Privacy policy',
    'terms': 'Terms of service',
    'cookies': 'Cookie policy',
    'delete-account': 'Delete your account',
}

export function resolveMeta(rawPath: string): PageMeta {
    const path = normalisePath(rawPath)
    const override = seo.routes[path]

    const base: PageMeta = {
        title: seo.defaultTitle,
        description: seo.defaultDescription,
        canonical: absoluteUrl(path),
        path,
        noindex: matchesNoindex(path),
        ogType: 'website',
        ogImage: absoluteUrl(seo.ogImage),
        breadcrumbs: [{ name: 'Home', path: '/' }],
        priority: 0.5,
        changefreq: 'monthly',
    }

    // ── Project pages ────────────────────────────────────────────────────────
    const projectMatch = /^\/projects\/([^/]+)(\/.*)?$/.exec(path)
    if (projectMatch) {
        const slug = projectMatch[1]
        const suffix = (projectMatch[2] ?? '').replace(/^\//, '')
        const project = projects.find(p => p.slug === slug)

        if (project) {
            base.project = project
            base.breadcrumbs = [
                { name: 'Home', path: '/' },
                { name: 'Projects', path: '/projects' },
                { name: project.name, path: `/projects/${slug}` },
            ]

            // A classified project publishes nothing. Its existence is the joke,
            // and a search result spoiling it would be a strange way to lose
            // that. Same for anything marked internal or restricted: a private
            // build should not be discoverable through a search engine.
            const hidden = project.classified === true ||
                project.visibility === 'Internal' ||
                project.visibility === 'Internal Testing' ||
                project.visibility === 'Restricted'

            if (!suffix) {
                base.title = titleWith(project.name)
                base.description = firstSentence(
                    project.tagline
                        ? `${project.tagline} ${project.about?.[0] ?? ''}`
                        : project.about?.[0] ?? seo.defaultDescription,
                )
                base.ogType = 'article'
                base.priority = 0.8
                base.changefreq = 'monthly'
                base.noindex = base.noindex || hidden
                if (project.coverImage) base.ogImage = absoluteUrl(project.coverImage)
                return base
            }

            const status = STATUS_BY_SUFFIX[suffix]
            if (status) {
                const cfg = statusPages[status]
                base.title = titleWith(`${cfg.headline.replace(/\n/g, ' ')} ${project.name}`)
                base.description = cfg.body
                // Always noindex, whatever noindexPatterns says, so removing a
                // pattern by accident cannot start publishing these.
                base.noindex = true
                base.priority = 0
                base.breadcrumbs.push({ name: 'Status', path })
                return base
            }

            const legal = LEGAL_LABELS[suffix]
            if (legal) {
                base.title = titleWith(`${legal}, ${project.name}`)
                base.description =
                    `${legal} for ${project.name}, an application by ${brand.name}.`
                base.priority = hidden ? 0 : 0.3
                base.changefreq = 'yearly'
                base.noindex = base.noindex || hidden
                base.breadcrumbs.push({ name: legal, path })
                return base
            }

            // An unrecognised suffix under a real project. Not a 404 as far as
            // the router is concerned, but nothing worth indexing either.
            base.title = titleWith(project.name)
            base.noindex = true
            base.priority = 0
            return base
        }

        // A project slug that does not exist. The router shows the 404 page.
        base.title = titleWith('Not found')
        base.description = 'This page does not exist.'
        base.noindex = true
        base.priority = 0
        return base
    }

    // ── Everything else ──────────────────────────────────────────────────────
    if (path === '/') {
        base.title = seo.defaultTitle      // no template, see the config comment
        base.description = seo.entity.summary || seo.defaultDescription
        base.priority = 1
        base.changefreq = 'weekly'
    } else if (path === '/team') {
        base.ogType = 'profile'
        base.title = titleWith(override?.title ?? 'Who we are')
        base.description = override?.description
            ?? (leadership.length
                ? `The people behind ${brand.name}.`
                : seo.defaultDescription)
        base.breadcrumbs.push({ name: 'Who we are', path })
        base.priority = 0.6
    } else if (override) {
        base.title = titleWith(override.title ?? path.slice(1))
        base.description = override.description ?? seo.defaultDescription
        base.breadcrumbs.push({ name: override.title ?? path.slice(1), path })
    } else {
        // An unknown path. The router renders the 404 page, so say so.
        base.title = titleWith('Not found')
        base.description = 'This page does not exist.'
        base.noindex = true
        base.priority = 0
        return base
    }

    if (override) {
        if (override.title && path !== '/') base.title = titleWith(override.title)
        if (override.description) base.description = override.description
        if (override.noindex !== undefined) base.noindex = override.noindex
        if (override.priority !== undefined) base.priority = override.priority
        if (override.changefreq) base.changefreq = override.changefreq
    }

    base.noindex = base.noindex || matchesNoindex(path)
    return base
}

/**
 * Every path the site serves that is worth putting in a sitemap.
 *
 * Built from the same `projects` array the router builds its routes from, so a
 * new project appears in the sitemap without anybody remembering to add it.
 * That is the only way a sitemap stays accurate: the moment it is a hand
 * maintained list, it is wrong.
 */
export function allIndexablePaths(): string[] {
    const paths: string[] = ['/', '/projects']
    if (leadership.length > 0) paths.push('/team')

    for (const key of Object.keys(seo.routes)) {
        // '/team' is in seo.routes for its title and description, but the page
        // itself only exists once somebody is on the roster. The nav link is
        // hidden in that case too, and a sitemap entry for an empty page is a
        // promise the site does not keep.
        if (key === '/team' && leadership.length === 0) continue
        if (!paths.includes(key)) paths.push(key)
    }

    for (const p of projects) {
        paths.push(`/projects/${p.slug}`)
        paths.push(`/projects/${p.slug}/privacy-policy`)
        paths.push(`/projects/${p.slug}/terms`)
        paths.push(`/projects/${p.slug}/cookies`)
        if (p.deletion) paths.push(`/projects/${p.slug}/delete-account`)
    }

    // resolveMeta is the single authority on whether a page is indexable, so
    // filter through it rather than repeating the rules here.
    return paths.filter(path => !resolveMeta(path).noindex)
}

/**
 * Every path to prerender, which is a superset of the indexable ones.
 *
 * The status pages are prerendered even though they are noindex. A visitor
 * arriving from an email link should see the confirmation immediately rather
 * than a blank page while the bundle loads, and that is worth the handful of
 * extra files.
 */
export function allPrerenderPaths(): string[] {
    const paths = new Set<string>(['/', '/projects'])
    if (leadership.length > 0) paths.add('/team')
    for (const key of Object.keys(seo.routes)) {
        if (key === '/team' && leadership.length === 0) continue
        paths.add(key)
    }

    for (const p of projects) {
        const base = `/projects/${p.slug}`
        paths.add(base)
        paths.add(`${base}/privacy-policy`)
        paths.add(`${base}/terms`)
        paths.add(`${base}/cookies`)
        if (p.deletion) paths.add(`${base}/delete-account`)
        if (p.hasAuthPages) {
            paths.add(`${base}/auth/success`)
            paths.add(`${base}/auth/failed`)
        }
        if (p.hasPasswordReset) {
            paths.add(`${base}/reset/sent`)
            paths.add(`${base}/reset/success`)
            paths.add(`${base}/reset/failed`)
        }
        if (p.hasEmailConfirmation) {
            paths.add(`${base}/confirm/sent`)
            paths.add(`${base}/confirm/success`)
            paths.add(`${base}/confirm/failed`)
        }
        // /auth/callback is deliberately NOT prerendered. It reads credentials
        // out of the URL and decides which screen to show, so a static snapshot
        // of it would be a snapshot of the wrong answer.
    }

    return [...paths]
}