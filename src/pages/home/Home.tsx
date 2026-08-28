/**
 * Home.tsx
 * src/pages/home/Home.tsx
 *
 * ─── WHERE THE CONTENT LIVES ─────────────────────────────────────────────────
 *
 *  Everything comes from site.config.ts through the @/config barrel. There are
 *  no separate home.config or orb.config files.
 *
 *    homePage            hero copy
 *    homeStackBadges     tech chips under the hero
 *    homeSections        capabilities, approach, work, contact
 *    buildSequence       the scroll driven assembly animation
 *    projects            featured work and highlight cards read from here
 *    flags.showParticleBackground
 *
 *  Sections in order:
 *    1. Hero             particle field, copy, orb launcher
 *    2. Build sequence   scroll driven, an artifact assembles itself
 *    3. Capabilities     panels with the index numeral as background texture
 *    4. Approach         principles grid
 *    5. Work             featured projects
 *    6. Contact          closing
 *
 *  No scroll thread, no scroll indicator, no eyebrow tags above sections.
 *  Everything below the hero arrives through FadeUp on scroll.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout, TechBadge, FadeUp, BuildSequence } from '@/components'
import VoiceOrb from '@/components/Voiceorb'

import { ParticleViewer } from '@/particles'
import { heroParticleConfig } from '@/particles/particles.config'
import {
  homePage, homeStackBadges, flags, projects, brand, homeSections, buildSequence,
} from '@/config'
import type { CapabilityItem } from '@/config'
import { useIsMobile } from '@/hooks'

const ORB_ACCENT = { blue: '#61DAFF', orange: '#FF8C55' } as const
const ACCENT = '#FF8C55'

// ─────────────────────────────────────────────────────────────────────────────
// Section shell
// ─────────────────────────────────────────────────────────────────────────────

function Section({ children, flush = false }: { children: React.ReactNode; flush?: boolean }) {
  return (
    <section
      style={{
        borderTop: '1px solid var(--border, #151515)',
        padding: flush ? 'clamp(40px, 6vw, 72px) 0 0' : 'clamp(56px, 9vw, 104px) 0',
      }}
    >
      {children}
    </section>
  )
}

function SectionHeading({
  heading,
  intro,
  center = false,
}: {
  heading: string
  intro?: string
  center?: boolean
}) {
  return (
    <div
      style={{
        maxWidth: center ? '640px' : '580px',
        margin: center ? '0 auto' : undefined,
        textAlign: center ? 'center' : 'left',
      }}
    >
      <h2
        style={{
          fontSize: 'clamp(24px, 3.4vw, 38px)',
          fontWeight: 700,
          letterSpacing: '-0.028em',
          lineHeight: 1.12,
          color: 'var(--text, #f2f2f2)',
          margin: 0,
        }}
      >
        {heading}
      </h2>
      {intro && (
        <p
          style={{
            fontSize: 'clamp(14px, 1.4vw, 15px)',
            color: 'var(--text-muted, #6e6e6e)',
            lineHeight: 1.75,
            margin: '14px 0 0',
          }}
        >
          {intro}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Capability panel art
// ─────────────────────────────────────────────────────────────────────────────

function CapabilityVisual({ kind, accent }: { kind: CapabilityItem['visual']; accent: string }) {
  const stroke = `${accent}6e`
  const faint = 'rgba(255,255,255,0.07)'
  const mint = 'rgba(0,255,178,0.40)'

  return (
    <svg
      viewBox="0 0 220 150"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '190px' }}
      aria-hidden="true"
    >
      {kind === 'stack' && (
        <>
          {[0, 1, 2].map(i => (
            <rect
              key={i}
              x={54 + i * 6} y={26 + i * 14}
              width="112" height="86" rx="9"
              fill="none" stroke={i === 0 ? stroke : faint} strokeWidth="1"
            />
          ))}
          <rect x="66" y="52" width="52" height="4" rx="2" fill={stroke} />
          <rect x="66" y="64" width="76" height="3" rx="1.5" fill={faint} />
          <rect x="66" y="73" width="64" height="3" rx="1.5" fill={faint} />
          <circle cx="152" cy="98" r="7" fill="none" stroke={mint} strokeWidth="1" />
        </>
      )}

      {kind === 'grid' && (
        <>
          <rect x="30" y="24" width="160" height="102" rx="9" fill="none" stroke={faint} strokeWidth="1" />
          <line x1="30" y1="46" x2="190" y2="46" stroke={faint} strokeWidth="1" />
          <line x1="86" y1="46" x2="86" y2="126" stroke={faint} strokeWidth="1" />
          <circle cx="42" cy="35" r="2.5" fill={stroke} />
          <circle cx="51" cy="35" r="2.5" fill={faint} />
          <circle cx="60" cy="35" r="2.5" fill={faint} />
          <rect x="42" y="58" width="30" height="3" rx="1.5" fill={faint} />
          <rect x="42" y="68" width="22" height="3" rx="1.5" fill={faint} />
          <rect x="42" y="78" width="28" height="3" rx="1.5" fill={faint} />
          <rect x="98" y="58" width="80" height="3" rx="1.5" fill={stroke} />
          <rect x="98" y="70" width="58" height="3" rx="1.5" fill={faint} />
          <rect x="98" y="82" width="70" height="3" rx="1.5" fill={faint} />
          <rect x="98" y="98" width="44" height="14" rx="4" fill="none" stroke={mint} strokeWidth="1" />
        </>
      )}

      {kind === 'signal' && (
        <>
          <line x1="18" y1="75" x2="202" y2="75" stroke={faint} strokeWidth="1" />
          <path
            d="M18 75 L52 75 L60 48 L72 100 L84 62 L96 82 L108 75 L140 75 L150 58 L162 90 L174 75 L202 75"
            fill="none" stroke={stroke} strokeWidth="1.4"
            strokeLinejoin="round" strokeLinecap="round"
          />
          <circle cx="72" cy="100" r="3.5" fill="none" stroke={mint} strokeWidth="1.2" />
          <circle cx="150" cy="58" r="3.5" fill="none" stroke={mint} strokeWidth="1.2" />
          {[34, 118, 186].map(x => (
            <line key={x} x1={x} y1="32" x2={x} y2="118" stroke={faint} strokeWidth="1" strokeDasharray="2 6" />
          ))}
        </>
      )}

      {kind === 'data' && (
        <>
          {/* axes */}
          <line x1="34" y1="118" x2="196" y2="118" stroke={faint} strokeWidth="1" />
          <line x1="34" y1="26" x2="34" y2="118" stroke={faint} strokeWidth="1" />
          {[42, 66, 90].map(y => (
            <line key={y} x1="34" y1={y} x2="196" y2={y} stroke={faint} strokeWidth="1" strokeDasharray="2 7" />
          ))}
          {/* bars */}
          {[0.34, 0.58, 0.42, 0.80, 0.55, 0.92].map((h, i) => (
            <rect
              key={i}
              x={46 + i * 25} y={118 - h * 84}
              width="15" height={h * 84} rx="2.5"
              fill={i === 3 || i === 5 ? mint : faint}
            />
          ))}
          {/* trend */}
          <polyline
            points="53,90 78,68 103,80 128,46 153,62 178,34"
            fill="none" stroke={stroke} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {[[53, 90], [128, 46], [178, 34]].map(([cx, cy]) => (
            <circle key={`${cx}`} cx={cx} cy={cy} r="2.6" fill={accent} opacity="0.75" />
          ))}
        </>
      )}

      {kind === 'shield' && (
        <>
          {/* shield outline */}
          <path
            d="M110 18 L176 34 L176 82 C176 108 146 126 110 134 C74 126 44 108 44 82 L44 34 Z"
            fill={`${accent}0d`} stroke={stroke} strokeWidth="1.3"
          />
          {/* inner scan lines */}
          {[54, 66, 78, 90].map((y, i) => (
            <line
              key={y}
              x1={i % 2 === 0 ? 62 : 70} y1={y}
              x2={i % 2 === 0 ? 158 : 150} y2={y}
              stroke={faint} strokeWidth="1"
            />
          ))}
          {/* sweep band */}
          <rect x="44" y="70" width="132" height="9" fill={accent} opacity="0.10" />
          <line x1="44" y1="70" x2="176" y2="70" stroke={accent} strokeWidth="1" opacity="0.55" />
          {/* padlock */}
          <g transform="translate(110, 96)">
            <rect x="-11" y="-2" width="22" height="16" rx="3.5" fill={`${accent}26`} stroke={stroke} strokeWidth="1.2" />
            <path d="M-6 -2 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke={stroke} strokeWidth="1.2" />
            <circle cx="0" cy="6" r="1.9" fill={accent} opacity="0.8" />
          </g>
        </>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Capability panel
// ─────────────────────────────────────────────────────────────────────────────
// The index numeral is background texture now, sized to fill the panel at very
// low opacity, rather than a small badge in a row.

function CapabilityPanel({
  item,
  step,
  isMobile,
}: {
  item: CapabilityItem
  step: number
  isMobile: boolean
}) {
  const featured = !!item.featured
  const accent = featured ? '#FF6B2B' : ACCENT

  return (
    <article
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
        alignItems: 'stretch',
        background: featured ? 'rgba(255,107,43,0.028)' : 'var(--surface, #0a0a0a)',
        border: `1px solid ${featured ? 'rgba(255,107,43,0.26)' : 'var(--border, #1a1a1a)'}`,
        borderRadius: '14px',
        transition: 'border-color 0.18s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = featured ? 'rgba(255,107,43,0.48)' : '#2c2c2c'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = featured ? 'rgba(255,107,43,0.26)' : 'var(--border, #1a1a1a)'
      }}
    >
      {/* Index numeral as background texture */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: isMobile ? 'auto' : '-0.055em',
          right: isMobile ? '-0.04em' : 'auto',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: isMobile ? 'clamp(160px, 48vw, 260px)' : 'clamp(210px, 21vw, 320px)',
          fontWeight: 800,
          lineHeight: 0.72,
          letterSpacing: '-0.07em',
          color: featured ? 'rgba(255,107,43,0.075)' : 'rgba(255,255,255,0.032)',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        {String(step).padStart(2, '0')}
      </span>

      {/* Copy side */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isMobile ? '24px 20px' : 'clamp(28px, 3.4vw, 44px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '10px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {item.name}
          </span>
          {featured && item.featureLabel && (
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '9px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: accent,
                border: `1px solid ${accent}44`,
                background: `${accent}14`,
                borderRadius: '100px',
                padding: '3px 9px',
              }}
            >
              {item.featureLabel}
            </span>
          )}
        </div>

        <h3
          style={{
            fontSize: 'clamp(18px, 2.2vw, 25px)',
            fontWeight: 700,
            letterSpacing: '-0.022em',
            lineHeight: 1.22,
            color: 'var(--text, #f2f2f2)',
            margin: '0 0 12px',
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            fontSize: '13.5px',
            color: 'var(--text-muted, #6e6e6e)',
            lineHeight: 1.75,
            margin: '0 0 20px',
          }}
        >
          {item.description}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {item.points.slice(0, 3).map(point => (
            <span
              key={point}
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '10px',
                letterSpacing: '0.04em',
                color: featured ? `${accent}bb` : 'var(--text-dim, #545454)',
                border: `1px solid ${featured ? `${accent}33` : 'var(--border, #1e1e1e)'}`,
                borderRadius: '4px',
                padding: '3px 9px',
              }}
            >
              {point}
            </span>
          ))}
        </div>
      </div>

      {/* Visual side */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '8px 20px 24px' : 'clamp(20px, 2.6vw, 32px)',
          borderTop: isMobile ? '1px solid var(--border, #151515)' : 'none',
          borderLeft: isMobile ? 'none' : `1px solid ${featured ? 'rgba(255,107,43,0.16)' : 'var(--border, #151515)'}`,
          minWidth: 0,
        }}
      >
        <div style={{ width: '100%' }}>
          <CapabilityVisual kind={item.visual} accent={accent} />
        </div>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Featured work card
// ─────────────────────────────────────────────────────────────────────────────

function WorkCard({ p }: { p: (typeof projects)[number] }) {
  return (
    <Link to={`/projects/${p.slug}`} style={{ display: 'block', textDecoration: 'none', height: '100%' }}>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface, #0a0a0a)',
          border: '1px solid var(--border, #1a1a1a)',
          borderRadius: '12px',
          padding: '20px',
          transition: 'border-color 0.16s, transform 0.16s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = '#2c2c2c'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border, #1a1a1a)'
          el.style.transform = 'translateY(0)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          {p.appIconPath && (
            <img
              src={p.appIconPath}
              alt=""
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.07)', objectFit: 'cover', flexShrink: 0,
              }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-dim, #4a4a4a)',
            }}
          >
            {p.status}
          </span>
        </div>

        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text, #f2f2f2)',
            margin: '0 0 8px',
            lineHeight: 1.25,
          }}
        >
          {p.name}
        </h3>

        <p
          style={{
            fontSize: '12.5px',
            color: 'var(--text-muted, #5a5a5a)',
            lineHeight: 1.6,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {p.tagline}
        </p>

        <div style={{ flex: 1, minHeight: '16px' }} />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border, #141414)',
          }}
        >
          {p.tech.slice(0, 3).map(t => (
            <span
              key={t}
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '9.5px',
                color: 'var(--text-dim, #3e3e3e)',
                border: '1px solid var(--border, #1c1c1c)',
                borderRadius: '3px',
                padding: '2px 7px',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const isMobile = useIsMobile(768)
  const [orbs, setOrbs] = useState<{ blue: boolean; orange: boolean }>({ blue: false, orange: false })
  const [menuOpen, setMenuOpen] = useState(false)

  const { capabilities, approach, work, contact } = homeSections

  const featured = (() => {
    const picked = work.featuredSlugs
      .map(slug => projects.find(p => p.slug === slug))
      .filter(Boolean) as typeof projects
    if (picked.length) return picked.slice(0, 3)
    return projects.filter(p => p.status !== 'Archived' && p.status !== 'Dead').slice(0, 3)
  })()

  const orbRow = (variant: 'blue' | 'orange') => {
    const on = orbs[variant]
    const accent = ORB_ACCENT[variant]
    return (
      <button
        key={variant}
        onClick={() => setOrbs(o => ({ ...o, [variant]: !o[variant] }))}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: on ? accent : 'var(--text-dim, #6a6a6a)',
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.02em',
          transition: 'background 0.12s, color 0.12s',
          textAlign: 'left',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--surface2, #141414)'
          e.currentTarget.style.color = accent
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = on ? accent : 'var(--text-dim, #6a6a6a)'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
          <span
            style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: accent, opacity: on ? 1 : 0.5,
              boxShadow: on ? `0 0 7px ${accent}` : 'none',
            }}
          />
          {variant === 'blue' ? 'Blue orb' : 'Orange orb'}
        </span>
        <span
          style={{
            fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em',
            color: on ? accent : 'var(--text-faint, #6a6a6a)', textTransform: 'uppercase',
          }}
        >
          {on ? 'On' : 'Off'}
        </span>
      </button>
    )
  }

  return (
    <Layout>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '0' : 'clamp(32px, 5vw, 64px)',
          alignItems: 'center',
          minHeight: isMobile ? 'auto' : 'calc(100vh - var(--nav-h) - 80px)',
          paddingTop: isMobile ? '24px' : '0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative', zIndex: 1 }}>
          <div>
            <p
              style={{
                fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: 'var(--text-dim, #555)', marginBottom: '16px',
              }}
            >
              {homePage.eyebrow}
            </p>
            <h1
              style={{
                fontSize: 'clamp(38px, 5.5vw, 68px)', fontWeight: 700,
                letterSpacing: '-0.03em', lineHeight: 1.0,
                color: 'var(--text, #f2f2f2)', margin: 0,
              }}
            >
              {homePage.headline.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h1>
          </div>

          <p style={{ fontSize: '15px', color: 'var(--text-muted, #6e6e6e)', lineHeight: 1.75, maxWidth: '440px', margin: 0 }}>
            {homePage.subtext}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to={homePage.ctaPath}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px', background: 'var(--accent, #f2f2f2)',
                color: 'var(--bg, #080808)', borderRadius: '7px',
                fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em',
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover, #ddd)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent, #f2f2f2)')}
            >
              {homePage.ctaLabel}
            </Link>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '12px 20px', background: 'transparent',
                  color: 'var(--text, #f2f2f2)', border: '1px solid var(--border-light, #2a2a2a)',
                  borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                  letterSpacing: '0.02em', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-light, #2a2a2a)')}
              >
                Make your own orb videos
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 140 }} />
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 150,
                      minWidth: '210px', background: 'rgba(10,10,10,0.98)',
                      backdropFilter: 'blur(14px)', border: '1px solid var(--border-light, #242424)',
                      borderRadius: '9px', boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                      overflow: 'hidden', padding: '6px 0',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '9px', fontWeight: 600, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'var(--text-faint, #6a6a6a)',
                        padding: '6px 14px 8px', margin: 0, borderBottom: '1px solid var(--border, #1c1c1c)',
                      }}
                    >
                      Voice orbs
                    </p>
                    {orbRow('blue')}
                    {orbRow('orange')}
                  </div>
                </>
              )}
            </div>
          </div>

          <p
            style={{
              fontSize: '13px', color: 'var(--text-dim, #5a5a5a)', lineHeight: 1.8,
              maxWidth: '460px', margin: 0,
              borderLeft: '2px solid var(--border, #1e1e1e)', paddingLeft: '16px',
            }}
          >
            {homePage.about}
          </p>

          {homeStackBadges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {homeStackBadges.map(name => (
                <TechBadge key={name} name={name} />
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            position: 'relative',
            height: isMobile ? '260px' : 'min(520px, 72vh)',
            marginTop: isMobile ? '24px' : '0',
          }}
        >
          {flags.showParticleBackground && (
            <ParticleViewer
              config={isMobile ? { ...heroParticleConfig, particleCount: 400 } : heroParticleConfig}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </div>

      {/* ══ BUILD SEQUENCE ════════════════════════════════════════════════ */}
      {buildSequence.show && (
        <Section flush>
          <FadeUp>
            <SectionHeading heading={buildSequence.heading} intro={buildSequence.intro} />
          </FadeUp>
          <BuildSequence isMobile={isMobile} />
        </Section>
      )}

      {/* ══ CAPABILITIES ══════════════════════════════════════════════════ */}
      {capabilities.show && (
        <Section>
          <FadeUp>
            <SectionHeading heading={capabilities.heading} intro={capabilities.intro} />
          </FadeUp>
          <div style={{ display: 'grid', gap: '14px', marginTop: 'clamp(28px, 4vw, 44px)' }}>
            {capabilities.items.map((item, i) => (
              <FadeUp key={item.id} delay={i * 0.06}>
                <CapabilityPanel item={item} step={i + 1} isMobile={isMobile} />
              </FadeUp>
            ))}
          </div>
        </Section>
      )}

      {/* ══ APPROACH ══════════════════════════════════════════════════════ */}
      {approach.show && (
        <Section>
          <FadeUp>
            <SectionHeading heading={approach.heading} intro={approach.intro} />
          </FadeUp>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1px',
              marginTop: 'clamp(28px, 4vw, 44px)',
              background: 'var(--border, #151515)',
              border: '1px solid var(--border, #151515)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {approach.principles.map((principle, i) => (
              <FadeUp key={principle.title} delay={i * 0.06} style={{ background: 'var(--surface, #0a0a0a)' }}>
                <div style={{ padding: 'clamp(22px, 2.8vw, 30px)', height: '100%' }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '10px',
                      letterSpacing: '0.14em',
                      color: 'rgba(255,140,85,0.75)',
                      marginBottom: '14px',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3
                    style={{
                      fontSize: '15px', fontWeight: 700, letterSpacing: '-0.015em',
                      lineHeight: 1.35, color: 'var(--text, #f2f2f2)', margin: '0 0 10px',
                    }}
                  >
                    {principle.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted, #5e5e5e)', lineHeight: 1.75, margin: 0 }}>
                    {principle.body}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </Section>
      )}

      {/* ══ FEATURED WORK ═════════════════════════════════════════════════ */}
      {work.show && featured.length > 0 && (
        <Section>
          <FadeUp>
            <SectionHeading heading={work.heading} intro={work.intro} />
          </FadeUp>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '12px',
              alignItems: 'stretch',
              marginTop: 'clamp(28px, 4vw, 44px)',
            }}
          >
            {featured.map((p, i) => (
              <FadeUp key={p.slug} delay={i * 0.07} style={{ height: '100%' }}>
                <WorkCard p={p} />
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.12}>
            <Link
              to={work.ctaPath}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '22px',
                fontFamily: 'var(--font-mono, monospace)', fontSize: '12px',
                color: 'var(--text-muted, #6a6a6a)', textDecoration: 'none', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted, #6a6a6a)')}
            >
              {work.ctaLabel}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </FadeUp>
        </Section>
      )}

      {/* ══ CONTACT ═══════════════════════════════════════════════════════ */}
      {contact.show && (
        <Section>
          <FadeUp>
            <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700,
                  letterSpacing: '-0.03em', lineHeight: 1.1,
                  color: 'var(--text, #f2f2f2)', margin: '0 0 16px',
                }}
              >
                {contact.heading}
              </h2>
              <p
                style={{
                  fontSize: 'clamp(14px, 1.5vw, 16px)', color: 'var(--text-muted, #6e6e6e)',
                  lineHeight: 1.75, margin: '0 0 28px',
                }}
              >
                {contact.subheadline}
              </p>
              <a
                href={`mailto:${brand.email}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '13px 28px', background: 'var(--accent, #f2f2f2)',
                  color: 'var(--bg, #080808)', borderRadius: '7px',
                  fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em',
                  textDecoration: 'none', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover, #ddd)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent, #f2f2f2)')}
              >
                {contact.ctaLabel}
              </a>
              <p style={{ fontSize: '12.5px', color: 'var(--text-dim, #4e4e4e)', margin: '18px 0 0' }}>
                {contact.reassurance}
              </p>
              <a
                href={`mailto:${brand.email}`}
                style={{
                  display: 'inline-block', marginTop: '10px',
                  fontFamily: 'var(--font-mono, monospace)', fontSize: '12.5px',
                  color: 'var(--text-dim, #4e4e4e)', textDecoration: 'none', transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim, #4e4e4e)')}
              >
                {brand.email}
              </a>
            </div>
          </FadeUp>
        </Section>
      )}

      {orbs.blue && (
        <VoiceOrb variant="blue" offsetRight={24} onClose={() => setOrbs(o => ({ ...o, blue: false }))} />
      )}
      {orbs.orange && (
        <VoiceOrb
          variant="orange"
          offsetRight={orbs.blue && !isMobile ? 340 : 24}
          onClose={() => setOrbs(o => ({ ...o, orange: false }))}
        />
      )}
    </Layout>
  )
}