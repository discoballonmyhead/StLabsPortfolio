import ParticleViewer from '../../particles/ParticleViewer'
import { heroParticleConfig } from '../../particles/particles.config'
import { useSystemTheme } from '../../hooks/useSystemTheme'
import { projects, statusPages, brand } from '@/config'
import type { StatusPageType } from '@/config'

interface Props {
  type: StatusPageType
  projectSlug?: string
}

export default function StatusPage({ type, projectSlug }: Props) {
  const config = statusPages[type]
  const theme = useSystemTheme()
  const isDark = theme === 'dark'

  const project = projectSlug ? projects.find((p) => p.slug === projectSlug) : undefined

  const s = {
    page: {
      position: 'relative' as const,
      width: '100%',

      // dvh accounts for mobile browser toolbars; falls back to 100vh above
      ...({ minHeight: '100dvh' } as const),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 24px)',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      overflow: 'hidden' as const,
      background: isDark ? '#000000' : '#FAFAFA',
    },
    particlesWrap: {
      // fixed + inset 0 = always covers the full viewport on every device
      position: 'fixed' as const,
      inset: 0,
      width: '100vw',
      height: '100dvh',
      zIndex: 0,
      pointerEvents: 'none' as const,
    },
    card: {
      position: 'relative' as const,
      zIndex: 10,
      width: '100%',
      maxWidth: '440px',
      background: isDark ? 'rgba(10, 10, 10, 0.75)' : 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
      borderRadius: '16px',
      padding: 'clamp(24px, 6vw, 40px)',
      boxSizing: 'border-box' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      boxShadow: isDark
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
        : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    },
    heading: {
      fontSize: 'clamp(28px, 6vw, 36px)',
      fontWeight: 600,
      color: isDark ? '#FFFFFF' : '#111827',
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
      margin: 0,
    },
    sub: {
      fontSize: '15px',
      color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#4B5563',
      lineHeight: 1.6,
      margin: 0,
    },
    footer: {
      marginTop: '16px',
      paddingTop: '24px',
      borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
      fontSize: '11px',
      color: isDark ? 'rgba(255, 255, 255, 0.4)' : '#9CA3AF',
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      display: 'flex',
      justifyContent: 'space-between' as const,
      alignItems: 'center',
      gap: '12px',
    },
    brandName: {
      fontWeight: 500,
      color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#6B7280',
    },
  }

  return (
    <div style={s.page}>
      {/* Force whatever ParticleViewer renders (wrapper div / canvas) to fill the layer */}
      <style>{`
        .status-particles > *,
        .status-particles canvas {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: block;
        }
      `}</style>

      <div className="status-particles" style={s.particlesWrap}>
        <ParticleViewer config={heroParticleConfig} />
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1 style={s.heading}>{config.headline.replace('\n', ' ')}</h1>
          <p style={s.sub}>{config.body}</p>
        </div>

        <div style={s.footer}>
          <span style={s.brandName}>{brand.shortName}</span>
          {project ? (
            <span>
              {project.name} &middot; {config.footer}
            </span>
          ) : (
            <span>{config.footer}</span>
          )}
        </div>
      </div>
    </div>
  )
}