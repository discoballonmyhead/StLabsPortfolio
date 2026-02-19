import { Link } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { PrivacyLayout } from '../shared'

export default function CalculatorPrivacy() {
  return (
    <PrivacyLayout
      appName="Calculator"
      appPath="/projects/calculator"
      updated="February 19, 2026"
      contact="sagnikdaslearns@gmail.com"
      androidPermission={true}
      extraSections={null}
    />
  )
}
