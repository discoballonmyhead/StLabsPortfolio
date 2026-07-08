/**
 * DeleteAccountPage.tsx
 *
 * Reusable account + data deletion request form.
 * Called from any project route: /projects/<slug>/delete-account
 *
 * The form POSTs to a Google Apps Script Web App URL which writes
 * the request to a Google Sheet. Free, no backend needed, works on
 * GitHub Pages.
 *
 * Config:
 *   site.config.ts → deletionConfig.scriptUrl    — the deployed Apps Script URL
 *   ProjectConfig  → deletion.identifierLabel     — "Email address" | "Username" | etc.
 *                  → deletion.extraNote           — optional extra note shown on form
 *                  → deletion.appIconPath         — defaults to project appIconPath
 */

import { useState } from 'react'
import { Layout, Breadcrumb } from '@/components'
import { projects, deletionConfig } from '@/config'

interface Props {
    slug: string
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

// ── Icon helpers ──────────────────────────────────────────────────────────────
const CheckIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)
const AlertIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
)

// ── Field style helpers ───────────────────────────────────────────────────────
const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: '8px',
}

function inputStyle(focused: boolean): React.CSSProperties {
    return {
        width: '100%',
        boxSizing: 'border-box',
        background: '#0a0a0a',
        border: `1px solid ${focused ? '#3a3a3a' : '#1e1e1e'}`,
        borderRadius: '7px',
        padding: '12px 14px',
        color: '#f2f2f2',
        fontSize: '14px',
        outline: 'none',
        fontFamily: 'var(--font)',
        lineHeight: 1.5,
        transition: 'border-color 0.15s',
    }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DeleteAccountPage({ slug }: Props) {
    const project = projects.find(p => p.slug === slug)

    const [identifier, setIdentifier] = useState('')
    const [reason, setReason] = useState('')
    const [confirm, setConfirm] = useState(false)
    const [formState, setFormState] = useState<FormState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [focusedField, setFocused] = useState<string | null>(null)

    if (!project) return null

    const appName = project.name
    const label = project.deletion?.identifierLabel ?? 'Email address or username'
    const extraNote = project.deletion?.extraNote
    const scriptUrl = deletionConfig.scriptUrl
    const iconPath = project.appIconPath

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!identifier.trim() || !confirm) return

        setFormState('submitting')
        setErrorMsg('')

        try {
            // Google Apps Script accepts form-encoded POST
            // Using no-cors mode because Apps Script returns an opaque response
            // (the script itself handles CORS headers but fetch still sees opaque)
            const body = new URLSearchParams({
                app: appName,
                slug: slug,
                identifier: identifier.trim(),
                reason: reason.trim() || 'No reason provided',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
            })

            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',   // Apps Script deployed as "anyone" requires this from cross-origin
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            })

            // With no-cors we can't read the response — if fetch didn't throw, treat as success
            setFormState('success')
        } catch (err) {
            setFormState('error')
            setErrorMsg('Could not send request. Please try again or contact support directly.')
        }
    }

    const isValid = identifier.trim().length > 0 && confirm
    const busy = formState === 'submitting'

    return (
        <Layout>
            <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                <Breadcrumb items={[
                    { label: 'Home', path: '/' },
                    { label: 'Projects', path: '/projects' },
                    { label: appName, path: `/projects/${slug}` },
                    { label: 'Delete Account' },
                ]} />

                {/* App identity header */}
                <header style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {iconPath && (
                        <img src={iconPath} alt={appName}
                            style={{ width: '52px', height: '52px', borderRadius: '12px', border: '1px solid #1e1e1e', flexShrink: 0 }} />
                    )}
                    <div>
                        <p style={{
                            fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em',
                            textTransform: 'uppercase', color: '#555', marginBottom: '4px'
                        }}>
                            {appName}
                        </p>
                        <h1 style={{
                            fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 700,
                            letterSpacing: '-0.02em', lineHeight: 1.1, color: '#f2f2f2'
                        }}>
                            Delete Account &amp; Data
                        </h1>
                    </div>
                </header>

                {/* Warning notice */}
                <div style={{
                    background: 'rgba(220,60,60,0.06)',
                    border: '1px solid rgba(220,60,60,0.18)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc3c3c"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#dc3c3c', marginBottom: '4px' }}>
                            This action is permanent
                        </p>
                        <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.6 }}>
                            Submitting this form sends a deletion request to our team. Your account and all
                            associated data will be permanently deleted within <strong style={{ color: '#aaa' }}>30 days</strong>.
                            This cannot be undone.
                        </p>
                    </div>
                </div>

                {/* ── Success state ── */}
                {formState === 'success' && (
                    <div style={{
                        background: 'rgba(0,200,100,0.06)',
                        border: '1px solid rgba(0,200,100,0.20)',
                        borderRadius: '10px',
                        padding: '28px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'center',
                    }}>
                        <div style={{ color: '#00c864' }}><CheckIcon /></div>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#f2f2f2' }}>
                            Request received
                        </p>
                        <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.7, maxWidth: '360px' }}>
                            Your deletion request has been submitted. Our team will process it within 30 days
                            and you will receive a confirmation if an email address was provided.
                        </p>
                        <p style={{ fontSize: '11px', color: '#444', marginTop: '4px' }}>
                            Reference: {appName} · {new Date().toLocaleDateString()}
                        </p>
                    </div>
                )}

                {/* ── Form ── */}
                {formState !== 'success' && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Identifier field */}
                        <div>
                            <label style={fieldLabel} htmlFor="del-identifier">{label}</label>
                            <input
                                id="del-identifier"
                                type="text"
                                placeholder={label}
                                value={identifier}
                                onChange={e => setIdentifier(e.target.value)}
                                onFocus={() => setFocused('id')}
                                onBlur={() => setFocused(null)}
                                disabled={busy}
                                required
                                autoComplete="email"
                                style={inputStyle(focusedField === 'id')}
                            />
                            <p style={{ fontSize: '11px', color: '#444', marginTop: '6px' }}>
                                Enter the {label.toLowerCase()} associated with your {appName} account.
                            </p>
                        </div>

                        {/* Reason field (optional) */}
                        <div>
                            <label style={fieldLabel} htmlFor="del-reason">
                                Reason for deletion
                                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#444', marginLeft: '6px' }}>
                                    (optional)
                                </span>
                            </label>
                            <textarea
                                id="del-reason"
                                placeholder="Help us improve — why are you deleting your account?"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                onFocus={() => setFocused('reason')}
                                onBlur={() => setFocused(null)}
                                disabled={busy}
                                rows={3}
                                style={{ ...inputStyle(focusedField === 'reason'), resize: 'vertical', minHeight: '80px' }}
                            />
                        </div>

                        {/* Extra note from project config */}
                        {extraNote && (
                            <p style={{
                                fontSize: '12px', color: '#555', lineHeight: 1.7,
                                background: '#0f0f0f', border: '1px solid #1a1a1a',
                                borderRadius: '6px', padding: '10px 12px'
                            }}>
                                {extraNote}
                            </p>
                        )}

                        {/* Confirmation checkbox */}
                        <label style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            cursor: busy ? 'not-allowed' : 'pointer',
                            padding: '14px',
                            background: confirm ? 'rgba(220,60,60,0.05)' : '#0a0a0a',
                            border: `1px solid ${confirm ? 'rgba(220,60,60,0.20)' : '#1e1e1e'}`,
                            borderRadius: '7px',
                            transition: 'background 0.15s, border-color 0.15s',
                            userSelect: 'none',
                        }}>
                            <input
                                type="checkbox"
                                checked={confirm}
                                onChange={e => setConfirm(e.target.checked)}
                                disabled={busy}
                                style={{ marginTop: '2px', accentColor: '#dc3c3c', cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: '13px', color: '#888', lineHeight: 1.6 }}>
                                I understand that deleting my account is <strong style={{ color: '#aaa' }}>permanent and irreversible</strong>.
                                All my data in {appName} will be deleted and cannot be recovered.
                            </span>
                        </label>

                        {/* Error message */}
                        {formState === 'error' && (
                            <div style={{
                                display: 'flex', gap: '10px', alignItems: 'flex-start',
                                background: 'rgba(220,60,60,0.06)', border: '1px solid rgba(220,60,60,0.18)',
                                borderRadius: '7px', padding: '12px 14px',
                                color: '#dc3c3c', fontSize: '13px',
                            }}>
                                <AlertIcon />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!isValid || busy}
                            style={{
                                width: '100%',
                                padding: '13px 20px',
                                borderRadius: '8px',
                                background: isValid && !busy ? '#dc3c3c' : '#111',
                                border: `1px solid ${isValid && !busy ? '#dc3c3c' : '#222'}`,
                                color: isValid && !busy ? '#fff' : '#333',
                                fontSize: '13px',
                                fontWeight: 600,
                                letterSpacing: '0.04em',
                                cursor: isValid && !busy ? 'pointer' : 'not-allowed',
                                transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                            onMouseEnter={e => { if (isValid && !busy) (e.currentTarget as HTMLElement).style.background = '#c43535' }}
                            onMouseLeave={e => { if (isValid && !busy) (e.currentTarget as HTMLElement).style.background = '#dc3c3c' }}
                        >
                            {busy ? (
                                <>
                                    <span style={{
                                        width: '13px', height: '13px', borderRadius: '50%',
                                        border: '2px solid #333', borderTopColor: '#888',
                                        display: 'inline-block', animation: 'dal-spin 0.7s linear infinite',
                                    }} />
                                    Submitting…
                                </>
                            ) : (
                                'Submit Deletion Request'
                            )}
                        </button>

                        <p style={{ fontSize: '11px', color: '#333', textAlign: 'center', lineHeight: 1.6 }}>
                            By submitting you agree to our{' '}
                            <a href={`/projects/${slug}/privacy-policy`}
                                style={{ color: '#555', textDecoration: 'underline' }}>
                                Privacy Policy
                            </a>.
                            Requests are processed within 30 days.
                        </p>

                    </form>
                )}

            </div>

            <style>{`@keyframes dal-spin{to{transform:rotate(360deg)}}`}</style>
        </Layout>
    )
}