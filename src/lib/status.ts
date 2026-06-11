import type { ProjectStatus } from '@/config'
import type { CSSProperties } from 'react'

const map: Record<ProjectStatus, { fg: string; bg: string; bd: string }> = {
  Live:             { fg: '#4a9a5a', bg: 'rgba(74,154,90,0.10)',    bd: 'rgba(74,154,90,0.22)'    },
  'In Development': { fg: '#b8a840', bg: 'rgba(184,168,64,0.10)',   bd: 'rgba(184,168,64,0.22)'   },
  Beta:             { fg: '#4a8aaa', bg: 'rgba(74,138,170,0.10)',   bd: 'rgba(74,138,170,0.22)'   },
  Paused:           { fg: '#8b7fc7', bg: 'rgba(139,127,199,0.10)',  bd: 'rgba(139,127,199,0.22)'  },
  Dead:             { fg: '#555',    bg: 'rgba(80,80,80,0.10)',      bd: 'rgba(80,80,80,0.22)'     },
  Archived:         { fg: '#664433', bg: 'rgba(102,68,51,0.10)',    bd: 'rgba(102,68,51,0.22)'    },
}

export function statusStyle(status: ProjectStatus): CSSProperties {
  const t = map[status] ?? map.Dead
  return {
    color:           t.fg,
    background:      t.bg,
    border:          `1px solid ${t.bd}`,
    fontSize:        '11px',
    fontWeight:      500,
    letterSpacing:   '0.07em',
    textTransform:   'uppercase',
    padding:         '3px 9px',
    borderRadius:    '4px',
    whiteSpace:      'nowrap',
  }
}

export function getStatusColors(status: ProjectStatus) {
  return map[status] ?? map.Dead
}
