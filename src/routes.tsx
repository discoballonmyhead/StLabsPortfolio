import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { projects, standaloneDeletion } from '@/config'
import App from '@/App'

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

// NOTE: these are relative paths (no leading "/") because they're nested
// children of the root layout route below — React Router's nested-route
// resolution handles that regardless of how the routes get rendered, so
// `projects/${slug}` here still serves at the real /projects/<slug> URL.
function buildProjectRoutes(): RouteObject[] {
  return projects.flatMap((p): RouteObject[] => {
    const base = `projects/${p.slug}`
    const routes: RouteObject[] = [
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

// Single root layout route. App (below) renders the persistent chrome
// (MusicPlayer) once and an <Outlet/> for whichever page matched — this is
// what lets scripts/prerender.mjs both (a) prerender every page below as
// real static HTML at build time, and (b) keep MusicPlayer mounted across
// client-side navigation, exactly like the old sibling-of-<Routes/> trick.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'team', element: <TeamPage /> },
      // One address covering every app. The per project forms under
      // /projects/<slug>/delete-account still exist, since a store listing
      // wants a URL specific to that app. Both land in the same sheet.
      ...(standaloneDeletion.show
        ? [{ path: standaloneDeletion.path.replace(/^\//, ''), element: <AccountDeletion /> }]
        : []),
      ...buildProjectRoutes(),
      { path: '*', element: <NotFound /> },
    ],
  },
]
