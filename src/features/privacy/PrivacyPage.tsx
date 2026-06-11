import { Link } from 'react-router-dom'
import { Layout, Breadcrumb } from '@/components'
import { projects } from '@/config'

interface Props {
  slug: string
}

const text: React.CSSProperties = {
  fontSize: '14px',
  color: '#aaa',
  lineHeight: 1.8,
  maxWidth: '600px',
}

const code: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  background: '#141414',
  border: '1px solid #222',
  padding: '1px 6px',
  borderRadius: '3px',
  color: '#888',
}

const ul: React.CSSProperties = {
  listStyle: 'none',
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '7px',
}

const li: React.CSSProperties = {
  fontSize: '14px',
  color: '#aaa',
  paddingLeft: '16px',
  position: 'relative',
  lineHeight: 1.6,
}

function Dash() {
  return <span style={{ position: 'absolute', left: 0, color: '#333' }}>&#8212;</span>
}

interface SectionProps {
  label: string
  children: React.ReactNode
  isLast?: boolean
}

function PolicySection({ label, children, isLast }: SectionProps) {
  return (
    <div style={{
      padding: '26px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
    }}>
      <p style={{
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#555',
        marginBottom: '10px',
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}

export default function PrivacyPage({ slug }: Props) {
  const p = projects.find(x => x.slug === slug)
  if (!p) return null

  const { privacy } = p
  const basePath = `/projects/${p.slug}`

  // Build section list dynamically from config
  const sections: { label: string; content: React.ReactNode }[] = []

  sections.push({
    label: '1. About',
    content: (
      <p style={text}>
        {p.name} is a mobile application{
          p.platform === 'Cross-platform' ? ' available on Android, iOS, macOS, Windows, Linux, and web' :
            p.platform === 'Mobile' ? ' available on Android and iOS' :
              ''
        }.{' '}
        {privacy.collectsData
          ? 'It connects to a backend service to provide its features.'
          : 'All processing is performed locally on the device.'}
      </p>
    ),
  })

  if (!privacy.collectsData && !privacy.dataCollected) {
    sections.push({
      label: '2. Data Collection',
      content: (
        <>
          <p style={text}>No data is collected, stored, transmitted, or shared. This includes:</p>
          <ul style={ul}>
            {[
              'No account or registration',
              'No analytics or crash reporting',
              'No advertising identifiers',
              'No location data',
              'No device identifiers',
              'No user data sent off-device',
            ].map(item => (
              <li key={item} style={li}><Dash />{item}</li>
            ))}
          </ul>
        </>
      ),
    })
  }

  if (privacy.internetAccess || !privacy.collectsData) {
    sections.push({
      label: `${sections.length + 1}. Internet Access`,
      content: (
        <p style={text}>
          {privacy.internetAccess ?? 'This app does not use an internet connection. No data is sent to any server.'}
        </p>
      ),
    })
  }

  if (privacy.permissions && privacy.permissions.length > 0) {
    sections.push({
      label: `${sections.length + 1}. Permissions`,
      content: (
        <>
          <p style={text}>The app requests the following device permissions:</p>
          <ul style={{ ...ul }}>
            {privacy.permissions.map((perm, i) => (
              <li key={i} style={li}>
                <Dash />
                <span>
                  <code style={code}>{perm.name}</code>
                  {' '}&mdash; {perm.purpose}
                </span>
              </li>
            ))}
          </ul>
        </>
      ),
    })
  } else if (privacy.androidPermission) {
    sections.push({
      label: `${sections.length + 1}. Permissions`,
      content: (
        <p style={text}>
          On Android, only the <code style={code}>VIBRATE</code> permission is declared,
          used for optional haptic feedback. No user dialog is shown and no data is
          collected through this permission. No permissions are requested on iOS.
        </p>
      ),
    })
  }

  if (!privacy.collectsData && !privacy.permissions) {
    sections.push({
      label: `${sections.length + 1}. Third-Party Services`,
      content: (
        <p style={text}>
          No third-party SDKs, analytics tools, advertising networks, or external
          services are integrated.
        </p>
      ),
    })
  }

  if (privacy.dataCollected && privacy.dataCollected.length > 0) {
    sections.push({
      label: `${sections.length + 1}. Data Collected`,
      content: (
        <>
          <p style={text}>We collect only what you explicitly provide:</p>
          <ul style={ul}>
            {privacy.dataCollected.map(item => (
              <li key={item} style={li}><Dash />{item}</li>
            ))}
          </ul>
          <p style={{ ...text, marginTop: '12px' }}>
            We do not collect device identifiers, location data, usage analytics, or any
            data not listed above. All data is stored securely and never sold or shared
            with third parties beyond what is required to operate the service.
          </p>
        </>
      ),
    })
  }

  if (privacy.localStorageNote) {
    sections.push({
      label: `${sections.length + 1}. Local Data Storage`,
      content: <p style={text}>{privacy.localStorageNote}</p>,
    })
  }

  sections.push({
    label: `${sections.length + 1}. Children`,
    content: (
      <p style={text}>
        This app is suitable for all ages. No data is collected from any user,
        including children under 13.
      </p>
    ),
  })

  sections.push({
    label: `${sections.length + 1}. Changes`,
    content: (
      <p style={text}>
        Any updates to this policy will be posted at this URL with a revised date.
      </p>
    ),
  })

  sections.push({
    label: `${sections.length + 1}. Contact`,
    content: (
      <p style={text}>
        Questions:{' '}
        <a
          href={`mailto:${privacy.contact}`}
          style={{ color: '#aaa', borderBottom: '1px solid #2a2a2a', paddingBottom: '1px', transition: 'color var(--dur-base)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {privacy.contact}
        </a>
      </p>
    ),
  })

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <Breadcrumb items={[
          { label: 'Home', path: '/' },
          { label: 'Projects', path: '/projects' },
          { label: p.name, path: basePath },
          { label: 'Privacy Policy' },
        ]} />

        <header>
          <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: '14px' }}>
            Legal &middot; {p.name}
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, color: 'var(--text)', letterSpacing: '-0.025em', marginBottom: '10px' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '12px', color: '#888', letterSpacing: '0.02em' }}>
            Last updated: {privacy.updated}
          </p>
        </header>

        <div style={{
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontSize: '13px',
          color: '#aaa',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#888' }}>Summary:</strong>{' '}
          {privacy.summaryOverride ?? 'This app collects no data. It runs entirely on-device.'}
        </div>

        <div>
          {sections.map((sec, i) => (
            <PolicySection key={i} label={sec.label} isLast={i === sections.length - 1}>
              {sec.content}
            </PolicySection>
          ))}
        </div>

        <Link
          to={basePath}
          style={{ fontSize: '13px', fontWeight: 500, color: '#888', transition: 'color var(--dur-base)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          &larr; Back to {p.name}
        </Link>
      </div>
    </Layout>
  )
}