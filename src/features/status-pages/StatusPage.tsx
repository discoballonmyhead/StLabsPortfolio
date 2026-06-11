import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { projects, statusPages, brand } from '@/config'
import type { StatusPageType } from '@/config'

interface Props {
  type:         StatusPageType
  projectSlug?: string
}

// Derive a foreground-dimmed version of the accent colour for secondary text
function dimColor(hex: string): string {
  // Just darken the hue towards #333 area
  return hex.replace(/[0-9a-f]{2}/gi, m => {
    const val = Math.floor(parseInt(m, 16) * 0.35)
    return val.toString(16).padStart(2, '0')
  })
}

function isSuccess(type: StatusPageType) {
  return type === 'auth-success' || type === 'email-confirmed'
}

export default function StatusPage({ type, projectSlug }: Props) {
  const config  = statusPages[type]
  const project = projectSlug ? projects.find(p => p.slug === projectSlug) : undefined
  const [ts]    = useState(() => new Date().toISOString())
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setPulse(v => !v), 1200)
    return () => clearInterval(id)
  }, [])

  const success    = isSuccess(type)
  const accent     = config.accent
  const dimAccent  = dimColor(accent)
  const borderCol  = `${accent}18`   // very faint

  const s = {
    page: {
      minHeight:       '100vh',
      background:      config.bg,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 24px)',
      fontFamily:      'var(--font-mono)',
    } as React.CSSProperties,
    card: {
      width:           '100%',
      maxWidth:        '480px',
      display:         'flex',
      flexDirection:   'column' as const,
      gap:             '32px',
    },
    topBar: {
      display:         'flex',
      alignItems:      'center',
      gap:             '10px',
      fontSize:        '11px',
      color:           dimAccent,
      letterSpacing:   '0.09em',
    },
    dot: {
      width:           '8px',
      height:          '8px',
      borderRadius:    '50%',
      background:      accent,
      flexShrink:      0,
      transition:      'box-shadow 0.6s',
      boxShadow:       success
        ? `0 0 0 ${pulse ? '5px' : '0px'} ${accent}30`
        : 'none',
    } as React.CSSProperties,
    statusCode: {
      fontSize:        '11px',
      color:           dimAccent,
      letterSpacing:   '0.12em',
      textTransform:   'uppercase' as const,
    },
    heading: {
      fontSize:        'clamp(32px, 7vw, 52px)',
      fontWeight:      400,
      color:           accent,
      letterSpacing:   '-0.02em',
      lineHeight:      1.1,
      whiteSpace:      'pre-line' as const,
    },
    sub: {
      fontSize:        '13px',
      color:           dimAccent,
      lineHeight:      1.7,
    },
    logBlock: {
      background:      `${config.bg}aa`,
      border:          `1px solid ${borderCol}`,
      borderRadius:    'var(--radius)',
      padding:         '16px 20px',
      display:         'flex',
      flexDirection:   'column' as const,
      gap:             '6px',
    },
    logLine: {
      fontSize:        '12px',
      color:           dimAccent,
      letterSpacing:   '0.03em',
      lineHeight:      1.5,
    },
    logHighlight: {
      color:           accent,
      marginRight:     '6px',
    },
    actions: {
      display:         'flex',
      gap:             '12px',
      flexWrap:        'wrap' as const,
    },
    btnPrimary: {
      fontSize:        '12px',
      fontWeight:      500,
      color:           config.bg,
      background:      accent,
      padding:         '10px 20px',
      borderRadius:    '4px',
      letterSpacing:   '0.04em',
      textTransform:   'uppercase' as const,
      display:         'inline-block',
      transition:      'opacity 0.15s',
      cursor:          'pointer',
      border:          'none',
    } as React.CSSProperties,
    btnSecondary: {
      fontSize:        '12px',
      fontWeight:      500,
      color:           dimAccent,
      border:          `1px solid ${borderCol}`,
      padding:         '10px 20px',
      borderRadius:    '4px',
      letterSpacing:   '0.04em',
      textTransform:   'uppercase' as const,
      display:         'inline-block',
      transition:      'border-color 0.15s, color 0.15s',
    } as React.CSSProperties,
    footer: {
      fontSize:        '11px',
      color:           dimAccent,
      letterSpacing:   '0.07em',
      textTransform:   'uppercase' as const,
      display:         'flex',
      justifyContent:  'space-between' as const,
      alignItems:      'center',
    },
    brandName: {
      fontSize:        '11px',
      color:           `${dimAccent}80`,
      letterSpacing:   '0.07em',
    },
  }

  const tick = success ? '&#10003;' : '&#10005;'

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Top bar */}
        <div style={s.topBar}>
          <div style={s.dot} />
          <span>
            {config.statusCode
              ? `${config.statusCode} · ${config.statusLabel}`
              : config.statusLabel}
          </span>
        </div>

        {/* Heading block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={s.heading}>{config.headline}</h1>
          <p style={s.sub}>{config.body}</p>
        </div>

        {/* Log block */}
        <div style={s.logBlock}>
          {config.logLines.map((line, i) => (
            <p key={i} style={s.logLine}>
              <span style={s.logHighlight} dangerouslySetInnerHTML={{ __html: tick }} />
              {line}
            </p>
          ))}
          <p style={{ ...s.logLine, color: `${dimAccent}60`, marginTop: '4px' }}>
            timestamp: {ts}
          </p>
        </div>

        {/* Actions */}
        <div style={s.actions}>
          {type === 'auth-failed' ? (
            <button
              style={s.btnPrimary}
              onClick={() => window.history.back()}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {config.primaryCta.label}
            </button>
          ) : (
            <a
              href={config.primaryCta.href}
              style={s.btnPrimary}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {config.primaryCta.label}
            </a>
          )}

          <Link
            to={config.secondaryCta.path}
            style={s.btnSecondary}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = accent + '40'
              e.currentTarget.style.color = accent
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = borderCol
              e.currentTarget.style.color = dimAccent
            }}
          >
            {config.secondaryCta.label}
          </Link>
        </div>

        {/* Footer: studio brand + app name */}
        <div style={s.footer}>
          <span style={s.brandName}>{brand.shortName}</span>
          {project && (
            <span style={{ ...s.brandName }}>
              {project.name.toUpperCase()} &middot; {config.footer}
            </span>
          )}
        </div>

      </div>
    </div>
  )
}
