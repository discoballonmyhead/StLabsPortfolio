import { PrivacyLayout } from '../shared'

export default function ProjectVaultPrivacy() {
  return (
    <PrivacyLayout
      appName="CN PROJECT VAULT"
      appPath="/projects/project-vault"
      updated="February 19, 2026"
      contact="info@stateless-labs.com"
      androidPermission={false}
      extraSections={[
        {
          label: '5. Local Data Storage',
          content: (
            <p style={{ fontSize: '14px', color: '#777', lineHeight: '1.8', maxWidth: '600px' }}>
              Project Vault does not require any login. All sensitive data you store in the vault is saved locally on your device.
              No data is backed up to any server or cloud service. If you uninstall the app, all stored data will be permanently lost.
            </p>
          ),
        },
      ]}
    />
  );
}