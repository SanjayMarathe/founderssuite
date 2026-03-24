import { useEffect, useRef, useState } from 'react'
import { connectJobWS } from '../api/client'
import { Loader2, CheckCircle, XCircle, Terminal } from 'lucide-react'

export default function LiveFeed({ jobId, onComplete }) {
  const [status, setStatus] = useState(null)
  const [log, setLog] = useState([])
  const wsRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    if (!jobId) return
    setLog([])
    wsRef.current = connectJobWS(jobId, (data) => {
      setStatus(data)
      if (data.current_step && data.current_step !== 'Queued') {
        setLog(prev => {
          const last = prev[prev.length - 1]
          if (last === data.current_step) return prev
          return [...prev, data.current_step]
        })
      }
      if (data.status === 'completed' || data.status === 'failed') {
        onComplete?.(data)
      }
    })
    return () => wsRef.current?.close()
  }, [jobId])

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

  if (!status) return null

  const Icon = status.status === 'completed'
    ? CheckCircle
    : status.status === 'failed'
    ? XCircle
    : Loader2

  const iconColor = status.status === 'completed'
    ? 'text-green-400'
    : status.status === 'failed'
    ? 'text-red-400'
    : 'text-brand-400'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Icon
          size={18}
          className={`${iconColor} ${status.status === 'running' ? 'animate-spin' : ''}`}
        />
        <span className="text-sm font-medium capitalize">{status.status}</span>
        <span className="text-xs text-gray-500 ml-auto">{status.progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-1 mb-4">
        <div
          className="bg-brand-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${status.progress}%` }}
        />
      </div>

      {/* Live step log */}
      {log.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Terminal size={12} /> Live agent feed
          </div>
          <div
            ref={logRef}
            className="bg-gray-950 border border-gray-800 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs space-y-1"
          >
            {log.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-600 select-none">{String(i + 1).padStart(2, '0')}</span>
                <span className={i === log.length - 1 ? 'text-brand-400' : 'text-gray-400'}>
                  {entry}
                </span>
              </div>
            ))}
            {status.status === 'running' && (
              <div className="flex gap-2">
                <span className="text-gray-600 select-none">  </span>
                <span className="text-brand-500 animate-pulse">▌</span>
              </div>
            )}
          </div>
        </div>
      )}

      {status.status === 'failed' && status.error && (
        <div className="mt-3 p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-xs font-mono">
          {status.error}
        </div>
      )}
    </div>
  )
}
