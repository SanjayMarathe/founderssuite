import { Routes, Route, NavLink } from 'react-router-dom'
import Layout from './components/Layout'
import BetaTester from './components/BetaTester'
import CompetitorAnalysis from './components/CompetitorAnalysis'
import SwarmTest from './components/SwarmTest'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<BetaTester />} />
        <Route path="/competitor" element={<CompetitorAnalysis />} />
        <Route path="/swarm" element={<SwarmTest />} />
      </Routes>
    </Layout>
  )
}
