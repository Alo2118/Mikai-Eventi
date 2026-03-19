import { useState, useEffect } from 'react'
import { SearchInput } from '../ui/SearchInput'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE } from '../../lib/constants'
import { useMaterialsStore } from '../../hooks/useMaterials'

export function MaterialFilters() {
  const filters = useMaterialsStore(s => s.filters)
  const setFilter = useMaterialsStore(s => s.setFilter)
  const resetFilters = useMaterialsStore(s => s.resetFilters)
  const fetchBrands = useMaterialsStore(s => s.fetchBrands)
  const [brands, setBrands] = useState([])

  useEffect(() => {
    fetchBrands().then(({ data }) => {
      setBrands(data)
    })
  }, [])

  const hasFilters = filters.search || filters.tipo || filters.posizione || filters.brand

  return (
    <div className="space-y-3 px-6 md:px-8">
      <SearchInput
        value={filters.search}
        onChange={(v) => setFilter('search', v)}
        placeholder="Cerca materiale..."
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.brand || ''}
          onChange={(e) => setFilter('brand', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per azienda"
        >
          <option value="">Tutte le aziende</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.nome}</option>
          ))}
        </select>
        <select
          value={filters.tipo}
          onChange={(e) => setFilter('tipo', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per tipo"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_MATERIALE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.posizione}
          onChange={(e) => setFilter('posizione', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per posizione"
        >
          <option value="">Tutte le posizioni</option>
          {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={resetFilters} className="px-4 py-2.5 text-base text-mikai-400 hover:text-mikai-500 min-h-[48px] font-medium">
            Azzera filtri
          </button>
        )}
      </div>
    </div>
  )
}
