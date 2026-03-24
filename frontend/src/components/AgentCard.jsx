import { useEffect, useRef, useState } from 'react'
import { connectJobWS } from '../api/client'
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Bug, Smile, AlertTriangle, Monitor } from 'lucide-react'

export default function AgentCard({ jobId, agentIndex, personaName, color }) {
  const [status, setStatus] = useState(null)
  const [screenshot, setScreenshot] = useState(null)
  const [log, setLog] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('screen') // 'screen' | 'log'
  const wsRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    wsRef.current = connectJobWS(jobId, (data) => {
      setStatus(data)
      if (data.screenshot) setScreenshot(data.screenshot)
      if (data.current_step && data.current_step !== 'Queued' && data.current_step !== 'Starting...') {
        setLog(prev => {
          if (prev[prev.length - 1] === data.current_step) return prev
          return [...prev.slice(-80), data.current_step]
        })
      }
    })
    return () => wsRef.current?.close()
  }, [jobId])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const Icon = !status ? Loader2
    : status.status === 'completed' ? CheckCircle
    : status.status === 'failed' ? XCircle
    : Loader2

  const iconColor = !status ? 'text-gray-600'
    : status.status === 'completed' ? 'text-green-400'
    : status.status === 'failed' ? 'text-red-400'
    : 'text-brand-400'

  const result = status?.result

  return (
    <div className={`border rounded-xl overflow-hidden flex flex-col ${color}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={15} className={`${iconColor} ${status?.status === 'running' ? 'animate-spin' : ''} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Agent {agentIndex}</div>
            <div className="text-xs text-gray-400 truncate">{personaName}</div>
          </div>
          {result && (
            <div className={`text-xl font-bold ${result.overall_score >= 75 ? 'text-green-400' : result.overall_score >= 50 ? 'text-brand-400' : 'text-red-400'}`}>
              {result.overall_score}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-800/60 rounded-full h-1 mb-3">
          <div
            className="bg-brand-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${status?.progress || 0}%` }}
          />
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setView('screen')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${view === 'screen' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Monitor size={11} /> Screen
          </button>
          <button
            onClick={() => setView('log')}
            className={`px-2 py-1 rounded text-xs transition-colors ${view === 'log' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Log
          </button>
        </div>
      </div>

      {/* Live screenshot */}
      {view === 'screen' && (
        <div className="mx-4 mb-4 rounded-lg overflow-hidden bg-gray-950 border border-gray-800" style={{ aspectRatio: '16/10' }}>
          {screenshot ? (
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Live browser view"
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Monitor size={24} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-xs">
                  {status?.status === 'running' ? 'Waiting for first screenshot...' : 'No screenshot yet'}
                </p>
              </div>
            </div>
          )}
          {/* Overlay current step */}
          {status?.status === 'running' && log.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-950/80 px-2 py-1 text-xs text-brand-400 truncate font-mono">
              {log[log.length - 1]}
            </div>
          )}
        </div>
      )}

      {/* Log view */}
      {view === 'log' && (
        <div
          ref={logRef}
          className="mx-4 mb-4 bg-gray-950/70 rounded-lg p-2 overflow-y-auto font-mono text-xs space-y-0.5"
          style={{ height: '160px' }}
        >
          {log.length === 0 && <span className="text-gray-600">Waiting to start...</span>}
          {log.map((entry, i) => (
            <div key={i} className={`${i === log.length - 1 ? 'text-brand-400' : 'text-gray-500'} truncate`}>
              {entry}
            </div>
          ))}
          {status?.status === 'running' && <div className="text-brand-500 animate-pulse">▌</div>}
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="border-t border-gray-800/50">
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Bug size={11} /> {result.bugs_found?.length || 0} bugs &nbsp;·&nbsp;
              <AlertTriangle size={11} /> {result.friction_points?.length || 0} friction &nbsp;·&nbsp;
              <Smile size={11} /> {result.positive_findings?.length || 0} positives
            </span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-xs text-gray-300 leading-relaxed">{result.summary}</p>

              {result.bugs_found?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Bugs</div>
                  {result.bugs_found.slice(0, 3).map((b, i) => (
                    <div key={i} className="text-xs text-gray-300 mb-1 flex gap-1.5">
                      <span className={`flex-shrink-0 font-bold ${b.severity === 'critical' ? 'text-red-400' : b.severity === 'high' ? 'text-brand-400' : 'text-brand-400'}`}>
                        [{b.severity}]
                      </span>
                      <span className="truncate">{b.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.friction_points?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Friction</div>
                  {result.friction_points.slice(0, 3).map((f, i) => (
                    <div key={i} className="text-xs text-gray-400 mb-0.5 flex gap-1.5">
                      <span className="text-brand-400">·</span> {f}
                    </div>
                  ))}
                </div>
              )}

              {result.positive_findings?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">What Works</div>
                  {result.positive_findings.slice(0, 2).map((f, i) => (
                    <div key={i} className="text-xs text-gray-400 mb-0.5 flex gap-1.5">
                      <span className="text-green-400">·</span> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {status?.status === 'failed' && status.error && (
        <div className="px-4 pb-3">
          <div className="text-xs text-red-400 font-mono bg-red-950/30 rounded p-2">{status.error}</div>
        </div>
      )}
    </div>
  )
}
