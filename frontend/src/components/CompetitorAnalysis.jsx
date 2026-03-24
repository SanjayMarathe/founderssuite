import { useState } from 'react'
import { startCompetitorTest } from '../api/client'
import PersonaSelector from './PersonaSelector'
import LiveFeed from './LiveFeed'
import { CompetitorResults } from './ResultsPanel'
import { Play, Globe, Swords } from 'lucide-react'

export default function CompetitorAnalysis() {
  const [yourUrl, setYourUrl] = useState('')
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [persona, setPersona] = useState('sales_ops_pro_01')
  const [maxSteps, setMaxSteps] = useState(40)
  const [jobId, setJobId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!yourUrl || !competitorUrl) return
    setError('')
    setResult(null)
    setJobId(null)
    setLoading(true)
    try {
      const { job_id } = await startCompetitorTest({
        your_url: yourUrl,
        competitor_url: competitorUrl,
        persona_id: persona,
        max_steps: maxSteps,
      })
      setJobId(job_id)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = (data) => {
    if (data.status === 'completed' && data.result) {
      setResult(data.result)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Competitor Analysis</h1>
        <p className="text-gray-400">
          An AI agent evaluates your app and a competitor head-to-head using the same
          persona, then produces a delta analysis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Globe size={14} className="inline mr-1" /> Your App URL
            </label>
            <input
              type="url"
              value={yourUrl}
              onChange={(e) => setYourUrl(e.target.value)}
              placeholder="https://your-startup.com"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Swords size={14} className="inline mr-1" /> Competitor URL
            </label>
            <input
              type="url"
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              placeholder="https://competitor.com"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        <PersonaSelector value={persona} onChange={setPersona} />

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Max Steps</label>
          <input
            type="number"
            min={10}
            max={100}
            value={maxSteps}
            onChange={(e) => setMaxSteps(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !yourUrl || !competitorUrl}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Play size={16} />
          {loading ? 'Starting...' : 'Run Competitor Analysis'}
        </button>
      </form>

      {jobId && <LiveFeed jobId={jobId} onComplete={handleComplete} />}
      {result && <CompetitorResults result={result} />}
    </div>
  )
}
