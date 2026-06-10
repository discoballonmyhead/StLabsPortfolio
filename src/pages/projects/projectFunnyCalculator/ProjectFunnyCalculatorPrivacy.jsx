import { Link } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { PrivacyLayout } from '../shared'

export default function ProjectFunnyCalculatorPrivacy() {
  return (
    <PrivacyLayout
      appName="Calculator"
      appPath="/projects/project-funny-calculator"
      updated="February 19, 2026"
      contact="info@stateless-labs.com"
      androidPermission={true}
      extraSections={null}
    />
  )
}
