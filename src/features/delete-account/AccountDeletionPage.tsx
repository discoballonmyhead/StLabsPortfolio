/**
 * AccountDeletionPage.tsx
 * src/features/delete-account/AccountDeletionPage.tsx
 *
 * Route: whatever standaloneDeletion.path is set to, /delete-account by default.
 *
 * One address covering every app. The visitor picks which app from a dropdown
 * showing each icon, gives an email, and submits. It POSTs to the same Apps
 * Script endpoint as the per project form and lands in the same sheet, so there
 * is one queue to work through rather than several.
 *
 * WHY BOTH FORMS EXIST
 *   Per project, /projects/<slug>/delete-account, is what a store listing wants
 *   because it asks for a URL specific to that app. This one is what goes in a
 *   footer, a support reply, or an email signature, where the person may not
 *   know which of your apps they are dealing with.
 *
 * WHAT REACHES THE SHEET
 *   app         the display name of the chosen app
 *   slug        its slug, or 'other' when nothing matched
 *   identifier  whatever they typed in the email field
 *   reason      optional, or a placeholder when left blank
 *   timestamp   ISO, generated client side
 *   userAgent   browser string, useful when a request looks automated
 *
 * THE DROPDOWN
 *   A native select cannot show an icon per option, so this is a real listbox.
 *   It is keyboard operable: Enter or Space or ArrowDown opens it, arrows move,
 *   Enter picks, Escape closes and returns focus to the trigger. Clicking away
 *   closes it too.
 *
 * Classified projects never appear. Their existence is not advertised, and a
 * deletion dropdown is a silly place to leak it.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '@/components'
import { projects, assets, deletionConfig, standaloneDeletion, brand } from '@/config'

const ACCENT = '#FF8C55'
const DANGER = '#E5644E'
const OK = '#4ade80'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

interface AppOption {
    slug: string
    name: string
    icon?: string
    meta?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────────────────

function buildOptions(): AppOption[] {
    const include = standaloneDeletion.includeSlugs

    // Add ": AppOption[]" here
    const list: AppOption[] = projects
        .filter(p => !(p as { classified?: boolean }).classified)
        .filter(p => (include ? include.includes(p.slug) : true))
        .map(p => ({
            slug: p.slug,
            name: p.name,
            icon: p.appIconPath ?? (assets as { defaultIcon?: string }).defaultIcon,
            meta: `${(p as any).platform} · ${(p as any).year}`,
        }))

    if (standaloneDeletion.allowOther) {
        list.push({ slug: 'other', name: standaloneDeletion.otherLabel }) // Now valid
    }

    return list
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon
// ─────────────────────────────────────────────────────────────────────────────
function AppIcon({ option, size = 26 }: { option: AppOption; size?: number }) {
    const [failed, setFailed] = useState(false)

    // Reset failed state when the selected option changes
    useEffect(() => {
        setFailed(false)
    }, [option.icon])

    // Handle the "Other" option natively for consistent UI
    if (option.slug === 'other') {
        return (
            <span
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    flexShrink: 0,
                    borderRadius: `${Math.round(size * 0.26)}px`,
                    border: '1px dashed var(--border-light, #2a2a2a)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-ghost, #4e4e4e)',
                    fontSize: `${Math.round(size * 0.5)}px`,
                }}
            >
                ?
            </span>
        )
    }

    if (!option.icon || failed) {
        return (
            <span
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    flexShrink: 0,
                    borderRadius: `${Math.round(size * 0.26)}px`,
                    border: '1px solid var(--border-strong, #1a1a1a)',
                    background: 'rgba(255,255,255,0.035)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: `${Math.round(size * 0.42)}px`,
                    fontWeight: 700,
                    color: 'var(--text-faint, #6a6a6a)',
                }}
            >
                {option.name[0]}
            </span>
        )
    }

    return (
        <img
            src={option.icon}
            alt=""
            onError={() => setFailed(true)}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                flexShrink: 0,
                borderRadius: `${Math.round(size * 0.26)}px`,
                border: '1px solid var(--border-strong, #1a1a1a)',
                objectFit: 'cover',
                display: 'block',
            }}
        />
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// App picker
// ─────────────────────────────────────────────────────────────────────────────

function AppPicker({
    options,
    value,
    onChange,
    disabled,
}: {
    options: AppOption[]
    value: AppOption | null
    onChange: (o: AppOption) => void
    disabled: boolean
}) {
    const [open, setOpen] = useState(false)
    const [cursor, setCursor] = useState(0)
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    // Close on click away
    useEffect(() => {
        if (!open) return
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    // Keep the highlighted row in view
    useEffect(() => {
        if (!open) return
        listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
            ?.scrollIntoView({ block: 'nearest' })
    }, [cursor, open])

    const commit = (o: AppOption) => {
        onChange(o)
        setOpen(false)
        triggerRef.current?.focus()
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return

        if (!open) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault()
                setOpen(true)
                setCursor(Math.max(0, options.findIndex(o => o.slug === value?.slug)))
            }
            return
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault()
                setOpen(false)
                triggerRef.current?.focus()
                break
            case 'ArrowDown':
                e.preventDefault()
                setCursor(c => (c + 1) % options.length)
                break
            case 'ArrowUp':
                e.preventDefault()
                setCursor(c => (c - 1 + options.length) % options.length)
                break
            case 'Home':
                e.preventDefault()
                setCursor(0)
                break
            case 'End':
                e.preventDefault()
                setCursor(options.length - 1)
                break
            case 'Enter':
            case ' ':
                e.preventDefault()
                if (options[cursor]) commit(options[cursor])
                break
        }
    }

    return (
        <div ref={rootRef} style={{ position: 'relative' }} onKeyDown={onKeyDown}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => {
                    setOpen(o => !o)
                    setCursor(Math.max(0, options.findIndex(o => o.slug === value?.slug)))
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '11px 13px',
                    background: 'var(--surface, #0a0a0a)',
                    border: `1px solid ${open ? ACCENT : 'var(--border-strong, #1e1e1e)'}`,
                    borderRadius: '8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                    opacity: disabled ? 0.55 : 1,
                }}
            >
                {value ? (
                    <>
                        <AppIcon option={value} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text, #f2f2f2)' }}>
                                {value.name}
                            </span>
                            {value.meta && (
                                <span style={{ fontSize: '11px', color: 'var(--text-ghost, #4e4e4e)' }}>{value.meta}</span>
                            )}
                        </span>
                    </>
                ) : (
                    <span style={{ flex: 1, fontSize: '13.5px', color: 'var(--text-faint, #6a6a6a)' }}>
                        {standaloneDeletion.appPlaceholder}
                    </span>
                )}

                <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                    style={{
                        flexShrink: 0,
                        color: open ? ACCENT : 'var(--text-faint, #6a6a6a)',
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.18s, color 0.15s',
                    }}
                    aria-hidden="true"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <ul
                    ref={listRef}
                    role="listbox"
                    aria-label={standaloneDeletion.appLabel}
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        zIndex: 60,
                        maxHeight: '286px',
                        overflowY: 'auto',
                        listStyle: 'none',
                        margin: 0,
                        padding: '5px',
                        background: 'rgba(10,10,10,0.985)',
                        backdropFilter: 'blur(14px)',
                        border: '1px solid var(--border-light, #262626)',
                        borderRadius: '10px',
                        boxShadow: '0 16px 44px rgba(0,0,0,0.65)',
                    }}
                >
                    {options.map((o, i) => {
                        const selected = o.slug === value?.slug
                        const active = i === cursor
                        return (
                            <li
                                key={o.slug}
                                data-index={i}
                                role="option"
                                aria-selected={selected}
                                onMouseEnter={() => setCursor(i)}
                                onClick={() => commit(o)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '11px',
                                    padding: '9px 10px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    background: active ? 'rgba(255,140,85,0.10)' : 'transparent',
                                    transition: 'background 0.12s',
                                }}
                            >

                                <AppIcon option={o} />


                                <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0, flex: 1 }}>
                                    <span
                                        style={{
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: active ? ACCENT : 'var(--text, #f2f2f2)',
                                            transition: 'color 0.12s',
                                        }}
                                    >
                                        {o.name}
                                    </span>
                                    {o.meta && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-ghost, #4e4e4e)' }}>{o.meta}</span>
                                    )}
                                </span>

                                {selected && (
                                    <svg
                                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT}
                                        strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ flexShrink: 0 }} aria-hidden="true"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Field helpers
// ─────────────────────────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.11em',
    textTransform: 'uppercase',
    color: 'var(--text-faint, #6a6a6a)',
    marginBottom: '9px',
}

function inputStyle(focused: boolean, disabled: boolean): React.CSSProperties {
    return {
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--surface, #0a0a0a)',
        border: `1px solid ${focused ? ACCENT : 'var(--border-strong, #1e1e1e)'}`,
        borderRadius: '8px',
        padding: '12px 13px',
        color: 'var(--text, #f2f2f2)',
        fontSize: '14px',
        fontFamily: 'inherit',
        lineHeight: 1.5,
        outline: 'none',
        transition: 'border-color 0.15s',
        opacity: disabled ? 0.55 : 1,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AccountDeletionPage() {
    const cfg = standaloneDeletion
    const options = buildOptions()

    const [app, setApp] = useState<AppOption | null>(null)
    const [identifier, setIdentifier] = useState('')
    const [reason, setReason] = useState('')
    const [confirm, setConfirm] = useState(false)
    const [state, setState] = useState<FormState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [focused, setFocused] = useState<string | null>(null)
    const [touched, setTouched] = useState(false)

    const busy = state === 'submitting'
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())
    const valid = !!app && emailOk && confirm

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setTouched(true)
        if (!valid || busy) return

        setState('submitting')
        setErrorMsg('')

        try {
            const body = new URLSearchParams({
                app: app!.name,
                slug: app!.slug,
                identifier: identifier.trim(),
                reason: reason.trim() || 'No reason provided',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                // Ignored by the current script. Add a Source column to
                // deletion-script.gs if you want to tell the two forms apart.
                source: 'standalone',
            })

            await fetch(deletionConfig.scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            })

            // no-cors means the response is opaque, so a request that did not throw
            // is treated as delivered. The Executions tab in Apps Script is the only
            // reliable place to confirm it landed.
            setState('success')
        } catch {
            setState('error')
            setErrorMsg('The request could not be sent. Check your connection and try again, or email us directly.')
        }
    }

    return (
        <Layout>
            <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Header */}
                <header style={{ paddingTop: '16px' }}>
                    <p
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'var(--text-dim, #555)',
                            margin: '0 0 12px',
                        }}
                    >
                        {cfg.eyebrow}
                    </p>
                    <h1
                        style={{
                            fontSize: 'clamp(28px, 4.2vw, 42px)',
                            fontWeight: 700,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.08,
                            color: 'var(--text, #f2f2f2)',
                            margin: '0 0 14px',
                        }}
                    >
                        {cfg.heading}
                    </h1>
                    <p style={{ fontSize: '14.5px', color: 'var(--text-muted, #8a8a8a)', lineHeight: 1.8, margin: 0 }}>
                        {cfg.subtext}
                    </p>
                </header>

                {/* ── Success ── */}
                {state === 'success' ? (
                    <div
                        style={{
                            background: 'rgba(74,222,128,0.05)',
                            border: '1px solid rgba(74,222,128,0.22)',
                            borderRadius: '12px',
                            padding: '34px 26px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '14px',
                            textAlign: 'center',
                        }}
                    >
                        <span
                            style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                border: `1px solid rgba(74,222,128,0.35)`,
                                background: 'rgba(74,222,128,0.08)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                color: OK,
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </span>

                        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text, #f2f2f2)', margin: 0 }}>
                            {cfg.successHeading}
                        </p>
                        <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #8a8a8a)', lineHeight: 1.8, maxWidth: '380px', margin: 0 }}>
                            {cfg.successBody}
                        </p>

                        <div
                            style={{
                                marginTop: '6px',
                                paddingTop: '16px',
                                borderTop: '1px solid var(--border-faint, #141414)',
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                            }}
                        >
                            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11.5px', color: 'var(--text-ghost, #4e4e4e)' }}>
                                {app?.name} · {new Date().toLocaleDateString()}
                            </span>
                            <Link
                                to="/"
                                style={{ fontSize: '12.5px', color: ACCENT, textDecoration: 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                                Back to the site
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Warning ── */}
                        <div
                            style={{
                                background: 'rgba(229,100,78,0.05)',
                                border: '1px solid rgba(229,100,78,0.20)',
                                borderRadius: '10px',
                                padding: '15px 17px',
                                display: 'flex',
                                gap: '13px',
                                alignItems: 'flex-start',
                            }}
                        >
                            <svg
                                width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={DANGER}
                                strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
                                style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true"
                            >
                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: DANGER, margin: '0 0 5px' }}>
                                    This cannot be undone
                                </p>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted, #8a8a8a)', lineHeight: 1.75, margin: 0 }}>
                                    The account and everything attached to it is removed within{' '}
                                    <strong style={{ color: 'var(--text, #f2f2f2)' }}>{cfg.processingDays} days</strong>.
                                    There is no recovery window and no archived copy.
                                </p>
                            </div>
                        </div>

                        {/* ── Form ── */}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

                            {/* App */}
                            <div>
                                <label style={fieldLabel} htmlFor="del-app">{cfg.appLabel}</label>
                                <AppPicker options={options} value={app} onChange={setApp} disabled={busy} />
                                {touched && !app && (
                                    <p style={{ fontSize: '11.5px', color: DANGER, margin: '7px 0 0' }}>
                                        Pick which app this is about.
                                    </p>
                                )}
                            </div>

                            {/* Identifier */}
                            <div>
                                <label style={fieldLabel} htmlFor="del-identifier">{cfg.identifierLabel}</label>
                                <input
                                    id="del-identifier"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                    onFocus={() => setFocused('id')}
                                    onBlur={() => setFocused(null)}
                                    disabled={busy}
                                    required
                                    style={inputStyle(focused === 'id', busy)}
                                />
                                <p style={{ fontSize: '11.5px', color: 'var(--text-ghost, #4e4e4e)', margin: '7px 0 0', lineHeight: 1.6 }}>
                                    {cfg.identifierHint}
                                </p>
                                {touched && identifier.trim() !== '' && !emailOk && (
                                    <p style={{ fontSize: '11.5px', color: DANGER, margin: '5px 0 0' }}>
                                        That does not look like an email address.
                                    </p>
                                )}
                            </div>

                            {/* Reason */}
                            <div>
                                <label style={fieldLabel} htmlFor="del-reason">
                                    {cfg.reasonLabel}
                                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-ghost, #4e4e4e)', marginLeft: '7px' }}>
                                        optional
                                    </span>
                                </label>
                                <textarea
                                    id="del-reason"
                                    rows={3}
                                    placeholder={cfg.reasonPlaceholder}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    onFocus={() => setFocused('reason')}
                                    onBlur={() => setFocused(null)}
                                    disabled={busy}
                                    style={{ ...inputStyle(focused === 'reason', busy), resize: 'vertical', minHeight: '84px' }}
                                />
                            </div>

                            {/* Confirm */}
                            <label
                                style={{
                                    display: 'flex',
                                    gap: '13px',
                                    alignItems: 'flex-start',
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    padding: '15px',
                                    background: confirm ? 'rgba(229,100,78,0.045)' : 'var(--surface, #0a0a0a)',
                                    border: `1px solid ${confirm ? 'rgba(229,100,78,0.24)' : 'var(--border-strong, #1e1e1e)'}`,
                                    borderRadius: '9px',
                                    transition: 'background 0.15s, border-color 0.15s',
                                    userSelect: 'none',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={confirm}
                                    onChange={e => setConfirm(e.target.checked)}
                                    disabled={busy}
                                    style={{ marginTop: '2px', accentColor: DANGER, cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                                />
                                <span style={{ fontSize: '13px', color: 'var(--text-muted, #8a8a8a)', lineHeight: 1.7 }}>
                                    {cfg.confirmText}
                                </span>
                            </label>

                            {/* Error */}
                            {state === 'error' && (
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-start',
                                        background: 'rgba(229,100,78,0.06)',
                                        border: '1px solid rgba(229,100,78,0.20)',
                                        borderRadius: '8px',
                                        padding: '13px 15px',
                                        color: DANGER,
                                        fontSize: '13px',
                                        lineHeight: 1.65,
                                    }}
                                >
                                    {errorMsg}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={!valid || busy}
                                style={{
                                    width: '100%',
                                    padding: '14px 20px',
                                    borderRadius: '9px',
                                    background: valid && !busy ? DANGER : 'var(--surface, #0f0f0f)',
                                    border: `1px solid ${valid && !busy ? DANGER : 'var(--border-strong, #1e1e1e)'}`,
                                    color: valid && !busy ? '#fff' : 'var(--text-ghost, #3a3a3a)',
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    fontFamily: 'inherit',
                                    cursor: valid && !busy ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '9px',
                                    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                                }}
                                onMouseEnter={e => { if (valid && !busy) e.currentTarget.style.background = '#D2543E' }}
                                onMouseLeave={e => { if (valid && !busy) e.currentTarget.style.background = DANGER }}
                            >
                                {busy ? (
                                    <>
                                        <span
                                            style={{
                                                width: '13px', height: '13px', borderRadius: '50%',
                                                border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
                                                display: 'inline-block', animation: 'adp-spin 0.7s linear infinite',
                                            }}
                                        />
                                        Sending
                                    </>
                                ) : (
                                    cfg.submitLabel
                                )}
                            </button>

                            <p style={{ fontSize: '11.5px', color: 'var(--text-ghost, #4e4e4e)', textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
                                Prefer to email? Write to{' '}
                                <a
                                    href={`mailto:${brand.email}`}
                                    style={{ color: 'var(--text-faint, #6a6a6a)', textDecoration: 'underline' }}
                                >
                                    {brand.email}
                                </a>{' '}
                                and it goes to the same queue.
                            </p>
                        </form>
                    </>
                )}
            </div>

            <style>{`@keyframes adp-spin { to { transform: rotate(360deg) } }`}</style>
        </Layout>
    )
}