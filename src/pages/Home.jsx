import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { logoConfig, techConfig } from './Config';
import StatelessLabsLogoVar1 from './components/AnimatedLogoOLD.jsx';

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
      <div style={{
        position: 'fixed',
        top: logoConfig.topOffset,
        right: logoConfig.rightOffset,
        transform: `translateY(${logoConfig.translateY})`,
        width: `${logoConfig.size}px`,
        height: `${logoConfig.size}px`,
        opacity: logoConfig.opacity,
        filter: logoConfig.blur !== '0px' ? logoConfig.blur : undefined,
        zIndex: logoConfig.zIndex,
        pointerEvents: 'none',     // never blocks clicks
        userSelect: 'none',
      }}>
        <StatelessLabsLogoVar1
          width={logoConfig.size}
          height={logoConfig.size}
          viewBox="0 0 300 300"
        />
      </div>
      <div style={s.page}>
        <section style={s.hero}>
          <p style={s.label}>Creative Coding, Games, Internal Tooling, and Fun Stuff</p>
          <h1 style={s.headline}>Execution on<br />Creative Ideas</h1>
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
            STATELESS LABS also provides Cybersecurity Tooling, Management, and Maintenance Services.
          </p>
        </section>

        <hr style={s.divider} />

        <section>
          <p style={s.sectionLabel}>Stack</p>
          <div style={s.stack}>
            {Object.entries(techConfig).map(([name, cfg]) => {
              // Has a custom local logo — render manually
              if (cfg.customLogo) {
                return (
                  <div key={name} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: cfg.color, padding: '4px 10px',
                    borderRadius: '3px', height: '24px',
                  }}>
                    <img src={cfg.customLogo} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '11px', fontWeight: '500', color: '#fff', letterSpacing: '0.03em' }}>{name}</span>
                  </div>
                )
              }

              // Has a shields.io logo
              if (cfg.logo) {
                const logoColor = cfg.logoColor || 'ffffff'
                const src = `https://img.shields.io/badge/${encodeURIComponent(name)}-${cfg.color.replace('#', '')}.svg?style=flat-square&logo=${cfg.logo}&logoColor=${logoColor}`
                return <img key={name} src={src} alt={name} style={{ height: '24px', borderRadius: '3px' }} />
              }

              // No logo at all — plain colored badge with just the name
              return (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center',
                  background: cfg.color, padding: '4px 10px',
                  borderRadius: '3px', height: '24px',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '500', color: '#fff', letterSpacing: '0.03em' }}>{name}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Layout>
  )
}

/**
 * export default function Home() {
  return (
    <Layout>
      <div style={s.page}>
        <section style={s.hero}>
          <p style={s.label}>f</p>
          <h1 style={s.headline}>Ar<br />Expressing Creative Ideas</h1>
          <p style={s.sub}>
           
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
            provides Cybersecurity Management and Maintenance Services.
          </p>
        </section>

        <hr style={s.divider} />

        <section>
          <p style={s.sectionLabel}>Stack</p>
          <div style={s.stack}>
            {Object.entries(techConfig).map(([name, cfg]) => {
              // Has a custom local logo — render manually
              if (cfg.customLogo) {
                return (
                  <div key={name} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: cfg.color, padding: '4px 10px',
                    borderRadius: '3px', height: '24px',
                  }}>
                    <img src={cfg.customLogo} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '11px', fontWeight: '500', color: '#fff', letterSpacing: '0.03em' }}>{name}</span>
                  </div>
                )
              }

              // Has a shields.io logo
              if (cfg.logo) {
                const logoColor = cfg.logoColor || 'ffffff'
                const src = `https://img.shields.io/badge/${encodeURIComponent(name)}-${cfg.color.replace('#', '')}.svg?style=flat-square&logo=${cfg.logo}&logoColor=${logoColor}`
                return <img key={name} src={src} alt={name} style={{ height: '24px', borderRadius: '3px' }} />
              }

              // No logo at all — plain colored badge with just the name
              return (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center',
                  background: cfg.color, padding: '4px 10px',
                  borderRadius: '3px', height: '24px',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '500', color: '#fff', letterSpacing: '0.03em' }}>{name}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Layout>
  )
}

 */