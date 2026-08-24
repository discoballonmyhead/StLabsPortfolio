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

/** Real link, or a placeholder someone has not filled in yet. */
export function isRealHref(href?: string): href is string {
    if (!href) return false
    const h = href.trim()
    if (!h || h === '#') return false
    if (h.toUpperCase().startsWith('REPLACE_')) return false
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