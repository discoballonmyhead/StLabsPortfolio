import { lazy, Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { projects, standaloneDeletion } from '@/config'
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
const DeleteAccountPage = lazy(() => import('@/features/delete-account/DeleteAccountPage'))
const StatusPage = lazy(() => import('@/features/status-pages/StatusPage'))
const TermsPage = lazy(() => import('@/features/legal/TermsPage'))
const CookiePage = lazy(() => import('@/features/legal/CookiePage'))
const AccountDeletion = lazy(() => import('@/features/delete-account/AccountDeletionPage'))

function buildProjectRoutes() {
  return projects.flatMap(p => {
    const base = `/projects/${p.slug}`
    const routes = [
      { path: base, element: <ProjectDetail slug={p.slug} /> },
      { path: `${base}/privacy-policy`, element: <PrivacyPage slug={p.slug} /> },
      { path: `${base}/delete-account`, element: <DeleteAccountPage slug={p.slug} /> },
      // Terms and cookies exist for every project. Both fall back to
      // legalDefaults when the project defines no block of its own, so these
      // routes never 404 and never need a flag to switch on.
      { path: `${base}/terms`, element: <TermsPage slug={p.slug} /> },
      { path: `${base}/cookies`, element: <CookiePage slug={p.slug} /> },
    ]
    if (p.hasAuthPages) {
      routes.push(
        { path: `${base}/auth/success`, element: <StatusPage type="auth-success" projectSlug={p.slug} /> },
        { path: `${base}/auth/failed`, element: <StatusPage type="auth-failed" projectSlug={p.slug} /> },
      )
    }
    if (p.hasPasswordReset) {
      routes.push(
        { path: `${base}/reset/sent`, element: <StatusPage type="reset-sent" projectSlug={p.slug} /> },
        { path: `${base}/reset/success`, element: <StatusPage type="reset-success" projectSlug={p.slug} /> },
        { path: `${base}/reset/failed`, element: <StatusPage type="reset-failed" projectSlug={p.slug} /> },
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
    // One address covering every app. The per project forms under
    // /projects/<slug>/delete-account still exist, since a store listing wants
    // a URL specific to that app. Both land in the same sheet.
    ...(standaloneDeletion.show
      ? [{ path: standaloneDeletion.path, element: <AccountDeletion /> }]
      : []),
    ...buildProjectRoutes(),
    { path: '*', element: <NotFound /> },
  ])
}

export default function App() {
  return (
    <Suspense fallback={<Resolve />}>
      {/*
        MusicPlayer lives here - OUTSIDE the route tree - so it never
        unmounts on navigation. The audio element persists for the entire
        app lifetime regardless of which page is shown.
      */}
      <MusicPlayer />
      <Routes />
    </Suspense>
  )
}