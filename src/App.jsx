import { Routes, Route, useRoutes } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'

import { projectVaultRoutes, projectKinRoutes, projectFunnyCalculatorRoutes, projectBlinkoAdminRoutes } from "./routes";



import NotFound from './pages/NotFound'

export default function App() {
  return useRoutes([
    { path: "/", element: <Home /> },
    { path: "/projects", element: <Projects /> },
    ...projectVaultRoutes,
    ...projectKinRoutes,
    ...projectFunnyCalculatorRoutes,
    ...projectBlinkoAdminRoutes,
    { path: "*", element: <NotFound /> },
  ]);
}