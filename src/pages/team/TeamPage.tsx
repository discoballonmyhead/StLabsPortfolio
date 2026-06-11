/**
 * TeamPage.tsx — Leadership & Team
 *
 * Console easter eggs:
 *   showAlter('Name')        — glitch a person to their alter state
 *   showAlter('Name', false) — reset
 *   showRealHead()           — reveal trueChairPerson
 *   showRealHead(false)      — dismiss
 *
 * Music crescendo: MusicPlayer dispatches 'mp:crescendo' with {active:bool}
 * during the two crescendo ranges. All alterable members auto-glitch in sync.
 */

import { useMemo, useState, useEffect } from 'react'
import { Layout } from '@/components'
import { useIsMobile } from '@/hooks'
import { leadership } from '@/config'

export interface TeamMember {
    name: string
    role: string
    title?: string
    bio?: string | null
    image?: string | null
    linkedin?: string | null
    accent?: string
    region?: string | string[]
    alterEnabled?: boolean
    alterImage?: string | null
    alterName?: string | null
    alterTitle?: string | null
    alterBio?: string | null
    alterGithub?: string | null
}

export interface ChairPerson {
    name: string; role: string; title?: string
    bio?: string | null; image?: string | null
    github?: string | null; accent?: string
}

function injectCSS(id: string, css: string) {
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id; el.textContent = css
    document.head.appendChild(el)
}

const GLITCH_CSS = `
@keyframes gl-h{0%,100%{clip-path:inset(0 0 95% 0);transform:translate(-4px,0)}20%{clip-path:inset(30% 0 50% 0);transform:translate(4px,0)}40%{clip-path:inset(60% 0 20% 0);transform:translate(-2px,0)}60%{clip-path:inset(10% 0 80% 0);transform:translate(3px,0)}80%{clip-path:inset(80% 0 5% 0);transform:translate(-3px,0)}}
@keyframes gl-v{0%,100%{clip-path:inset(5% 0 80% 0);transform:translate(0,-3px);opacity:.7}25%{clip-path:inset(40% 0 40% 0);transform:translate(0,2px);opacity:.9}50%{clip-path:inset(70% 0 15% 0);transform:translate(0,-1px);opacity:.6}75%{clip-path:inset(20% 0 65% 0);transform:translate(0,3px);opacity:.8}}
@keyframes gl-flicker{0%,100%{opacity:1}3%{opacity:.2}6%{opacity:1}50%{opacity:.3}52%{opacity:1}}
@keyframes gl-reveal{0%{clip-path:inset(100% 0 0 0)}50%{clip-path:inset(0% 0 0 0)}65%{clip-path:inset(0 0 0 0);transform:translate(-2px,0)}80%{clip-path:inset(0 0 0 0);transform:translate(2px,0)}100%{clip-path:inset(0 0 0 0);transform:translate(0,0)}}
.gl-wrap{position:absolute;inset:0;overflow:hidden;animation:gl-flicker .22s steps(1) 3}
.gl-wrap img.gl-main{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;animation:gl-reveal .45s cubic-bezier(.22,1,.36,1) forwards}
.gl-wrap::before,.gl-wrap::after{content:'';position:absolute;inset:0;background-size:cover;background-position:center top;pointer-events:none}
.gl-wrap::before{mix-blend-mode:screen;opacity:.55;animation:gl-h .35s steps(1) 4 .05s}
.gl-wrap::after{mix-blend-mode:screen;opacity:.45;animation:gl-v .35s steps(1) 4 .1s}
.gl-scan{position:absolute;inset:0;pointer-events:none;z-index:2;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.18) 2px,rgba(0,0,0,.18) 4px);animation:gl-flicker .22s steps(1) 3}`

const CHAIR_CSS = `
@keyframes chair-in{0%{opacity:0;transform:translateY(-28px) scaleY(.92);filter:blur(6px) brightness(2)}40%{opacity:1;filter:blur(2px) brightness(1.4)}70%{transform:translateY(4px) scaleY(1.01);filter:blur(0) brightness(1)}100%{transform:translateY(0) scaleY(1);filter:blur(0) brightness(1)}}
@keyframes chair-pulse{0%,100%{box-shadow:0 0 0 0 transparent}30%{box-shadow:0 0 48px 8px var(--cc)}60%{box-shadow:0 0 24px 2px var(--cc)}}
.chair-reveal{animation:chair-in .65s cubic-bezier(.22,1,.36,1) forwards,chair-pulse 1s ease .3s 1}`

function getRegions(p: TeamMember): string[] {
    if (!p.region) return []
    return Array.isArray(p.region) ? p.region : [p.region]
}
function formatRegions(r: string[]): string {
    if (!r.length) return ''
    if (r.length === 1) return r[0]
    if (r.length === 2) return `${r[0]} & ${r[1]}`
    return `${r.slice(0, -1).join(', ')} & ${r[r.length - 1]}`
}

function RegionBadge({ person, accent }: { person: TeamMember; accent: string }) {
    const r = getRegions(person)
    if (!r.length) return null
    return (
        <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: `${accent}cc`, padding: '3px 9px', borderRadius: 100,
            border: `1px solid ${accent}30`, background: `${accent}0e`, whiteSpace: 'nowrap', flexShrink: 0
        }}>
            {formatRegions(r)}
        </span>
    )
}

function GlitchImage({ normalSrc, alterSrc, name, isGlitched, accent }: {
    normalSrc?: string | null; alterSrc?: string | null; name: string; isGlitched: boolean; accent: string
}) {
    const [phase, setPhase] = useState<'normal' | 'glitching' | 'alter'>('normal')
    useEffect(() => {
        let t: ReturnType<typeof setTimeout>
        if (isGlitched && phase === 'normal' && alterSrc) { setPhase('glitching'); t = setTimeout(() => setPhase('alter'), 520) }
        if (!isGlitched && phase !== 'normal') { setPhase('glitching'); t = setTimeout(() => setPhase('normal'), 520) }
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGlitched])
    const shown = phase === 'normal' ? normalSrc : alterSrc
    const hidden = phase === 'normal' ? alterSrc : normalSrc
    const is: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }
    if (!shown) return (
        <div style={{
            position: 'absolute', inset: 0, background: `linear-gradient(160deg,${accent}1a,${accent}06)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '5rem', color: `${accent}70`, letterSpacing: '-0.04em'
        }}>
            {name[0]}
        </div>
    )
    if (phase === 'glitching' && hidden) return (
        <div className="gl-wrap">
            <img className="gl-main" src={shown} alt={name} />
            <div className="gl-scan" />
            <style>{`.gl-wrap::before{background-image:url(${shown});filter:hue-rotate(90deg)}.gl-wrap::after{background-image:url(${shown});filter:hue-rotate(-90deg)}`}</style>
        </div>
    )
    return <img src={shown} alt={name} style={is} />
}

const GH = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
)
const LI = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
    </svg>
)

function linkBtn(href: string, accent: string, icon: React.ReactNode, label: string) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer"
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 10,
                background: `${accent}12`, border: `1px solid ${accent}28`, color: accent, fontSize: 13,
                fontWeight: 700, textDecoration: 'none', alignSelf: 'flex-start', transition: 'background 0.2s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accent}22` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accent}12` }}>
            {icon}{label}
        </a>
    )
}

function MobileCard({ person, isGlitched }: { person: TeamMember; isGlitched: boolean }) {
    const a = person.accent ?? '#f2f2f2'
    const g = isGlitched && !!person.alterEnabled
    const name = (g && person.alterName) || person.name
    const title = (g && person.alterTitle) || person.title
    const github = g ? person.alterGithub : null
    const linked = g ? null : person.linkedin
    return (
        <div style={{
            background: 'rgba(8,8,8,0.96)', border: `1px solid ${a}1e`, borderRadius: 16,
            overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%'
        }}>
            <div style={{
                position: 'relative', width: '100%', paddingTop: '90%', flexShrink: 0,
                backgroundColor: `${a}0a`, overflow: 'hidden'
            }}>
                <GlitchImage normalSrc={person.image} alterSrc={person.alterEnabled ? person.alterImage : null}
                    name={person.name} isGlitched={g} accent={a} />
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
                    background: 'linear-gradient(to bottom,transparent,rgba(8,8,8,0.93))', pointerEvents: 'none'
                }} />
            </div>
            <div style={{ padding: '12px 13px 15px', display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                <span style={{ color: a, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{person.role}</span>
                <h3 style={{ fontWeight: 800, fontSize: '0.90rem', color: '#f2f2f2', margin: 0, lineHeight: 1.2 }}>{name}</h3>
                {title && <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{title}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, gap: 6, flexWrap: 'wrap' }}>
                    <RegionBadge person={person} accent={a} />
                    {linked && <a href={linked} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: a, fontSize: 10, fontWeight: 700, textDecoration: 'none', opacity: .75 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                        LinkedIn
                    </a>}
                    {github && <a href={github} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: a, fontSize: 10, fontWeight: 700, textDecoration: 'none', opacity: .75 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
                        GitHub
                    </a>}
                </div>
            </div>
        </div>
    )
}

function DesktopCard({ person, isGlitched }: { person: TeamMember; isGlitched: boolean }) {
    const a = person.accent ?? '#f2f2f2'
    const g = isGlitched && !!person.alterEnabled
    const name = (g && person.alterName) || person.name
    const title = (g && person.alterTitle) || person.title
    const bio = (g && person.alterBio) || person.bio
    const github = g ? person.alterGithub : null
    const linked = g ? null : person.linkedin
    return (
        <div style={{
            background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)', border: `1px solid ${a}22`,
            borderRadius: 24, display: 'flex', flexDirection: 'row', alignItems: 'stretch',
            boxShadow: `0 0 48px ${a}0c`, overflow: 'hidden', transition: 'box-shadow 0.3s,border-color 0.3s', height: '100%'
        }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 64px ${a}1a`; (e.currentTarget as HTMLElement).style.borderColor = `${a}40` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 48px ${a}0c`; (e.currentTarget as HTMLElement).style.borderColor = `${a}22` }}>
            <div style={{ width: '38%', flexShrink: 0, position: 'relative', minHeight: 300, overflow: 'hidden', backgroundColor: `${a}0a` }}>
                <GlitchImage normalSrc={person.image} alterSrc={person.alterEnabled ? person.alterImage : null}
                    name={person.name} isGlitched={g} accent={a} />
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: '36px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: a, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{person.role}</span>
                    <RegionBadge person={person} accent={a} />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.85rem', color: '#f2f2f2', margin: '0 0 4px', lineHeight: 1.1 }}>{name}</h3>
                {title && <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13, marginBottom: bio ? 16 : 20 }}>{title}</p>}
                {bio && <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.92rem', lineHeight: 1.8, marginBottom: 24, flex: 1 }}>{bio}</p>}
                {linked && linkBtn(linked, a, <LI />, 'LinkedIn')}
                {github && linkBtn(github, a, <GH />, 'GitHub')}
            </div>
        </div>
    )
}

function ChairCard({ person, onDismiss, isMobile }: { person: ChairPerson; onDismiss: () => void; isMobile: boolean }) {
    const a = person.accent ?? '#FFB800'
    return (
        <div className="chair-reveal" style={{
            ['--cc' as string]: `${a}40`, position: 'relative',
            background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(24px)', border: `1px solid ${a}44`,
            borderRadius: 28, overflow: 'hidden', marginBottom: isMobile ? 20 : 32,
            display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch',
            boxShadow: `0 0 80px ${a}1a`
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 2,
                background: `linear-gradient(90deg,transparent,${a}88,${a},${a}88,transparent)`
            }} />
            <button onClick={onDismiss} style={{
                position: 'absolute', top: 14, right: 14, zIndex: 3,
                width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
            }}>✕</button>
            {!isMobile && person.image && (
                <div style={{ width: '32%', flexShrink: 0, position: 'relative', minHeight: 340, overflow: 'hidden' }}>
                    <img src={person.image} alt={person.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                </div>
            )}
            <div style={{ flex: 1, minWidth: 0, padding: isMobile ? '20px 22px 28px' : '44px 44px 44px 40px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 12 }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100,
                        background: `${a}18`, border: `1px solid ${a}40`, color: a, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase'
                    }}>
                        ♛ {person.role}
                    </span>
                </div>
                <h2 style={{ fontWeight: 800, fontSize: isMobile ? '1.8rem' : '2.6rem', color: '#f2f2f2', margin: '0 0 6px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>{person.name}</h2>
                {person.title && <p style={{ color: `${a}99`, fontSize: isMobile ? 12 : 14, fontWeight: 600, marginBottom: 16 }}>{person.title}</p>}
                {person.bio && <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: isMobile ? '0.88rem' : '0.96rem', lineHeight: 1.85, marginBottom: 24, flex: 1 }}>{person.bio}</p>}
                {person.github && linkBtn(person.github, a, <GH />, 'GitHub')}
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeamPage() {
    const isMobile = useIsMobile(640)
    const team = (Array.isArray(leadership) ? leadership : []) as TeamMember[]
    const [glitched, setGlitched] = useState<Set<string>>(new Set())
    const [chairRevealed, setChairRevealed] = useState(false)
    const [query, setQuery] = useState('')

    useEffect(() => {
        injectCSS('gl-styles', GLITCH_CSS)
        injectCSS('chair-styles', CHAIR_CSS)
    }, [])

    useEffect(() => {
        ; (window as any).showAlter = (name: string, enable = true) => {
            const q = name.toLowerCase()
            const m = team.find(p => p.alterEnabled && p.name.toLowerCase().includes(q))
            if (!m) { console.warn(`[showAlter] No alterable match for "${name}"`); return }
            if (enable && !m.alterImage) { console.warn(`[showAlter] "${m.name}" has no alterImage`); return }
            setGlitched(prev => { const n = new Set(prev); enable ? n.add(m.name) : n.delete(m.name); return n })
        }
        return () => { delete (window as any).showAlter }
    }, [team])

    useEffect(() => {
        const chair = (leadership as any).trueChairPerson as ChairPerson | undefined
            ; (window as any).showRealHead = (enable = true) => {
                if (!chair) { console.warn('[showRealHead] No trueChairPerson in config'); return }
                setChairRevealed(!!enable)
                if (enable) console.log(`%c♛ ${chair.name}`, 'color:#FFB800;font-weight:bold;font-size:13px;')
            }
        return () => { delete (window as any).showRealHead }
    }, [])

    // Music crescendo — auto-glitch all alterable members
    useEffect(() => {
        const handler = (e: Event) => {
            const { active } = (e as CustomEvent<{ active: boolean }>).detail
            const names = team.filter(p => p.alterEnabled && p.alterImage).map(p => p.name)
            setGlitched(prev => {
                const n = new Set(prev)
                names.forEach(nm => active ? n.add(nm) : n.delete(nm))
                return n
            })
        }
        window.addEventListener('mp:crescendo', handler)
        return () => window.removeEventListener('mp:crescendo', handler)
    }, [team])

    const chair = (leadership as any).trueChairPerson as ChairPerson | undefined

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return team
        return team.filter(p => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || (p.title ?? '').toLowerCase().includes(q))
    }, [team, query])

    return (
        <Layout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                <header style={{ paddingTop: '24px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#555', marginBottom: '14px' }}>
                        Stateless Labs
                    </p>
                    <h1 style={{ fontSize: 'clamp(36px,5vw,56px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, color: '#f2f2f2', marginBottom: '16px' }}>
                        Leadership
                    </h1>
                    <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.7, maxWidth: '480px' }}>
                        The people behind Stateless Labs.
                    </p>
                </header>

                <div style={{ position: 'relative', maxWidth: '320px' }}>
                    <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}
                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input type="text" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12,
                            padding: '10px 14px 10px 36px', color: '#f2f2f2', fontSize: 13, outline: 'none'
                        }} />
                </div>

                <div>
                    {chairRevealed && chair && <ChairCard person={chair} isMobile={isMobile} onDismiss={() => setChairRevealed(false)} />}
                    {filtered.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '80px 0' }}>No results for "{query}"</p>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : `repeat(${Math.min(filtered.length, 2)},1fr)`,
                            gap: isMobile ? 10 : 24, alignItems: 'start'
                        }}>
                            {filtered.map(p => isMobile
                                ? <MobileCard key={p.name} person={p} isGlitched={glitched.has(p.name)} />
                                : <DesktopCard key={p.name} person={p} isGlitched={glitched.has(p.name)} />
                            )}
                        </div>
                    )}
                </div>

                <p style={{ fontSize: '10px', color: '#1a1a1a', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', paddingBottom: '16px' }}>
                    Try showAlter('name') in the console
                </p>
            </div>
        </Layout>
    )
}