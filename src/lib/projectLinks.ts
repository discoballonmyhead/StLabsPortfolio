/**
 * projectLinks.ts
 * src/lib/projectLinks.ts
 *
 * One place that decides where a project can actually be opened.
 *
 * This used to live inside ProjectDetail.tsx, which was fine until the status
 * pages needed the same answer. Two copies of "which URL counts as the real
 * one" is exactly the kind of thing that quietly drifts, so it lives here now
 * and both import it.
 *
 * Rules, in one place:
 *
 *   - A placeholder is not a link. '#', empty, and anything starting with
 *     REPLACE_ are all treated as unset, so a button never points at nothing.
 *   - Builds outrank stores. If a thing can simply be opened, that beats
 *     sending someone to a store listing to install it.
 *   - A path starting with a slash is self hosted, and a trailing slash is
 *     rewritten to index.html because Vite's dev server will not resolve a
 *     directory URL for files in public/.
 *   - Internal, Internal Testing, and Restricted projects publish nothing.
 *     A private build must not leak a URL through a confirmation screen.
 */

import { projects } from '@/config'
import type { ProjectConfig, ProjectVisibility } from '@/config'

export interface ProjectLink {
    label: string
    href: string
    /** Served from this site's public/ folder rather than somewhere else. */
    internal: boolean
    /** Directly openable, or a store listing you install through. */
    kind: 'build' | 'store'
}

/** Visibility values that suppress every outbound link. */
export const LINK_HIDING_VISIBILITY = new Set<ProjectVisibility>([
    'Internal', 'Internal Testing', 'Restricted',
])

export function hidesLinks(visibility?: ProjectVisibility): boolean {
    return !!visibility && LINK_HIDING_VISIBILITY.has(visibility)
}

/**
 * Schemes a project link is allowed to use.
 *
 * `javascript:` is the one that matters. React does not block it in an href,
 * so `build: { web: 'javascript:fetch(...)' }` becomes script execution in the
 * visitor's session the moment someone clicks the button, and it would be
 * rendered as the primary call to action on the detail page.
 *
 * Config is author-controlled, so this is defence in depth rather than a live
 * hole. It is worth having because hrefs get pasted from issue trackers and
 * chat messages, a bare `data:text/html,...` is a phishing surface, and the
 * cost of the check is one indexOf.
 *
 * A custom app scheme like `blinko://reset` is allowed on purpose: handing off
 * to a native app is a real thing these links do.
 */
const BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:']

/**
 * Are we in a dev build?
 *
 * `import.meta.env.DEV` is a Vite thing, and TypeScript only knows about it if
 * the project pulls in Vite's client types. If it does not you get
 * "Property 'env' does not exist on type 'ImportMeta'", which is what happened
 * here. The cast makes this file compile either way, and the optional chaining
 * means it also returns false under Jest, Vitest in node mode, or anything
 * else that does not define `import.meta.env` at all.
 *
 * The project-wide fix, worth doing separately: a file at src/vite-env.d.ts
 * containing exactly
 *
 *     /// <reference types="vite/client" />
 *
 * after which `import.meta.env` is typed everywhere and you can use it
 * directly. This local cast is here so one warning line does not depend on
 * that.
 */
function isDev(): boolean {
    return (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true
}

/** Real link, or a placeholder someone has not filled in yet. */
export function isRealHref(href?: string): href is string {
    if (!href) return false
    const h = href.trim()
    if (!h || h === '#') return false
    if (h.toUpperCase().startsWith('REPLACE_')) return false

    // Strip the characters a browser ignores before parsing the scheme, so
    // `java\tscript:` and ` JavaScript:` cannot slip past a plain startsWith.
    // Control characters below 0x20 are dropped by the URL parser; so are
    // leading spaces.
    const probe = h.replace(/[\u0000- ]/g, '').toLowerCase()
    if (BLOCKED_SCHEMES.some(scheme => probe.startsWith(scheme))) {
        if (isDev()) {
            console.warn(
                `[projectLinks] Refusing a link with a blocked scheme: ${h.slice(0, 60)}`,
            )
        }
        return false
    }

    return true
}

/**
 * Vite's dev server serves public/ with extension guessing off, so a directory
 * URL never resolves to the index.html inside it. The request falls through to
 * the SPA fallback and the router answers with the 404 page. Naming the file
 * works everywhere, so the slash form is rewritten rather than relied upon.
 */
export function normaliseInternal(href: string): string {
    if (!href.startsWith('/')) return href
    return href.endsWith('/') ? `${href}index.html` : href
}

/**
 * Every usable link for a project, in priority order.
 *
 * `configured` reports whether the project defined a build or stores block at
 * all, which lets a caller tell "nothing set up yet" apart from "set up but
 * still on a placeholder" and word the empty state honestly.
 */
export function collectProjectLinks(p: ProjectConfig): {
    links: ProjectLink[]
    configured: boolean
} {
    const links: ProjectLink[] = []
    let configured = false

    const push = (label: string, href: string | undefined, kind: 'build' | 'store') => {
        if (href !== undefined) configured = true
        if (!isRealHref(href)) return
        const internal = href.startsWith('/')
        links.push({
            label,
            href: internal ? normaliseInternal(href) : href,
            internal,
            kind,
        })
    }

    // Builds first. Something you can just open beats something you install.
    push('Launch build', p.build?.web, 'build')
    push('Play on itch.io', p.build?.itch, 'build')
    push('Download APK', p.build?.apk, 'build')
    push('Download for Windows', p.build?.windows, 'build')
    push('Download for macOS', p.build?.macos, 'build')
    push('Download for Linux', p.build?.linux, 'build')
    push('Join the TestFlight', p.build?.testflight, 'build')
    push('Source on GitHub', p.build?.github, 'build')
    p.build?.other?.forEach(o => push(o.label, o.href, 'build'))

    // Then the store listings.
    push('Get it on Google Play', p.stores?.googlePlay, 'store')
    push('Download on the App Store', p.stores?.appStore, 'store')
    push('Open the web app', p.stores?.web, 'store')
    push('View on GitHub', p.stores?.github, 'store')

    return { links, configured }
}

/**
 * The single best "open this thing" link for a project, or null when there is
 * nowhere to send anybody.
 *
 * Used by the hosted status pages to decide whether an Open App button should
 * exist at all. A confirmation screen with a dead button is worse than a
 * confirmation screen with no button.
 *
 * @param slug        project slug, usually StatusPage's projectSlug prop
 * @param buildsOnly  ignore store listings and return null unless there is a
 *                    real build. Use it when "open" should mean "open", not
 *                    "go and install this first".
 */
export function primaryLaunchLink(
    slug?: string,
    { buildsOnly = false }: { buildsOnly?: boolean } = {},
): ProjectLink | null {
    if (!slug) return null

    const project = projects.find(p => p.slug === slug)
    if (!project) return null
    if (hidesLinks(project.visibility)) return null

    const { links } = collectProjectLinks(project)
    const usable = buildsOnly ? links.filter(l => l.kind === 'build') : links

    return usable[0] ?? null
}