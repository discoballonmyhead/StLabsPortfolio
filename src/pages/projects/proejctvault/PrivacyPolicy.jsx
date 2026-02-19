import { PrivacyLayout } from '../shared'

export default function EmailPrivacy() {
  return (
    <PrivacyLayout
      appName="Email App"
      appPath="/projects/emailapp"
      updated="February 19, 2026"
      contact="your@email.com"
      androidPermission={false}
      extraSections={[
        {
          label: '5. Email Credentials',
          content: <p style={{ fontSize: '14px', color: '#777', lineHeight: '1.8', maxWidth: '600px' }}>
            Email account credentials (username, password, server settings) are stored locally on your device using secure storage. They are never transmitted to any server operated by this studio. They are used only to connect directly to your email provider.
          </p>
        }
      ]}
    />
  )
}
