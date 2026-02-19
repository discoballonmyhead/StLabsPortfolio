import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const s = {
  page: {
    minHeight: '100vh',
    background: '#050a05',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '11px',
    color: '#2a5c2a',
    letterSpacing: '0.08em',
  },
  pulse: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#3a8a3a',
    boxShadow: '0 0 0 0 rgba(58,138,58,0.4)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  statusBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statusCode: {
    fontSize: '11px',
    color: '#2a5c2a',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 'clamp(32px, 6vw, 52px)',
    fontWeight: '400',
    color: '#4ade80',
    letterSpacing: '-0.02em',
    lineHeight: '1.1',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  subText: {
    fontSize: '13px',
    color: '#2a6a3a',
    lineHeight: '1.7',
  },
  logBlock: {
    background: '#070d07',
    border: '1px solid #1a2e1a',
    borderRadius: '6px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  logLine: {
    fontSize: '12px',
    color: '#2a5c2a',
    letterSpacing: '0.03em',
    lineHeight: '1.5',
  },
  logHighlight: {
    color: '#4ade80',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#050a05',
    background: '#4ade80',
    padding: '10px 20px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    transition: 'opacity 0.15s',
    display: 'inline-block',
  },
  btnSecondary: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#2a6a3a',
    border: '1px solid #1a3a1a',
    padding: '10px 20px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    transition: 'border-color 0.15s, color 0.15s',
    display: 'inline-block',
  },
  footer: {
    fontSize: '11px',
    color: '#1a3a1a',
    letterSpacing: '0.06em',
  },
}

// Inject keyframes
const styleTag = document.createElement('style')
styleTag.textContent = `
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(58,138,58,0.5); }
    50% { box-shadow: 0 0 0 6px rgba(58,138,58,0); }
  }
`
document.head.appendChild(styleTag)

export default function ProjectKinAuthSuccess() {
  const [ts] = useState(() => new Date().toISOString())

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.topBar}>
          <div style={s.pulse} />
          <span>AUTH SESSION ACTIVE</span>
        </div>

        <div style={s.statusBlock}>
          <p style={s.statusCode}>200 · Authentication Successful</p>
          <h1 style={s.heading}>Access<br />Granted.</h1>
          <p style={s.subText}>
            Identity verified. You can return to the application — this window will close automatically.
          </p>
        </div>

        <div style={s.logBlock}>
          <p style={s.logLine}><span style={s.logHighlight}>✓</span> oauth token validated</p>
          <p style={s.logLine}><span style={s.logHighlight}>✓</span> session created</p>
          <p style={s.logLine}><span style={s.logHighlight}>✓</span> permissions granted</p>
          <p style={{ ...s.logLine, color: '#1e3e1e', marginTop: '4px' }}>timestamp: {ts}</p>
        </div>

        <div style={s.actions}>
          <a href="#" style={s.btnPrimary}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            Open App
          </a>
          <Link to="/projects/authapp" style={s.btnSecondary}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a6a3a'; e.currentTarget.style.color = '#4ade80' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a3a1a'; e.currentTarget.style.color = '#2a6a3a' }}>
            Back
          </Link>
        </div>

        <p style={s.footer}>AUTH APP · SECURE SESSION</p>

      </div>
    </div>
  )
}
