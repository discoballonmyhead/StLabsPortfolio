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
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Layout, Breadcrumb, SectionLabel, FadeUp } from '@/components'
import ImageCarousel from '@/components/ImageCarousel'
import { projects } from '@/config'
import type { ProjectStatus, ProjectVisibility } from '@/config'
import { useIsMobile } from '@/hooks'

interface Props {
  slug: string
}

const ACCENT = '#FF8C55'
const ACCENT_WARM = '#FFA070'
const DANGER = '#E5644E'

const HIDES_LINKS = new Set<ProjectVisibility>(['Internal', 'Internal Testing', 'Restricted'])
const TERMINAL_STATUSES = new Set<ProjectStatus>(['Dead', 'Defunct', 'Abandoned', 'Discontinued'])

// ─────────────────────────────────────────────────────────────────────────────
// Link model
// ─────────────────────────────────────────────────────────────────────────────

interface OutLink {
  label: string
  href: string
  internal: boolean
}

function normaliseInternal(href: string): string {
  if (!href.startsWith('/')) return href
  return href.endsWith('/') ? `${href}index.html` : href
}

function isRealHref(href?: string): href is string {
  if (!href) return false
  const h = href.trim()
  if (!h || h === '#') return false
  if (h.toUpperCase().startsWith('REPLACE_')) return false
  return true
}

function collectLinks(p: (typeof projects)[number]): { links: OutLink[]; configured: boolean } {
  const links: OutLink[] = []
  let configured = false

  const push = (label: string, href?: string) => {
    if (href !== undefined) configured = true
    if (!isRealHref(href)) return
    const internal = href.startsWith('/')
    links.push({ label, href: internal ? normaliseInternal(href) : href, internal })
  }

  push('Launch build', p.build?.web)
  push('Play on itch.io', p.build?.itch)
  push('Download APK', p.build?.apk)
  push('Download for Windows', p.build?.windows)
  push('Download for macOS', p.build?.macos)
  push('Download for Linux', p.build?.linux)
  push('Join the TestFlight', p.build?.testflight)
  push('Source on GitHub', p.build?.github)
  p.build?.other?.forEach(o => push(o.label, o.href))

  push('Get it on Google Play', p.stores?.googlePlay)
  push('Download on the App Store', p.stores?.appStore)
  push('Open the web app', p.stores?.web)
  push('View on GitHub', p.stores?.github)

  return { links, configured }
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons & Graphics
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

function ActionLink({ link, primary = false, large = false }: { link: OutLink; primary?: boolean; large?: boolean }) {
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
// Graveyard Banner
// ─────────────────────────────────────────────────────────────────────────────

function TerminalStatusBanner({ status }: { status: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '20px 24px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-light, #2a2a2a)',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--surface, #0a0a0a)',
          border: '1px solid var(--border-strong, #1a1a1a)',
          color: 'var(--text-ghost, #4e4e4e)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 10h.01M15 10h.01" />
          <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        </svg>
      </div>

      <div>
        <h4 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 600, color: 'var(--text, #f2f2f2)' }}>
          This project is {status.toLowerCase()}.
        </h4>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-faint, #6a6a6a)', lineHeight: 1.6 }}>
          It has reached the end of its active lifecycle and is no longer maintained. Links and downloads are provided purely for archival purposes and may no longer function.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header & Badge Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStatusColors(status: string) {
  if (['Live', 'Beta'].includes(status)) return { bg: 'rgba(61, 220, 132, 0.15)', text: '#3DDC84', border: 'rgba(61, 220, 132, 0.3)' }
  if (TERMINAL_STATUSES.has(status as ProjectStatus)) return { bg: 'rgba(229, 100, 78, 0.15)', text: DANGER, border: 'rgba(229, 100, 78, 0.3)' }
  return { bg: 'rgba(255, 140, 85, 0.15)', text: ACCENT, border: 'rgba(255, 140, 85, 0.3)' }
}

function CustomProjectHeader({ p, isMobile }: { p: (typeof projects)[number]; isMobile: boolean }) {
  const statusTheme = getStatusColors(p.status)
  const isPublic = !p.visibility || p.visibility === 'Public'

  // Use the path exactly as provided in the config
  const iconSrc = p.appIconPath

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '12px' }}>

      {/* Icon Area with Badges */}
      <div style={{ position: 'relative', flexShrink: 0 }}>

        {/* The Icon Box */}
        <div style={{
          width: '96px', height: '96px',
          borderRadius: '22px',
          background: 'var(--surface, #1a1a1a)',
          border: '1px solid var(--border-strong, #2a2a2a)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {iconSrc ? (
            <img src={iconSrc} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom right, #2a2a2a, #1a1a1a)' }} />
          )}
        </div>

        {/* Top-Right Badge: Status */}
        <div style={{
          position: 'absolute', top: '-8px', right: '-16px', zIndex: 10,
          background: statusTheme.bg, color: statusTheme.text, border: `1px solid ${statusTheme.border}`,
          padding: '4px 10px', borderRadius: '100px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase', backdropFilter: 'blur(8px)'
        }}>
          {p.status}
        </div>

        {/* Bottom-Right Badge: Access */}
        {!isPublic && (
          <div style={{
            position: 'absolute', bottom: '-8px', right: '-16px', zIndex: 10,
            background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.3)',
            padding: '4px 10px', borderRadius: '100px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase', backdropFilter: 'blur(8px)'
          }}>
            {p.visibility}
          </div>
        )}
      </div>

      {/* Title & Tagline Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#fff', letterSpacing: '-0.02em', fontWeight: 700 }}>
          {p.name}
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted, #8a8a8a)', lineHeight: 1.5, maxWidth: '600px' }}>
          {p.tagline}
        </p>

        {/* Tech Stack Chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
          {p.tech.map(t => (
            <span key={t} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '100px', background: 'rgba(255,255,255,0.04)', color: '#a3a3a3', border: '1px solid rgba(255,255,255,0.05)' }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
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
  const linksHidden = !!visibility && HIDES_LINKS.has(visibility)
  const isTerminal = TERMINAL_STATUSES.has(p.status as ProjectStatus)

  const { links, configured } = collectLinks(p)

  const visibleLinks = linksHidden ? [] : links
  const primary = visibleLinks[0]
  const rest = visibleLinks.slice(1)
  const pending = !linksHidden && configured && visibleLinks.length === 0

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Projects', path: '/projects' }, { label: p.name }]} />

        {/* ── Custom Dual-Badge Header ── */}
        <CustomProjectHeader p={p} isMobile={isMobile} />

        {/* ── Terminal Animation Banner ── */}
        {isTerminal && (
          <FadeUp delay={0.02}>
            <TerminalStatusBanner status={p.status} />
          </FadeUp>
        )}

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
                {rest.length === 1 ? 'One other way to get it, listed below.' : `${rest.length} other ways to get it, listed below.`}
              </span>
            )}
            {pending && <PendingPill>Build is not published yet</PendingPill>}
            {linksHidden && <PendingPill>{visibility} project, links are not published</PendingPill>}
          </div>
        )}

        {hasMedia && (
          <FadeUp>
            <ImageCarousel coverImage={p.coverImage} screenshots={p.screenshots} projectName={p.name} />
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
                  {p.about.map((para, i) => <p key={i} style={bodyText}>{para}</p>)}
                </div>
              </section>
            </FadeUp>

            {p.features && p.features.length > 0 && (
              <FadeUp delay={0.05}>
                <section>
                  <SectionLabel>Features</SectionLabel>
                  <div style={{ marginTop: '4px' }}><BulletList items={p.features} marker="check" /></div>
                </section>
              </FadeUp>
            )}

            {p.stackNotes && p.stackNotes.length > 0 && (
              <FadeUp delay={0.08}>
                <section>
                  <SectionLabel>Stack</SectionLabel>
                  <div style={{ marginTop: '4px' }}><BulletList items={p.stackNotes} marker="dash" /></div>
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
                <MetaRow label="Status" value={p.status} last={!visibility || visibility === 'Public'} />
                {visibility && visibility !== 'Public' && <MetaRow label="Access" value={<span style={{ color: ACCENT }}>{visibility}</span>} last />}
                <p style={{ fontSize: '11px', color: 'var(--text-ghost, #4e4e4e)', margin: '12px 0 0' }}>
                  Last reviewed {p.privacy?.updated || 'recently'}
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
                      {(p.buildNote || p.storeNote) && <p style={{ fontSize: '12px', color: 'var(--text-faint, #6a6a6a)', lineHeight: 1.65, margin: '0 0 12px' }}>{p.buildNote ?? p.storeNote}</p>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {visibleLinks.map((link, i) => <ActionLink key={link.href + i} link={link} primary={i === 0} />)}
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