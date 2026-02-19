import { Link } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { appStyles as s, Breadcrumb, AppHeader, Divider, SectionLabel } from '../shared'

export default function ProjectKin() {
  return (
    <Layout>
      <div style={s.page}>
        <Breadcrumb items={[['Home', '/'], ['Projects', '/projects'], ['Project Kin', null]]} />

        <AppHeader
          label="Mobile App · 2025"
          title="Project Kin"
          tagline="Social media application to reforge your attention span"
          tags={["In Development", 'Flutter', 'Dart', 'Supabase']}
          statusTag="In Development"
        />

        <Divider />

        <div style={s.grid}>
          <section>
            <SectionLabel>About</SectionLabel>
            <p style={s.bodyText}>
              A Social media app that aims to ban a lot of stupidity than is usually allowed
              the established application to monetize on your attention, we want to help you
              build your creativity back and help you be inspired everyday, till you can do it on your
              own.
            </p>
          </section>

          {/* <section>
            <SectionLabel>Features</SectionLabel>
            <ul style={s.featureList}>
              {[
                'OAuth 2.0 authentication flow',
                'Clear success and failure feedback',
                'Secure token handling',
                'No credentials stored on-device',
                'Works with major auth providers',
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
            <p style={s.bodyText}>No credentials or personal data are stored. Auth tokens are handled in memory only.</p>
            <Link to="/projects/projectkin/privacy-policy" style={s.policyLink}
              onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#777'; e.currentTarget.style.borderColor = '#2a2a2a' }}>
              Privacy Policy
            </Link>
          </section>*/}
        </div>
      </div>
    </Layout>
  )
}
