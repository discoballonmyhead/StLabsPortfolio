import { lazy, Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { projects } from '@/config'
import { Resolve } from '@/components'
import MusicPlayer from '@/components/MusicPlayer'

// Eager-loaded (tiny, always needed)
import Home from '@/pages/home/Home'
import ProjectsPage from '@/pages/projects/Projects'
import TeamPage from '@/pages/team/TeamPage'
import NotFound from '@/pages/not-found/NotFound'

// Lazy-loaded feature pages (code-split)
const ProjectDetail = lazy(() => import('@/features/projects/ProjectDetail'))
const PrivacyPage = lazy(() => import('@/features/privacy/PrivacyPage'))
const StatusPage = lazy(() => import('@/features/status-pages/StatusPage'))

function buildProjectRoutes() {
  return projects.flatMap(p => {
    const base = `/projects/${p.slug}`
    const routes = [
      { path: base, element: <ProjectDetail slug={p.slug} /> },
      { path: `${base}/privacy-policy`, element: <PrivacyPage slug={p.slug} /> },
    ]
    if (p.hasAuthPages) {
      routes.push(
        { path: `${base}/auth/success`, element: <StatusPage type="auth-success" projectSlug={p.slug} /> },
        { path: `${base}/auth/failed`, element: <StatusPage type="auth-failed" projectSlug={p.slug} /> },
      )
    }
    if (p.hasEmailConfirmation) {
      routes.push(
        { path: `${base}/confirm/sent`, element: <StatusPage type="email-sent" projectSlug={p.slug} /> },
        { path: `${base}/confirm/success`, element: <StatusPage type="email-confirmed" projectSlug={p.slug} /> },
        { path: `${base}/confirm/failed`, element: <StatusPage type="email-failed" projectSlug={p.slug} /> },
      )
    }
    return routes
  })
}

function Routes() {
  return useRoutes([
    { path: '/', element: <Home /> },
    { path: '/projects', element: <ProjectsPage /> },
    { path: '/team', element: <TeamPage /> },
    ...buildProjectRoutes(),
    { path: '*', element: <NotFound /> },
  ])
}

export default function App() {
  return (
    <Suspense fallback={<Resolve />}>
      {/*
        MusicPlayer lives here — OUTSIDE the route tree — so it never
        unmounts on navigation. The audio element persists for the entire
        app lifetime regardless of which page is shown.
      */}
      <MusicPlayer />
      <Routes />
    </Suspense>
  )
}