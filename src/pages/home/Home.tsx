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
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { Link } from 'react-router-dom'
import { Layout, TechBadge } from '@/components'
import { ParticleViewer } from '@/particles'
import { heroParticleConfig } from '@/particles/particles.config'
import { homePage, homeStackBadges, flags } from '@/config'
import { useIsMobile } from '@/hooks'

export default function Home() {
  const isMobile = useIsMobile(768)

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
              color: '#555',
              marginBottom: '16px',
            }}>
              {homePage.eyebrow}
            </p>
            <h1 style={{
              fontSize: 'clamp(38px, 5.5vw, 68px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              color: '#f2f2f2',
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
            color: '#666',
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
              background: '#f2f2f2',
              color: '#080808',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#ddd')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f2f2f2')}
            >
              {homePage.ctaLabel}
            </Link>
          </div>

          {/* About text */}
          <p style={{
            fontSize: '13px',
            color: '#444',
            lineHeight: 1.8,
            maxWidth: '440px',
            margin: 0,
            borderLeft: '2px solid #1e1e1e',
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
    </Layout>
  )
}