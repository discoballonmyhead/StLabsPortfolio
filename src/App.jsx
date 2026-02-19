import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'

// Calculator
import CalculatorApp from './pages/projects/calculator/CalculatorApp'
import CalculatorPrivacy from './pages/projects/calculator/PrivacyPolicy'

// Project Kin App
import ProjectKin from './pages/projects/projectkin/ProjectKin'
import AuthPrivacy from './pages/projects/projectkin/PrivacyPolicy'
import AuthSuccess from './pages/projects/projectkin/AuthSuccess'
import AuthFailed from './pages/projects/projectkin/AuthFailed'

// Project Vault App
import EmailApp from './pages/projects/emailapp/EmailApp'
import EmailPrivacy from './pages/projects/emailapp/PrivacyPolicy'
import EmailSent from './pages/projects/emailapp/EmailSent'

import NotFound from './pages/NotFound'


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects" element={<Projects />} />

      <Route path="/projects/calculator" element={<CalculatorApp />} />
      <Route path="/projects/calculator/privacy-policy" element={<CalculatorPrivacy />} />

      <Route path="/projects/projectkin" element={<ProjectKin />} />
      <Route path="/projects/projectkin/privacy-policy" element={<AuthPrivacy />} />
      <Route path="/projects/projectkin/auth/success" element={<AuthSuccess />} />
      <Route path="/projects/projectkin/auth/failed" element={<AuthFailed />} />

      <Route path="/projects/emailapp" element={<EmailApp />} />
      <Route path="/projects/emailapp/privacy-policy" element={<EmailPrivacy />} />
      <Route path="/projects/emailapp/email-sent" element={<EmailSent />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
