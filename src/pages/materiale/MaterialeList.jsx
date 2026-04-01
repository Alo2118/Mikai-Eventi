import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useExportHandler } from '../../hooks/useExportHandler'
import { MaterialCard } from '../../components/materiale/MaterialCard'
import { MaterialFilters } from '../../components/materiale/MaterialFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { ExportButton } from '../../components/ui/ExportButton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Icon } from '../../components/ui/Icon'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE, SUMMARY_BAR_STYLE, CARD_STYLE } from '../../lib/constants'
import { useProductTypes } from '../../hooks/useProductTypes'
import { POSIZIONE_ICONS, MATERIALE_ICONS, TIPO_PRODOTTO_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { toDriveImageUrl } from '../../lib/format-utils'

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

// ── Stock product card ──────────────────────────────────────────────────────

function StockProductCard({ product, tipoLabels }) {
  const imgUrl = toDriveImageUrl(product.foto_url)
  const sottoSoglia = product.soglia_minima != null && product.quantita_disponibile <= product.soglia_minima
  const tipo = tipoLabels[product.tipo] || product.tipo

  return (
    <div className={CARD_STYLE + ' flex gap-4 items-start'}>
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={product.nome}
          className="w-16 h-16 rounded-lg object-contain bg-gray-50 shrink-0"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <Icon icon={TIPO_PRODOTTO_ICONS[product.tipo] || MATERIALE_ICONS.package} size={28} className="text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 truncate">{product.nome}</p>
            {product.brand && (
              <p className="text-sm text-gray-500">{product.brand.nome}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-2xl font-bold tabular-nums ${sottoSoglia ? 'text-red-600' : 'text-gray-900'}`}>
              {product.quantita_disponibile ?? '—'}
            </span>
            <span className="text-xs text-gray-400">disponibili</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {tipo && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{tipo}</span>
          )}
          {product.soglia_minima != null && (
            <span className="text-xs text-gray-400">Soglia: {product.soglia_minima}</span>
          )}
          {sottoSoglia && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
              <Icon icon={FEEDBACK_ICONS.warning} size={12} />
              Sotto soglia!
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Per-prodotto grouped card ───────────────────────────────────────────────

function ProductGroupCard({ group }) {
  const [expanded, setExpanded] = useState(false)
  const imgUrl = toDriveImageUrl(group.foto_url)

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 text-left min-h-[48px]"
        aria-expanded={expanded}
      >
        {/* Product image */}
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={group.nome}
              className="w-full h-full object-contain"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <Icon icon={TIPO_PRODOTTO_ICONS[group.tipo] || MATERIALE_ICONS.package} size={20} className="text-gray-400" />
          )}
        </div>

        {/* Name + brand */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{group.nome}</p>
          {group.brand && (
            <p className="text-sm text-gray-500">{group.brand}</p>
          )}
        </div>

        {/* Total count + expand arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-gray-500 font-medium">
            {group.items.length} {group.items.length === 1 ? 'esemplare' : 'esemplari'}
          </span>
          <Icon
            name={expanded ? 'chevronUp' : 'chevronDown'}
            size={18}
            className="text-gray-400"
          />
        </div>
      </button>

      {/* Position breakdown pills */}
      <div className="flex flex-wrap gap-2">
        {POSIZIONE_ORDER.map(pos => {
          const count = group.positionCounts[pos]
          if (!count) return null
          return (
            <span
              key={pos}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${POSIZIONE_BG[pos]}`}
            >
              <Icon icon={POSIZIONE_ICONS[pos]} size={12} />
              {count} {POSIZIONE_MATERIALE[pos]}
            </span>
          )
        })}
      </div>

      {/* Expanded specimens list */}
      {expanded && (
        <div className="border-l-2 border-gray-200 pl-4 space-y-2 pt-1">
          {group.items.map(m => (
            <Link
              key={m.id}
              to={`/materiale/${m.id}`}
              className="flex items-center justify-between gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors min-h-[44px]"
            >
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-800 truncate block">{m.nome}</span>
                {m.codice_inventario && (
                  <span className="text-xs text-gray-400">{m.codice_inventario}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${POSIZIONE_BG[m.posizione_attuale] || 'bg-gray-100 text-gray-600'}`}>
                  <Icon icon={POSIZIONE_ICONS[m.posizione_attuale]} size={11} />
                  {POSIZIONE_MATERIALE[m.posizione_attuale] || m.posizione_attuale}
                </span>
                {m.posizione_attuale === 'in_magazzino' && m.magazzino?.nome && (
                  <span className="text-xs text-gray-400 hidden md:inline">({m.magazzino.nome})</span>
                )}
                {m.posizione_attuale === 'magazzino_agente' && m.agente && (
                  <span className="text-xs text-gray-400 hidden md:inline">({m.agente.cognome} {m.agente.nome})</span>
                )}
                {m.posizione_attuale === 'presso_evento' && m.posizione_dettaglio && (
                  <span className="text-xs text-gray-400 hidden md:inline truncate max-w-[120px]">({m.posizione_dettaglio})</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export function MaterialeList() {
  const materials = useMaterialsStore(s => s.materials)
  const loading = useMaterialsStore(s => s.loading)
  const loadingMore = useMaterialsStore(s => s.loadingMore)
  const hasMore = useMaterialsStore(s => s.hasMore)
  const totalCount = useMaterialsStore(s => s.totalCount)
  const error = useMaterialsStore(s => s.error)
  const filters = useMaterialsStore(s => s.filters)
  const setFilter = useMaterialsStore(s => s.setFilter)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)
  const loadMore = useMaterialsStore(s => s.loadMore)
  const resetFilters = useMaterialsStore(s => s.resetFilters)
  const stockProducts = useMaterialsStore(s => s.stockProducts)
  const stockLoading = useMaterialsStore(s => s.stockLoading)
  const fetchStockProducts = useMaterialsStore(s => s.fetchStockProducts)
  const { exporting, handleExport } = useExportHandler()
  const { labels: tipoLabels } = useProductTypes()
  // viewMode: 'product' (default) | 'list' | 'grouped'
  const [viewMode, setViewMode] = useState('product')
  const [mainTab, setMainTab] = useState('esemplari') // 'esemplari' | 'stock'
  const [stockSearch, setStockSearch] = useState('')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    resetFilters()
    const searchFromUrl = searchParams.get('search')
    if (searchFromUrl) setFilter('search', searchFromUrl)
    fetchStockProducts()
  }, [])

  // Scroll to top when filters change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters.search, filters.tipo, filters.posizione, filters.brand])

  // Contatori per posizione (note: only reflects loaded items, not total)
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

  // Raggruppamento per prodotto
  const byProduct = {}
  for (const m of materials) {
    const key = m.product_id || `no-product-${m.nome}`
    if (!byProduct[key]) {
      byProduct[key] = {
        product: m.product,
        nome: m.product?.nome || m.nome,
        brand: m.product?.brand?.nome,
        foto_url: m.product?.foto_url,
        tipo: m.product?.tipo || m.tipo,
        items: [],
        positionCounts: {},
      }
    }
    byProduct[key].items.push(m)
    const pos = m.posizione_attuale
    byProduct[key].positionCounts[pos] = (byProduct[key].positionCounts[pos] || 0) + 1
  }
  const productGroups = Object.values(byProduct).sort((a, b) => a.nome.localeCompare(b.nome, 'it'))

  // Stock tab — filtered products
  const filteredStock = stockSearch
    ? stockProducts.filter(p =>
        p.nome?.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.brand?.nome?.toLowerCase().includes(stockSearch.toLowerCase())
      )
    : stockProducts

  const sottoSogliaCount = stockProducts.filter(
    p => p.soglia_minima != null && p.quantita_disponibile <= p.soglia_minima
  ).length
  const totalStockUnits = stockProducts.reduce((acc, p) => acc + (p.quantita_disponibile ?? 0), 0)

  return (
    <div>
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget' }]} />
      </div>
      <PageHeader
        title="Materiale & Gadget"
        subtitle={mainTab === 'esemplari'
          ? (totalCount > 0 ? `${materials.length} di ${totalCount} elementi` : `${materials.length} elementi`)
          : `${stockProducts.length} prodotti`
        }
        actions={mainTab === 'esemplari'
          ? <ExportButton onClick={() => handleExport({ columns: EXPORT_COLUMNS_MATERIALI, rows: materials, filename: 'materiale', sheetName: 'Materiale' })} loading={exporting} />
          : null
        }
      />

      {/* Segmented control: Esemplari / Stock */}
      <div className="px-4 md:px-6 mb-4">
        <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMainTab('esemplari')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] transition-all ${
              mainTab === 'esemplari'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon icon={MATERIALE_ICONS.package} size={16} />
              Esemplari
            </span>
          </button>
          <button
            onClick={() => setMainTab('stock')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] transition-all ${
              mainTab === 'stock'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon icon={MATERIALE_ICONS.gadget} size={16} />
              Stock prodotti
              {sottoSogliaCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {sottoSogliaCount}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* ── ESEMPLARI TAB ── */}
      {mainTab === 'esemplari' && (
        <>
          {/* Summary bar con breakdown posizioni */}
          {/* Note: counts only reflect loaded items; if hasMore, counts are partial */}
          {!loading && materials.length > 0 && (
            <div className={'mx-4 md:mx-6 mb-4 ' + SUMMARY_BAR_STYLE}>
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
                {hasMore && (
                  <span className="flex items-center text-xs text-gray-400 italic self-center">
                    (conteggio parziale — carica tutti per il totale)
                  </span>
                )}
              </div>
            </div>
          )}

          <MaterialFilters />

          {/* Chip filtri attivi + toggle vista */}
          <div className="px-4 md:px-6 pt-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-gray-500 shrink-0">
                {loading
                  ? ''
                  : materials.length === 0
                    ? 'Nessun elemento trovato'
                    : totalCount > materials.length
                      ? `Mostrati ${materials.length} di ${totalCount} elementi`
                      : `${materials.length} ${materials.length === 1 ? 'elemento trovato' : 'elementi trovati'}`
                }
              </span>
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
            {/* View mode toggle: Per prodotto / Lista / Per posizione */}
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setViewMode('product')}
                className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors ${viewMode === 'product' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Vista per prodotto"
                title="Per prodotto"
              >
                <Icon icon={MATERIALE_ICONS.viewProduct} size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Vista lista"
                title="Lista"
              >
                <Icon icon={MATERIALE_ICONS.viewList} size={20} />
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors ${viewMode === 'grouped' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Vista per posizione"
                title="Per posizione"
              >
                <Icon icon={MATERIALE_ICONS.viewGrid} size={20} />
              </button>
            </div>
          </div>

          <div className="px-4 md:px-6 py-4">
            {loading ? (
              <LoadingSkeleton lines={5} />
            ) : error ? (
              <EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare il materiale. Riprova." />
            ) : materials.length === 0 ? (
              <EmptyState title="Nessun materiale trovato" description="Prova a cambiare i filtri." />
            ) : viewMode === 'product' ? (
              /* ── Per prodotto view ── */
              <div className="space-y-3">
                {productGroups.map((group, i) => (
                  <ProductGroupCard key={group.product?.id || `no-product-${i}`} group={group} />
                ))}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                      Carica altri
                    </Button>
                  </div>
                )}
              </div>
            ) : viewMode === 'list' ? (
              /* ── Lista flat view ── */
              <div className="space-y-3">
                {materials.map((m) => (
                  <MaterialCard key={m.id} material={m} linkTo={`/materiale/${m.id}`} showQuickAction />
                ))}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                      Carica altri
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Per posizione view ── */
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
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                      Carica altri
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── STOCK TAB ── */}
      {mainTab === 'stock' && (
        <>
          {/* Summary bar */}
          {!stockLoading && stockProducts.length > 0 && (
            <div className={'mx-4 md:mx-6 mb-4 ' + SUMMARY_BAR_STYLE}>
              <div className="flex flex-wrap gap-4 md:gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Icon icon={MATERIALE_ICONS.gadget} size={16} />
                  <span className="font-bold text-gray-900">{stockProducts.length}</span>
                  <span>prodotti</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Icon icon={MATERIALE_ICONS.warehouse} size={16} />
                  <span className="font-bold text-gray-900">{totalStockUnits}</span>
                  <span>unità totali</span>
                </div>
                {sottoSogliaCount > 0 && (
                  <div className="flex items-center gap-1.5 text-red-600 font-semibold">
                    <Icon icon={FEEDBACK_ICONS.warning} size={16} />
                    <span className="font-bold">{sottoSogliaCount}</span>
                    <span>{sottoSogliaCount === 1 ? 'prodotto sotto soglia' : 'prodotti sotto soglia'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search per stock */}
          <div className="px-4 md:px-6 mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Icon name="search" size={18} className="text-gray-400" />
              </div>
              <input
                type="search"
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                placeholder="Cerca per nome o brand..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-mikai-400 bg-white min-h-[48px]"
              />
            </div>
          </div>

          <div className="px-4 md:px-6 pb-4">
            {stockLoading ? (
              <LoadingSkeleton lines={4} />
            ) : filteredStock.length === 0 ? (
              <EmptyState
                title={stockSearch ? 'Nessun prodotto trovato' : 'Nessun prodotto a stock'}
                description={stockSearch ? 'Prova a cambiare la ricerca.' : 'Non ci sono prodotti con quantità tracciata.'}
              />
            ) : (
              <div className="space-y-3">
                {filteredStock.map(p => (
                  <StockProductCard key={p.id} product={p} tipoLabels={tipoLabels} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
