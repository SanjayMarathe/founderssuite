import { AlertTriangle, CheckCircle, XCircle, Info, TrendingUp, TrendingDown } from 'lucide-react'

const severityConfig = {
  critical: { color: 'text-red-400 bg-red-950/50 border-red-900', icon: XCircle },
  high: { color: 'text-orange-400 bg-orange-950/50 border-orange-900', icon: AlertTriangle },
  medium: { color: 'text-yellow-400 bg-yellow-950/50 border-yellow-900', icon: AlertTriangle },
  low: { color: 'text-blue-400 bg-blue-950/50 border-blue-900', icon: Info },
}

function ScoreBadge({ score, label }) {
  const color = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="text-center">
      <div className={`text-4xl font-bold ${color}`}>{score}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  )
}

function Section({ title, items, icon: Icon, itemColor = 'text-gray-300' }) {
  if (!items?.length) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Icon size={14} /> {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`text-sm ${itemColor} flex items-start gap-2`}>
            <span className="text-gray-600 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BetaTestResults({ result }) {
  if (!result) return null

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-white">Beta Test Report</h2>
            <p className="text-gray-500 text-sm">Tested as: {result.persona_used}</p>
          </div>
          <ScoreBadge score={result.overall_score} label="UX Score" />
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
      </div>

      {/* Bugs */}
      {result.bugs_found?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold mb-4 text-white">
            Bugs Found ({result.bugs_found.length})
          </h3>
          <div className="space-y-3">
            {result.bugs_found.map((bug, i) => {
              const cfg = severityConfig[bug.severity] || severityConfig.low
              const BugIcon = cfg.icon
              return (
                <div key={i} className={`border rounded-lg p-3 ${cfg.color}`}>
                  <div className="flex items-start gap-2">
                    <BugIcon size={15} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase">{bug.severity}</span>
                        <span className="text-xs opacity-70">{bug.category}</span>
                        <span className="text-xs opacity-50 ml-auto">{bug.location}</span>
                      </div>
                      <p className="text-sm">{bug.description}</p>
                      {bug.suggested_fix && (
                        <p className="text-xs opacity-70 mt-1">Fix: {bug.suggested_fix}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Observations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <Section title="Friction Points" items={result.friction_points} icon={AlertTriangle} itemColor="text-orange-300" />
          <Section title="UX Observations" items={result.ux_observations} icon={Info} itemColor="text-gray-300" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <Section title="What Works Well" items={result.positive_findings} icon={CheckCircle} itemColor="text-green-300" />
        </div>
      </div>
    </div>
  )
}

export function CompetitorResults({ result }) {
  if (!result) return null

  return (
    <div className="space-y-6 mt-6">
      {/* Score comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-around mb-4">
          <ScoreBadge score={result.your_score} label="Your App" />
          <div className="text-gray-600 text-2xl font-bold">vs</div>
          <ScoreBadge score={result.competitor_score} label="Competitor" />
        </div>
        <p className="text-gray-300 text-sm text-center">{result.summary}</p>
      </div>

      {/* Feature Matrix */}
      {result.feature_matrix?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold mb-4 text-white">Feature Comparison Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Feature</th>
                  <th className="text-center py-2 px-3">Your App</th>
                  <th className="text-center py-2 px-3">Competitor</th>
                  <th className="text-left py-2 pl-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.feature_matrix.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-2.5 pr-4 text-gray-300">{row.feature}</td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusDot status={row.your_app} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusDot status={row.competitor} />
                    </td>
                    <td className="py-2.5 pl-3 text-gray-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Win/Lose */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <Section title="Where You Win" items={result.where_you_win} icon={TrendingUp} itemColor="text-green-300" />
          <Section title="Wording Issues" items={result.wording_issues} icon={AlertTriangle} itemColor="text-yellow-300" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <Section title="Where You Lose" items={result.where_you_lose} icon={TrendingDown} itemColor="text-red-300" />
          <Section title="Recommendations" items={result.recommendations} icon={CheckCircle} itemColor="text-blue-300" />
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }) {
  const config = {
    present: 'bg-green-500 text-green-400',
    missing: 'bg-red-500 text-red-400',
    partial: 'bg-yellow-500 text-yellow-400',
  }
  const labels = { present: '✓', missing: '✗', partial: '~' }
  const cfg = config[status] || config.missing
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-opacity-20 text-xs font-bold ${cfg}`}>
      {labels[status] || '?'}
    </span>
  )
}
