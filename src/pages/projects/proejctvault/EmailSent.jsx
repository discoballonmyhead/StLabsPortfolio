import { Link } from 'react-router-dom'

const s = {
  page: {
    minHeight: '100vh',
    background: '#09080a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    gap: '36px',
  },
  envelopeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  line: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(to right, transparent, #2a2040)',
  },
  lineRight: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(to left, transparent, #2a2040)',
  },
  envelopeBox: {
    width: '48px',
    height: '36px',
    border: '1px solid #2a2040',
    borderRadius: '3px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0d14',
  },
  envelopeFlap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    borderBottom: '1px solid #2a2040',
    background: 'transparent',
    clipPath: 'polygon(0 0, 50% 60%, 100% 0)',
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#7c6fcd',
    position: 'absolute',
    bottom: '8px',
  },
  heading: {
    fontSize: 'clamp(30px, 5vw, 46px)',
    fontWeight: '300',
    color: '#d4cef0',
    letterSpacing: '-0.025em',
    lineHeight: '1.15',
  },
  headingAccent: {
    color: '#7c6fcd',
  },
  subText: {
    fontSize: '14px',
    color: '#4a4560',
    lineHeight: '1.75',
  },
  detailBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    border: '1px solid #1a1828',
    borderRadius: '6px',
    background: '#0c0b12',
    overflow: 'hidden',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 16px',
    borderBottom: '1px solid #1a1828',
    fontSize: '12px',
  },
  detailRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 16px',
    fontSize: '12px',
  },
  detailKey: { color: '#332e4a', letterSpacing: '0.06em', textTransform: 'uppercase' },
  detailVal: { color: '#5a5475' },
  detailValGood: { color: '#7c6fcd' },
  actions: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  btnDone: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#09080a',
    background: '#7c6fcd',
    padding: '10px 22px',
    borderRadius: '5px',
    letterSpacing: '0.02em',
    transition: 'opacity 0.15s',
    display: 'inline-block',
  },
  btnBack: {
    fontSize: '13px',
    fontWeight: '400',
    color: '#332e4a',
    border: '1px solid #1a1828',
    padding: '10px 22px',
    borderRadius: '5px',
    letterSpacing: '0.02em',
    transition: 'border-color 0.15s, color 0.15s',
    display: 'inline-block',
  },
  footer: {
    fontSize: '11px',
    color: '#1e1b2e',
    letterSpacing: '0.06em',
  },
}

export default function EmailSent() {
  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Envelope graphic */}
        <div style={s.envelopeRow}>
          <div style={s.line} />
          <div style={s.envelopeBox}>
            <div style={s.envelopeFlap} />
            <div style={s.dot} />
          </div>
          <div style={s.lineRight} />
        </div>

        {/* Heading */}
        <div>
          <h1 style={s.heading}>
            Message<br />
            <span style={s.headingAccent}>delivered.</span>
          </h1>
        </div>

        <p style={s.subText}>
          The email has been sent and is on its way.
          You can return to the inbox or compose another message.
        </p>

        {/* Detail rows */}
        <div style={s.detailBlock}>
          <div style={s.detailRow}>
            <span style={s.detailKey}>Status</span>
            <span style={s.detailValGood}>Sent</span>
          </div>
          <div style={s.detailRow}>
            <span style={s.detailKey}>Date</span>
            <span style={s.detailVal}>{date}</span>
          </div>
          <div style={s.detailRowLast}>
            <span style={s.detailKey}>Time</span>
            <span style={s.detailVal}>{ts}</span>
          </div>
        </div>

        <div style={s.actions}>
          <a href="#" style={s.btnDone}
            onMouseEnter={e=>e.currentTarget.style.opacity='0.85'}
            onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
            Go to Inbox
          </a>
          <Link to="/projects/emailapp" style={s.btnBack}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#332e4a';e.currentTarget.style.color='#7c6fcd'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#1a1828';e.currentTarget.style.color='#332e4a'}}>
            Back
          </Link>
        </div>

        <p style={s.footer}>EMAIL APP</p>

      </div>
    </div>
  )
}
