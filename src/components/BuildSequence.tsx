/**
 * BuildSequence.tsx
 * src/components/BuildSequence.tsx
 *
 * A scroll driven assembly animation. One artifact builds itself in the middle
 * of the screen as the visitor scrolls.
 *
 * THE ARC
 *   Scope   Ideas, experience, and expertise pour in from above as light bulbs,
 *           brains, and glasses. They fall into the frame and dissolve into it.
 *   Build   Header, sidebar, and content rows fill in on a stagger.
 *   Data    Chart bars grow, a trend line draws across them.
 *   Harden  A larger box swivels shut around the whole thing, one side at a
 *           time. A glitched SECURITY pass flashes over it, then four locks
 *           appear and lock into place inside the borders.
 *   Ship    The hardened unit shrinks down and wires out to the people and
 *           businesses that use it.
 *
 * HOW IT WORKS
 *   The outer container is taller than the viewport. Inside it a sticky panel
 *   holds still while the page scrolls past. useScrollProgress turns that
 *   travel into a single number from 0 to 1, and every element reads its own
 *   slice of that number through segment(). Nothing is keyframed against a
 *   clock, so scrubbing backwards works for free.
 *
 *   The few things that should stay alive when the page is still, the live 
 *   dot, run on CSS keyframes instead.
 *
 * SWAPPING IN YOUR OWN ANIMATION LATER
 *   Everything under the SCENE banner is one SVG driven by a `p` prop. Replace
 *   the contents of <Scene />, keep the prop, and the scroll plumbing, the
 *   stage rail, and the reduced motion handling all keep working.
 *
 * STAGES
 *   Read from buildSequence.stages in site.config.ts. Retime them there and
 *   the rail follows automatically.
 */

import { useEffect, useState } from 'react'
import { useScrollProgress, segment, ease, clamp01 } from '@/hooks/useScrollProgress'
import { buildSequence } from '@/config'
import type { BuildStage } from '@/config'

const ORANGE = '#FF6B2B'
const MINT = '#00FFB2'
const CREAM = '#F2E9DC'
const FAINT = 'rgba(255,255,255,0.075)'

// Scene geometry. Everything hangs off these.
const CX = 280
const CY = 181

// ─────────────────────────────────────────────────────────────────────────────
// Keyframes, injected once
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_ID = 'bs-styles'
function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = `
    @keyframes bs-live-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
    @keyframes bs-glitch-r {
      0%      { transform: translate(-2px, 0); opacity: 1; }
      18%     { transform: translate(3px, -1px); opacity: 1; }
      36%     { transform: translate(-4px, 1px); opacity: 1; }
      54%     { transform: translate(2px, 0); opacity: 1; }
      72%     { transform: translate(-1px, -1px); opacity: 1; }
      88%     { transform: translate(4px, 1px); opacity: 1; }
      100%    { transform: translate(0, 0); opacity: 0; }
    }
    @keyframes bs-glitch-c {
      0%      { transform: translate(2px, 0); opacity: 1; }
      18%     { transform: translate(-3px, 1px); opacity: 1; }
      36%     { transform: translate(4px, -1px); opacity: 1; }
      54%     { transform: translate(-2px, 0); opacity: 1; }
      72%     { transform: translate(1px, 1px); opacity: 1; }
      88%     { transform: translate(-4px, -1px); opacity: 1; }
      100%    { transform: translate(0, 0); opacity: 0; }
    }
    @keyframes bs-glitch-flick {
      0%       { opacity: 1;    }
      7%       { opacity: 0.25; }
      12%      { opacity: 1;    }
      41%      { opacity: 0.55; }
      46%      { opacity: 1;    }
      77%      { opacity: 0.3;  }
      82%,100% { opacity: 1;    }
    }
    @keyframes bs-pulse-soft { 0%,100% { opacity: 0.5; } 50% { opacity: 0.95; } }
  `
    document.head.appendChild(el)
}

// ─────────────────────────────────────────────────────────────────────────────
// Small icon builders, all drawn around their own origin so they can be placed
// with a single translate
// ─────────────────────────────────────────────────────────────────────────────

function BulbIcon({ color }: { color: string }) {
    return (
        <g stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round">
            <path d="M0 -8 a6.4 6.4 0 0 1 3.9 11.5 v2.1 h-7.8 v-2.1 A6.4 6.4 0 0 1 0 -8 Z" />
            <line x1="-2.6" y1="7.4" x2="2.6" y2="7.4" />
            <line x1="-1.7" y1="10" x2="1.7" y2="10" />
            <path d="M0 -3.4 v4.6" opacity="0.75" />
        </g>
    )
}

function BrainIcon({ color }: { color: string }) {
    return (
        <g stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-1 -7.4 a4.2 4.2 0 0 0 -5.6 3.4 a3.6 3.6 0 0 0 -1 5.6 a4 4 0 0 0 3 5.2 a3.6 3.6 0 0 0 4.6 1.2 Z" />
            <path d="M1 -7.4 a4.2 4.2 0 0 1 5.6 3.4 a3.6 3.6 0 0 1 1 5.6 a4 4 0 0 1 -3 5.2 a3.6 3.6 0 0 1 -4.6 1.2 Z" />
            <path d="M0 -7 v15" opacity="0.55" />
        </g>
    )
}

function GlassesIcon({ color }: { color: string }) {
    return (
        <g stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round">
            <circle cx="-5.4" cy="1" r="4.1" />
            <circle cx="5.4" cy="1" r="4.1" />
            <path d="M-1.3 0.4 a2 2 0 0 1 2.6 0" />
            <path d="M-9.5 -0.6 l-3.4 -2.4" />
            <path d="M9.5 -0.6 l3.4 -2.4" />
        </g>
    )
}

function LockIcon({ color, scale = 1 }: { color: string; scale?: number }) {
    return (
        <g transform={`scale(${scale})`}>
            <rect x="-8" y="-1" width="16" height="12" rx="2.6" fill={`${color}26`} stroke={color} strokeWidth="1.25" />
            <path d="M-4.4 -1 v-4.2 a4.4 4.4 0 0 1 8.8 0 v4.2" fill="none" stroke={color} strokeWidth="1.25" />
            <circle cx="0" cy="5" r="1.5" fill={color} />
        </g>
    )
}

function UserNode({ color }: { color: string }) {
    return (
        <g stroke={color} strokeWidth="1.25" fill="none" strokeLinecap="round">
            <circle cx="0" cy="-3.4" r="3.4" />
            <path d="M-6 7.4 a6 6 0 0 1 12 0" />
        </g>
    )
}

function BusinessNode({ color }: { color: string }) {
    return (
        <g stroke={color} strokeWidth="1.25" fill="none" strokeLinejoin="round">
            <rect x="-7" y="-6.5" width="14" height="14" rx="1.6" />
            <line x1="-3.6" y1="-3" x2="-3.6" y2="-1.6" />
            <line x1="0" y1="-3" x2="0" y2="-1.6" />
            <line x1="3.6" y1="-3" x2="3.6" y2="-1.6" />
            <line x1="-3.6" y1="1" x2="-3.6" y2="2.4" />
            <line x1="0" y1="1" x2="0" y2="2.4" />
            <line x1="3.6" y1="1" x2="3.6" y2="2.4" />
        </g>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────────────────────────────────────

function Scene({ p }: { p: number }) {
    const seg = (a: number, b: number) => ease(segment(p, a, b))

    // ── Scope: the pour ───────────────────────────────────────────────────────
    const pourItems = [
        { kind: 0, x: 196, drift: 10, spin: -14, delay: 0.000 },
        { kind: 1, x: 240, drift: -6, spin: 11, delay: 0.016 },
        { kind: 2, x: 288, drift: 8, spin: -9, delay: 0.032 },
        { kind: 0, x: 336, drift: -9, spin: 13, delay: 0.010 },
        { kind: 1, x: 372, drift: 6, spin: -12, delay: 0.046 },
        { kind: 2, x: 214, drift: 12, spin: 10, delay: 0.058 },
        { kind: 0, x: 262, drift: -7, spin: -15, delay: 0.070 },
        { kind: 1, x: 312, drift: 9, spin: 8, delay: 0.084 },
        { kind: 2, x: 356, drift: -11, spin: -10, delay: 0.096 },
    ]

    const tFrame = seg(0.03, 0.17)
    const tGrid = seg(0.09, 0.23)

    // Frame chrome and content
    const tHead = seg(0.18, 0.28)
    const tSide = seg(0.21, 0.34)
    const rows = [0, 1, 2].map(i => seg(0.26 + i * 0.035, 0.38 + i * 0.035))

    // Data
    const barHeights = [0.34, 0.62, 0.45, 0.86, 0.58, 0.97]
    const bars = barHeights.map((_, i) => seg(0.40 + i * 0.020, 0.53 + i * 0.020))
    const tTrend = seg(0.47, 0.60)

    // Harden: four panels swivel shut, staggered so it reads as a sequence
    const panelTop = seg(0.585, 0.665)
    const panelRight = seg(0.605, 0.685)
    const panelBottom = seg(0.625, 0.705)
    const panelLeft = seg(0.645, 0.725)
    const tBoxLine = seg(0.60, 0.73)

    // Glitched security pass, sits between the box closing and the locks
    const tGlitchIn = seg(0.695, 0.755)
    const tGlitchOut = seg(0.795, 0.855)
    const glitchAlpha = tGlitchIn * (1 - tGlitchOut)

    // Locks appear and lock into the four corners of the inner box
    const locks = [0, 1, 2, 3].map(i => seg(0.745 + i * 0.022, 0.835 + i * 0.022))

    // Positions chosen to sit exactly inside the left/right and top/bottom borders
    const lockPositions = [
        { x: CX - 155, y: CY - 88 }, // Top Left
        { x: CX + 155, y: CY - 88 }, // Top Right
        { x: CX + 155, y: CY + 88 }, // Bottom Right
        { x: CX - 155, y: CY + 88 }, // Bottom Left
    ]

    // Ship: the hardened unit shrinks, connections reach out
    const tShip = seg(0.855, 1.00)
    const tGlow = seg(0.84, 1.00)
    const unitScale = 1 - tShip * 0.46

    const shipNodes = [
        { kind: 'user', angle: -90, color: MINT },
        { kind: 'business', angle: -30, color: CREAM },
        { kind: 'user', angle: 30, color: MINT },
        { kind: 'business', angle: 90, color: CREAM },
        { kind: 'user', angle: 150, color: MINT },
        { kind: 'business', angle: 210, color: CREAM },
    ]

    return (
        <svg
            viewBox="0 0 560 392"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
            aria-hidden="true"
        >
            <defs>
                <radialGradient id="bs-glow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={MINT} stopOpacity="0.08" />
                    <stop offset="1" stopColor={MINT} stopOpacity="0" />
                </radialGradient>
                <clipPath id="bs-frame-clip">
                    <rect x="170" y="96" width="220" height="170" rx="9" />
                </clipPath>
            </defs>

            {/* Ship glow behind everything */}
            {tGlow > 0 && <ellipse cx={CX} cy={CY} rx="300" ry="220" fill="url(#bs-glow)" opacity={tGlow} />}

            {/* ═══ SHIP: outgoing connections, drawn at full scale outside the unit ═══ */}
            {tShip > 0 && shipNodes.map((node, i) => {
                const t = ease(segment(p, 0.860 + i * 0.014, 0.930 + i * 0.014))
                if (t <= 0) return null

                const rad = (node.angle * Math.PI) / 180

                // Destination node center
                const nx = CX + Math.cos(rad) * 232
                const ny = CY + Math.sin(rad) * 156

                // Wire start point (edge of the shrunken unit)
                const sx = CX + Math.cos(rad) * 180 * unitScale
                const sy = CY + Math.sin(rad) * 120 * unitScale

                // Vector math to ensure the line stops EXACTLY on the border of the 16px encompassing circle
                const dx = nx - sx
                const dy = ny - sy
                const dist = Math.sqrt(dx * dx + dy * dy)
                const travelRatio = Math.max(0, (dist - 17) / dist) // 16px radius + 1px visual buffer

                // This is the absolute final position of the tip of the wire
                const targetX = sx + dx * travelRatio
                const targetY = sy + dy * travelRatio

                // Interpolate along the safe path
                const mx = sx + (targetX - sx) * t
                const my = sy + (targetY - sy) * t

                // Timing used to fade in and explicitly draw the circle
                const nodeDraw = clamp01((t - 0.5) * 2)

                return (
                    <g key={i}>
                        <line
                            x1={sx} y1={sy} x2={mx} y2={my}
                            stroke={node.color} strokeWidth="1.2" opacity={0.4}
                        />
                        {/* the pulse dot disappears right as it perfectly touches the boundary at t=1 */}
                        {t < 1 && (
                            <circle cx={mx} cy={my} r={1.9} fill={node.color} opacity={0.9} />
                        )}
                        {t > 0.5 && (
                            <g
                                transform={`translate(${nx}, ${ny}) scale(${0.6 + nodeDraw * 0.4})`}
                                opacity={nodeDraw}
                            >
                                <circle
                                    cx="0" cy="0" r="16"
                                    fill="rgba(255,255,255,0.018)"
                                    stroke={node.color}
                                    strokeOpacity="0.45"
                                    strokeWidth="1.5"
                                    pathLength={1}
                                    strokeDasharray={1}
                                    strokeDashoffset={1 - nodeDraw}
                                />
                                {node.kind === 'user' ? <UserNode color={node.color} /> : <BusinessNode color={node.color} />}
                            </g>
                        )}
                    </g>
                )
            })}

            {/* ═══ THE UNIT: frame, security box, and locks all shrink together ═══ */}
            <g transform={`translate(${CX}, ${CY}) scale(${unitScale}) translate(${-CX}, ${-CY})`}>

                {/* ── HARDEN: outer box, four panels swivelling shut ── */}
                {panelTop > 0 && (
                    <g
                        transform={`translate(${CX}, 52) scale(1, ${panelTop}) rotate(${(1 - panelTop) * -7}) translate(${-CX}, -52)`}
                        opacity={Math.min(panelTop * 2, 1)}
                    >
                        <rect x="86" y="52" width="388" height="26" fill={`${ORANGE}14`} stroke={`${ORANGE}55`} strokeWidth="1" />
                    </g>
                )}
                {panelBottom > 0 && (
                    <g
                        transform={`translate(${CX}, 310) scale(1, ${panelBottom}) rotate(${(1 - panelBottom) * 7}) translate(${-CX}, -310)`}
                        opacity={Math.min(panelBottom * 2, 1)}
                    >
                        <rect x="86" y="284" width="388" height="26" fill={`${ORANGE}14`} stroke={`${ORANGE}55`} strokeWidth="1" />
                    </g>
                )}
                {panelLeft > 0 && (
                    <g
                        transform={`translate(86, ${CY}) scale(${panelLeft}, 1) rotate(${(1 - panelLeft) * -7}) translate(-86, ${-CY})`}
                        opacity={Math.min(panelLeft * 2, 1)}
                    >
                        <rect x="86" y="52" width="26" height="258" fill={`${ORANGE}14`} stroke={`${ORANGE}55`} strokeWidth="1" />
                    </g>
                )}
                {panelRight > 0 && (
                    <g
                        transform={`translate(474, ${CY}) scale(${panelRight}, 1) rotate(${(1 - panelRight) * 7}) translate(-474, ${-CY})`}
                        opacity={Math.min(panelRight * 2, 1)}
                    >
                        <rect x="448" y="52" width="26" height="258" fill={`${ORANGE}14`} stroke={`${ORANGE}55`} strokeWidth="1" />
                    </g>
                )}

                {/* Outer box outline, drawn once the panels have met */}
                {tBoxLine > 0 && (
                    <rect
                        x="86" y="52" width="388" height="258" rx="6"
                        fill="none" stroke={ORANGE} strokeWidth="1.3"
                        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tBoxLine}
                        style={tBoxLine > 0.995 ? { animation: 'bs-pulse-soft 3s ease-in-out infinite' } : undefined}
                    />
                )}

                {/* ── The app frame ── */}
                <rect
                    x="170" y="96" width="220" height="170" rx="9"
                    fill="rgba(255,255,255,0.014)"
                    stroke={CREAM} strokeOpacity="0.30" strokeWidth="1.2"
                    pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tFrame}
                />

                <g clipPath="url(#bs-frame-clip)">
                    {tGrid > 0 && (
                        <g opacity={tGrid * 0.9}>
                            {[0, 1, 2, 3].map(i => (
                                <line key={`v${i}`} x1={170 + i * 55} y1="96" x2={170 + i * 55} y2="266" stroke={FAINT} strokeWidth="1" />
                            ))}
                            {[0, 1, 2].map(i => (
                                <line key={`h${i}`} x1="170" y1={96 + i * 57} x2="390" y2={96 + i * 57} stroke={FAINT} strokeWidth="1" />
                            ))}
                        </g>
                    )}

                    {/* Header */}
                    {tHead > 0 && (
                        <g opacity={tHead}>
                            <rect x="170" y="96" width="220" height="26" fill="rgba(255,255,255,0.032)" />
                            <line x1="170" y1="122" x2="390" y2="122" stroke={CREAM} strokeOpacity="0.16" strokeWidth="1" />
                            <rect x="182" y="105" width={54 * tHead} height="8" rx="4" fill={CREAM} opacity="0.45" />
                        </g>
                    )}

                    {/* Sidebar */}
                    {tSide > 0 && (
                        <g opacity={tSide}>
                            <rect x="170" y="122" width="50" height="144" fill="rgba(255,255,255,0.022)" />
                            <line x1="220" y1="122" x2="220" y2="266" stroke={CREAM} strokeOpacity="0.14" strokeWidth="1" />
                            {[0, 1, 2, 3].map(i => (
                                <rect
                                    key={i} x="180" y={136 + i * 15}
                                    width={(i === 0 ? 30 : 24) * tSide} height="5" rx="2.5"
                                    fill={i === 0 ? ORANGE : CREAM} opacity={i === 0 ? 0.75 : 0.26}
                                />
                            ))}
                        </g>
                    )}

                    {/* Content rows */}
                    {rows.map((t, i) =>
                        t > 0 ? (
                            <rect
                                key={i} x="232" y={136 + i * 16}
                                width={(i === 1 ? 118 : i === 2 ? 88 : 140) * t} height="7" rx="3.5"
                                fill={CREAM} opacity={0.30 * t}
                            />
                        ) : null,
                    )}

                    {/* Data */}
                    {bars.map((t, i) =>
                        t > 0 ? (
                            <rect
                                key={i}
                                x={234 + i * 25}
                                y={258 - barHeights[i] * 64 * t}
                                width="17" height={barHeights[i] * 64 * t} rx="2.5"
                                fill={i === 3 || i === 5 ? MINT : CREAM}
                                opacity={i === 3 || i === 5 ? 0.62 : 0.22}
                            />
                        ) : null,
                    )}
                    {tTrend > 0 && (
                        <polyline
                            points="242,236 267,216 292,228 317,198 342,212 367,190"
                            fill="none" stroke={MINT} strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tTrend}
                            opacity="0.9"
                        />
                    )}

                    {/* Live badge, inside the frame so it shrinks with it */}
                    {tShip > 0 && (
                        <g opacity={tShip}>
                            <rect x="334" y="101" width="46" height="16" rx="8" fill="rgba(0,255,178,0.12)" stroke={MINT} strokeOpacity="0.5" strokeWidth="1" />
                            <circle cx="344" cy="109" r="2.6" fill={MINT} style={{ animation: 'bs-live-blink 1.6s ease-in-out infinite' }} />
                            <text x="351" y="112.5" fill={MINT} fontSize="8" fontFamily="var(--font-mono, monospace)" letterSpacing="1.1" opacity="0.95">
                                LIVE
                            </text>
                        </g>
                    )}
                </g>

                {/* ── Four locks statically placed inside the inner borders of the harden box ── */}
                <g>
                    {locks.map((t, i) => {
                        if (t <= 0) return null
                        const { x, y } = lockPositions[i]

                        return (
                            <g key={i} transform={`translate(${x}, ${y})`} opacity={t}>
                                <LockIcon color={ORANGE} scale={0.72 + t * 0.28} />
                            </g>
                        )
                    })}
                </g>
            </g>

            {/* ═══ SCOPE: the pour, drawn last so items fall in front of the frame ═══ */}
            {pourItems.map((item, i) => {
                const t = ease(segment(p, item.delay, 0.135 + item.delay))
                if (t <= 0 || t >= 1) return null
                const y = -26 + t * 232
                const x = item.x + item.drift * t
                const rot = item.spin * (1 - t)
                const alpha = Math.min(t * 5, 1) * (1 - clamp01((t - 0.72) / 0.28))
                const color = item.kind === 0 ? ORANGE : item.kind === 1 ? MINT : CREAM

                return (
                    <g key={i} transform={`translate(${x}, ${y}) rotate(${rot})`} opacity={alpha}>
                        {item.kind === 0 && <BulbIcon color={color} />}
                        {item.kind === 1 && <BrainIcon color={color} />}
                        {item.kind === 2 && <GlassesIcon color={color} />}
                    </g>
                )
            })}

            {/* ═══ HARDEN: the glitched security pass ═══ */}
            {glitchAlpha > 0.001 && (
                <g opacity={glitchAlpha}>
                    {/* The flicker runs exactly once and ends on frame 100% (fully visible/settled) */}
                    <g style={{ animation: 'bs-glitch-flick 1.1s steps(1)' }}>
                        {/* red channel */}
                        <text
                            x={CX} y={CY + 9} textAnchor="middle"
                            fill="#FF2D2D" fillOpacity="0.75" fontSize="30" fontWeight="800"
                            letterSpacing="9" fontFamily="var(--font-mono, monospace)"
                            style={{ animation: 'bs-glitch-r 0.7s steps(1) forwards' }}
                        >
                            SECURITY
                        </text>
                        {/* cyan channel */}
                        <text
                            x={CX} y={CY + 9} textAnchor="middle"
                            fill="#2DF5FF" fillOpacity="0.6" fontSize="30" fontWeight="800"
                            letterSpacing="9" fontFamily="var(--font-mono, monospace)"
                            style={{ animation: 'bs-glitch-c 0.7s steps(1) forwards' }}
                        >
                            SECURITY
                        </text>
                        {/* solid core */}
                        <text
                            x={CX} y={CY + 9} textAnchor="middle"
                            fill={CREAM} fontSize="30" fontWeight="800"
                            letterSpacing="9" fontFamily="var(--font-mono, monospace)"
                        >
                            SECURITY
                        </text>
                        {/* tear slices */}
                        {[0, 1, 2].map(i => (
                            <rect
                                key={i}
                                x="120" y={CY - 12 + i * 11} width="320" height="2.4"
                                fill={ORANGE}
                                style={{ animation: `bs-glitch-${i % 2 === 0 ? 'r' : 'c'} 0.7s steps(1) forwards` }}
                            />
                        ))}
                    </g>
                </g>
            )}
        </svg>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage rail
// ─────────────────────────────────────────────────────────────────────────────

function Rail({ stages, p, horizontal }: { stages: BuildStage[]; p: number; horizontal: boolean }) {
    const activeIndex = (() => {
        for (let i = stages.length - 1; i >= 0; i--) if (p >= stages[i].from) return i
        return 0
    })()

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: horizontal ? 'row' : 'column',
                gap: horizontal ? '6px' : '2px',
                width: horizontal ? '100%' : '188px',
                flexShrink: 0,
            }}
        >
            {stages.map((stage, i) => {
                const local = clamp01((p - stage.from) / (stage.to - stage.from || 1))
                const active = i === activeIndex
                const passed = p >= stage.to

                return (
                    <div
                        key={stage.id}
                        style={{
                            flex: horizontal ? 1 : undefined,
                            display: 'flex',
                            flexDirection: horizontal ? 'column' : 'row',
                            gap: horizontal ? '7px' : '12px',
                            alignItems: horizontal ? 'stretch' : 'flex-start',
                            minWidth: 0,
                        }}
                    >
                        <div
                            style={{
                                position: 'relative',
                                flexShrink: 0,
                                width: horizontal ? '100%' : '2px',
                                height: horizontal ? '2px' : '38px',
                                background: 'rgba(255,255,255,0.07)',
                                borderRadius: '2px',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    transformOrigin: horizontal ? 'left center' : 'center top',
                                    transform: horizontal ? `scaleX(${local})` : `scaleY(${local})`,
                                    background: stage.color,
                                    opacity: passed ? 0.65 : 1,
                                    transition: 'opacity 0.3s',
                                }}
                            />
                        </div>

                        <div style={{ minWidth: 0, paddingBottom: horizontal ? 0 : '14px' }}>
                            <div
                                style={{
                                    fontSize: horizontal ? '10px' : '11.5px',
                                    fontWeight: 600,
                                    letterSpacing: '0.02em',
                                    color: active ? stage.color : passed ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.20)',
                                    transition: 'color 0.3s',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {stage.label}
                            </div>
                            {!horizontal && (
                                <div
                                    style={{
                                        fontSize: '11px',
                                        lineHeight: 1.55,
                                        marginTop: '4px',
                                        color: active ? 'rgba(255,255,255,0.46)' : 'rgba(255,255,255,0.18)',
                                        transition: 'color 0.3s',
                                    }}
                                >
                                    {stage.caption}
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BuildSequence({ isMobile = false }: { isMobile?: boolean }) {
    const { ref, progress } = useScrollProgress<HTMLDivElement>()
    const [reduced, setReduced] = useState(false)

    useEffect(() => {
        ensureStyles()
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
        if (!mq) return
        setReduced(mq.matches)
        const onChange = () => setReduced(mq.matches)
        mq.addEventListener?.('change', onChange)
        return () => mq.removeEventListener?.('change', onChange)
    }, [])

    const stages = buildSequence.stages
    const p = reduced ? 1 : progress
    const shaped = clamp01(p * 1.04 - 0.02)

    const scrollHeight = reduced
        ? 'auto'
        : `${isMobile ? buildSequence.scrollLengthMobile : buildSequence.scrollLength}vh`

    const activeStage = (() => {
        for (let i = stages.length - 1; i >= 0; i--) if (shaped >= stages[i].from) return stages[i]
        return stages[0]
    })()

    return (
        <div ref={ref} style={{ position: 'relative', height: scrollHeight }}>
            <div
                style={{
                    position: reduced ? 'relative' : 'sticky',
                    top: reduced ? undefined : 'calc(var(--nav-h, 64px) + 12px)',
                    height: reduced ? 'auto' : 'calc(100vh - var(--nav-h, 64px) - 24px)',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: isMobile ? '440px' : '480px',
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '188px minmax(0, 1fr)',
                        gap: isMobile ? '18px' : 'clamp(24px, 4vw, 52px)',
                        alignItems: 'center',
                        width: '100%',
                    }}
                >
                    <Rail stages={stages} p={shaped} horizontal={isMobile} />

                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxHeight: isMobile ? '340px' : '520px',
                            aspectRatio: '560 / 392',
                            margin: '0 auto',
                        }}
                    >
                        <Scene p={shaped} />
                    </div>

                    {isMobile && (
                        <p
                            style={{
                                fontSize: '12px',
                                lineHeight: 1.6,
                                color: 'rgba(255,255,255,0.40)',
                                textAlign: 'center',
                                margin: 0,
                                minHeight: '38px',
                            }}
                        >
                            {activeStage.caption}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default BuildSequence