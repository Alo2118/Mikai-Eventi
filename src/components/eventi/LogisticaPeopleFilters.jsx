import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { GROUP_MAIN, GROUP_MORE } from '../../lib/logistics-utils'
import { StatusDot } from './StatusDot'

export function LogisticaPeopleFilters({
  groupBy, setGroupBy, hasTavoli,
  filterOptions, activeFilters, toggleFilter, clearFilters,
}) {
  const [moreGroupOpen, setMoreGroupOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex rounded-lg bg-gray-100 p-0.5">
        {GROUP_MAIN.map(g => (
          <button
            key={g.id || 'all'}
            onClick={() => { setGroupBy(g.id); setMoreGroupOpen(false) }}
            className={`px-3 py-1 rounded-md text-sm font-medium min-h-[48px] md:min-h-0 transition-colors ${
              groupBy === g.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {(hasTavoli || GROUP_MORE.some(g => g.id !== 'tavolo')) && (
        <div className="relative">
          <button
            onClick={() => setMoreGroupOpen(!moreGroupOpen)}
            className={`px-3 py-1 rounded-lg text-sm font-medium min-h-[48px] md:min-h-0 transition-colors ${
              GROUP_MORE.some(g => g.id === groupBy) ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Altre opzioni di raggruppamento"
          >
            {GROUP_MORE.find(g => g.id === groupBy)?.label || <Icon icon={ACTION_ICONS.more} size={16} />}
          </button>
          {moreGroupOpen && (
            <div className="absolute z-20 left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
              {GROUP_MORE.filter(g => hasTavoli || g.id !== 'tavolo').map(g => (
                <button
                  key={g.id}
                  onClick={() => { setGroupBy(g.id); setMoreGroupOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm min-h-[48px] md:min-h-[44px] transition-colors ${
                    groupBy === g.id ? 'bg-mikai-50 text-mikai-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <span className="w-px h-5 bg-gray-200 hidden md:block" />
      {filterOptions.map(f => {
        if (f.count === 0 && !activeFilters.has(f.id)) return null
        return (
          <button
            key={f.id}
            onClick={() => toggleFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[48px] md:min-h-0 transition-colors border ${
              activeFilters.has(f.id)
                ? 'bg-mikai-100 text-mikai-700 border-mikai-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label} ({f.count})
          </button>
        )
      })}
      {activeFilters.size > 0 && (
        <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 px-2 min-h-[48px] md:min-h-0">
          Rimuovi filtri
        </button>
      )}
      <span className="hidden md:flex items-center gap-3 ml-auto text-xs text-gray-400">
        <span className="flex items-center gap-1"><StatusDot stato="da_prenotare" /> Da pren.</span>
        <span className="flex items-center gap-1"><StatusDot stato="prenotato" /> Pren.</span>
        <span className="flex items-center gap-1"><StatusDot stato="confermato" /> Conf.</span>
        <span className="flex items-center gap-1"><StatusDot stato="non_necessario" /> N/N</span>
      </span>
    </div>
  )
}
