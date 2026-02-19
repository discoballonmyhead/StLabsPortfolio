import { Link } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { appStyles as s, Breadcrumb, AppHeader, Divider, SectionLabel } from '../shared'

export default function CalculatorApp() {
  return (
    <Layout>
      <div style={s.page}>
        <Breadcrumb items={[['Home', '/'], ['Projects', '/projects'], ['Calculator', null]]} />

        <AppHeader
          label="Mobile App · 2024"
          title="Calculator"
          tagline="A clean, minimal calculator for Android and iOS."
          tags={['Live', 'Flutter', 'BLoC', 'Clean Architecture', 'Android', 'iOS']}
          statusTag="Live"
        />

        <Divider />

        <div style={s.grid}>
          <section>
            <SectionLabel>About</SectionLabel>
            <p style={s.bodyText}>
              A fast, minimal calculator built with Flutter using BLoC state management
              and Clean Architecture. Supports standard arithmetic, percentages, decimal
              numbers, and real-time expression preview. No ads, no tracking.
            </p>
          </section>

          <section>
            <SectionLabel>Features</SectionLabel>
            <ul style={s.featureList}>
              {['Addition, subtraction, multiplication, division', 'Percentage and decimal support', 'Expression preview while typing', 'Works fully offline', 'No data collection', 'No permissions required'].map(f => (
                <li key={f} style={s.featureItem}><span style={s.dash}>—</span>{f}</li>
              ))}
            </ul>
          </section>

          <section>
            <SectionLabel>Download</SectionLabel>
            <p style={s.bodyText}>Available on both major app stores.</p>
            <div style={s.storeRow}>
              <a href="#" style={s.storeBtn} onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#777' }}>Google Play</a>
              <a href="#" style={s.storeBtn} onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#777' }}>App Store</a>
            </div>
          </section>

          <section>
            <SectionLabel>Legal</SectionLabel>
            <p style={s.bodyText}>No personal data is collected. No permissions beyond optional haptic feedback on Android. No network access.</p>
            <Link to="/projects/calculator/privacy-policy" style={s.policyLink}
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
