import { Link } from 'react-router-dom'
import { Layout } from '@/components'
import { projects } from '@/config'
import { statusStyle, getStatusColors } from '@/lib'
import type { ProjectStatus } from '@/config'
import { useIsMobile } from '@/hooks'

export default function Projects() {
  const isMobile = useIsMobile(640)

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '52px' }}>

        {/* Header */}
        <header style={{ paddingTop: '24px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#555',
            marginBottom: '14px',
          }}>
            Stateless Labs
          </p>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: '#f2f2f2',
            marginBottom: '16px',
          }}>
            Applications
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#888',
            lineHeight: 1.7,
            maxWidth: '480px',
          }}>
            Every app we've built — from internal tools to public releases.
          </p>
        </header>

        {/* Count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#444',
          }}>
            {projects.length} projects
          </span>
          <span style={{ width: '1px', height: '12px', background: '#222' }} />
          <span style={{ fontSize: '11px', color: '#333', letterSpacing: '0.06em' }}>
            {projects.filter(p => p.status === 'Live').length} live
          </span>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: '1px',
          background: '#1a1a1a',
          border: '1px solid #1a1a1a',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          {projects.map((p, idx) => {
            const statusColors = getStatusColors(p.status as ProjectStatus)
            return (
              <Link
                key={p.slug}
                to={`/projects/${p.slug}`}
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <div
                  style={{
                    background: '#0a0a0a',
                    padding: isMobile ? '24px 20px' : '28px 28px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0f0f0f')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0a0a0a')}
                >

                  {/* Top row: index + status */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#2a2a2a',
                      letterSpacing: '0.1em',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={statusStyle(p.status as ProjectStatus)}>
                      {p.status}
                    </span>
                  </div>

                  {/* Name + tagline */}
                  <div>
                    <h2 style={{
                      fontSize: 'clamp(18px, 2.5vw, 22px)',
                      fontWeight: 700,
                      color: '#f2f2f2',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      marginBottom: '8px',
                    }}>
                      {p.name}
                    </h2>
                    <p style={{
                      fontSize: '13px',
                      color: '#777',
                      lineHeight: 1.6,
                    }}>
                      {p.tagline}
                    </p>
                  </div>

                  {/* Tech tags */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    flex: 1,
                    alignContent: 'flex-start',
                  }}>
                    {p.tech.map(t => (
                      <span key={t} style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#555',
                        background: '#111',
                        border: '1px solid #222',
                        padding: '3px 9px',
                        borderRadius: '4px',
                        letterSpacing: '0.03em',
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Bottom row: meta + arrow */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid #161616',
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#3a3a3a',
                        letterSpacing: '0.04em',
                      }}>
                        {p.platform}
                      </span>
                      <span style={{ color: '#222', fontSize: '10px' }}>·</span>
                      <span style={{
                        fontSize: '11px',
                        color: '#3a3a3a',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.04em',
                      }}>
                        {p.year}
                      </span>
                    </div>

                    {/* Coloured arrow that matches status */}
                    <span style={{
                      fontSize: '16px',
                      color: statusColors.fg,
                      opacity: 0.6,
                      transition: 'opacity 0.15s, transform 0.15s',
                    }}>
                      &#8594;
                    </span>
                  </div>

                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </Layout>
  )
}