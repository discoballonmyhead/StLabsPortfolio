/**
 * App.tsx
 * src/App.tsx
 *
 * The root layout route. Renders the chrome that has to survive navigation,
 * and an <Outlet/> for whichever page matched.
 *
 * ─── WHY THIS IS A LAYOUT RATHER THAN A ROUTER ───────────────────────────────
 *
 * The previous version called useRoutes() in here, which meant App WAS the
 * router. That works in the browser and cannot be prerendered: there is no way
 * to render one specific path in Node if the component insists on matching the
 * current location itself.
 *
 * Routes now live in routes.tsx as plain data, and this component is the first
 * entry in that tree. The client renders it under a BrowserRouter and the build
 * renders it under a StaticRouter, and both get the same tree.
 *
 * It also fixes the thing that was already true before: MusicPlayer is mounted
 * once, above the Outlet, so client side navigation does not remount it and the
 * track does not restart when somebody clicks a nav link.
 *
 * ─── NOTE ON THE OLD FILE ────────────────────────────────────────────────────
 *
 * The version being replaced had its own copy of the route table, including an
 * /auth/callback route that routes.tsx was missing. Both tables were live in
 * the repo and had already drifted. There is one table now, in routes.tsx, and
 * it has the callback route.
 */

import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Resolve } from '@/components'
import MusicPlayer from '@/components/MusicPlayer'
import Seo from '@/seo/Seo'

export default function App() {
  return (
    <>
      {/*
              Head management. Renders nothing; it keeps the title, canonical,
              Open Graph tags and JSON-LD in step with the route. The static
              HTML already carries all of it, so this is only doing work after
              a client side navigation.
            */}
      <Seo />

      {/* Mounted once, above the Outlet, so navigation never restarts it. */}
      <MusicPlayer />

      <Suspense fallback={<Resolve />}>
        <Outlet />
      </Suspense>
    </>
  )
}