import { useEffect, useState } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useExportHandler } from '../../hooks/useExportHandler'
import { MaterialCard } from '../../components/materiale/MaterialCard'
import { MaterialFilters } from '../../components/materiale/MaterialFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ExportButton } from '../../components/ui/ExportButton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Icon } from '../../components/ui/Icon'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { POSIZIONE_ICONS, MATERIALE_ICONS } from '../../lib/icons'

const EXPORT_COLUMNS_MATERIALI = [
  { key: 'nome', label: 'Nome', width: 30 },
  { key: 'codice_inventario', label: 'Codice inventario' },
  { key: 'tipo', label: 'Tipo', format: v => TIPO_MATERIALE[v] || v },
  { key: 'posizione_attuale', label: 'Posizione', format: v => POSIZIONE_MATERIALE[v] || v },
  { key: 'product', label: 'Brand', format: v => v?.brand?.nome || '' },
]

const POSIZIONE_ORDER = ['in_magazzino', 'presso_evento', 'magazzino_agente', 'in_transito', 'manutenzione']

const POSIZIONE_BG = {
  in_magazzino: 'bg-green-50 text-green-700',
  presso_evento: 'bg-blue-50 text-blue-700',
  magazzino_agente: 'bg-yellow-50 text-yellow-700',
  in_transito: 'bg-sky-50 text-sky-700',
  manutenzione: 'bg-red-50 text-red-700',
}

export function MaterialeList() {
  const materials = useMaterialsStore(s => s.materials)
  const loading = useMaterialsStore(s => s.loading)
  const error = useMaterialsStore(s => s.error)
  const filters = useMaterialsStore(s => s.filters)
  const setFilter = useMaterialsStore(s => s.setFilter)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)
  const resetFilters = useMaterialsStore(s => s.resetFilters)
  const { exporting, handleExport } = useExportHandler()
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grouped'

  useEffect(() => { resetFilters() }, [])

  // Contatori per posizione
  const counts = {}
  for (const pos of POSIZIONE_ORDER) counts[pos] = 0
  for (const m of materials) {
    if (counts[m.posizione_attuale] !== undefined) counts[m.posizione_attuale]++
  }

  // Filtri attivi (per chip)
  const activeFilters = []
  if (filters.search) activeFilters.push({ key: 'search', label: `"${filters.search}"` })
  if (filters.brand) activeFilters.push({ key: 'brand', label: materials.find(m => m.product?.brand?.id === filters.brand)?.product?.brand?.nome || 'Azienda' })
  if (filters.tipo) activeFilters.push({ key: 'tipo', label: TIPO_MATERIALE[filters.tipo] })
  if (filters.posizione) activeFilters.push({ key: 'posizione', label: POSIZIONE_MATERIALE[filters.posizione] })

  // Raggruppamento per posizione
  const grouped = {}
  for (const pos of POSIZIONE_ORDER) grouped[pos] = []
  for (const m of materials) {
    if (grouped[m.posizione_attuale]) grouped[m.posizione_attuale].push(m)
  }

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget' }]} />
      </div>
      <PageHeader
        title="Materiale & Gadget"
        subtitle={`${materials.length} elementi`}
        actions={<ExportButton onClick={() => handleExport({ columns: EXPORT_COLUMNS_MATERIALI, rows: materials, filename: 'materiale', sheetName: 'Materiale' })} loading={exporting} />}
      />

      {/* Summary bar con breakdown posizioni */}
      {!loading && materials.length > 0 && (
        <div className={'mx-4 md:mx-8 mb-4 ' + SUMMARY_BAR_STYLE}>
          <div className="flex flex-wrap gap-3 md:gap-5">
            {POSIZIONE_ORDER.map(pos => (
              <button
                key={pos}
                onClick={() => setFilter('posizione', filters.posizione === pos ? '' : pos)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[48px] ${
                  filters.posizione === pos ? POSIZIONE_BG[pos] + ' ring-2 ring-offset-1 ring-current' : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                <Icon icon={POSIZIONE_ICONS[pos]} size={16} />
                <span className="hidden md:inline">{POSIZIONE_MATERIALE[pos]}</span>
                <span className="font-bold">{counts[pos]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <MaterialFilters />

      {/* Chip filtri attivi + toggle vista */}
      <div className="px-4 md:px-8 pt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          {activeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key, '')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium min-h-[48px] transition-colors"
              aria-label={`Rimuovi filtro ${f.label}`}
            >
              {f.label}
              <Icon name="close" size={14} />
            </button>
          ))}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
            aria-label="Vista lista"
          >
            <Icon icon={MATERIALE_ICONS.viewList} size={20} />
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors ${viewMode === 'grouped' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
            aria-label="Vista raggruppata"
          >
            <Icon icon={MATERIALE_ICONS.viewGrid} size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : error ? (
          <EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare il materiale. Riprova." />
        ) : materials.length === 0 ? (
          <EmptyState title="Nessun materiale trovato" description="Prova a cambiare i filtri." />
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {materials.map((m) => (
              <MaterialCard key={m.id} material={m} linkTo={`/materiale/${m.id}`} showQuickAction />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {POSIZIONE_ORDER.map(pos => {
              const items = grouped[pos]
              if (items.length === 0) return null
              return (
                <div key={pos}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${POSIZIONE_BG[pos]}`}>
                      <Icon icon={POSIZIONE_ICONS[pos]} size={16} />
                      {POSIZIONE_MATERIALE[pos]}
                    </span>
                    <span className="text-sm text-gray-400">{items.length}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map(m => (
                      <MaterialCard key={m.id} material={m} linkTo={`/materiale/${m.id}`} showQuickAction />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
