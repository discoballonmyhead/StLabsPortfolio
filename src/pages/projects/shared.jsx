import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'

// ─── Shared styles for STLABSPORTFOLIO-style app pages (calculator, emailapp) ───
export const appStyles = {
  page: { display: 'flex', flexDirection: 'column', gap: '48px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '36px' },
  bodyText: { fontSize: '14px', color: '#777', lineHeight: '1.8' },
  featureList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' },
  featureItem: { fontSize: '14px', color: '#777', paddingLeft: '18px', position: 'relative', lineHeight: '1.6' },
  dash: { position: 'absolute', left: 0, color: '#333' },
  storeRow: { display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' },
  storeBtn: {
    fontSize: '13px', fontWeight: '500', color: '#777',
    border: '1px solid #2a2a2a', background: '#111',
    padding: '8px 16px', borderRadius: '6px',
    transition: 'border-color 0.15s, color 0.15s', display: 'inline-block',
  },
  policyLink: {
    display: 'inline-block', marginTop: '14px', fontSize: '13px',
    fontWeight: '500', color: '#777', borderBottom: '1px solid #2a2a2a',
    paddingBottom: '2px', transition: 'color 0.15s, border-color 0.15s',
  },
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────
export function Breadcrumb({ items }) {
  const s = {
    nav: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px', color: '#444' },
    link: { color: '#555', transition: 'color 0.15s' },
    sep: { color: '#2a2a2a' },
    current: { color: '#777' },
  }
  return (
    <nav style={s.nav}>
      {items.map(([label, path], i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {i > 0 && <span style={s.sep}>/</span>}
          {path
            ? <Link to={path} style={s.link} onMouseEnter={e => e.target.style.color = '#f0f0f0'} onMouseLeave={e => e.target.style.color = '#555'}>{label}</Link>
            : <span style={s.current}>{label}</span>
          }
        </span>
      ))}
    </nav>
  )
}


export function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e' }} />
}

export function SectionLabel({ children }) {
  return <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '14px' }}>{children}</p>
}

// ─── Shared Privacy Policy layout ────────────────────────────────────────
export function PrivacyLayout({ appName, appPath, updated, contact, androidPermission, extraSections }) {
  const s = {
    page: { display: 'flex', flexDirection: 'column', gap: '40px' },
    title: { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '300', color: '#f0f0f0', letterSpacing: '-0.025em', marginBottom: '10px' },
    meta: { fontSize: '12px', color: '#555', letterSpacing: '0.02em' },
    notice: { padding: '16px 20px', background: '#111', border: '1px solid #222', borderRadius: '6px', fontSize: '13px', color: '#666', lineHeight: '1.6' },
    sections: { display: 'flex', flexDirection: 'column' },
    section: { padding: '26px 0', borderBottom: '1px solid #1e1e1e' },
    sLabel: { fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '10px' },
    text: { fontSize: '14px', color: '#777', lineHeight: '1.8', maxWidth: '600px' },
    ul: { listStyle: 'none', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' },
    li: { fontSize: '14px', color: '#777', paddingLeft: '16px', position: 'relative', lineHeight: '1.6' },
    code: { fontFamily: 'monospace', fontSize: '12px', background: '#141414', border: '1px solid #222', padding: '1px 6px', borderRadius: '3px', color: '#888' },
    emailLink: { color: '#777', borderBottom: '1px solid #2a2a2a', paddingBottom: '1px', transition: 'color 0.15s' },
    backLink: { fontSize: '13px', fontWeight: '500', color: '#555', transition: 'color 0.15s' },
  }

  const sections = [
    {
      label: '1. About',
      content: <p style={s.text}>{appName} is a mobile application available on Android and iOS. All processing is performed locally on the device.</p>
    },
    {
      label: '2. Data Collection',
      content: <>
        <p style={s.text}>No data is collected, stored, transmitted, or shared. This includes:</p>
        <ul style={s.ul}>
          {['No account or registration', 'No analytics or crash reporting', 'No advertising identifiers', 'No location data', 'No device identifiers', 'No user data sent off-device'].map(item => (
            <li key={item} style={s.li}><span style={{ position: 'absolute', left: 0, color: '#333' }}>—</span>{item}</li>
          ))}
        </ul>
      </>
    },
    {
      label: '3. Internet Access',
      content: <p style={s.text}>This app does not use an internet connection. No data is sent to any server.</p>
    },
    {
      label: '4. Third-Party Services',
      content: <p style={s.text}>No third-party SDKs, analytics tools, advertising networks, or external services are integrated.</p>
    },
    androidPermission && {
      label: '5. Permissions',
      content: <p style={s.text}>On Android, only the <code style={s.code}>VIBRATE</code> permission is declared, used for optional haptic feedback. No user dialog is shown and no data is collected through this permission. No permissions are requested on iOS.</p>
    },
    ...(extraSections || []),
    {
      label: `${androidPermission ? 6 : 5}. Children`,
      content: <p style={s.text}>This app is suitable for all ages. No data is collected from any user, including children under 13.</p>
    },
    {
      label: `${androidPermission ? 7 : 6}. Changes`,
      content: <p style={s.text}>Any updates to this policy will be posted at this URL with a revised date.</p>
    },
    {
      label: `${androidPermission ? 8 : 7}. Contact`,
      content: <p style={s.text}>Questions: <a href={`mailto:${contact}`} style={s.emailLink} onMouseEnter={e => e.target.style.color = '#f0f0f0'} onMouseLeave={e => e.target.style.color = '#777'}>{contact}</a></p>
    },
  ].filter(Boolean)

  const crumbs = [['Home', '/'], ['Projects', '/projects'], [appName, appPath], ['Privacy Policy', null]]

  return (
    <Layout>
      <div style={s.page}>
        <Breadcrumb items={crumbs} />
        <header>
          <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '14px' }}>Legal · {appName}</p>
          <h1 style={s.title}>Privacy Policy</h1>
          <p style={s.meta}>Last updated: {updated}</p>
        </header>
        <div style={s.notice}>
          <strong style={{ color: '#999' }}>Summary:</strong> This app collects no data. It runs entirely on-device.
        </div>
        <div style={s.sections}>
          {sections.map((sec, i) => (
            <div key={i} style={{ ...s.section, ...(i === sections.length - 1 ? { borderBottom: 'none' } : {}) }}>
              <p style={s.sLabel}>{sec.label}</p>
              {sec.content}
            </div>
          ))}
        </div>
        <Link to={appPath} style={s.backLink} onMouseEnter={e => e.target.style.color = '#f0f0f0'} onMouseLeave={e => e.target.style.color = '#555'}>
          Back to {appName}
        </Link>
      </div>
    </Layout>
  )
}


const statusStyles = {
  Live: { color: '#4a9a5a', background: 'rgba(74,154,90,0.12)', border: '1px solid rgba(74,154,90,0.25)' },
  'In Development': { color: '#b8a840', background: 'rgba(184,168,64,0.12)', border: '1px solid rgba(184,168,64,0.25)' },
  Paused: { color: '#8b7fc7', background: 'rgba(139,127,199,0.12)', border: '1px solid rgba(139,127,199,0.25)' },
  Dead: { color: '#555', background: 'rgba(80,80,80,0.12)', border: '1px solid rgba(80,80,80,0.25)' },
  Beta: { color: '#4a8aaa', background: 'rgba(74,138,170,0.12)', border: '1px solid rgba(74,138,170,0.25)' },
  Archived: { color: '#664433', background: 'rgba(102,68,51,0.12)', border: '1px solid rgba(102,68,51,0.25)' },
}

export function AppHeader({ label, title, tagline, tags, statusTag }) {
  const baseTag = {
    fontSize: '11px', fontWeight: '500', letterSpacing: '0.08em',
    textTransform: 'uppercase', padding: '4px 10px', borderRadius: '4px',
  }
  const plainTag = {
    ...baseTag,
    color: '#555', border: '1px solid #222', background: '#111',
  }

  return (
    <header style={{ paddingTop: '8px' }}>
      <p style={{ fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '14px' }}>{label}</p>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '300', color: '#f0f0f0', letterSpacing: '-0.025em', marginBottom: '10px' }}>{title}</h1>
      <p style={{ fontSize: '15px', color: '#777', marginBottom: '18px' }}>{tagline}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {tags.map(t => (
          <span key={t} style={t === statusTag
            ? { ...baseTag, ...(statusStyles[t] || statusStyles['Dead']) }
            : plainTag
          }>{t}</span>
        ))}
      </div>
    </header>
  )
}