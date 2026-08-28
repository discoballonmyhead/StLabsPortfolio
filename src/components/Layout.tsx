import type { ReactNode } from 'react'
import Nav from './Nav'

interface LayoutProps {
  children: ReactNode
  maxWidth?: string
}

export default function Layout({ children, maxWidth = 'var(--max-w)' }: LayoutProps) {
  return (
    <>
      <Nav />
      <div style={{ minHeight: '100vh', paddingTop: 'var(--nav-h)' }}>
        <div style={{
          maxWidth,
          margin: '0 auto',
          padding: 'clamp(40px,6vw,64px) var(--gutter)',
        }}>
          {children}
        </div>
      </div>
    </>
  )
}