import { useEffect, useRef, useState } from 'react'
import { connectJobWS } from '../api/client'
import { Terminal } from 'lucide-react'

// One distinct terminal color per agent index
const AGENT_COLORS = [
  'text-purple-400',
  'text-blue-400',
  'text-green-400',
  'text-orange-400',
  'text-pink-400',
  'text-yellow-400',
]

const STATUS_COLOR = {
  completed: 'text-green-500',
  failed:    'text-red-500',
  running:   'text-cyan-400',
  pending:   'text-gray-500',
}

export default function MasterLog({ jobIds, agentLabels }) {
  const [lines, setLines] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!jobIds?.length) return
    setLines([])

    const sockets = jobIds.map((jobId, i) => {
      const label = agentLabels[i] || `Agent ${i + 1}`
      const color = AGENT_COLORS[i % AGENT_COLORS.length]

      return connectJobWS(jobId, (data) => {
        const step = data.current_step
        const status = data.status

        if (!step || step === 'Queued') return

        const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

        setLines(prev => {
          // Avoid duplicate consecutive lines from the same agent
          const last = prev.findLast?.(l => l.agentIndex === i)
          if (last?.text === step) return prev
          return [...prev, { agentIndex: i, label, color, text: step, status, ts, id: Date.now() + Math.random() }]
        })
      })
    })

    return () => sockets.forEach(ws => ws?.close())
  }, [jobIds?.join(',')])

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  if (!jobIds?.length) return null

  return (
    <div className="mt-6 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900">
        <Terminal size={14} className="text-green-400" />
        <span className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider">Master Log</span>
        <span className="ml-auto text-xs text-gray-600">{lines.length} events</span>
        {/* Legend */}
        <div className="flex items-center gap-3 ml-4">
          {agentLabels.map((label, i) => (
            <span key={i} className={`text-xs font-mono ${AGENT_COLORS[i % AGENT_COLORS.length]}`}>
              [{`A${i + 1}`}]
            </span>
          ))}
        </div>
      </div>

      {/* Terminal body */}
      <div className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {lines.length === 0 && (
          <span className="text-gray-700">Waiting for agents to start...</span>
        )}
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2 leading-5">
            {/* Timestamp */}
            <span className="text-gray-700 flex-shrink-0 select-none">{line.ts}</span>
            {/* Agent tag */}
            <span className={`flex-shrink-0 font-bold ${line.color}`}>
              [{line.label}]
            </span>
            {/* Status badge on terminal events */}
            {(line.text === 'Done' || line.status === 'completed') && (
              <span className="text-green-500 flex-shrink-0">✓</span>
            )}
            {line.status === 'failed' && (
              <span className="text-red-500 flex-shrink-0">✗</span>
            )}
            {/* Message */}
            <span className="text-gray-300 break-all">{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
