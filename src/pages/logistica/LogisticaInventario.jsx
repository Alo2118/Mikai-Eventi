import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/SearchInput'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Icon } from '../../components/ui/Icon'
import { POSIZIONE_ICONS } from '../../lib/icons'
import { POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE, SELECT_STYLE } from '../../lib/constants'

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
              <p className="text-sm text-gray-500 mt-0.5">{codice_inventario}</p>
            )}
            {tipo && (
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{tipo.replace('_', ' ')}</p>
            )}
            {material.magazzino?.nome && (
              <p className="text-sm text-gray-500 mt-0.5">{material.magazzino.nome}</p>
            )}
            {material.agente && (
              <p className="text-sm text-gray-500 mt-0.5">{material.agente.cognome} {material.agente.nome}</p>
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
  const allMaterials = useMaterialsStore(s => s.materials)
  const loading = useMaterialsStore(s => s.loading)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)
  const fetchMagazzini = useMaterialsStore(s => s.fetchMagazzini)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [posizione, setPosizione] = useState('')
  const [magazzini, setMagazzini] = useState([])
  const [filterMagazzino, setFilterMagazzino] = useState('')

  useEffect(() => {
    fetchMaterials()
    fetchMagazzini().then(({ data }) => setMagazzini(data))
  }, [])

  const filtered = allMaterials.filter(m => {
    const matchSearch = !search || m.nome?.toLowerCase().includes(search.toLowerCase())
    const matchPosizione = !posizione || m.posizione_attuale === posizione
    const matchMagazzino = !filterMagazzino || m.magazzino_id === filterMagazzino
    return matchSearch && matchPosizione && matchMagazzino
  })

  const fuori = allMaterials.filter(m => m.posizione_attuale !== 'in_magazzino').length

  return (
    <div className="px-4 md:px-8 py-4">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cerca materiale..."
          />
        </div>
        <select
          value={posizione}
          onChange={e => setPosizione(e.target.value)}
          className={SELECT_STYLE}
          aria-label="Filtra per posizione"
        >
          {POSIZIONE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {magazzini.length > 0 && (
          <select
            value={filterMagazzino}
            onChange={e => setFilterMagazzino(e.target.value)}
            className={SELECT_STYLE}
            aria-label="Filtra per magazzino"
          >
            <option value="">Tutti i magazzini</option>
            {magazzini.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        )}
      </div>

      {fuori > 0 && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
          {fuori} materiale{fuori !== 1 ? 'i' : ''} fuori sede
        </p>
      )}

      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nessun materiale trovato"
          description="Prova a cambiare i filtri di ricerca."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <InventarioCard key={m.id} material={m} onNavigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}
