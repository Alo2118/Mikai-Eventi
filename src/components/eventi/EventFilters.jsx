import { SearchInput } from '../ui/SearchInput'
import { STATO_EVENTO, SELECT_STYLE } from '../../lib/constants'
import { useEventTypes } from '../../hooks/useEventTypes'
import { useEventsStore } from '../../hooks/useEvents'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

const PERIODO_OPTIONS = [
  { value: '3months', label: '3 mesi' },
  { value: 'all', label: 'Tutti i futuri' },
  { value: 'past', label: 'Tutto' },
]

export function EventFilters({ promotori, filterPromotore, onFilterPromotore, viewMode, onViewMode, onlyMine, onToggleMine }) {
  const filters = useEventsStore(s => s.filters)
  const setFilter = useEventsStore(s => s.setFilter)
  const resetFilters = useEventsStore(s => s.resetFilters)
  const { eventTypes } = useEventTypes()

  const hasFilters = filters.search || filters.stato || filters.tipo || filterPromotore || onlyMine || (viewMode && viewMode !== '3months')

  return (
    <div className="px-4 md:px-6 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search — grows to fill */}
        <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-[360px]">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilter('search', v)}
            placeholder="Cerca evento..."
          />
        </div>

        {/* Stato */}
        <select
          value={filters.stato}
          onChange={(e) => setFilter('stato', e.target.value)}
          className={SELECT_STYLE + ' w-auto max-w-[160px]'}
          aria-label="Filtra per stato"
        >
          <option value="">Stato</option>
          {Object.entries(STATO_EVENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Tipo */}
        <select
          value={filters.tipo}
          onChange={(e) => setFilter('tipo', e.target.value)}
          className={SELECT_STYLE + ' w-auto max-w-[150px]'}
          aria-label="Filtra per tipo"
        >
          <option value="">Tipo</option>
          {eventTypes.filter(t => t.attivo).map(t => (
            <option key={t.codice} value={t.codice}>{t.nome}</option>
          ))}
        </select>

        {/* Promotore */}
        {promotori && promotori.length > 1 && (
          <select
            value={filterPromotore}
            onChange={(e) => onFilterPromotore(e.target.value)}
            className={SELECT_STYLE + ' w-auto max-w-[180px]'}
            aria-label="Filtra per promotore"
          >
            <option value="">Promotore</option>
            {promotori.map(p => (
              <option key={p._key} value={p._key}>{p.cognome} {p.nome}</option>
            ))}
          </select>
        )}

        {/* Periodo */}
        {onViewMode && (
          <select
            value={viewMode}
            onChange={(e) => onViewMode(e.target.value)}
            className={SELECT_STYLE + ' w-auto max-w-[160px]'}
            aria-label="Filtra per periodo"
          >
            {PERIODO_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {/* I miei toggle */}
        {onToggleMine && (
          <button
            onClick={onToggleMine}
            className={`inline-flex items-center gap-1.5 px-3 min-h-[48px] rounded-lg text-sm font-medium transition-colors ${
              onlyMine
                ? 'bg-mikai-100 text-mikai-700 ring-1 ring-mikai-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={onlyMine ? 'Mostra tutti gli eventi' : 'Mostra solo i miei eventi'}
          >
            I miei
          </button>
        )}

        {/* Azzera */}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-2 min-h-[48px] text-sm text-gray-500 hover:text-gray-700"
          >
            <Icon icon={ACTION_ICONS.clearFilter} size={14} />
            <span className="hidden sm:inline">Azzera</span>
          </button>
        )}
      </div>
    </div>
  )
}
