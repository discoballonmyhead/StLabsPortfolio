import Nav from './Nav'

export default function Layout({ children }) {
  return (
    <>
      <Nav />
      <div style={{ minHeight: '100vh', paddingTop: '60px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 32px' }}>
          {children}
        </div>
      </div>
    </>
  )
}
