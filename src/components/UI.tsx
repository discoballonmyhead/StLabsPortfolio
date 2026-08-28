import type { CSSProperties, ReactNode } from 'react'
import type { ProjectStatus } from '@/config'
import { statusStyle } from '@/lib'
import { resolveBadge } from '@/lib/badges'

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
}

// ─── Section label (eyebrow) ─────────────────────────────────────────────────
interface SectionLabelProps {
  children: ReactNode
  style?: CSSProperties
}
export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <p style={{
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#555',
      marginBottom: '14px',
      ...style,
    }}>
      {children}
    </p>
  )
}

// ─── App page header ─────────────────────────────────────────────────────────
interface AppHeaderProps {
  label: string
  title: string
  tagline: string
  tags: string[]
  statusTag: ProjectStatus
}
export function AppHeader({ label, title, tagline, tags, statusTag }: AppHeaderProps) {
  return (
    <header style={{ paddingTop: '8px' }}>
      <SectionLabel>{label}</SectionLabel>
      <h1 style={{
        fontSize: 'clamp(28px, 4vw, 44px)',
        fontWeight: 300,
        color: 'var(--text)',
        letterSpacing: '-0.025em',
        marginBottom: '10px',
        lineHeight: 1.12,
      }}>
        {title}
      </h1>
      <p style={{ fontSize: '15px', color: '#aaa', marginBottom: '18px' }}>
        {tagline}
      </p>
      {/* Status badge */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <span style={statusStyle(statusTag)}>{statusTag}</span>
      </div>
      {/* Tech badges — uses TechBadge so customLogo (Phaser, C#) and shields.io all render */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {tags.filter(t => t !== statusTag).map(t => (
          <TechBadge key={t} name={t} />
        ))}
      </div>
    </header>
  )
}

// ─── Tech badge ───────────────────────────────────────────────────────────────
interface TechBadgeProps {
  name: string
}
export function TechBadge({ name }: TechBadgeProps) {
  const badge = resolveBadge(name)

  if (badge.variant === 'shields' && badge.src) {
    return (
      <img
        src={badge.src}
        alt={name}
        style={{ height: '24px', borderRadius: '3px', display: 'inline-block' }}
      />
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: badge.color,
      padding: '4px 10px',
      borderRadius: '3px',
      height: '24px',
    }}>
      {badge.logoPath && (
        <img src={badge.logoPath} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} />
      )}
      <span style={{ fontSize: '11px', fontWeight: 500, color: '#fff', letterSpacing: '0.03em' }}>
        {name}
      </span>
    </div>
  )
}

// ─── Store button ─────────────────────────────────────────────────────────────
interface StoreButtonProps {
  label: string
  href: string
}
export function StoreButton({ label, href }: StoreButtonProps) {
  return (
    <a
      href={href}
      style={{
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text-muted)',
        border: '1px solid #2a2a2a',
        background: 'var(--surface)',
        padding: '8px 16px',
        borderRadius: 'var(--radius)',
        display: 'inline-block',
        transition: 'border-color var(--dur-base), color var(--dur-base)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#555'
        e.currentTarget.style.color = 'var(--text)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#2a2a2a'
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      {label}
    </a>
  )
}

// ─── Policy link ─────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

interface PolicyLinkProps {
  to: string
  children: ReactNode
  style?: React.CSSProperties
}
export function PolicyLink({ to, children, style: extraStyle }: PolicyLinkProps) {
  return (
    <Link
      to={to}
      style={{
        ...extraStyle,
        display: 'inline-block',
        marginTop: '14px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text-muted)',
        borderBottom: '1px solid #2a2a2a',
        paddingBottom: '2px',
        transition: 'color var(--dur-base), border-color var(--dur-base)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--text)'
        e.currentTarget.style.borderBottomColor = '#555'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-muted)'
        e.currentTarget.style.borderBottomColor = '#2a2a2a'
      }}
    >
      {children}
    </Link>
  )
}