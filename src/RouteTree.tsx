import { useRoutes, type RouteObject } from 'react-router-dom'

// Shared by both main.tsx (client) and scripts/prerender.mjs (build-time
// Node render), so the exact same route-matching logic runs in both places.
export default function RouteTree({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes)
}
