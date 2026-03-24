import { useState, useEffect } from 'react'
import { getPersonas, startSwarmTest } from '../api/client'
import AgentCard from './AgentCard'
import MasterLog from './MasterLog'
import { Zap, Plus, Trash2, Eye, EyeOff, Play } from 'lucide-react'

const PERSONA_COLORS = [
  'border-brand-500 bg-brand-500/10',
  'border-blue-400 bg-blue-400/10',
  'border-sky-500 bg-sky-500/10',
  'border-brand-600 bg-brand-600/10',
  'border-cyan-500 bg-cyan-500/10',
  'border-blue-300 bg-blue-300/10',
]

export default function SwarmTest() {
  const [url, setUrl] = useState('')
  const [personas, setPersonas] = useState([])
  const [agents, setAgents] = useState([
    { persona_id: 'sales_ops_pro_01', custom_task: '' },
    { persona_id: 'non_tech_founder_01', custom_task: '' },
  ])
  const [maxSteps, setMaxSteps] = useState(20)
  const [showBrowsers, setShowBrowsers] = useState(true)
  const [swarmId, setSwarmId] = useState(null)
  const [jobIds, setJobIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getPersonas().then(setPersonas).catch(() => {})
  }, [])

  const addAgent = () => {
    if (agents.length >= 6) return
    const p = personas[agents.length % personas.length]
    setAgents(prev => [...prev, { persona_id: p?.persona_id || personas[0]?.persona_id, custom_task: '' }])
  }

  const removeAgent = (i) => setAgents(prev => prev.filter((_, idx) => idx !== i))

  const updateAgent = (i, field, val) =>
    setAgents(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url || agents.length === 0) return
    setError('')
    setSwarmId(null)
    setJobIds([])
    setLoading(true)
    try {
      const res = await startSwarmTest({
        url,
        agents: agents.map(a => ({
          persona_id: a.persona_id,
          custom_task: a.custom_task || undefined,
        })),
        max_steps: maxSteps,
        show_browsers: showBrowsers,
      })
      setSwarmId(res.swarm_id)
      setJobIds(res.job_ids)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const personaName = (id) => personas.find(p => p.persona_id === id)?.name || id

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Zap size={28} className="text-brand-400" /> Swarm Test
        </h1>
        <p className="text-gray-400">
          Launch multiple AI agents simultaneously — each with a different persona — all testing your app at once.
        </p>
      </div>

      {/* Config form */}
      {!swarmId && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://your-startup.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Options row */}
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Max Steps / Agent</label>
                <input
                  type="number"
                  min={5} max={50}
                  value={maxSteps}
                  onChange={e => setMaxSteps(Number(e.target.value))}
                  className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Show browsers toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Browser Display</label>
                <button
                  type="button"
                  onClick={() => setShowBrowsers(p => !p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    showBrowsers
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400'
                  }`}
                >
                  {showBrowsers ? <Eye size={15} /> : <EyeOff size={15} />}
                  {showBrowsers ? 'Browsers Visible' : 'Headless (Silent)'}
                </button>
              </div>
            </div>
          </div>

          {/* Agent builder */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Agents ({agents.length}/6)</h2>
              <button
                type="button"
                onClick={addAgent}
                disabled={agents.length >= 6}
                className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={15} /> Add Agent
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map((agent, i) => (
                <div key={i} className={`border rounded-lg p-4 ${PERSONA_COLORS[i % PERSONA_COLORS.length]}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agent {i + 1}</span>
                    {agents.length > 1 && (
                      <button type="button" onClick={() => removeAgent(i)} className="text-gray-600 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <select
                    value={agent.persona_id}
                    onChange={e => updateAgent(i, 'persona_id', e.target.value)}
                    className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-brand-500"
                  >
                    {personas.map(p => (
                      <option key={p.persona_id} value={p.persona_id}>{p.name} — {p.role}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={agent.custom_task}
                    onChange={e => updateAgent(i, 'custom_task', e.target.value)}
                    placeholder="Custom task (optional)..."
                    className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !url}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            <Zap size={18} />
            {loading ? 'Launching swarm...' : `Launch ${agents.length} Agents`}
          </button>
        </form>
      )}

      {/* Live swarm grid */}
      {swarmId && jobIds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap size={18} className="text-brand-400" /> Swarm Running — {jobIds.length} Agents
            </h2>
            <button
              onClick={() => { setSwarmId(null); setJobIds([]) }}
              className="text-sm text-gray-500 hover:text-white"
            >
              ← New Swarm
            </button>
          </div>
          <div className={`grid gap-4 ${jobIds.length === 1 ? 'grid-cols-1' : jobIds.length === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
            {jobIds.map((jobId, i) => (
              <AgentCard
                key={jobId}
                jobId={jobId}
                agentIndex={i + 1}
                personaName={personaName(agents[i]?.persona_id)}
                color={PERSONA_COLORS[i % PERSONA_COLORS.length]}
              />
            ))}
          </div>
          <MasterLog
            jobIds={jobIds}
            agentLabels={jobIds.map((_, i) => personaName(agents[i]?.persona_id))}
          />
        </div>
      )}
    </div>
  )
}
