/**
 * CookiePage.tsx
 * src/features/legal/CookiePage.tsx
 *
 * Route: /projects/<slug>/cookies
 *
 * Two shapes, picked by one flag.
 *
 *   usesCookies: false   A short honest page saying the app sets none. Browser
 *                        storage that is not a cookie is still disclosed
 *                        through localStorageUse, because visitors care about
 *                        the behaviour rather than the technical name for it.
 *
 *   usesCookies: true    A table of every cookie grouped by category, who sets
 *                        it, why, and how long it lasts, followed by third
 *                        parties and how to turn them off.
 *
 * From site.config.ts, on the project:
 *
 *   cookies: {
 *     updated:     'June 10, 2026',
 *     contact:     'you@example.com',
 *     usesCookies: true,
 *     cookies: [{
 *       name: 'sb-access-token', provider: 'Supabase',
 *       purpose: 'Keeps you signed in.', duration: '1 hour',
 *       category: 'essential',
 *     }],
 *     localStorageUse: ['Saved brackets, so you can resume later'],
 *     thirdParties: [{ name: 'Supabase', purpose: '...', policyUrl: '...' }],
 *   }
 *
 * Leave `cookies` off a project and the page renders the no cookies version,
 * which is true of most of these apps.
 */

import { projects, legalDefaults } from '@/config'
import type { CookieCategory, CookieEntry } from '@/config'
import { LegalPage, Clause, LegalList, Callout, legalText } from './LegalShell'

interface Props {
    slug: string
}

const CATEGORY_ORDER: CookieCategory[] = ['essential', 'functional', 'analytics', 'advertising']

const CATEGORY_META: Record<CookieCategory, { label: string; blurb: string; color: string }> = {
    essential: {
        label: 'Essential',
        blurb: 'Needed for the app to work at all. Without these you would be signed out constantly or unable to sign in.',
        color: '#00FFB2',
    },
    functional: {
        label: 'Functional',
        blurb: 'Remember a preference you set, so you do not have to set it again.',
        color: '#61DAFF',
    },
    analytics: {
        label: 'Analytics',
        blurb: 'Count how features get used, so effort goes to the parts people actually reach for.',
        color: '#FFB347',
    },
    advertising: {
        label: 'Advertising',
        blurb: 'Used to select or measure ads. These are the ones worth being fussiest about.',
        color: '#FF6B2B',
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie table
// ─────────────────────────────────────────────────────────────────────────────

function CookieGroup({ category, entries }: { category: CookieCategory; entries: CookieEntry[] }) {
    const meta = CATEGORY_META[category]

    return (
        <div style={{ marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '6px' }}>
                <span
                    style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: meta.color, flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: meta.color,
                    }}
                >
                    {meta.label}
                </span>
            </div>

            <p style={{ ...legalText, fontSize: '13px', margin: '0 0 12px' }}>{meta.blurb}</p>

            <div
                style={{
                    border: '1px solid var(--border-strong, #1a1a1a)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                }}
            >
                {entries.map((c, i) => (
                    <div
                        key={c.name}
                        style={{
                            padding: '14px 16px',
                            borderTop: i === 0 ? 'none' : '1px solid var(--border-faint, #141414)',
                            background: 'var(--surface, #0a0a0a)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                gap: '12px',
                                flexWrap: 'wrap',
                                marginBottom: '7px',
                            }}
                        >
                            <code
                                style={{
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontSize: '12.5px',
                                    color: 'var(--text, #f2f2f2)',
                                    background: 'rgba(255,255,255,0.035)',
                                    border: '1px solid var(--border-strong, #1a1a1a)',
                                    borderRadius: '4px',
                                    padding: '2px 7px',
                                }}
                            >
                                {c.name}
                            </code>
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontSize: '11px',
                                    letterSpacing: '0.04em',
                                    color: 'var(--text-ghost, #4e4e4e)',
                                }}
                            >
                                {c.duration}
                            </span>
                        </div>

                        <p style={{ ...legalText, fontSize: '13.5px', margin: '0 0 5px' }}>{c.purpose}</p>

                        <span style={{ fontSize: '11.5px', color: 'var(--text-ghost, #4e4e4e)' }}>
                            Set by {c.provider}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CookiePage({ slug }: Props) {
    const p = projects.find(x => x.slug === slug)
    if (!p) return null

    const c = p.cookies
    const updated = c?.updated ?? legalDefaults.updated
    const contact = c?.contact ?? legalDefaults.contact
    const uses = c?.usesCookies ?? false
    const base = `/projects/${p.slug}`

    const grouped = CATEGORY_ORDER
        .map(cat => ({ cat, entries: (c?.cookies ?? []).filter(x => x.category === cat) }))
        .filter(g => g.entries.length > 0)

    const hasAdvertising = grouped.some(g => g.cat === 'advertising')

    return (
        <LegalPage
            projectName={p.name}
            projectSlug={p.slug}
            title="Cookie Policy"
            intro={c?.summaryOverride ?? (uses
                ? `This page lists every cookie ${p.name} sets, who sets it, what it is for, and how long it sticks around. No cookie is used here that is not on this list.`
                : legalDefaults.noCookiesSummary)}
            updated={updated}
            contact={contact}
            siblings={[
                { label: 'Terms of Service', path: `${base}/terms` },
                { label: 'Privacy Policy', path: `${base}/privacy-policy` },
                { label: 'Cookies', path: `${base}/cookies`, active: true },
                { label: 'Delete account', path: `${base}/delete-account` },
            ]}
        >

            {/* ── What a cookie is, always worth one short paragraph ── */}
            <Clause index={1} title="What these actually are">
                <p style={legalText}>
                    A cookie is a small file a website asks your browser to keep, then reads back
                    on a later visit. It is the mechanism behind staying signed in, and also
                    behind being followed around the internet by an advert for a chair you
                    already bought.
                </p>
                <p style={legalText}>
                    Local storage does a similar job by a different mechanism. It is not a
                    cookie, it does not travel with your requests, and it never leaves your
                    device, but it is disclosed here anyway because the distinction matters
                    far less to you than the behaviour does.
                </p>
            </Clause>

            {/* ── The cookies themselves, or the absence of them ── */}
            {uses && grouped.length > 0 ? (
                <Clause index={2} title="Every cookie this app sets">
                    <p style={legalText}>
                        Grouped by what they are for. Essential ones cannot be switched off
                        without breaking sign in, everything else can.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '6px' }}>
                        {grouped.map(g => (
                            <CookieGroup key={g.cat} category={g.cat} entries={g.entries} />
                        ))}
                    </div>
                </Clause>
            ) : (
                <Clause index={2} title="This app sets no cookies">
                    <p style={legalText}>
                        No cookies are set by {p.name}, and nothing here follows you to other
                        sites. There is no consent banner because there is nothing to consent
                        to.
                    </p>
                    <Callout>
                        If that changes, this page changes with it and the date at the top
                        moves. It will not change quietly.
                    </Callout>
                </Clause>
            )}

            {/* ── Browser storage ── */}
            {c?.localStorageUse && c.localStorageUse.length > 0 && (
                <Clause index={3} title="What is kept in your browser">
                    <p style={legalText}>
                        Stored on your device by your own browser. It is not transmitted, it is
                        not readable by anyone else, and clearing your browser data removes it.
                    </p>
                    <LegalList items={c.localStorageUse} />
                    <Callout tone="warn">
                        Because this lives only on your device, clearing site data will lose it
                        permanently. There is no server side copy to restore from.
                    </Callout>
                </Clause>
            )}

            {/* ── Third parties ── */}
            {c?.thirdParties && c.thirdParties.length > 0 && (
                <Clause index={c?.localStorageUse?.length ? 4 : 3} title="Third parties that can set cookies">
                    <p style={legalText}>
                        These services are part of how the app works, and each has its own
                        policy governing what it collects.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                        {c.thirdParties.map(tp => (
                            <div
                                key={tp.name}
                                style={{
                                    border: '1px solid var(--border-strong, #1a1a1a)',
                                    borderRadius: '9px',
                                    padding: '13px 15px',
                                    background: 'var(--surface, #0a0a0a)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text, #f2f2f2)' }}>
                                        {tp.name}
                                    </span>
                                    {tp.policyUrl && (
                                        <a
                                            href={tp.policyUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '11.5px',
                                                color: '#FF8C55',
                                                textDecoration: 'none',
                                                fontFamily: 'var(--font-mono, monospace)',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                        >
                                            their policy
                                        </a>
                                    )}
                                </div>
                                <p style={{ ...legalText, fontSize: '13.5px' }}>{tp.purpose}</p>
                            </div>
                        ))}
                    </div>
                </Clause>
            )}

            {/* ── Control ── */}
            <Clause
                index={
                    2
                    + (c?.localStorageUse?.length ? 1 : 0)
                    + (c?.thirdParties?.length ? 1 : 0)
                    + 1
                }
                title="Turning them off"
                last
            >
                <p style={legalText}>
                    Every browser can block or clear cookies, usually under privacy or site
                    settings, and most let you do it per site rather than everywhere at once.
                </p>
                {uses ? (
                    <>
                        <p style={legalText}>
                            Blocking essential cookies will sign you out and keep you out, since
                            they are the mechanism that holds the session together. Blocking the
                            rest costs you nothing beyond having to set a preference again.
                        </p>
                        {hasAdvertising && (
                            <Callout tone="warn">
                                Advertising cookies can also be limited through your browser and
                                through the ad provider directly, independently of anything set
                                here.
                            </Callout>
                        )}
                    </>
                ) : (
                    <p style={legalText}>
                        There is nothing here to block, though clearing site data will remove
                        anything the app has saved locally, including saved progress.
                    </p>
                )}
            </Clause>
        </LegalPage>
    )
}