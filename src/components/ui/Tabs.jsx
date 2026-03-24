const DOT_COLORS = {
  complete:   'bg-green-500',
  warning:    'bg-yellow-500',
  incomplete: 'bg-red-500',
}

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <nav className="flex gap-0 -mb-px" aria-label="Sezioni">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap px-4 py-3 min-h-[48px] text-base font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-mikai-400 text-mikai-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.status && (
                <span className={`w-2 h-2 rounded-full ${DOT_COLORS[tab.status] || ''}`} aria-label={tab.status} />
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
