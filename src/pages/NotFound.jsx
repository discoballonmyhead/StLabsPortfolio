import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const s = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '16px',
    paddingTop: '40px',
  },
  code: {
    fontSize: '11px', fontWeight: '500',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: '#444',
  },
  title: {
    fontSize: '32px', fontWeight: '300',
    color: '#e8e8e8', letterSpacing: '-0.02em',
  },
  sub: { fontSize: '14px', color: '#555' },
  link: {
    fontSize: '13px', fontWeight: '500',
    color: '#555', borderBottom: '1px solid #2a2a2a',
    paddingBottom: '2px', transition: 'color 0.15s',
    marginTop: '8px', display: 'inline-block',
  },
}

export default function NotFound() {
  return (
    <Layout>
      <div style={s.page}>
        <p style={s.code}>404</p>
        <h1 style={s.title}>Page not found</h1>
        <p style={s.sub}>This URL does not exist.</p>
        <Link to="/" style={s.link}
          onMouseEnter={e=>e.target.style.color='#e8e8e8'}
          onMouseLeave={e=>e.target.style.color='#555'}>
          Return home
        </Link>
      </div>
    </Layout>
  )
}
