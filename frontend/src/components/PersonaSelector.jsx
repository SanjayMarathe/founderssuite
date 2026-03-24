import { useEffect, useState } from 'react'
import { getPersonas } from '../api/client'
import { User } from 'lucide-react'

export default function PersonaSelector({ value, onChange }) {
  const [personas, setPersonas] = useState([])

  useEffect(() => {
    getPersonas().then(setPersonas).catch(() => {})
  }, [])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        <User size={14} className="inline mr-1" /> Tester Persona
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {personas.map((p) => (
          <button
            key={p.persona_id}
            onClick={() => onChange(p.persona_id)}
            className={`text-left p-3 rounded-lg border transition-all ${
              value === p.persona_id
                ? 'border-brand-500 bg-brand-500/10 text-white'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-sm">{p.name}</div>
            <div className="text-xs mt-1 opacity-70 line-clamp-2">{p.role}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
