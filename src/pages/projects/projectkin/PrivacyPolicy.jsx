import { PrivacyLayout } from '../shared'

export default function AuthPrivacy() {
  return (
    <PrivacyLayout
      appName="Auth App"
      appPath="/projects/authapp"
      updated="February 19, 2026"
      contact="your@email.com"
      androidPermission={false}
      extraSections={null}
    />
  )
}
