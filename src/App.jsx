import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'

// Calculator
import CalculatorApp from './pages/projects/calculator/CalculatorApp'
import CalculatorPrivacy from './pages/projects/calculator/PrivacyPolicy'

// Project Kin App
import ProjectKin from './pages/projects/projectkin/ProjectKin'
import ProjectKinPrivacy from './pages/projects/projectkin/PrivacyPolicy'
import ProjectKinAuthSuccess from './pages/projects/projectkin/ProjectKinAuthSuccess'
import ProjectKinAuthFailed from './pages/projects/projectkin/ProjectKinAuthFailed'

// Project Vault App
import ProjectVault from './pages/projects/proejctvault/ProjectVault'
import ProjectVaultPrivacy from './pages/projects/proejctvault/PrivacyPolicy'
import ProjectVaultAcknowledgement from './pages/projects/proejctvault/ProjectVaultAcknowledgement'


{/*// Project phaser learning App
import ProjectVault from './pages/projects/proejctvault/ProjectVault'
import ProjectVaultPrivacy from './pages/projects/proejctvault/PrivacyPolicy'
import ProjectVaultAcknowledgement from './pages/projects/proejctvault/ProjectVaultAcknowledgement'

*/}
{/*// Project runner learning App
import ProjectVault from './pages/projects/proejctvault/ProjectVault'
import ProjectVaultPrivacy from './pages/projects/proejctvault/PrivacyPolicy'
import ProjectVaultAcknowledgement from './pages/projects/proejctvault/ProjectVaultAcknowledgement'

*/}



{/*// Project pray learning App
import ProjectVault from './pages/projects/proejctvault/ProjectVault'
import ProjectVaultPrivacy from './pages/projects/proejctvault/PrivacyPolicy'
import ProjectVaultAcknowledgement from './pages/projects/proejctvault/ProjectVaultAcknowledgement'

*/}

{/*// Project chess royale learning App
import ProjectVault from './pages/projects/proejctvault/ProjectVault'
import ProjectVaultPrivacy from './pages/projects/proejctvault/PrivacyPolicy'
import ProjectVaultAcknowledgement from './pages/projects/proejctvault/ProjectVaultAcknowledgement'

*/}

import NotFound from './pages/NotFound'


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects" element={<Projects />} />

      <Route path="/projects/calculator" element={<CalculatorApp />} />
      <Route path="/projects/calculator/privacy-policy" element={<CalculatorPrivacy />} />

      <Route path="/projects/projectkin" element={<ProjectKin />} />
      <Route path="/projects/projectkin/privacy-policy" element={<ProjectKinPrivacy />} />
      <Route path="/projects/projectkin/auth/success" element={<ProjectKinAuthSuccess />} />
      <Route path="/projects/projectkin/auth/failed" element={<ProjectKinAuthFailed />} />

      <Route path="/projects/proejctvault" element={<ProjectVault />} />
      <Route path="/projects/proejctvault/privacy-policy" element={<ProjectVaultPrivacy />} />
      <Route path="/projects/proejctvault/email-sent" element={<ProjectVaultAcknowledgement />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
