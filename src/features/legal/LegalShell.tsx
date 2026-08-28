/**
 * LegalShell.tsx
 * src/features/legal/LegalShell.tsx
 *
 * Shared furniture for the terms and cookie pages, so both look like they came
 * from the same place and neither drifts when the other is edited.
 *
 * Exports:
 *   LegalPage    the page frame: breadcrumb, title, updated date, sibling links
 *   Clause       one numbered section with a heading and paragraphs
 *   LegalList    a dashed list for enumerations inside a clause
 *   Callout      a bordered aside for the one thing people must not miss
 *   legalText    the paragraph style, exported so pages stay consistent
 */

import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Layout, Breadcrumb } from '@/components'

const ACCENT = '#FF8C55'

export const legalText: CSSProperties = {
    fontSize: '14.5px',
    color: 'var(--text-muted, #8a8a8a)',
    lineHeight: 1.85,
    margin: 0,
    maxWidth: '68ch',
}

// ─────────────────────────────────────────────────────────────────────────────
// Page frame
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalSibling {
    label: string
    path: string
    active?: boolean
}

export function LegalPage({
    projectName,
    projectSlug,
    title,
    intro,
    updated,
    contact,
    siblings,
    children,
}: {
    projectName: string
    projectSlug: string
    title: string
    intro: string
    updated: string
    contact: string
    siblings: LegalSibling[]
    children: ReactNode
}) {
    return (
        <Layout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                <Breadcrumb
                    items={[
                        { label: 'Home', path: '/' },
                        { label: 'Projects', path: '/projects' },
                        { label: projectName, path: `/projects/${projectSlug}` },
                        { label: title },
                    ]}
                />

                {/* Title block */}
                <header>
                    <p
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'var(--text-dim, #555)',
                            margin: '0 0 12px',
                        }}
                    >
                        {projectName}
                    </p>
                    <h1
                        style={{
                            fontSize: 'clamp(30px, 4.4vw, 46px)',
                            fontWeight: 700,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.06,
                            color: 'var(--text, #f2f2f2)',
                            margin: '0 0 16px',
                        }}
                    >
                        {title}
                    </h1>
                    <p style={{ ...legalText, maxWidth: '62ch' }}>{intro}</p>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginTop: '18px',
                        }}
                    >
                        <span
                            style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: '11px',
                                letterSpacing: '0.06em',
                                color: 'var(--text-ghost, #4e4e4e)',
                                border: '1px solid var(--border-strong, #1a1a1a)',
                                borderRadius: '100px',
                                padding: '4px 12px',
                            }}
                        >
                            Last updated {updated}
                        </span>
                    </div>
                </header>

                {/* Sibling documents, so nobody has to go back to find the other one */}
                {siblings.length > 0 && (
                    <nav
                        style={{
                            display: 'flex',
                            gap: '6px',
                            flexWrap: 'wrap',
                            borderTop: '1px solid var(--border-faint, #141414)',
                            borderBottom: '1px solid var(--border-faint, #141414)',
                            padding: '12px 0',
                        }}
                    >
                        {siblings.map(s =>
                            s.active ? (
                                <span
                                    key={s.path}
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: ACCENT,
                                        background: 'rgba(255,140,85,0.10)',
                                        border: '1px solid rgba(255,140,85,0.28)',
                                        borderRadius: '7px',
                                        padding: '7px 13px',
                                    }}
                                >
                                    {s.label}
                                </span>
                            ) : (
                                <Link
                                    key={s.path}
                                    to={s.path}
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: 'var(--text-faint, #6a6a6a)',
                                        border: '1px solid transparent',
                                        borderRadius: '7px',
                                        padding: '7px 13px',
                                        textDecoration: 'none',
                                        transition: 'color 0.15s, background 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.color = 'var(--text, #f2f2f2)'
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.032)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.color = 'var(--text-faint, #6a6a6a)'
                                        e.currentTarget.style.background = 'transparent'
                                    }}
                                >
                                    {s.label}
                                </Link>
                            ),
                        )}
                    </nav>
                )}

                {/* Clauses */}
                <div>{children}</div>

                {/* Contact footer */}
                <div
                    style={{
                        borderTop: '1px solid var(--border-faint, #141414)',
                        paddingTop: '24px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'baseline',
                    }}
                >
                    <span style={{ fontSize: '13px', color: 'var(--text-faint, #6a6a6a)' }}>
                        Questions about this document?
                    </span>
                    <a
                        href={`mailto:${contact}`}
                        style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '13px',
                            color: ACCENT,
                            textDecoration: 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                        {contact}
                    </a>
                </div>
            </div>
        </Layout>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Clause
// ─────────────────────────────────────────────────────────────────────────────

export function Clause({
    index,
    title,
    children,
    last = false,
}: {
    index: number
    title: string
    children: ReactNode
    last?: boolean
}) {
    return (
        <section
            style={{
                display: 'grid',
                gridTemplateColumns: '32px minmax(0, 1fr)',
                gap: '0 16px',
                padding: '26px 0',
                borderBottom: last ? 'none' : '1px solid var(--border-faint, #141414)',
            }}
        >
            <span
                style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    color: 'var(--text-ghost, #4e4e4e)',
                    paddingTop: '4px',
                }}
            >
                {String(index).padStart(2, '0')}
            </span>

            <div>
                <h2
                    style={{
                        fontSize: '15.5px',
                        fontWeight: 700,
                        letterSpacing: '-0.012em',
                        color: 'var(--text, #f2f2f2)',
                        margin: '0 0 10px',
                        lineHeight: 1.4,
                    }}
                >
                    {title}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    {children}
                </div>
            </div>
        </section>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────────────────────

export function LegalList({ items }: { items: string[] }) {
    return (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {items.map(item => (
                <li
                    key={item}
                    style={{
                        fontSize: '14px',
                        color: 'var(--text-muted, #8a8a8a)',
                        lineHeight: 1.7,
                        paddingLeft: '20px',
                        position: 'relative',
                        maxWidth: '68ch',
                    }}
                >
                    <span
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: '11px',
                            width: '9px',
                            height: '1px',
                            background: 'var(--border-light, #2a2a2a)',
                        }}
                    />
                    {item}
                </li>
            ))}
        </ul>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Callout
// ─────────────────────────────────────────────────────────────────────────────

export function Callout({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' }) {
    const warn = tone === 'warn'
    return (
        <div
            style={{
                borderLeft: `2px solid ${warn ? 'rgba(229,100,78,0.55)' : 'rgba(255,140,85,0.45)'}`,
                background: warn ? 'rgba(229,100,78,0.045)' : 'rgba(255,140,85,0.035)',
                borderRadius: '0 8px 8px 0',
                padding: '13px 16px',
                fontSize: '13.5px',
                color: 'var(--text-muted, #8a8a8a)',
                lineHeight: 1.75,
                maxWidth: '68ch',
            }}
        >
            {children}
        </div>
    )
}