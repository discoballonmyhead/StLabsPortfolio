/**
 * Home.tsx
 *
 * ─── SITE CONFIG FIELDS READ BY THIS PAGE ─────────────────────────────────────
 *
 *  homePage (site.config.ts)
 *    .eyebrow     Small label above the headline
 *    .headline    Main heading (supports \n for line breaks)
 *    .subtext     Paragraph below the headline
 *    .ctaLabel    Primary button label
 *    .ctaPath     Primary button href
 *    .about       About section paragraph
 *
 *  homeStackBadges  string[]   Tech badges shown below the about text
 *  brand.name       string     Used in about section
 *  shapeTimeline    (shape-timeline.config.ts) drives the hero particle
 *                   morphs — each shape is fully formed at its `at` second.
 *
 *  flags (site.config.ts)
 *    .showParticleBackground  boolean
 *        true  = ParticleViewer renders (default)
 *        false = particle canvas is hidden
 *        NOTE: Strudel visualizer is a separate component. If you want to show
 *              it instead, set this to false and add <StrudelVisualizer /> below
 *              the {flags.showParticleBackground && ...} block. Do NOT import
 *              Strudel into particles.config.ts.
 *
 *  VOICE ORBS — a single white "Make your own orb videos" button next to the
 *  CTA opens a dropdown with the Blue / Orange orb toggles. Both popups can
 *  be open at once, side by side, bottom-right. Dropdown closes on outside
 *  click; orbs stay open independently of the dropdown.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout, TechBadge } from '@/components'
import VoiceOrb from '@/components/Voiceorb'
import { ParticleViewer } from '@/particles'
import { heroParticleConfig } from '@/particles/particles.config'
import { homePage, homeStackBadges, flags } from '@/config'
import { useIsMobile } from '@/hooks'

const ORB_ACCENT = { blue: '#61DAFF', orange: '#FF8C55' } as const

export default function Home() {
  const isMobile = useIsMobile(768)
  const [orbs, setOrbs] = useState<{ blue: boolean; orange: boolean }>({ blue: false, orange: false })
  const [menuOpen, setMenuOpen] = useState(false)

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
          color: on ? accent : 'var(--text-dim)',
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.02em',
          transition: 'background 0.12s, color 0.12s',
          textAlign: 'left',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = accent }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = on ? accent : 'var(--text-dim)' }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: accent, opacity: on ? 1 : 0.5,
            boxShadow: on ? `0 0 7px ${accent}` : 'none',
          }} />
          {variant === 'blue' ? 'Blue orb' : 'Orange orb'}
        </span>
        <span style={{
          fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em',
          color: on ? accent : 'var(--text-faint, #8a8a8a)', textTransform: 'uppercase',
        }}>
          {on ? 'On' : 'Off'}
        </span>
      </button>
    )
  }

  return (
    <Layout>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '0' : 'clamp(32px, 5vw, 64px)',
        alignItems: 'center',
        minHeight: isMobile ? 'auto' : 'calc(100vh - var(--nav-h) - 80px)',
        paddingTop: isMobile ? '24px' : '0',
      }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              marginBottom: '16px',
            }}>
              {homePage.eyebrow}
            </p>
            <h1 style={{
              fontSize: 'clamp(38px, 5.5vw, 68px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              color: 'var(--text)',
              margin: 0,
            }}>
              {homePage.headline.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </h1>
          </div>

          <p style={{
            fontSize: '15px',
            color: 'var(--text-muted)',
            lineHeight: 1.75,
            maxWidth: '420px',
            margin: 0,
          }}>
            {homePage.subtext}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to={homePage.ctaPath} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'var(--accent)',
              color: 'var(--bg)',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover, #ddd)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {homePage.ctaLabel}
            </Link>

            {/* "Make your own orb videos" — white button + dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover, #ddd)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
              >
                Make your own orb videos
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    transform: menuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.18s',
                  }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  {/* click-away backdrop */}
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 140 }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    zIndex: 150,
                    minWidth: '210px',
                    background: 'rgba(10,10,10,0.98)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '9px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                    padding: '6px 0',
                  }}>
                    <p style={{
                      fontSize: '9px', fontWeight: 600, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: 'var(--text-faint, #8a8a8a)',
                      padding: '6px 14px 8px', margin: 0,
                      borderBottom: '1px solid var(--border)',
                    }}>
                      Voice orbs
                    </p>
                    {orbRow('blue')}
                    {orbRow('orange')}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* About text */}
          <p style={{
            fontSize: '13px',
            color: 'var(--text-dim)',
            lineHeight: 1.8,
            maxWidth: '440px',
            margin: 0,
            borderLeft: '2px solid var(--border)',
            paddingLeft: '16px',
          }}>
            {homePage.about}
          </p>

          {/* Tech stack badges */}
          {homeStackBadges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {homeStackBadges.map(name => (
                <TechBadge key={name} name={name} />
              ))}
            </div>
          )}
        </div>

        {/* Right column - particle viewer */}
        <div style={{
          position: 'relative',
          height: isMobile ? '260px' : 'min(520px, 72vh)',
          marginTop: isMobile ? '24px' : '0',
        }}>
          {flags.showParticleBackground && (
            <ParticleViewer
              config={isMobile
                ? { ...heroParticleConfig, particleCount: 400 }
                : heroParticleConfig
              }
              style={{ width: '100%', height: '100%' }}
            />
          )}

          {/*
            To show the Strudel visualizer instead:
            1. Set flags.showParticleBackground = false in site.config.ts
            2. Import and render your StrudelVisualizer component here:

            {!flags.showParticleBackground && (
              <StrudelVisualizer style={{ width: '100%', height: '100%' }} />
            )}

            Do NOT put Strudel imports into particles.config.ts.
          */}
        </div>
      </div>

      {/* Voice orb popups — blue innermost, orange beside it when both open */}
      {orbs.blue && (
        <VoiceOrb
          variant="blue"
          offsetRight={24}
          onClose={() => setOrbs(o => ({ ...o, blue: false }))}
        />
      )}
      {orbs.orange && (
        <VoiceOrb
          variant="orange"
          offsetRight={orbs.blue ? 340 : 24}
          onClose={() => setOrbs(o => ({ ...o, orange: false }))}
        />
      )}
    </Layout>
  )
}