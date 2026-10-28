/**
 * StatusPage.tsx
 * src/features/status-pages/StatusPage.tsx
 *
 * The hosted confirmation screens: email verified, link expired, password
 * changed, and so on. One component, driven by `statusPages[type]` in
 * site.config.ts.
 *
 * ─── BACKGROUND ──────────────────────────────────────────────────────────────
 *
 * This used to render <ParticleViewer config={heroParticleConfig} />, which is
 * why heroParticleConfig had been locked to shapes: ['wave'] and froze the
 * home page. It now renders WaveField, which is purpose-built for this and
 * shares nothing with the hero.
 *
 * The wave takes its colour from the status type, so a verified screen reads
 * green and an expired link reads red without the card having to shout. A
 * project-level `theme.accent` overrides it, so a confirmation screen can look
 * like the app that sent the visitor here.
 *
 * ─── RESPONSIVE ──────────────────────────────────────────────────────────────
 *
 * WaveField measures its own canvas, so there is no breakpoint maths here.
 * On a portrait phone it rotates the wave to run down the screen instead of
 * leaving a thin band across the middle.
 *
 * The one thing this file decides is the travelling crest: on for the screens
 * where something is actually in transit (email on its way, reset link sent),
 * off for the plain auth results. The list lives in statusWaveConfig.pulseOn.
 *
 * On a phone the card also drops the blur. iOS Safari composites a
 * backdrop-filter over a live canvas on the CPU, which turns a cheap animation
 * into a janky one; a slightly more opaque panel looks the same and scrolls
 * properly.
 */

import WaveField from '../../particles/WaveField'
import { statusWaveConfig } from '../../particles/particles.config'
import { useSystemTheme } from '../../hooks/useSystemTheme'
import { useIsMobile } from '@/hooks'
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
  const isMobile = useIsMobile(768)

  const project = projectSlug ? projects.find(p => p.slug === projectSlug) : undefined

  // Accent resolution, most specific first:
  //
  //   1. the project's own theme.accent, so the screen matches the app that
  //      sent the visitor here
  //   2. statusPages[type].accent, if your StatusPageConfig defines one
  //   3. statusWaveConfig.accents[type], which always does
  //
  // Both config reads go through a cast rather than a direct property access.
  // StatusPageConfig does not necessarily declare `accent`, and this component
  // should not force a config change to compile.
  const projectAccent = (project as { theme?: { accent?: string } } | undefined)?.theme?.accent
  const configAccent = (config as { accent?: string }).accent
  const accent =
    projectAccent ??
    configAccent ??
    statusWaveConfig.accents[type] ??
    statusWaveConfig.fallbackAccent

  const pulse = (statusWaveConfig.pulseOn as readonly string[]).includes(type)

  const s = {
    page: {
      position: 'relative' as const,
      width: '100%',
      // dvh accounts for mobile browser chrome; the vh line is the fallback.
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 24px)',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      overflow: 'hidden' as const,
      background: isDark ? '#000000' : '#FAFAFA',
    },
    waveWrap: {
      position: 'fixed' as const,
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none' as const,
    },
    card: {
      position: 'relative' as const,
      zIndex: 10,
      width: '100%',
      maxWidth: '440px',
      background: isDark
        ? (isMobile ? 'rgba(10,10,10,0.92)' : 'rgba(10,10,10,0.75)')
        : (isMobile ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)'),
      // Blur only on desktop, see the note at the top of the file.
      ...(isMobile
        ? {}
        : {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }),
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '16px',
      padding: 'clamp(24px, 6vw, 40px)',
      boxSizing: 'border-box' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      boxShadow: isDark
        ? '0 25px 50px -12px rgba(0,0,0,0.8)'
        : '0 25px 50px -12px rgba(0,0,0,0.15)',
    },
    accentRule: {
      height: '2px',
      width: '38px',
      borderRadius: '2px',
      background: accent,
      opacity: 0.85,
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
      color: isDark ? 'rgba(255,255,255,0.7)' : '#4B5563',
      lineHeight: 1.6,
      margin: 0,
    },
    footer: {
      marginTop: '16px',
      paddingTop: '24px',
      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      fontSize: '11px',
      color: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF',
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      display: 'flex',
      justifyContent: 'space-between' as const,
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap' as const,
    },
    brandName: {
      fontWeight: 500,
      color: isDark ? 'rgba(255,255,255,0.6)' : '#6B7280',
    },
  }

  return (
    <div style={{ ...s.page, minHeight: '100dvh' }}>
      <div style={s.waveWrap}>
        <WaveField
          accent={accent}
          isDark={isDark}
          orientation={statusWaveConfig.orientation}
          pulse={pulse}
          density={statusWaveConfig.density}
        />
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={s.accentRule} />
          <h1 style={s.heading}>{config.headline.replace(/\n/g, ' ')}</h1>
          <p style={s.sub}>{config.body}</p>
        </div>

        <div style={s.footer}>
          <span style={s.brandName}>{brand.shortName}</span>
          <span>
            {project ? `${project.name} · ${config.footer}` : config.footer}
          </span>
        </div>
      </div>
    </div>
  )
}