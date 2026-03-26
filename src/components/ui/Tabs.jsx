import { useRef, useEffect } from 'react'

const DOT_COLORS = {
  complete:   'bg-green-500',
  warning:    'bg-yellow-500',
  incomplete: 'bg-red-500',
}

const STATUS_LABELS = {
  complete: 'Completato',
  warning: 'Attenzione',
  incomplete: 'Incompleto',
}

export function Tabs({ tabs, activeTab, onChange }) {
  const navRef = useRef(null)
  const activeRef = useRef(null)

  // Scroll active tab into view on mount and tab change
  useEffect(() => {
    if (activeRef.current && navRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeTab])

  return (
    <div className="border-b border-gray-200 relative">
      <nav
        ref={navRef}
        className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide"
        aria-label="Sezioni"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={activeTab === tab.id ? activeRef : undefined}
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap px-3 md:px-4 py-3 min-h-[48px] text-sm md:text-base font-medium border-b-2 transition-colors flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-mikai-400 text-mikai-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.status && (
                <span className={`w-2 h-2 rounded-full ${DOT_COLORS[tab.status] || ''}`} aria-label={STATUS_LABELS[tab.status] || tab.status} />
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
