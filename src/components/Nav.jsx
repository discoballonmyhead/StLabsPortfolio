import { Link, useLocation } from 'react-router-dom'

export default function Nav() {
  const { pathname } = useLocation()

  const s = {
    nav: {
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: 'rgba(8,8,8,0.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #242424',
    },
    logo: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#f0f0f0',
      letterSpacing: '0.02em',
    },
    links: { display: 'flex', gap: '28px' },
  }

  const linkStyle = (path) => ({
    fontSize: '13px',
    fontWeight: '400',
    color: (pathname === path || (path !== '/' && pathname.startsWith(path))) ? '#f0f0f0' : '#666',
    transition: 'color 0.15s',
    letterSpacing: '0.02em',
  })

  const hover = (e, on) => e.target.style.color = on ? '#f0f0f0' : (
    (pathname === e.target.getAttribute('data-path') || pathname.startsWith(e.target.getAttribute('data-path') || '__')) ? '#f0f0f0' : '#666'
  )

  return (
    <nav style={s.nav}>
      <Link to="/" style={s.logo}>Stateless Labs</Link>
      <div style={s.links}>
        <Link to="/" data-path="/" style={linkStyle('/')} onMouseEnter={e=>e.target.style.color='#f0f0f0'} onMouseLeave={e=>e.target.style.color=pathname==='/'?'#f0f0f0':'#666'}>Home</Link>
        <Link to="/projects" data-path="/projects" style={linkStyle('/projects')} onMouseEnter={e=>e.target.style.color='#f0f0f0'} onMouseLeave={e=>e.target.style.color=pathname.startsWith('/projects')?'#f0f0f0':'#666'}>Projects</Link>
      </div>
    </nav>
  )
}
