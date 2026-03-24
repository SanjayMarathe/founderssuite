import { NavLink } from 'react-router-dom'
import { Swords, Zap } from 'lucide-react'

export default function Layout({ children }) {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-600 text-white'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">FoundersSuite</span>
            <span className="text-gray-500 text-sm">AI QA Testing</span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink to="/" className={linkClass}>
              <Zap size={16} /> Swarm
            </NavLink>
            <NavLink to="/competitor" className={linkClass}>
              <Swords size={16} /> Competitor Analysis
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  )
}
