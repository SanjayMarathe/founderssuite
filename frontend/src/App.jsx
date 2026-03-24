import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CompetitorAnalysis from './components/CompetitorAnalysis'
import SwarmTest from './components/SwarmTest'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SwarmTest />} />
        <Route path="/competitor" element={<CompetitorAnalysis />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
