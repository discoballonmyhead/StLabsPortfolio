import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const projects = [
  {
    slug: 'calculator',
    name: 'Calculator',
    tagline: 'A clean, minimal calculator for Android and iOS.',
    platform: 'Android',
    status: 'Live',
    year: '2026',
    tech: ['Flutter', 'Dart'],
  },
  {
    slug: 'projectkin',
    name: 'Project Kin',
    tagline: 'Social media application to reforge your attention span',
    platform: 'Android · iOS',
    status: 'In Development',
    year: '2025',
    tech: ['Flutter', 'Dart', 'Supabase'],
  },
  {
    slug: 'projectvault',
    name: 'Project Vault',
    tagline: 'Cryptography (Not Crypto) related app',
    platform: 'Android · iOS',
    status: 'Paused',
    year: '2025',
    tech: ['Flutter', 'Dart'],
  },
  {
    slug: 'projecttamer',
    name: 'Project Tamer',
    tagline: '2d Sprite art monster tamer game on the web',
    platform: 'Android · iOS',
    status: 'In Development',
    year: '2026',
    tech: ['Phaser', 'JavaScript', 'Tiled'],
  },
]


const statusStyles = {
  Live: { color: '#4a9a5a', background: 'rgba(74,154,90,0.12)', border: '1px solid rgba(74,154,90,0.25)' },
  'In Development': { color: '#b8a840', background: 'rgba(184,168,64,0.12)', border: '1px solid rgba(184,168,64,0.25)' },
  Paused: { color: '#8b7fc7', background: 'rgba(139,127,199,0.12)', border: '1px solid rgba(139,127,199,0.25)' },
  Dead: { color: '#555', background: 'rgba(80,80,80,0.12)', border: '1px solid rgba(80,80,80,0.25)' },
  Beta: { color: '#4a8aaa', background: 'rgba(74,138,170,0.12)', border: '1px solid rgba(74,138,170,0.25)' },
  Archived: { color: '#664433', background: 'rgba(102,68,51,0.12)', border: '1px solid rgba(102,68,51,0.25)' },
}

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: '48px' },
  header: { paddingTop: '20px' },
  label: { fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '14px' },
  title: { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '300', color: '#f0f0f0', letterSpacing: '-0.025em' },
  list: { display: 'flex', flexDirection: 'column', borderTop: '1px solid #1e1e1e' },
  item: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '22px 0', borderBottom: '1px solid #1e1e1e',
    transition: 'opacity 0.15s', gap: '16px', cursor: 'pointer',
  },
  itemLeft: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  itemName: { fontSize: '16px', fontWeight: '500', color: '#f0f0f0', letterSpacing: '-0.01em' },
  itemTagline: { fontSize: '13px', color: '#666' },
  techRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  techTag: {
    fontSize: '11px', color: '#444', background: '#111',
    border: '1px solid #1e1e1e', padding: '2px 8px', borderRadius: '3px',
    letterSpacing: '0.03em',
  },
  itemRight: { display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0, paddingTop: '2px' },
  itemMeta: { fontSize: '12px', color: '#555', letterSpacing: '0.02em' },
  itemStatus: {
    fontSize: '11px', fontWeight: '500', letterSpacing: '0.08em',
    textTransform: 'uppercase', padding: '3px 9px', borderRadius: '4px',
  },
  itemArrow: { fontSize: '14px', color: '#444' },
}

export default function Projects() {
  return (
    <Layout>
      <div style={s.page}>
        <header style={s.header}>
          <p style={s.label}>Projects</p>
          <h1 style={s.title}>Applications</h1>
        </header>
        <ul style={{ ...s.list, listStyle: 'none' }}>
          {projects.map(p => (
            <li key={p.slug}>
              <Link to={`/projects/${p.slug}`} style={{ display: 'block', textDecoration: 'none' }}>
                <div style={s.item}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <div style={s.itemLeft}>
                    <div style={s.itemName}>{p.name}</div>
                    <div style={s.itemTagline}>{p.tagline}</div>
                    <div style={s.techRow}>
                      {p.tech.map(t => (
                        <span key={t} style={s.techTag}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={s.itemRight}>
                    <span style={s.itemMeta}>{p.platform}</span>
                    <span style={s.itemMeta}>{p.year}</span>
                    <span style={{ ...s.itemStatus, ...(statusStyles[p.status] || statusStyles['Dead']) }}>
                      {p.status}
                    </span>
                    <span style={s.itemArrow}>→</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}