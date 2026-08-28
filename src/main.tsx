import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { routes } from './routes'
import RouteTree from './RouteTree'
import './index.css'

const container = document.getElementById('root')!
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <RouteTree routes={routes} />
    </BrowserRouter>
  </React.StrictMode>
)

// hydrateRoot when scripts/prerender.mjs has already filled #root with real
// markup (production build); createRoot as a plain-CSR fallback in dev,
// where #root starts empty.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, app)
} else {
  ReactDOM.createRoot(container).render(app)
}
