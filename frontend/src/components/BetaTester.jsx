import { useState } from 'react'
import { startBetaTest } from '../api/client'
import PersonaSelector from './PersonaSelector'
import LiveFeed from './LiveFeed'
import { BetaTestResults } from './ResultsPanel'
import { Play, Globe, FileText } from 'lucide-react'

export default function BetaTester() {
  const [url, setUrl] = useState('')
  const [persona, setPersona] = useState('sales_ops_pro_01')
  const [customTask, setCustomTask] = useState('')
  const [maxSteps, setMaxSteps] = useState(30)
  const [jobId, setJobId] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url) return
    setError('')
    setResult(null)
    setJobId(null)
    setLoading(true)
    try {
      const { job_id } = await startBetaTest({
        url,
        persona_id: persona,
        max_steps: maxSteps,
        custom_task: customTask || undefined,
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
        <h1 className="text-3xl font-bold text-white mb-2">AI Beta Tester</h1>
        <p className="text-gray-400">
          An AI agent browses your app like a real first-time user, finds bugs,
          friction points, and UX issues — automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            <Globe size={14} className="inline mr-1" /> Target URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-startup.com"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Persona */}
        <PersonaSelector value={persona} onChange={setPersona} />

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Max Steps</label>
            <input
              type="number"
              min={5}
              max={100}
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Custom Task (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            <FileText size={14} className="inline mr-1" /> Custom Task (optional)
          </label>
          <textarea
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            placeholder="Leave empty to use default evaluation flow. Or specify: 'Try to create an account and send an invite'..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Play size={16} />
          {loading ? 'Starting...' : 'Run Beta Test'}
        </button>
      </form>

      {jobId && <LiveFeed jobId={jobId} onComplete={handleComplete} />}
      {result && <BetaTestResults result={result} />}
    </div>
  )
}
