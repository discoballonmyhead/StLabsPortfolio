import { Link } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { appStyles as s, Breadcrumb, AppHeader, Divider, SectionLabel } from '../shared'

export default function ProjectVault() {
  return (
    <Layout>
      <div style={s.page}>
        <Breadcrumb items={[['Home', '/'], ['Projects', '/projects'], ['Email App', null]]} />

        <AppHeader
          label="Mobile App · 2025"
          title="Email App"
          tagline="Fast, distraction-free email on mobile."
          tags={['Live', 'Flutter', 'IMAP', 'Android', 'iOS']}
          statusTag="Live"
        />

        <Divider />

        <div style={s.grid}>
          <section>
            <SectionLabel>About</SectionLabel>
            <p style={s.bodyText}>
              A focused email client that strips away everything unnecessary.
              Fast inbox loading, clean reading view, and a send flow that
              stays out of the way. Built for people who want email to feel
              like a tool, not a product.
            </p>
          </section>

          <section>
            <SectionLabel>Features</SectionLabel>
            <ul style={s.featureList}>
              {[
                'IMAP support for any email provider',
                'Clean, distraction-free reading view',
                'Fast inbox sync',
                'Send, reply, and forward',
                'Offline reading of cached messages',
              ].map(f => (
                <li key={f} style={s.featureItem}><span style={s.dash}>—</span>{f}</li>
              ))}
            </ul>
          </section>

          <section>
            <SectionLabel>Download</SectionLabel>
            <p style={s.bodyText}>Available on both major app stores.</p>
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
            <p style={s.bodyText}>Email credentials are stored securely on-device only and never transmitted to any external server operated by this studio.</p>
            <Link to="/projects/ProjectVault/privacy-policy" style={s.policyLink}
              onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#777'; e.currentTarget.style.borderColor = '#2a2a2a' }}>
              Privacy Policy
            </Link>
          </section>
        </div>
      </div>
    </Layout>
  )
}
