import { Link, useLocation } from 'react-router-dom'
import { brand, nav } from '@/config'
import { useIsMobile } from '@/hooks'

export default function Nav() {
  const { pathname } = useLocation()
  const isMobile = useIsMobile(480)

  function isActive(path: string) {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      height: 'var(--nav-h)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 20px' : '0 36px',
      background: 'rgba(8,8,8,0.97)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <Link to="/" style={{
        fontSize: '13px',
        fontWeight: 700,
        color: '#f2f2f2',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {isMobile ? brand.shortName : brand.name}
      </Link>

      <div style={{ display: 'flex', gap: isMobile ? '20px' : '32px', alignItems: 'center' }}>
        {nav.links.map(link => {
          const active = isActive(link.path)
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                color: active ? '#f2f2f2' : '#888',
                letterSpacing: '0.02em',
                transition: 'color 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f2f2f2')}
              onMouseLeave={e => (e.currentTarget.style.color = active ? '#f2f2f2' : '#888')}
            >
              {link.label}
              {active && (
                <span style={{
                  position: 'absolute',
                  bottom: '-21px',
                  left: '0',
                  right: '0',
                  height: '1px',
                  background: '#f2f2f2',
                  opacity: 0.4,
                }} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}