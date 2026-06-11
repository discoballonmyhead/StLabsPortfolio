import { Layout, Breadcrumb, Divider, SectionLabel, AppHeader, StoreButton, PolicyLink } from '@/components'
import ImageCarousel from '@/components/ImageCarousel'
import { projects } from '@/config'
import type { ProjectStatus } from '@/config'

interface Props {
  slug: string
}

const bodyText: React.CSSProperties = {
  fontSize: '14px',
  color: '#aaa',
  lineHeight: 1.8,
}

const featureList: React.CSSProperties = {
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '9px',
}

const featureItem: React.CSSProperties = {
  fontSize: '14px',
  color: '#aaa',
  paddingLeft: '18px',
  position: 'relative',
  lineHeight: 1.6,
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '36px',
}

export default function ProjectDetail({ slug }: Props) {
  const p = projects.find(x => x.slug === slug)
  if (!p) return null

  const basePath = `/projects/${p.slug}`
  const hasMedia = !!(p.coverImage || (p.screenshots && p.screenshots.length > 0))

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        <Breadcrumb items={[
          { label: 'Home', path: '/' },
          { label: 'Projects', path: '/projects' },
          { label: p.name },
        ]} />

        <AppHeader
          label={p.label}
          title={p.name}
          tagline={p.tagline}
          tags={[p.status, ...p.tech]}
          statusTag={p.status as ProjectStatus}
        />

        {/* Screenshots / carousel — only rendered when images exist */}
        {hasMedia && (
          <>
            <Divider />
            <section>
              <SectionLabel>Screenshots</SectionLabel>
              <ImageCarousel
                coverImage={p.coverImage}
                screenshots={p.screenshots}
                projectName={p.name}
              />
            </section>
          </>
        )}

        <Divider />

        <div style={grid}>
          {/* About */}
          <section>
            <SectionLabel>About</SectionLabel>
            {p.about.map((para, i) => (
              <p key={i} style={{ ...bodyText, marginBottom: i < p.about.length - 1 ? '12px' : 0 }}>
                {para}
              </p>
            ))}
          </section>

          {/* Features */}
          {p.features && p.features.length > 0 && (
            <section>
              <SectionLabel>Features</SectionLabel>
              <ul style={featureList}>
                {p.features.map(f => (
                  <li key={f} style={featureItem}>
                    <span style={{ position: 'absolute', left: 0, color: '#333' }}>&#8212;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Stack notes */}
          {p.stackNotes && p.stackNotes.length > 0 && (
            <section>
              <SectionLabel>Stack</SectionLabel>
              <ul style={featureList}>
                {p.stackNotes.map(f => (
                  <li key={f} style={featureItem}>
                    <span style={{ position: 'absolute', left: 0, color: '#333' }}>&#8212;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Download */}
          {p.stores && (
            <section>
              <SectionLabel>Download</SectionLabel>
              {p.storeNote && <p style={{ ...bodyText, marginBottom: '14px' }}>{p.storeNote}</p>}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {p.stores.googlePlay && <StoreButton label="Google Play" href={p.stores.googlePlay} />}
                {p.stores.appStore && <StoreButton label="App Store" href={p.stores.appStore} />}
                {p.stores.web && <StoreButton label="Web App" href={p.stores.web} />}
                {p.stores.github && <StoreButton label="GitHub" href={p.stores.github} />}
              </div>
            </section>
          )}

          {/* Legal */}
          <section>
            <SectionLabel>Legal</SectionLabel>
            {p.legalNote && <p style={bodyText}>{p.legalNote}</p>}
            <PolicyLink to={`${basePath}/privacy-policy`}>Privacy Policy</PolicyLink>
          </section>
        </div>
      </div>
    </Layout>
  )
}