/**
 * main.tsx
 * src/main.tsx
 *
 * The browser entry point.
 *
 * ─── WHY createRoot AND NOT hydrateRoot ──────────────────────────────────────
 *
 * Every route is prerendered to static HTML, so the obvious move is to hydrate
 * it rather than throw it away and render again. That is deliberately not what
 * happens here, for a specific reason.
 *
 * Hydration requires the first client render to produce exactly the markup the
 * server produced. Two hooks in this codebase are built not to:
 *
 *   useSystemTheme  returns 'light' on the server and then whatever
 *                   prefers-color-scheme says once an effect runs
 *   useIsMobile     returns false on the server and then measures the viewport
 *
 * Both are correct designs: neither value exists at render time in Node. But
 * they mean a hydration pass would warn on every page, and on a narrow viewport
 * or in dark mode React would discard the server markup for those subtrees and
 * re-render them anyway.
 *
 * So the static HTML does its job, which is being there in the bytes for
 * crawlers and for the first paint, and then the app renders over it. The
 * visible cost is one reflow on load. The thing it buys is that the behaviour
 * is the same every time rather than depending on the visitor's colour scheme.
 *
 * If the theme and viewport hooks ever read from a cookie or a class on <html>
 * set by an inline script, hydration becomes viable and is worth switching to.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import RouteTree from './RouteTree'
import { routes } from './routes'
import './index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('No #root element. index.html is not the one this app expects.')
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <RouteTree routes={routes} />
    </BrowserRouter>
  </StrictMode>,
)