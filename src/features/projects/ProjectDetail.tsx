/**
 * ProjectDetail.tsx
 * src/features/projects/ProjectDetail.tsx
 *
 * ─── LAYOUT ──────────────────────────────────────────────────────────────────
 *
 *  Breadcrumb
 *  AppHeader                    name, tagline, status badge, tech badges
 *  Launch bar                   the one action that matters, right up top
 *  Carousel                     only when coverImage or screenshots exist
 *  ┌──────────────────────────────┬────────────────────────────┐
 *  │ About                        │ Details        (sticky)    │
 *  │ Features                     │ Get it                     │
 *  │ Stack                        │ Legal                      │
 *  └──────────────────────────────┴────────────────────────────┘
 *
 * ─── WHERE THE BUILD LINK SHOWS UP ───────────────────────────────────────────
 *
 *  A project's first usable link is promoted to a launch bar directly under the
 *  header, so nobody has to hunt for it. Every link, that one included, is also
 *  listed in the Get it card in the aside.
 *
 *  Links only render when the href is real. These are all skipped:
 *      '#'                       placeholder
 *      'REPLACE_WITH_...'        placeholder
 *      '' or undefined           not set
 *
 *  When a project has a build or stores block but every href is still a
 *  placeholder, the page says the build is not published yet rather than
 *  silently rendering nothing. That is why a project set to
 *  `build: { web: 'REPLACE_WITH_BUILD_URL' }` shows a pending notice and no
 *  button. Swap in a real path and the launch bar appears on its own.
 *
 *  Self hosted builds are supported. Any href starting with a slash is treated
 *  as living inside this site, gets a launch glyph instead of the external
 *  arrow, and says so. Drop a build at public/builds/<slug>/ and point at it:
 *
 *      build: { web: '/builds/bey-builder-x/' }
 *
 *  A trailing slash is rewritten to the index.html inside that folder, because
 *  Vite's dev server will not do it for you. See normaliseInternal below.
 *
 * ─── SITE CONFIG FIELDS READ BY THIS PAGE ────────────────────────────────────
 *
 *   name, tagline, label, status, tech          header
 *   visibility?                                 access row, and gates links
 *   platform, year                              details card
 *   about[], features[], stackNotes[]           main column
 *   coverImage?, screenshots[]                  carousel
 *   stores?, storeNote?                         store listings
 *   build?, buildNote?                          direct builds
 *   privacy.updated                             last reviewed
 *   legalNote?                                  legal card copy
 *
 *  Internal, Internal Testing, and Restricted projects publish no links at all.
 */
/**
 * ProjectDetail.tsx
 * src/features/projects/ProjectDetail.tsx
 */

import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Layout, Breadcrumb, SectionLabel, AppHeader, FadeUp } from '@/components'
import ImageCarousel from '@/components/ImageCarousel'
import { projects } from '@/config'
import type { ProjectStatus } from '@/config'
import { collectProjectLinks, hidesLinks } from '@/lib/projectLinks'
import type { ProjectLink } from '@/lib/projectLinks'
import { useIsMobile } from '@/hooks'

interface Props {
  slug: string
}

const ACCENT = '#FF8C55'
const ACCENT_WARM = '#FFA070'
const DANGER = '#E5644E'

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

const IconExternal = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7" /><path d="M9 7h8v8" />
  </svg>
)

const IconLaunch = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="6 4 20 12 6 20" />
  </svg>
)

const IconTrash = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h16" /><path d="M9 6V4h6v2" /><path d="M6 6l1 14h10l1-14" />
  </svg>
)

// ─────────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────────

const bodyText: CSSProperties = {
  fontSize: '14.5px',
  color: 'var(--text-muted, #8a8a8a)',
  lineHeight: 1.85,
  margin: 0,
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface, #0a0a0a)',
        border: '1px solid var(--border-strong, #1a1a1a)',
        borderRadius: '12px',
        padding: '18px',
      }}
    >
      <p
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--text-faint, #6a6a6a)',
          margin: '0 0 14px',
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function MetaRow({ label, value, last = false }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '8px 0',
        borderBottom: last ? 'none' : '1px solid var(--border-faint, #141414)',
      }}
    >
      <span style={{ fontSize: '11.5px', color: 'var(--text-faint, #6a6a6a)', flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '12px',
          color: 'var(--text, #f2f2f2)',
          fontFamily: 'var(--font-mono, monospace)',
          textAlign: 'right',
          minWidth: 0,
        }}
      >
        {value}
      </span>
    </div>
  )
}

/** One outbound link. Filled for the primary action, outlined for the rest. */
function ActionLink({
  link,
  primary = false,
  large = false,
}: {
  link: ProjectLink
  primary?: boolean
  large?: boolean
}) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: large ? 'center' : 'space-between',
    gap: '10px',
    width: large ? 'auto' : '100%',
    boxSizing: 'border-box',
    padding: large ? '13px 26px' : '10px 14px',
    borderRadius: '8px',
    fontSize: large ? '13.5px' : '12.5px',
    fontWeight: 600,
    letterSpacing: '0.01em',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s',
    background: primary ? ACCENT : 'transparent',
    color: primary ? '#0a0a0a' : 'var(--text, #f2f2f2)',
    border: `1px solid ${primary ? ACCENT : 'var(--border-light, #2a2a2a)'}`,
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      onMouseEnter={e => {
        const el = e.currentTarget
        if (primary) {
          el.style.background = ACCENT_WARM
          if (large) el.style.transform = 'translateY(-1px)'
        } else {
          el.style.borderColor = ACCENT
          el.style.color = ACCENT
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (primary) {
          el.style.background = ACCENT
          el.style.transform = 'translateY(0)'
        } else {
          el.style.borderColor = 'var(--border-light, #2a2a2a)'
          el.style.color = 'var(--text, #f2f2f2)'
        }
      }}
    >
      {link.label}
      <span style={{ display: 'inline-flex', flexShrink: 0, opacity: primary ? 0.85 : 0.6 }}>
        {link.internal ? <IconLaunch size={large ? 12 : 10} /> : <IconExternal size={large ? 13 : 12} />}
      </span>
    </a>
  )
}

function BulletList({ items, marker }: { items: string[]; marker: 'check' | 'dash' }) {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', margin: 0, padding: 0 }}>
      {items.map(item => (
        <li
          key={item}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '14.5px',
            color: 'var(--text-muted, #a3a3a3)',
            lineHeight: 1.7,
          }}
        >
          <span
            style={{
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width: marker === 'check' ? '20px' : '16px',
              height: marker === 'check' ? '20px' : '16px',
              borderRadius: marker === 'check' ? '50%' : '0',
              background: marker === 'check' ? 'rgba(255, 140, 85, 0.12)' : 'transparent',
            }}
            aria-hidden="true"
          >
            {marker === 'check' ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ACCENT}
                strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '2px',
                borderRadius: '2px',
                background: 'var(--border-strong, #3f3f46)'
              }} />
            )}
          </span>
          <span style={{ flex: 1, letterSpacing: '0.01em' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Used when a build exists in config but has no real URL yet. */
function PendingPill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '9px 15px',
        borderRadius: '100px',
        border: '1px dashed var(--border-light, #2a2a2a)',
        color: 'var(--text-faint, #6a6a6a)',
        fontSize: '12px',
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--text-ghost, #4e4e4e)', flexShrink: 0,
        }}
      />
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Legal Footer
// ─────────────────────────────────────────────────────────────────────────────

function LegalFooter({ p, basePath }: { p: (typeof projects)[number]; basePath: string }) {
  const linkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-muted, #8a8a8a)',
    textDecoration: 'none',
    transition: 'color 0.15s',
  }

  return (
    <div
      style={{
        marginTop: '24px',
        paddingTop: '32px',
        borderTop: '1px solid var(--border-faint, #141414)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {p.legalNote && (
        <p style={{ fontSize: '13px', color: 'var(--text-faint, #6a6a6a)', lineHeight: 1.7, margin: 0, maxWidth: '800px' }}>
          {p.legalNote}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
        <Link to={`${basePath}/terms`} style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = 'var(--text, #f2f2f2)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted, #8a8a8a)'}>
          Terms of Service
        </Link>
        <Link to={`${basePath}/privacy-policy`} style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = 'var(--text, #f2f2f2)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted, #8a8a8a)'}>
          Privacy Policy
        </Link>
        <Link to={`${basePath}/cookies`} style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = 'var(--text, #f2f2f2)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted, #8a8a8a)'}>
          Cookie Policy
        </Link>
        <Link
          to={`${basePath}/delete-account`}
          style={{
            ...linkStyle, marginLeft: 'auto', color: DANGER, background: 'rgba(229, 100, 78, 0.08)',
            padding: '8px 16px', borderRadius: '100px', fontWeight: 500, transition: 'background 0.15s, transform 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229, 100, 78, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(229, 100, 78, 0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <IconTrash size={14} />
          Delete account and data
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectDetail({ slug }: Props) {
  const isMobile = useIsMobile(900)
  const p = projects.find(x => x.slug === slug)
  if (!p) return null

  const basePath = `/projects/${p.slug}`
  const hasMedia = !!(p.coverImage || (p.screenshots && p.screenshots.length > 0))

  const visibility = p.visibility
  const linksHidden = hidesLinks(visibility)

  const { links, configured } = collectProjectLinks(p)
  const visibleLinks = linksHidden ? [] : links
  const primary = visibleLinks[0]
  const rest = visibleLinks.slice(1)

  // Something was configured but every href is still a placeholder.
  const pending = !linksHidden && configured && visibleLinks.length === 0

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'Projects', path: '/projects' },
            { label: p.name },
          ]}
        />

        <AppHeader
          label={p.label}
          title={p.name}
          tagline={p.tagline}
          tags={[p.status, ...p.tech]}
          statusTag={p.status as ProjectStatus}
        />

        {/* ── Launch bar ── */}
        {(primary || pending || linksHidden) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {primary && <ActionLink link={primary} primary large />}

            {primary && primary.internal && (
              <span style={{ fontSize: '11.5px', color: 'var(--text-ghost, #4e4e4e)' }}>
                Runs right here, nothing to install.
              </span>
            )}

            {rest.length > 0 && (
              <span style={{ fontSize: '11.5px', color: 'var(--text-ghost, #4e4e4e)' }}>
                {rest.length === 1
                  ? 'One other way to get it, listed below.'
                  : `${rest.length} other ways to get it, listed below.`}
              </span>
            )}

            {pending && <PendingPill>Build is not published yet</PendingPill>}
            {linksHidden && <PendingPill>{visibility} project, links are not published</PendingPill>}
          </div>
        )}

        {hasMedia && (
          <FadeUp>
            <ImageCarousel
              coverImage={p.coverImage}
              screenshots={p.screenshots}
              projectName={p.name}
            />
          </FadeUp>
        )}

        {/* ── Content and aside ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.7fr) minmax(268px, 1fr)',
            gap: isMobile ? '40px' : 'clamp(32px, 4vw, 56px)',
            alignItems: 'start',
            borderTop: '1px solid var(--border-faint, #141414)',
            paddingTop: 'clamp(28px, 4vw, 44px)',
          }}
        >

          {/* Main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', minWidth: 0 }}>

            <FadeUp>
              <section>
                <SectionLabel>About</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                  {p.about.map((para, i) => (
                    <p key={i} style={bodyText}>{para}</p>
                  ))}
                </div>
              </section>
            </FadeUp>

            {p.features && p.features.length > 0 && (
              <FadeUp delay={0.05}>
                <section>
                  <SectionLabel>Features</SectionLabel>
                  <div style={{ marginTop: '4px' }}>
                    <BulletList items={p.features} marker="check" />
                  </div>
                </section>
              </FadeUp>
            )}

            {p.stackNotes && p.stackNotes.length > 0 && (
              <FadeUp delay={0.08}>
                <section>
                  <SectionLabel>Stack</SectionLabel>
                  <div style={{ marginTop: '4px' }}>
                    <BulletList items={p.stackNotes} marker="dash" />
                  </div>
                </section>
              </FadeUp>
            )}
          </div>

          {/* Aside */}
          <aside
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: isMobile ? 'static' : 'sticky',
              top: isMobile ? undefined : 'calc(var(--nav-h, 64px) + 24px)',
              minWidth: 0,
            }}
          >

            <FadeUp>
              <Card title="Details">
                <MetaRow label="Platform" value={p.platform} />
                <MetaRow label="Year" value={p.year} />
                <MetaRow
                  label="Status"
                  value={p.status}
                  last={!visibility || visibility === 'Public'}
                />
                {visibility && visibility !== 'Public' && (
                  <MetaRow label="Access" value={<span style={{ color: ACCENT }}>{visibility}</span>} last />
                )}
                <p style={{ fontSize: '11px', color: 'var(--text-ghost, #4e4e4e)', margin: '12px 0 0' }}>
                  Last reviewed {p.privacy.updated}
                </p>
              </Card>
            </FadeUp>

            {(configured || linksHidden) && (
              <FadeUp delay={0.05}>
                <Card title={linksHidden ? 'Availability' : 'Get it'}>
                  {linksHidden ? (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #8a8a8a)', lineHeight: 1.7, margin: 0 }}>
                      This project is {visibility?.toLowerCase()}. Download and store links are not published here.
                    </p>
                  ) : visibleLinks.length > 0 ? (
                    <>
                      {(p.buildNote || p.storeNote) && (
                        <p style={{ fontSize: '12px', color: 'var(--text-faint, #6a6a6a)', lineHeight: 1.65, margin: '0 0 12px' }}>
                          {p.buildNote ?? p.storeNote}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {visibleLinks.map((link, i) => (
                          <ActionLink key={link.href + i} link={link} primary={i === 0} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize: '12.5px', color: 'var(--text-faint, #6a6a6a)', lineHeight: 1.7, margin: 0 }}>
                      A build is planned but the link is not live yet. It appears here the moment a real URL replaces the placeholder in the config.
                    </p>
                  )}
                </Card>
              </FadeUp>
            )}

          </aside>
        </div>

        <FadeUp delay={0.12}>
          <LegalFooter p={p} basePath={basePath} />
        </FadeUp>

      </div>
    </Layout>
  )
}