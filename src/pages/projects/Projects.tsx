/**
 * Projects.tsx
 *
 * All copy comes from site.config.ts projectsPage. Nothing is hardcoded here.
 * (Exception: the CLASSIFIED card's redaction stamps are thematic set-dressing,
 * not copy — they are intentionally literal.)
 *
 * ─── SITE CONFIG FIELDS READ BY THIS PAGE ─────────────────────────────────────
 *
 *  projectsPage (site.config.ts)
 *    .eyebrow              Small label above the h1
 *    .heading              Page h1
 *    .subtext              Paragraph below heading
 *    .activeSectionLabel   Section heading for active projects
 *    .inactiveSectionLabel Section heading for inactive projects
 *    .inactiveNote         Note under inactive section heading
 *
 *  projects[] (site.config.ts) - fields used by this page:
 *    .slug          string      URL: /projects/<slug>
 *    .name          string      Card title
 *    .tagline       string      Card subtitle, clamped to 2 lines
 *    .platform      Platform    Card footer left
 *    .year          string      Card footer right
 *    .status        ProjectStatus
 *                               Lifecycle grouping:
 *                               Active:   'Live' | 'Beta' | 'In Development'
 *                               Inactive: 'Paused' | 'Archived' | 'Dead' |
 *                                         'Defunct' | 'Abandoned' | 'Discontinued'
 *    .visibility?   ProjectVisibility
 *                               Audience badge shown on the card.
 *                               'Internal' | 'Internal Testing' | 'Private Beta' etc.
 *                               Omit (or set 'Public') for public apps - no badge.
 *                               'Internal' | 'Internal Testing' hides store download links.
 *    .tech          string[]    Stack tags. First 4 shown, rest +N.
 *    .coverImage?   string      /public/screenshots/<slug>/cover.jpg  16:9 thumbnail.
 *    .appIconPath?  string      /public/icons/<name>.png  overlaid bottom-left.
 *
 *    .classified?   boolean     ★ NEW. When true, the project renders as a
 *                               REDACTED card: only the name is visible, every
 *                               other field is blacked out, it never links to
 *                               /projects/<slug>, and it is excluded from the
 *                               active/inactive grouping logic. Clicking it
 *                               opens a meme instead.
 *    .memeGif?      string      ★ NEW. The meme shown when a classified card is
 *                               clicked. Defaults to /memes/<slug>.gif. If the
 *                               file is missing the modal shows a themed
 *                               "clearance denied" fallback instead of a broken
 *                               image — safe to ship before the gif exists.
 *
 *  Inactive projects: plain <div> rows, nothing clickable, all links disabled.
 *  Internal/Internal Testing: store/download buttons hidden even on active cards.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '@/components'
import { projects, projectsPage, assets } from '@/config'
import { statusStyle, getStatusColors } from '@/lib'
import type { ProjectStatus, ProjectVisibility } from '@/config'
import { useIsMobile } from '@/hooks'

type Project = (typeof projects)[number]

// ── Status grouping ───────────────────────────────────────────────────────────
const INACTIVE_STATUSES = new Set([
  'Paused', 'Archived', 'Dead', 'Defunct', 'Abandoned', 'Discontinued',
])
const isInactive = (status: string) => INACTIVE_STATUSES.has(status)

// ── Classified helpers ────────────────────────────────────────────────────────
const isClassified = (p: Project): boolean =>
  (p as { classified?: boolean }).classified === true ||
  String((p as { visibility?: string }).visibility) === 'Classified'

const memeGifSrc = (p: Project): string =>
  (p as { memeGif?: string }).memeGif ?? `/memes/${p.slug}.gif`

// ── Visibility helpers ────────────────────────────────────────────────────────
// These visibility values suppress public store/download links
const HIDES_STORE_LINKS = new Set<ProjectVisibility>([
  'Internal', 'Internal Testing', 'Restricted',
])

function shouldHideStoreLinks(visibility?: ProjectVisibility): boolean {
  if (!visibility || visibility === 'Public') return false
  return HIDES_STORE_LINKS.has(visibility)
}

// Colour + label for visibility badges
function visibilityBadgeStyle(v: ProjectVisibility): React.CSSProperties {
  const map: Record<ProjectVisibility, { bg: string; border: string; color: string }> = {
    'Public': { bg: 'transparent', border: 'transparent', color: 'transparent' },
    'Internal': { bg: 'rgba(255,140,0,0.10)', border: 'rgba(255,140,0,0.25)', color: '#FF9A3C' },
    'Internal Testing': { bg: 'rgba(255,80,80,0.10)', border: 'rgba(255,80,80,0.25)', color: '#FF6060' },
    'Private Beta': { bg: 'rgba(130,80,255,0.10)', border: 'rgba(130,80,255,0.25)', color: '#A07AFF' },
    'Restricted': { bg: 'rgba(255,60,60,0.10)', border: 'rgba(255,60,60,0.25)', color: '#FF5050' },
    'Unlisted': { bg: 'rgba(100,100,100,0.10)', border: 'rgba(100,100,100,0.25)', color: '#888888' },
  }
  const s = map[v] ?? map['Unlisted']
  return {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    color: s.color,
    background: s.bg,
    border: `1px solid ${s.border}`,
    padding: '2px 7px',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
    display: 'inline-block',
  }
}

// ── Redaction bar (▇▇▇▇ block used all over the classified card) ─────────────
function Redacted({ w, h = 10 }: { w: string; h?: number }) {
  return (
    <span style={{
      display: 'inline-block',
      width: w,
      height: `${h}px`,
      background: 'repeating-linear-gradient(90deg, #1c1c1c 0 8px, #161616 8px 16px)',
      borderRadius: '2px',
      verticalAlign: 'middle',
    }} />
  )
}

// ── Classified project card ───────────────────────────────────────────────────
// Shows the NAME and nothing else. Everything a normal card shows is redacted.
// Not a <Link> — clicking opens the meme modal instead of a detail page.
function ClassifiedCard({
  p,
  isMobile,
  onOpen,
}: {
  p: Project
  isMobile: boolean
  onOpen: (p: Project) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p) } }}
      style={{
        height: '100%',
        background: '#0a0a0a',
        border: '1px dashed rgba(255,60,60,0.28)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.16s, box-shadow 0.16s',
        cursor: 'pointer',
        outline: 'none',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,60,60,0.55)'
        el.style.boxShadow = '0 4px 24px rgba(255,40,40,0.10)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,60,60,0.28)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Redacted "thumbnail" — same 16:9 slot as normal cards */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%',
        flexShrink: 0,
        background:
          'repeating-linear-gradient(-45deg, #0c0c0c 0 14px, #090909 14px 28px)',
      }}>
        {/* CLASSIFIED stamp */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: '13px', fontWeight: 800,
            letterSpacing: '0.34em', textTransform: 'uppercase',
            color: 'rgba(255,70,70,0.75)',
            border: '2px solid rgba(255,70,70,0.45)',
            padding: '6px 14px 6px 18px',
            borderRadius: '3px',
            transform: 'rotate(-7deg)',
            fontFamily: 'var(--font-mono)',
            background: 'rgba(10,10,10,0.72)',
          }}>
            Classified
          </span>
        </div>
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text-faint, #8a8a8a)',
          fontFamily: 'var(--font-mono)',
        }}>
          ████-██
        </div>
      </div>

      {/* Body — only the name survives redaction */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '14px 16px 16px' : '16px 18px 18px',
        gap: '10px',
        minHeight: 0,
      }}>
        <h2 style={{
          fontSize: 'clamp(15px, 1.8vw, 17px)',
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: 0,
          flexShrink: 0,
        }}>
          {p.name}
        </h2>

        {/* Redacted tagline — matches the 2-line slot of normal cards */}
        <div style={{ minHeight: '37px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
          <Redacted w="92%" />
          <Redacted w="61%" />
        </div>

        <div style={{ flex: 1 }} />

        {/* Redacted tech tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
          {['46px', '58px', '38px'].map((w, i) => (
            <span key={i} style={{
              background: '#111', border: '1px solid var(--border)',
              padding: '2px 7px', borderRadius: '4px', lineHeight: 1.6,
              display: 'inline-flex', alignItems: 'center',
            }}>
              <Redacted w={w} h={7} />
            </span>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-faint, #141414)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: '10px', color: 'var(--text-faint, #8a8a8a)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
          }}>
            [Redacted]
          </span>
          <span style={{
            fontSize: '9px', color: 'rgba(255,70,70,0.55)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Clearance required
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Meme modal ────────────────────────────────────────────────────────────────
// Clicking a classified card opens this. Shows p.memeGif (default
// /memes/<slug>.gif). If the gif is missing/unloadable, a themed fallback
// renders instead of a broken image — nothing to add before the gif exists.
function MemeModal({ p, onClose }: { p: Project; onClose: () => void }) {
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // lock scroll behind the modal
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(4,4,4,0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 'min(680px, 92vw)',
          width: '100%',
          background: '#0a0a0a',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          cursor: 'default',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderBottom: '1px solid var(--border-faint, #161616)',
        }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,70,70,0.8)',
            fontFamily: 'var(--font-mono)',
          }}>
            Top secret // {p.name}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', color: 'var(--text-dim)',
              fontSize: '16px', lineHeight: 1, cursor: 'pointer', padding: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
          >
            ×
          </button>
        </div>

        {/* Meme — or the clearance-denied fallback if the gif is missing */}
        {!imgFailed ? (
          <img
            src={memeGifSrc(p)}
            alt={`${p.name} — classified`}
            onError={() => setImgFailed(true)}
            style={{
              display: 'block', width: '100%',
              maxHeight: '68vh', objectFit: 'contain',
              background: '#060606',
            }}
          />
        ) : (
          <div style={{
            padding: '56px 28px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '14px', textAlign: 'center',
          }}>
            <span style={{
              fontSize: '15px', fontWeight: 800,
              letterSpacing: '0.30em', textTransform: 'uppercase',
              color: 'rgba(255,70,70,0.75)',
              border: '2px solid rgba(255,70,70,0.4)',
              padding: '8px 16px 8px 20px',
              borderRadius: '3px', transform: 'rotate(-4deg)',
              fontFamily: 'var(--font-mono)',
            }}>
              Access denied
            </span>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.7, maxWidth: '340px', margin: 0 }}>
              Your clearance level is insufficient to view this asset.
            </p>
            <p style={{
              fontSize: '10px', color: 'var(--text-ghost, #6a6a6a)', margin: 0,
              fontFamily: 'var(--font-mono)',
            }}>
              ref: {memeGifSrc(p)}
            </p>
          </div>
        )}

        <div style={{
          padding: '8px 14px', borderTop: '1px solid var(--border-faint, #161616)',
          fontSize: '9px', color: 'var(--text-ghost, #6a6a6a)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)', textAlign: 'right',
        }}>
          Esc / click outside to close
        </div>
      </div>
    </div>
  )
}

// ── Active project card ───────────────────────────────────────────────────────
function ProjectCard({
  p,
  isMobile,
}: {
  p: Project
  isMobile: boolean
}) {
  const statusColors = getStatusColors(p.status as ProjectStatus)
  const vis = (p as any).visibility as ProjectVisibility | undefined

  return (
    <Link
      to={`/projects/${p.slug}`}
      style={{ display: 'block', textDecoration: 'none', height: '100%' }}
    >
      <div
        style={{
          height: '100%',
          background: '#0a0a0a',
          border: '1px solid var(--border-strong, #1a1a1a)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'border-color 0.16s, box-shadow 0.16s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#2e2e2e'
          el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.45)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#1a1a1a'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Thumbnail - always 16:9 */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          flexShrink: 0,
          background: '#0f0f0f',
        }}>
          <img
            src={p.coverImage ?? (assets as any).defaultCover}
            alt={p.name}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
            }}
            onError={e => {
              // If default cover also fails, fall back to the colour band
              const img = e.currentTarget
              img.style.display = 'none'
              const parent = img.parentElement
              if (parent) {
                const fallback = document.createElement('div')
                fallback.style.cssText = `position:absolute;inset:0;background:linear-gradient(135deg,${statusColors.bg ?? 'rgba(255,255,255,0.03)'} 0%,#090909 100%)`
                parent.appendChild(fallback)
              }
            }}
          />

          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 45%, rgba(10,10,10,0.82) 100%)',
            pointerEvents: 'none',
          }} />

          {/* Top-right badges row: visibility first, then status */}
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            display: 'flex', gap: '5px', alignItems: 'center',
          }}>
            {vis && vis !== 'Public' && (
              <span style={visibilityBadgeStyle(vis)}>{vis}</span>
            )}
            <span style={statusStyle(p.status as ProjectStatus)}>{p.status}</span>
          </div>

          <img
            src={p.appIconPath ?? (assets as any).defaultIcon}
            alt=""
            style={{
              position: 'absolute', bottom: '10px', left: '12px',
              width: '36px', height: '36px', borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: '#0a0a0a', objectFit: 'cover',
            }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '14px 16px 16px' : '16px 18px 18px',
          gap: '10px',
          minHeight: 0,
        }}>
          <h2 style={{
            fontSize: 'clamp(15px, 1.8vw, 17px)',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: 0,
            flexShrink: 0,
          }}>
            {p.name}
          </h2>

          {/* Tagline - always exactly 2 lines */}
          <p style={{
            fontSize: '12px',
            color: 'var(--text-dim)',
            lineHeight: 1.55,
            margin: 0,
            flexShrink: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            minHeight: '37px',
          }}>
            {p.tagline}
          </p>

          <div style={{ flex: 1 }} />

          {/* Tech tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
            {p.tech.slice(0, 4).map((t: string) => (
              <span key={t} style={{
                fontSize: '10px', fontWeight: 500,
                color: 'var(--text-faint, #8a8a8a)', background: '#111',
                border: '1px solid var(--border)',
                padding: '2px 7px', borderRadius: '4px',
                letterSpacing: '0.02em', lineHeight: 1.6,
              }}>{t}</span>
            ))}
            {p.tech.length > 4 && (
              <span style={{ fontSize: '10px', color: 'var(--text-ghost, #6a6a6a)', padding: '2px 4px', lineHeight: 1.6 }}>
                +{p.tech.length - 4}
              </span>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-faint, #141414)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-faint, #8a8a8a)', letterSpacing: '0.04em' }}>{p.platform}</span>
              <span style={{ color: 'var(--text-ghost, #6a6a6a)', fontSize: '8px' }}>·</span>
              <span style={{ fontSize: '10px', color: 'var(--text-faint, #8a8a8a)', fontFamily: 'var(--font-mono)' }}>{p.year}</span>
            </div>
            {/* Show arrow only for public/accessible apps */}
            {!shouldHideStoreLinks(vis) ? (
              <span style={{ fontSize: '14px', color: statusColors.fg, opacity: 0.65 }}>{''}</span>
            ) : (
              <span style={{
                fontSize: '9px', color: 'var(--text-faint, #8a8a8a)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Not public
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Inactive project row ──────────────────────────────────────────────────────
function InactiveRow({ p }: { p: Project }) {
  const vis = (p as any).visibility as ProjectVisibility | undefined

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 14px',
      background: '#080808',
      border: '1px solid var(--border-faint, #111)',
      borderRadius: '8px',
    }}>
      <img
        src={p.appIconPath ?? (assets as any).defaultIcon}
        alt=""
        style={{
          width: '34px', height: '34px', borderRadius: '8px',
          border: '1px solid var(--border-strong, #1a1a1a)', flexShrink: 0,
          filter: 'grayscale(1) opacity(0.35)', objectFit: 'cover',
        }}
        onError={e => {
          const img = e.currentTarget
          img.style.display = 'none'
          const span = document.createElement('div')
          span.style.cssText = 'width:34px;height:34px;border-radius:8px;background:#111;border:1px solid #1a1a1a;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#222'
          span.textContent = p.name[0]
          img.parentElement?.insertBefore(span, img)
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint, #8a8a8a)' }}>{p.name}</span>
          <span style={{ ...statusStyle(p.status as ProjectStatus), opacity: 0.5 }}>{p.status}</span>
          {vis && vis !== 'Public' && (
            <span style={{ ...visibilityBadgeStyle(vis), opacity: 0.5 }}>{vis}</span>
          )}
        </div>
        <p style={{
          fontSize: '11px', color: 'var(--text-ghost, #6a6a6a)', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{p.tagline}</p>
      </div>

      <div style={{
        display: 'flex', gap: '6px', alignItems: 'center',
        flexShrink: 0, fontSize: '10px', color: 'var(--text-ghost, #6a6a6a)',
        fontFamily: 'var(--font-mono)',
      }}>
        <span>{p.platform}</span>
        <span>·</span>
        <span>{p.year}</span>
      </div>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-faint, #8a8a8a)', whiteSpace: 'nowrap',
      }}>{children}</span>
      <span style={{
        fontSize: '10px', fontWeight: 700, color: 'var(--text-ghost, #6a6a6a)',
        background: '#111', border: '1px solid var(--border-strong, #1a1a1a)',
        padding: '1px 7px', borderRadius: '20px', fontFamily: 'var(--font-mono)',
      }}>{count}</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border-faint, #141414)' }} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Projects() {
  const isMobile = useIsMobile(640)
  const [memeProject, setMemeProject] = useState<Project | null>(null)

  // Classified projects bypass the active/inactive grouping entirely —
  // their status is nobody's business.
  const classified = projects.filter(isClassified)
  const active = projects.filter(p => !isClassified(p) && !isInactive(p.status))
  const inactive = projects.filter(p => !isClassified(p) && isInactive(p.status))
  const liveCount = projects.filter(p => p.status === 'Live').length

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

        <header style={{ paddingTop: '24px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '14px',
          }}>
            {projectsPage.eyebrow}
          </p>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.05,
            color: 'var(--text)', marginBottom: '16px',
          }}>
            {projectsPage.heading}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '480px' }}>
            {projectsPage.subtext}
          </p>
        </header>

        {/* Stats strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {([
            { label: `${projects.length} total`, muted: false },
            { label: `${liveCount} live`, muted: true },
            { label: `${inactive.length} inactive`, muted: true },
          ] as const).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {i > 0 && (
                <span style={{ width: '1px', height: '11px', background: 'var(--border)', flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: '11px', color: s.muted ? 'var(--text-ghost, #6a6a6a)' : 'var(--text-dim)',
                letterSpacing: '0.06em',
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Active — classified cards render in the same grid, at the end */}
        {(active.length > 0 || classified.length > 0) && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <SectionHeading count={active.length + classified.length}>
              {projectsPage.activeSectionLabel}
            </SectionHeading>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
              alignItems: 'stretch',
            }}>
              {active.map(p => (
                <ProjectCard key={p.slug} p={p} isMobile={isMobile} />
              ))}
              {classified.map(p => (
                <ClassifiedCard key={p.slug} p={p} isMobile={isMobile} onOpen={setMemeProject} />
              ))}
            </div>
          </section>
        )}

        {/* Inactive */}
        {inactive.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SectionHeading count={inactive.length}>
              {projectsPage.inactiveSectionLabel}
            </SectionHeading>
            <p style={{
              fontSize: '12px', color: 'var(--text-faint, #8a8a8a)',
              lineHeight: 1.6, maxWidth: '480px', marginTop: '-2px',
            }}>
              {projectsPage.inactiveNote}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {inactive.map(p => (
                <InactiveRow key={p.slug} p={p} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Meme modal — classified card clicked */}
      {memeProject && (
        <MemeModal p={memeProject} onClose={() => setMemeProject(null)} />
      )}
    </Layout>
  )
}