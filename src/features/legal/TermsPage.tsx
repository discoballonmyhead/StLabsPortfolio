/**
 * TermsPage.tsx
 * src/features/legal/TermsPage.tsx
 *
 * Route: /projects/<slug>/terms
 *
 * The document is assembled from flags on the project rather than pasted prose,
 * so every app gets the same structure and you only ever describe what is
 * actually true of that app.
 *
 * From site.config.ts, on the project:
 *
 *   terms: {
 *     updated:        'July 26, 2026',
 *     contact:        'you@example.com',
 *     minimumAge:     13,        // omit or 0 to drop the age clause
 *     hasAccounts:    true,      // adds the account clause
 *     hasPayments:    true,      // adds the payments clause
 *     hasUserContent: true,      // adds the content and licence clause
 *     governingLaw:   'England and Wales',
 *     summaryOverride: '...',    // replaces the opening paragraph
 *     extraClauses: [{ title: '...', body: ['...'] }],
 *   }
 *
 * Leave `terms` off entirely and the page still renders using legalDefaults,
 * which is the right answer for a small offline tool with no accounts.
 *
 * This produces a readable starting point, not legal advice. If real money,
 * real user data, or real risk is involved, have a lawyer read it.
 */

import { projects, brand, legalDefaults } from '@/config'
import type { TermsClause } from '@/config'
import { LegalPage, Clause, LegalList, Callout, legalText } from './LegalShell'

interface Props {
    slug: string
}

export default function TermsPage({ slug }: Props) {
    const p = projects.find(x => x.slug === slug)
    if (!p) return null

    const t = p.terms
    const updated = t?.updated ?? legalDefaults.updated
    const contact = t?.contact ?? legalDefaults.contact
    const minAge = t?.minimumAge ?? legalDefaults.minimumAge
    const law = t?.governingLaw
    const base = `/projects/${p.slug}`

    // Clauses are collected first so the numbering stays correct no matter which
    // ones a given project switches on.
    const clauses: TermsClause[] = []

    clauses.push({
        title: 'Agreeing to these terms',
        body: [
            `By installing, opening, or otherwise using ${p.name}, you agree to what is written here. If you do not agree with something in this document, the honest answer is not to use the app.`,
            'If these terms change in a way that matters, the date at the top changes with them and material changes are announced in the app itself rather than quietly slipped in.',
        ],
    })

    if (minAge && minAge > 0) {
        clauses.push({
            title: 'Who can use it',
            body: [
                `${p.name} is intended for people aged ${minAge} and over. If you are under that age, please do not use it, and if you are a parent or guardian who believes a younger child has been using it, contact ${contact} and anything associated with them will be removed.`,
            ],
        })
    }

    if (t?.hasAccounts) {
        clauses.push({
            title: 'Your account',
            body: [
                'You are responsible for keeping your credentials to yourself and for anything done through your account. Choose a password you do not use anywhere else, and tell us promptly if you think someone else has got in.',
                'Accounts may be suspended where there is a genuine reason to think they are being used to break these terms, to attack the service, or to harm another person.',
            ],
        })
    }

    clauses.push({
        title: 'Acceptable use',
        body: [
            'Most of this is common sense, but written down so there is no argument about it later. While using the app, please do not:',
        ],
    })

    if (t?.hasUserContent) {
        clauses.push({
            title: 'Content you provide',
            body: [
                'Anything you upload or publish stays yours. You keep ownership, and nothing here transfers it.',
                'To actually show your content to the people you intend it for, we need permission to store it, back it up, and display it inside the app. That permission is limited to running the service and ends when you delete the content or your account.',
                'You are responsible for having the right to share whatever you upload, and for it not being unlawful or designed to harm someone.',
            ],
        })
    }

    if (t?.hasPayments) {
        clauses.push({
            title: 'Payments',
            body: [
                'Prices are shown before you commit to anything, and no charge happens without an explicit action from you.',
                'Where a purchase is made through Apple or Google, their store handles the payment, the receipt, and any refund. Their refund policy applies and their support is the fastest route to a resolution.',
                'Subscriptions renew until cancelled, and you can cancel at any time through the same store account you bought them with.',
            ],
        })
    }

    clauses.push({
        title: 'Availability, and things breaking',
        body: [
            `${p.name} is offered as it is. It is maintained with care, but it is not promised to be available at every moment, free of every bug, or suitable for any particular purpose you have in mind.`,
            'Features may change or be withdrawn. Where a change would cause you to lose something, reasonable notice is given so you can get your data out first.',
        ],
    })

    clauses.push({
        title: 'What belongs to whom',
        body: [
            `The app itself, its code, its design, and its name belong to ${brand.name}. Using the app does not transfer any of that to you.`,
            'Third party names and trade marks that appear in the app belong to their respective owners and are used only to describe real things.',
        ],
    })

    clauses.push({
        title: 'Limits on liability',
        body: [
            `To the extent the law allows, ${brand.name} is not liable for indirect or consequential loss arising from your use of ${p.name}, including lost data, lost profit, or lost time.`,
            'Nothing here tries to exclude liability for death, personal injury, or fraud caused by negligence, because that cannot lawfully be excluded and should not be.',
        ],
    })

    clauses.push({
        title: 'Ending things',
        body: [
            'You can stop using the app whenever you want, and you can request deletion of your account and data from the link below at any time.',
            'Access may be withdrawn where these terms are being broken in a way that puts other people or the service at risk.',
        ],
    })

    if (law) {
        clauses.push({
            title: 'Governing law',
            body: [
                `These terms are governed by the laws of ${law}, and any dispute that cannot be settled directly falls to the courts of ${law}.`,
                'This does not remove any protection you have under the consumer law of the country you live in.',
            ],
        })
    }

    if (t?.extraClauses?.length) clauses.push(...t.extraClauses)

    clauses.push({
        title: 'Getting in touch',
        body: [
            `Questions, complaints, and takedown requests all go to ${contact}. A real person reads that address.`,
        ],
    })

    const acceptableUseIndex = clauses.findIndex(c => c.title === 'Acceptable use')

    return (
        <LegalPage
            projectName={p.name}
            projectSlug={p.slug}
            title="Terms of Service"
            intro={t?.summaryOverride ?? legalDefaults.termsSummary}
            updated={updated}
            contact={contact}
            siblings={[
                { label: 'Terms of Service', path: `${base}/terms`, active: true },
                { label: 'Privacy Policy', path: `${base}/privacy-policy` },
                { label: 'Cookies', path: `${base}/cookies` },
                { label: 'Delete account', path: `${base}/delete-account` },
            ]}
        >
            {clauses.map((clause, i) => (
                <Clause
                    key={clause.title}
                    index={i + 1}
                    title={clause.title}
                    last={i === clauses.length - 1}
                >
                    {clause.body.map((para, j) => (
                        <p key={j} style={legalText}>{para}</p>
                    ))}

                    {/* The acceptable use list lives here rather than in the data, since
              it is the same everywhere and reads better as a list than prose. */}
                    {i === acceptableUseIndex && (
                        <LegalList
                            items={[
                                'Break the law with it, or use it to help someone else do so',
                                'Try to break, overload, or work around the security of the service',
                                'Pull it apart to extract credentials, keys, or other people\u2019s data',
                                'Harass, impersonate, or endanger another person through it',
                                'Resell or rebrand it as your own product',
                            ]}
                        />
                    )}

                    {clause.title === 'Ending things' && (
                        <Callout>
                            Deletion is permanent and processed within 30 days. There is a form
                            for it at <strong>{base}/delete-account</strong>, and it does not
                            require you to email anybody first.
                        </Callout>
                    )}
                </Clause>
            ))}
        </LegalPage>
    )
}