// pages/projects/project-blinko-admin/index.jsx

import React from 'react'
import { Link } from 'react-router-dom'
import { Breadcrumb, Divider, SectionLabel, AppHeader, appStyles as s } from '../shared'

export default function BlinkoAdmin() {
    return (
        <div style={s.page}>
            <Breadcrumb items={[['Home', '/'], ['Projects', '/projects'], ['Blinko Analytics', null]]} />

            <AppHeader
                label="Mobile App · 2025"
                title="Blinko Analytics"
                tagline="Cross-platform admin platform for managing business cards, company posts, and team access"
                tags={['In Development', 'Flutter', 'Dart', 'Supabase']}
                statusTag="In Development"
            />

            <Divider />

            <div style={s.grid}>

                <section>
                    <SectionLabel>About</SectionLabel>
                    <p style={s.bodyText}>
                        Blinko Analytics is an internal admin application built for the Blinko Analytics company.
                        It gives every team member a digital business card they can present at events, and gives
                        content roles the ability to publish company posts — all from a single app that runs
                        natively on Android, iOS, macOS, Windows, Linux, and web from one Flutter codebase.
                    </p>
                    <p style={s.bodyText}>
                        The backend is Supabase: Postgres with row-level security, file storage for images and QR
                        codes, and Auth for email-based sign-in with confirmation flows. Role permissions are
                        enforced at the database layer so no client-side check can be bypassed.
                    </p>
                </section>

                <section>
                    <SectionLabel>Features</SectionLabel>
                    <ul style={s.featureList}>
                        {[
                            'Digital business cards with QR code, company logo, and selectable gradient background',
                            'Landscape presentation mode — card fills the screen at business events',
                            'Circle avatar overlapping the card corner in presentation view',
                            'Role-based access: Owner, Admin, Chief, SM, Marketing Head, Editor',
                            'Posts editor with Markdown, cover image upload, and draft / live toggle',
                            'Multi-platform file picker — Android, iOS, macOS, Windows, and web',
                            'Email confirmation flow with hosted success, failed, and confirmation pages',
                            'Localised in English and Vietnamese',
                            'Responsive shell — bottom nav on mobile, rail on tablet, side drawer on desktop',
                        ].map(f => (
                            <li key={f} style={s.featureItem}>
                                <span style={s.dash}>—</span>{f}
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <SectionLabel>Stack</SectionLabel>
                    <ul style={s.featureList}>
                        {[
                            'Flutter 3 — single codebase, six platforms',
                            'Dart — flutter_bloc / Cubit for state management',
                            'Supabase — Auth, Postgres, Storage, RLS policies',
                            'go_router — declarative routing with role-based redirects',
                            'flutter_localization — EN / VI',
                            'file_picker + image_picker — cross-platform uploads',
                            'share_plus + screenshot — business card sharing',
                        ].map(f => (
                            <li key={f} style={s.featureItem}>
                                <span style={s.dash}>—</span>{f}
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <SectionLabel>Download</SectionLabel>
                    <p style={s.bodyText}>Internal distribution. Available on both major app stores.</p>
                    <div style={s.storeRow}>
                        <a href="#" style={s.storeBtn}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#777' }}>
                            Google Play
                        </a>
                        <a href="#" style={s.storeBtn}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#777' }}>
                            App Store
                        </a>
                    </div>
                </section>

                <section>
                    <SectionLabel>Legal</SectionLabel>
                    <p style={s.bodyText}>
                        Personal data is stored securely via Supabase. No advertising SDKs or third-party
                        trackers are used. Users may request deletion of their account and all associated
                        data at any time.
                    </p>
                    <Link
                        to="/projects/project-blinko-admin/privacy-policy"
                        style={s.policyLink}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = '#555' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#777'; e.currentTarget.style.borderColor = '#2a2a2a' }}
                    >
                        Privacy Policy
                    </Link>
                </section>

            </div>
        </div>
    )
}