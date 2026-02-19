import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: '72px' },
  hero: { paddingTop: '32px' },
  label: { fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', marginBottom: '20px' },
  headline: { fontSize: 'clamp(34px, 5vw, 54px)', fontWeight: '300', lineHeight: '1.12', color: '#f0f0f0', letterSpacing: '-0.025em', marginBottom: '20px', maxWidth: '580px' },
  sub: { fontSize: '15px', color: '#777', lineHeight: '1.75', maxWidth: '460px', marginBottom: '32px' },
  cta: {
    display: 'inline-block', fontSize: '13px', fontWeight: '500',
    color: '#f0f0f0', background: '#1a1a1a',
    border: '1px solid #333', padding: '10px 22px',
    borderRadius: '6px', transition: 'background 0.15s, border-color 0.15s',
    letterSpacing: '0.02em',
  },
  divider: { border: 'none', borderTop: '1px solid #1e1e1e' },
  sectionLabel: { fontSize: '11px', fontWeight: '500', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: '16px' },
  aboutText: { fontSize: '15px', color: '#777', lineHeight: '1.8', maxWidth: '540px' },
  stack: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  tag: { fontSize: '12px', color: '#666', border: '1px solid #222', background: '#111', padding: '5px 12px', borderRadius: '4px', letterSpacing: '0.02em' },
}

export default function Home() {
  return (
    <Layout>
      <div style={s.page}>
        <section style={s.hero}>
          <p style={s.label}>Creative Coding, Games, Internal Tooling, and Fun Stuff</p>
          <h1 style={s.headline}>Application built for<br />Expressing Creative Ideas</h1>
          <p style={s.sub}>
            A small studio focused on clean, creative, innovative applications.
            Every app can be tracked here.
          </p>
          <Link to="/projects" style={s.cta}
            onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.borderColor = '#444' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#333' }}>
            View projects
          </Link>
        </section>

        <hr style={s.divider} />

        <section>
          <p style={s.sectionLabel}>About</p>
          <p style={s.aboutText}>
            Stateless Labs is primarily a Creative Coding studio.
            The focus is on innovative ideas that solve problems, we emphasize on market
            viability, and market strength after an idea has been properly realized.
            STATELESS LABS also provides Cybersecurity Management and Maintenance Services.
          </p>
        </section>

        <hr style={s.divider} />

        <section>
          <p style={s.sectionLabel}>Stack</p>
          <div style={s.stack}>
            {['Flutter', 'Dart', 'React', 'Phaser', 'JavaScript', 'Android', 'Java', 'iOS', 'Xcode', 'Unity', 'C#', 'Unreal Engine', 'C++'].map(t => (
              <span key={t} style={s.tag}>{t}</span>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}
