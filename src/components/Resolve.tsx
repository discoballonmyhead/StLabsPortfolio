/**
 * Resolve.tsx — full-screen loading overlay
 *
 * Uses the animated GIF from assets.resolveGif (set in site.config.ts).
 * Falls back to the CSS hex animation if the GIF hasn't been added yet.
 *
 * Usage:
 *   <Suspense fallback={<Resolve />}>...</Suspense>
 *   if (loading) return <Resolve message="Loading project" />
 *   <Resolve fullScreen={false} />
 */

import { useEffect, useRef, useState } from 'react'
import { brand, assets } from '@/config'

const STYLE_ID = 'resolve-keyframes'

function ensureKeyframes() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes resolve-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes resolve-dot-on {
      0%, 100% { opacity: 0.18; transform: scale(1);    }
      50%      { opacity: 1;    transform: scale(1.35); }
    }
    @keyframes resolve-spin-outer {
      from { transform: rotate(0deg);   }
      to   { transform: rotate(360deg); }
    }
    @keyframes resolve-spin-inner {
      from { transform: rotate(0deg);    }
      to   { transform: rotate(-360deg); }
    }
    @keyframes resolve-breathe {
      0%, 100% { opacity: 0.15; }
      50%      { opacity: 0.55; }
    }
    @keyframes resolve-shimmer {
      0%   { stroke-dashoffset: 400; opacity: 0.0; }
      10%  { opacity: 0.6; }
      90%  { opacity: 0.6; }
      100% { stroke-dashoffset: 0; opacity: 0.0; }
    }
  `
  document.head.appendChild(el)
}

// Fallback CSS hex — shown only if GIF hasn't loaded / not set
function FallbackHex({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g style={{ animation: 'resolve-spin-outer 9s linear infinite', transformOrigin: '150px 150px' }}>
        <path
          d="M143.5 90L98.8 90L47.7 178.9L98.8 267.5L143.5 267.5L156.3 267.5L201 267.5L252.2 178.9L201 90L156.3 90Z"
          stroke="#444" strokeWidth="1.5" fill="none"
        />
        <path
          d="M143.5 90L98.8 90L47.7 178.9L98.8 267.5L143.5 267.5L156.3 267.5L201 267.5L252.2 178.9L201 90L156.3 90Z"
          stroke="#f0f0f0" strokeWidth="1.5" fill="none"
          strokeDasharray="400"
          style={{ animation: 'resolve-shimmer 2.4s ease-in-out infinite' }}
        />
      </g>
      <g style={{ animation: 'resolve-spin-inner 6s linear infinite', transformOrigin: '150px 150px' }}>
        <path
          d="M133.8 151.2L117.7 179L133.8 206.9L166 206.9L182.1 179L166 151.2Z"
          stroke="#333" strokeWidth="1.5" fill="none"
        />
      </g>
      <circle cx="150" cy="179" r="3.5" fill="#555"
        style={{ animation: 'resolve-breathe 1.8s ease-in-out infinite' }}
      />
    </svg>
  )
}

function Dots() {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {['0ms', '333ms', '666ms'].map((delay, i) => (
        <div key={i} style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#555',
          opacity: 0.18,
          animation: 'resolve-dot-on 1s linear infinite',
          animationDelay: delay,
        }} />
      ))}
    </div>
  )
}

interface ResolveProps {
  message?: string
  fullScreen?: boolean
  bg?: string
}

export default function Resolve({ message, fullScreen = true, bg }: ResolveProps) {
  const [gifError, setGifError] = useState(false)
  ensureKeyframes()

  const wrapStyle: React.CSSProperties = fullScreen
    ? {
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      background: bg ?? 'var(--bg, #080808)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '28px',
      animation: 'resolve-fade-in 0.2s ease-out both',
    }
    : {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '28px',
      padding: '48px 0',
      width: '100%',
      animation: 'resolve-fade-in 0.2s ease-out both',
    }

  return (
    <div style={wrapStyle} role="status" aria-label="Loading">

      {/* GIF logo — falls back to CSS hex if missing */}
      {!gifError ? (
        <img
          src={assets.resolveGif}
          alt=""
          width={72}
          height={72}
          style={{ display: 'block', imageRendering: 'auto' }}
          onError={() => setGifError(true)}
        />
      ) : (
        <FallbackHex size={72} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <Dots />
        {message && (
          <p style={{
            fontSize: '11px',
            color: '#3a3a3a',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font)',
          }}>
            {message}
          </p>
        )}
      </div>

      <span style={{
        position: fullScreen ? 'fixed' : 'static',
        bottom: '24px',
        fontSize: '10px',
        color: '#222',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font)',
        userSelect: 'none',
        marginTop: fullScreen ? 0 : '16px',
      }}>
        {brand.shortName}
      </span>

    </div>
  )
}