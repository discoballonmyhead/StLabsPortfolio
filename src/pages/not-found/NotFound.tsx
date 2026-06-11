import { Link } from 'react-router-dom'
import { Layout } from '@/components'

export default function NotFound() {
  return (
    <Layout>
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'flex-start',
        gap:           '16px',
        paddingTop:    '40px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a3a3a' }}>
          404
        </p>
        <h1 style={{ fontSize: '32px', fontWeight: 300, color: '#e8e8e8', letterSpacing: '-0.02em' }}>
          Page not found
        </h1>
        <p style={{ fontSize: '14px', color: '#555' }}>
          This URL does not exist.
        </p>
        <Link
          to="/"
          style={{
            fontSize:      '13px',
            fontWeight:    500,
            color:         '#555',
            borderBottom:  '1px solid #2a2a2a',
            paddingBottom: '2px',
            marginTop:     '8px',
            display:       'inline-block',
            transition:    'color var(--dur-base)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e8e8e8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          Return home
        </Link>
      </div>
    </Layout>
  )
}
