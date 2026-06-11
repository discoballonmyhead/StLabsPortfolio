import { Link } from 'react-router-dom'
import { Layout, TechBadge } from '@/components'
import { homePage, homeStackBadges, flags } from '@/config'
import { heroParticleConfig } from '@/particles/particles.config'
import ParticleViewer from '@/particles/ParticleViewer'
import { useIsMobile } from '@/hooks'

export default function Home() {
  const isMobile = useIsMobile(900)

  return (
    <Layout>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        minHeight: 'calc(100vh - var(--nav-h))',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '55% 45%',
        alignItems: 'center',
        gap: '0',
        paddingTop: isMobile ? '48px' : '0',
        // Increased paddingBottom shifts the vertically centered content upwards
        paddingBottom: isMobile ? '80px' : '8vh',
      }}>

        {/* Left — copy */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          paddingRight: isMobile ? '0' : '48px',
          zIndex: 1,
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#3a3a3a',
          }}>
            {homePage.eyebrow}
          </p>

          <h1 style={{
            // Increased min, fluid, and max font sizes
            fontSize: 'clamp(42px, 6.5vw, 76px)',
            fontWeight: 700,
            lineHeight: 1.05,
            color: '#f0f0f0',
            letterSpacing: '-0.03em',
            whiteSpace: 'pre-line',
            // Increased max width to accommodate the larger text
            maxWidth: '600px',
          }}>
            {homePage.headline}
          </h1>

          <p style={{
            fontSize: '14px',
            color: '#888',
            lineHeight: 1.75,
            maxWidth: '380px',
          }}>
            {homePage.subtext}
          </p>

          <Link
            to={homePage.ctaPath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'flex-start',
              fontSize: '13px',
              fontWeight: 500,
              color: '#f0f0f0',
              background: 'transparent',
              border: '1px solid #2a2a2a',
              padding: '9px 20px',
              borderRadius: '5px',
              letterSpacing: '0.02em',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#555'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.color = '#f0f0f0'
            }}
          >
            {homePage.ctaLabel}
            <span style={{ opacity: 0.5 }}>&#8594;</span>
          </Link>
        </div>

        {/* Right — particle canvas — no border, blends into page */}
        <div style={{
          position: 'relative',
          height: isMobile ? '260px' : 'min(520px, 72vh)',
          marginTop: isMobile ? '24px' : '0',
        }}>
          {flags.showParticleBackground && (
            <ParticleViewer
              config={isMobile
                ? { ...heroParticleConfig, particleCount: 1200 }
                : heroParticleConfig
              }
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>

      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #131313' }} />

      {/* ── About ────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 0 80px' }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#3a3a3a',
          marginBottom: '18px',
        }}>
          About
        </p>
        <p style={{
          fontSize: '15px',
          color: '#999',
          lineHeight: 1.85,
          maxWidth: '520px',
        }}>
          {homePage.about}
        </p>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #131313' }} />

      {/* ── Stack ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 0 88px' }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#3a3a3a',
          marginBottom: '18px',
        }}>
          Stack
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {homeStackBadges.map(name => (
            <TechBadge key={name} name={name} />
          ))}
        </div>
      </section>

    </Layout>
  )
}