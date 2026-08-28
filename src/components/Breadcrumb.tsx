import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumb"
      style={{
        display:    'flex',
        gap:        '8px',
        alignItems: 'center',
        flexWrap:   'wrap',
        fontSize:   '12px',
        color:      '#444',
      }}
    >
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {i > 0 && <span style={{ color: '#2a2a2a' }}>/</span>}
          {item.path ? (
            <Link
              to={item.path}
              style={{ color: '#555', transition: 'color var(--dur-base)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: '#666' }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
