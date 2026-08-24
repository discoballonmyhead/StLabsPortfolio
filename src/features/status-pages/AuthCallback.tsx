/**
 * AuthCallback.tsx
 * src/features/status-pages/AuthCallback.tsx
 *
 * Route: /projects/<slug>/auth/callback
 *
 * ─── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 *
 * Supabase sends every outcome to the same redirect URL. A confirmed email and
 * an expired link both land on whatever you put in `emailRedirectTo`, with the
 * difference carried in the query string or the hash fragment rather than in
 * the path. So you cannot point Supabase at /confirm/success and expect it to
 * send failures somewhere else. It will cheerfully send failures there too.
 *
 * This page is the single address you give Supabase. It reads the outcome and
 * renders the right status page directly, with no redirect and no flash of the
 * wrong screen.
 *
 * ─── WHAT SUPABASE SENDS BACK ────────────────────────────────────────────────
 *
 *   Success, PKCE flow (the default for supabase-js v2):
 *     ?code=abc123
 *
 *   Success, implicit flow:
 *     #access_token=...&refresh_token=...&type=signup&expires_in=3600
 *
 *   Failure, either flow:
 *     ?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
 *     #error=access_denied&error_code=otp_expired&error_description=...
 *
 * `type` tells you which flow the user was in: signup, email_change, recovery,
 * magiclink, or invite. Both locations are parsed here because which one you
 * get depends on the flow and the client version.
 *
 * ─── ONE IMPORTANT CAVEAT ABOUT PASSWORD RESET ───────────────────────────────
 *
 * A successful `recovery` link does NOT mean the password changed. It means the
 * user now holds a session and is allowed to set a new one. Sending them to
 * "Password changed" at that moment would be a lie.
 *
 * So recovery success lands on `reset-sent` here, which reads as "the link
 * worked, carry on in the app". Show `reset-success` only after your app has
 * actually called updateUser({ password }). Set `recoveryRedirect` below to a
 * deep link into your app if you would rather hand off immediately.
 */

import { lazy, Suspense, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { projects } from '@/config'
import type { StatusPageType } from '@/config'

const StatusPage = lazy(() => import('./StatusPage'))

interface Props {
    slug: string
}

/**
 * Where a successful recovery link should go. Leave null to show the
 * reset-sent screen, which tells the user the link worked. Set it to a deep
 * link like 'blinko://reset' to hand straight off to a native app.
 */
const recoveryRedirect: string | null = null

type Flow = 'signup' | 'email_change' | 'recovery' | 'magiclink' | 'invite' | 'unknown'

interface Outcome {
    ok: boolean
    flow: Flow
    code?: string
    message?: string
}

/** Supabase puts params in the query on PKCE and in the hash on implicit. */
function readParams(search: string, hash: string): URLSearchParams {
    const merged = new URLSearchParams(search)
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    if (raw) {
        new URLSearchParams(raw).forEach((value, key) => {
            if (!merged.has(key)) merged.set(key, value)
        })
    }
    return merged
}

function readOutcome(search: string, hash: string): Outcome {
    const p = readParams(search, hash)

    const rawFlow = (p.get('type') ?? '').toLowerCase()
    const flow: Flow =
        rawFlow === 'signup' ? 'signup' :
            rawFlow === 'email_change' ? 'email_change' :
                rawFlow === 'recovery' ? 'recovery' :
                    rawFlow === 'magiclink' ? 'magiclink' :
                        rawFlow === 'invite' ? 'invite' :
                            'unknown'

    const error = p.get('error') ?? p.get('error_code')
    if (error) {
        return {
            ok: false,
            flow,
            code: p.get('error_code') ?? p.get('error') ?? undefined,
            message: p.get('error_description')?.replace(/\+/g, ' ') ?? undefined,
        }
    }

    // A code or an access token both mean Supabase verified the link.
    const verified = !!(p.get('code') || p.get('access_token') || p.get('token_hash'))

    // No params at all usually means someone opened the URL directly rather than
    // arriving from an email. Treat that as a failure, since there is nothing to
    // confirm and pretending otherwise would be misleading.
    return { ok: verified, flow }
}

function pickStatus(outcome: Outcome): StatusPageType {
    const { ok, flow } = outcome

    if (flow === 'recovery') return ok ? 'reset-sent' : 'reset-failed'
    if (flow === 'signup' || flow === 'email_change' || flow === 'invite') {
        return ok ? 'email-confirmed' : 'email-failed'
    }
    // magiclink and anything unrecognised are a plain sign in.
    return ok ? 'auth-success' : 'auth-failed'
}

export default function AuthCallback({ slug }: Props) {
    const location = useLocation()
    const project = projects.find(p => p.slug === slug)

    const outcome = useMemo(
        () => readOutcome(location.search, location.hash),
        [location.search, location.hash],
    )

    const status = pickStatus(outcome)

    // Optional hand off straight into a native app on a good recovery link.
    if (recoveryRedirect && outcome.ok && outcome.flow === 'recovery') {
        window.location.replace(recoveryRedirect)
        return null
    }

    if (!project) return null

    return (
        <Suspense fallback={null}>
            <StatusPage type={status} projectSlug={slug} />
        </Suspense>
    )
}