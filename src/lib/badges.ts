import type { CSSProperties } from 'react'
import { techConfig } from '@/config'

export type BadgeVariant = 'shields' | 'plain'

export interface RenderedBadge {
  variant:  BadgeVariant
  name:     string
  src?:     string   // for shields or custom img
  color:    string
  logoPath?: string  // custom logo path
}

export function resolveBadge(name: string): RenderedBadge {
  const cfg = techConfig[name] ?? { color: '#2a2a2a' }

  if (cfg.customLogo) {
    return { variant: 'plain', name, color: cfg.color, logoPath: cfg.customLogo }
  }

  if (cfg.logo) {
    const logoColor = cfg.logoColor ?? 'ffffff'
    const src = `https://img.shields.io/badge/${encodeURIComponent(name)}-${cfg.color.replace('#', '')}.svg?style=flat-square&logo=${cfg.logo}&logoColor=${logoColor}`
    return { variant: 'shields', name, src, color: cfg.color }
  }

  return { variant: 'plain', name, color: cfg.color }
}

export const techTagStyle: CSSProperties = {
  fontSize:      '11px',
  color:         '#444',
  background:    '#0f0f0f',
  border:        '1px solid #1e1e1e',
  padding:       '2px 9px',
  borderRadius:  '3px',
  letterSpacing: '0.03em',
}
