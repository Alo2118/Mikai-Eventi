import { SearchInput } from '../ui/SearchInput'
import { STATO_EVENTO, TIPO_EVENTO, SELECT_STYLE } from '../../lib/constants'
import { useEventsStore } from '../../hooks/useEvents'
import { Button } from '../ui/Button'

export function EventFilters() {
  const filters = useEventsStore(s => s.filters)
  const setFilter = useEventsStore(s => s.setFilter)
  const resetFilters = useEventsStore(s => s.resetFilters)

  const hasFilters = filters.search || filters.stato || filters.tipo

  return (
    <div className="px-4 md:px-8 py-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilter('search', v)}
            placeholder="Cerca evento..."
          />
        </div>
        <select
          value={filters.stato}
          onChange={(e) => setFilter('stato', e.target.value)}
          className={SELECT_STYLE + ' sm:max-w-[180px]'}
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
          className={SELECT_STYLE + ' sm:max-w-[160px]'}
          aria-label="Filtra per tipo"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_EVENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" onClick={resetFilters}>Azzera</Button>
        )}
      </div>
    </div>
  )
}
