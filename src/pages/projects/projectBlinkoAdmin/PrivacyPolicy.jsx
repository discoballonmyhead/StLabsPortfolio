// pages/projects/blinkoanalytics/privacy-policy.jsx

import React from 'react'
import { PrivacyLayout } from '../shared'

export default function BlinkoAdminPrivacy() {
    const code = { fontFamily: 'monospace', fontSize: '12px', background: '#141414', border: '1px solid #222', padding: '1px 6px', borderRadius: '3px', color: '#888' }
    const text = { fontSize: '14px', color: '#777', lineHeight: '1.8', maxWidth: '600px' }
    const ul = { listStyle: 'none', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }
    const li = { fontSize: '14px', color: '#777', paddingLeft: '16px', position: 'relative', lineHeight: '1.6' }
    const dot = { position: 'absolute', left: 0, color: '#333' }

    const extraSections = [
        {
            label: '3. Internet Access',
            content: (
                <p style={text}>
                    The app requires an active internet connection to communicate with the Supabase backend.
                    This connection is used solely for authentication, reading and writing your profile and
                    business card data, and uploading images you explicitly select. No background data
                    collection occurs.
                </p>
            ),
        },
        {
            label: '4. Permissions',
            content: (
                <>
                    <p style={text}>The App requests the following device permissions:</p>
                    <ul style={ul}>
                        {[
                            [<><code style={code}>INTERNET</code> (Android / iOS)</>, 'Required to connect to Supabase. The app cannot function without it.'],
                            [<><code style={code}>READ_MEDIA_IMAGES</code> (Android 13+)</>, 'Required to pick a profile photo, company logo, or QR image from your gallery. Only accessed when you tap the upload button.'],
                            [<><code style={code}>READ_EXTERNAL_STORAGE</code> (Android ≤ 12)</>, 'Same purpose as above on older Android versions.'],
                            ['NSPhotoLibraryUsageDescription (iOS)', 'Required to pick images from your photo library.'],
                            ['NSPhotoLibraryAddUsageDescription (iOS)', 'Required to save a shared business card image to your camera roll.'],
                        ].map(([perm, desc], i) => (
                            <li key={i} style={li}><span style={dot}>—</span><span><strong style={{ color: '#999', fontWeight: '500' }}>{perm}</strong> — {desc}</span></li>
                        ))}
                    </ul>
                </>
            ),
        },
        {
            label: '5. Data Collected',
            content: (
                <>
                    <p style={text}>We collect only what you explicitly provide:</p>
                    <ul style={ul}>
                        {[
                            'Email address and hashed password — for account creation and sign-in',
                            'Full name, job title, phone number, business email — displayed on your digital business card',
                            'Company name, website, address, logo, and QR code image — shown on your card',
                            'Profile photo — shown in the card presentation view',
                            'Posts content and cover images — published to the company blog',
                        ].map(item => (
                            <li key={item} style={li}><span style={dot}>—</span>{item}</li>
                        ))}
                    </ul>
                    <p style={{ ...text, marginTop: '12px' }}>
                        We do not collect device identifiers, location data, usage analytics, or any data
                        not listed above. All data is stored in Supabase and never sold or shared with
                        third parties beyond what is required to operate the service.
                    </p>
                </>
            ),
        },
    ]

    return (
        <PrivacyLayout
            appName="Blinko Analytics"
            appPath="/projects/project-blinko-admin"
            updated="June 10, 2026"
            contact="privacy@blinko-analytics.com"
            androidPermission={false}
            summaryOverride="This app collects only what you explicitly provide to build your digital business card and company posts. No tracking, no ads."
            extraSections={extraSections}
        />
    )
}