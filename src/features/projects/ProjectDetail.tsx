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
import { Layout, Breadcrumb, SectionLabel, AppHeader, FadeUp } from '@/components'
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

// ─────────────────────────────────────────────────────────────────────────────
// Link model
// ─────────────────────────────────────────────────────────────────────────────

interface OutLink {
  label: string
  href: string
  /** Lives inside this site, served from public/. Gets a launch glyph. */
  internal: boolean
}

/** Real link, or still a placeholder someone forgot to fill in. */
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
    links.push({ label, href, internal: href.startsWith('/') })
  }

  // Direct builds first. If it can simply be opened, that is the fastest way in.
  push('Launch build', p.build?.web)
  push('Play on itch.io', p.build?.itch)
  push('Download APK', p.build?.apk)
  push('Download for Windows', p.build?.windows)
  push('Download for macOS', p.build?.macos)
  push('Download for Linux', p.build?.linux)
  push('Join the TestFlight', p.build?.testflight)
  push('Source on GitHub', p.build?.github)
  p.build?.other?.forEach(o => push(o.label, o.href))

  // Then the store listings.
  push('Get it on Google Play', p.stores?.googlePlay)
  push('Download on the App Store', p.stores?.appStore)
  push('Open the web app', p.stores?.web)
  push('View on GitHub', p.stores?.github)

  return { links, configured }
}

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

const IconShield = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6z" />
  </svg>
)

const IconTrash = ({ size = 13 }: { size?: number }) => (
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
  link: OutLink
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

/**
 * Internal navigation row. Given real breathing room, an icon plate, and a
 * one line hint, so privacy and account deletion never read as one blurred
 * pair of links stacked on top of each other.
 */
function NavRow({
  to,
  label,
  hint,
  icon,
  danger = false,
}: {
  to: string
  label: string
  hint: string
  icon: ReactNode
  danger?: boolean
}) {
  const hoverColor = danger ? DANGER : ACCENT

  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        margin: '0 -12px',
        borderRadius: '9px',
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.background = danger ? 'rgba(229,100,78,0.07)' : 'rgba(255,255,255,0.032)'
        el.querySelectorAll<HTMLElement>('[data-tint]').forEach(n => { n.style.color = hoverColor })
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.background = 'transparent'
        el.querySelectorAll<HTMLElement>('[data-tint]').forEach(n => {
          n.style.color = n.dataset.tint === 'strong'
            ? 'var(--text, #f2f2f2)'
            : 'var(--text-faint, #6a6a6a)'
        })
      }}
    >
      <span
        data-tint="soft"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          height: '30px',
          flexShrink: 0,
          borderRadius: '8px',
          border: '1px solid var(--border-strong, #1a1a1a)',
          color: 'var(--text-faint, #6a6a6a)',
          transition: 'color 0.15s',
        }}
      >
        {icon}
      </span>

      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
        <span
          data-tint="strong"
          style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text, #f2f2f2)', transition: 'color 0.15s' }}
        >
          {label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-ghost, #4e4e4e)', lineHeight: 1.45 }}>
          {hint}
        </span>
      </span>

      <span
        data-tint="soft"
        style={{ color: 'var(--text-faint, #6a6a6a)', flexShrink: 0, transition: 'color 0.15s' }}
        aria-hidden="true"
      >
        &rarr;
      </span>
    </Link>
  )
}

function BulletList({ items, marker }: { items: string[]; marker: 'check' | 'dash' }) {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0, padding: 0 }}>
      {items.map(item => (
        <li
          key={item}
          style={{
            fontSize: '14px',
            color: 'var(--text-muted, #8a8a8a)',
            lineHeight: 1.65,
            paddingLeft: '24px',
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', left: 0, top: '3px', lineHeight: 1 }} aria-hidden="true">
            {marker === 'check' ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT}
                strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span style={{ display: 'inline-block', width: '11px', height: '1px', background: 'var(--border-light, #2a2a2a)', marginTop: '7px' }} />
            )}
          </span>
          {item}
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

  const { links, configured } = collectLinks(p)
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

            <FadeUp delay={0.08}>
              <Card title="Legal">
                {p.legalNote && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-faint, #6a6a6a)',
                      lineHeight: 1.7,
                      margin: '0 0 14px',
                      paddingBottom: '14px',
                      borderBottom: '1px solid var(--border-faint, #141414)',
                    }}
                  >
                    {p.legalNote}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <NavRow
                    to={`${basePath}/privacy-policy`}
                    label="Privacy policy"
                    hint="What is collected, and what is not"
                    icon={<IconShield />}
                  />
                  <NavRow
                    to={`${basePath}/delete-account`}
                    label="Delete account and data"
                    hint="Permanent, processed within 30 days"
                    icon={<IconTrash />}
                    danger
                  />
                </div>
              </Card>
            </FadeUp>

          </aside>
        </div>
      </div>
    </Layout>
  )
}