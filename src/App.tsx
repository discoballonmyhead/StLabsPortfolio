import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Resolve } from '@/components'
import MusicPlayer from '@/components/MusicPlayer'

// MusicPlayer sits outside the Suspense boundary entirely now, so it's
// never affected by a page's lazy chunk loading or Resolve fallback — a
// small improvement over the old setup where both shared one boundary.
export default function App() {
  return (
    <>
      <MusicPlayer />
      <Suspense fallback={<Resolve />}>
        <Outlet />
      </Suspense>
    </>
  )
}
