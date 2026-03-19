import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/SearchInput'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Icon } from '../../components/ui/Icon'
import { POSIZIONE_ICONS } from '../../lib/icons'
import { POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'

const POSIZIONE_OPTIONS = [
  { value: '', label: 'Tutte le posizioni' },
  { value: 'in_magazzino', label: 'In magazzino' },
  { value: 'presso_evento', label: 'Presso evento' },
  { value: 'magazzino_agente', label: 'Presso agente' },
  { value: 'in_transito', label: 'In transito' },
  { value: 'manutenzione', label: 'In manutenzione' },
]

function InventarioCard({ material, onNavigate }) {
  const { id, nome, codice_inventario, posizione_attuale, tipo } = material
  const PosIcon = POSIZIONE_ICONS[posizione_attuale] || POSIZIONE_ICONS.in_magazzino
  const fuori = posizione_attuale !== 'in_magazzino'

  return (
    <button
      type="button"
      onClick={() => onNavigate(`/materiale/${id}`)}
      className={`w-full text-left rounded-xl border p-4 hover:shadow-md transition-all min-h-[48px] ${
        fuori ? 'bg-white border-yellow-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon icon={PosIcon} size={20} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-base truncate">{nome}</p>
            {codice_inventario && (
              <p className="text-xs text-gray-400 mt-0.5">{codice_inventario}</p>
            )}
            {tipo && (
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{tipo.replace('_', ' ')}</p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <StatusBadge
            stato={posizione_attuale}
            labels={POSIZIONE_MATERIALE}
            colors={POSIZIONE_MATERIALE_COLORE}
          />
        </div>
      </div>
    </button>
  )
}

export function LogisticaInventario() {
  const materials = useMaterialsStore(s => s.materials)
  const loading = useMaterialsStore(s => s.loading)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)
  const setFilter = useMaterialsStore(s => s.setFilter)
  const filters = useMaterialsStore(s => s.filters)
  const navigate = useNavigate()
  const [localSearch, setLocalSearch] = useState(filters.search || '')

  useEffect(() => { fetchMaterials() }, [])

  function handleSearch(value) {
    setLocalSearch(value)
    setFilter('search', value)
  }

  function handlePosizione(value) {
    setFilter('posizione', value)
  }

  const fuori = materials.filter(m => m.posizione_attuale !== 'in_magazzino').length

  return (
    <div className="px-4 md:px-8 py-4">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SearchInput
            value={localSearch}
            onChange={handleSearch}
            placeholder="Cerca materiale..."
          />
        </div>
        <select
          value={filters.posizione}
          onChange={e => handlePosizione(e.target.value)}
          className="min-h-[48px] rounded-lg border border-gray-300 px-3 text-base focus:ring-2 focus:ring-mikai-400 focus:outline-none bg-white"
          aria-label="Filtra per posizione"
        >
          {POSIZIONE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {fuori > 0 && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
          {fuori} materiale{fuori !== 1 ? 'i' : ''} fuori sede
        </p>
      )}

      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : materials.length === 0 ? (
        <EmptyState
          title="Nessun materiale trovato"
          description="Prova a cambiare i filtri di ricerca."
        />
      ) : (
        <div className="space-y-3">
          {materials.map(m => (
            <InventarioCard key={m.id} material={m} onNavigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}
