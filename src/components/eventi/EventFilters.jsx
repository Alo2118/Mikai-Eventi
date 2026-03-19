import { SearchInput } from '../ui/SearchInput'
import { STATO_EVENTO, TIPO_EVENTO } from '../../lib/constants'
import { useEventsStore } from '../../hooks/useEvents'

export function EventFilters() {
  const filters = useEventsStore(s => s.filters)
  const setFilter = useEventsStore(s => s.setFilter)
  const resetFilters = useEventsStore(s => s.resetFilters)

  const hasFilters = filters.search || filters.stato || filters.tipo

  return (
    <div className="space-y-3 px-6 md:px-8">
      <SearchInput
        value={filters.search}
        onChange={(v) => setFilter('search', v)}
        placeholder="Cerca evento per nome..."
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.stato}
          onChange={(e) => setFilter('stato', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per stato"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO_EVENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.tipo}
          onChange={(e) => setFilter('tipo', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per tipo"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_EVENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 text-base text-mikai-400 hover:text-mikai-500 min-h-[48px] font-medium"
          >
            Azzera filtri
          </button>
        )}
      </div>
    </div>
  )
}
