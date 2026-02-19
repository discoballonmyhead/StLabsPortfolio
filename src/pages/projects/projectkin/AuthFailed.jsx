import { Link } from 'react-router-dom'

const s = {
  page: {
    minHeight: '100vh',
    background: '#0a0505',
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
    color: '#5c2a2a',
    letterSpacing: '0.08em',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#8a3a3a',
  },
  statusBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statusCode: {
    fontSize: '11px',
    color: '#6a2a2a',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 'clamp(32px, 6vw, 52px)',
    fontWeight: '400',
    color: '#f87171',
    letterSpacing: '-0.02em',
    lineHeight: '1.1',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  subText: {
    fontSize: '13px',
    color: '#6a3a3a',
    lineHeight: '1.7',
  },
  errorBlock: {
    background: '#0d0505',
    border: '1px solid #2e1a1a',
    borderRadius: '6px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  errorLine: {
    fontSize: '12px',
    color: '#5a2a2a',
    letterSpacing: '0.03em',
    lineHeight: '1.5',
  },
  errorHighlight: { color: '#f87171' },
  errorDim: { color: '#3a1a1a', marginTop: '4px' },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  btnRetry: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#0a0505',
    background: '#f87171',
    padding: '10px 20px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    transition: 'opacity 0.15s',
    display: 'inline-block',
    cursor: 'pointer',
  },
  btnBack: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6a3a3a',
    border: '1px solid #2e1a1a',
    padding: '10px 20px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    transition: 'border-color 0.15s, color 0.15s',
    display: 'inline-block',
  },
  footer: {
    fontSize: '11px',
    color: '#2e1a1a',
    letterSpacing: '0.06em',
  },
}

export default function AuthFailed() {
  const ts = new Date().toISOString()

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.topBar}>
          <div style={s.dot} />
          <span>AUTH SESSION TERMINATED</span>
        </div>

        <div style={s.statusBlock}>
          <p style={s.statusCode}>401 · Authentication Failed</p>
          <h1 style={s.heading}>Access<br />Denied.</h1>
          <p style={s.subText}>
            The authentication attempt could not be completed. This may be due to an
            expired session, cancelled request, or invalid credentials.
          </p>
        </div>

        <div style={s.errorBlock}>
          <p style={s.errorLine}><span style={s.errorHighlight}>✕</span> token exchange failed</p>
          <p style={s.errorLine}><span style={s.errorHighlight}>✕</span> session not created</p>
          <p style={s.errorLine}><span style={s.errorHighlight}>✕</span> access revoked</p>
          <p style={{ ...s.errorLine, ...s.errorDim }}>timestamp: {ts}</p>
        </div>

        <div style={s.actions}>
          <button
            style={s.btnRetry}
            onClick={() => window.history.back()}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            Try Again
          </button>
          <Link to="/projects/authapp" style={s.btnBack}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#5a2a2a';e.currentTarget.style.color='#f87171'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#2e1a1a';e.currentTarget.style.color='#6a3a3a'}}>
            Back
          </Link>
        </div>

        <p style={s.footer}>AUTH APP · SESSION ENDED</p>

      </div>
    </div>
  )
}
