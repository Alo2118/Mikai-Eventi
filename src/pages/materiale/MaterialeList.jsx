import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useCatalogStore } from '../../hooks/useCatalog'
import { useAuthStore } from '../../hooks/useAuth'
import { useExportHandler } from '../../hooks/useExportHandler'
import { MaterialCard } from '../../components/materiale/MaterialCard'
import { MaterialFilters } from '../../components/materiale/MaterialFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { ExportButton } from '../../components/ui/ExportButton'
import { SearchInput } from '../../components/ui/SearchInput'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Icon } from '../../components/ui/Icon'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, SUMMARY_BAR_STYLE, POSIZIONE_ORDER, POSIZIONE_BG, GROUP_HEADING_STYLE, SELECT_STYLE } from '../../lib/constants'
import { useProductTypes } from '../../hooks/useProductTypes'
import { POSIZIONE_ICONS, MATERIALE_ICONS, FEEDBACK_ICONS, ACTION_ICONS, NAV_ICONS } from '../../lib/icons'
import { StockProductCard } from '../../components/materiale/StockProductCard'
import { ProductGroupCard } from '../../components/materiale/ProductGroupCard'
import { MagazzinoOggi } from '../../components/materiale/MagazzinoOggi'
import { MagazzinoAlerts } from '../../components/materiale/MagazzinoAlerts'

const EXPORT_COLUMNS_MATERIALI = [
  { key: 'nome', label: 'Nome', width: 30 },
  { key: 'codice_inventario', label: 'Codice inventario' },
  { key: 'tipo', label: 'Tipo', format: v => TIPO_MATERIALE[v] || v },
  { key: 'posizione_attuale', label: 'Posizione', format: v => POSIZIONE_MATERIALE[v] || v },
  { key: 'product', label: 'Brand', format: v => v?.brand?.nome || '' },
]

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
  const positionCounts = useMaterialsStore(s => s.positionCounts)
  const fetchPositionCounts = useMaterialsStore(s => s.fetchPositionCounts)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)
  const loadMore = useMaterialsStore(s => s.loadMore)
  const resetFilters = useMaterialsStore(s => s.resetFilters)
  const stockProducts = useCatalogStore(s => s.stockProducts)
  const stockLoading = useCatalogStore(s => s.stockLoading)
  const fetchStockProducts = useCatalogStore(s => s.fetchStockProducts)
  const fetchBrands = useCatalogStore(s => s.fetchBrands)
  const { exporting, handleExport } = useExportHandler()
  const { labels: tipoLabels, productTypes } = useProductTypes()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canSeeMagazzinoOggi = hasPermission('gestione_magazzino')
  // viewMode: 'product' (default) | 'list' | 'grouped'
  const [viewMode, setViewMode] = useState('product')
  const [mainTab, setMainTab] = useState(canSeeMagazzinoOggi ? 'oggi' : 'esemplari') // 'oggi' | 'esemplari' | 'stock'
  const [stockSearch, setStockSearch] = useState('')
  const [stockBrand, setStockBrand] = useState('')
  const [stockTipo, setStockTipo] = useState('')
  const [stockGrouping, setStockGrouping] = useState('lista') // 'lista' | 'brand' | 'tipo'
  const [stockSottoSogliaOnly, setStockSottoSogliaOnly] = useState(false)
  const [brands, setBrands] = useState([])
  const [searchParams] = useSearchParams()

  useEffect(() => {
    resetFilters()
    fetchPositionCounts()
    const searchFromUrl = searchParams.get('search')
    if (searchFromUrl) setFilter('search', searchFromUrl)
    fetchStockProducts()
    fetchBrands().then(({ data }) => setBrands(data || []))
  }, [])

  // Scroll to top when filters change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters.search, filters.tipo, filters.posizione, filters.brand])

  // Contatori per posizione — server-side totals from positionCounts
  const counts = useMemo(() => {
    const c = {}
    let total = 0
    for (const pos of POSIZIONE_ORDER) {
      c[pos] = positionCounts[pos] || 0
      total += c[pos]
    }
    c._total = total
    return c
  }, [positionCounts])

  // Filtri attivi (per chip)
  const activeFilters = useMemo(() => {
    const af = []
    if (filters.search) af.push({ key: 'search', label: `"${filters.search}"` })
    if (filters.brand) af.push({ key: 'brand', label: materials.find(m => m.product?.brand?.id === filters.brand)?.product?.brand?.nome || 'Azienda' })
    if (filters.tipo) af.push({ key: 'tipo', label: TIPO_MATERIALE[filters.tipo] })
    if (filters.posizione) af.push({ key: 'posizione', label: POSIZIONE_MATERIALE[filters.posizione] })
    return af
  }, [filters.search, filters.brand, filters.tipo, filters.posizione, materials])

  // Raggruppamento per posizione
  const grouped = useMemo(() => {
    const g = {}
    for (const pos of POSIZIONE_ORDER) g[pos] = []
    for (const m of materials) {
      if (g[m.posizione_attuale]) g[m.posizione_attuale].push(m)
    }
    return g
  }, [materials])

  // Raggruppamento per prodotto
  const productGroups = useMemo(() => {
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
    return Object.values(byProduct).sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  }, [materials])

  // Stock tab — filtered products
  const filteredStock = useMemo(() => {
    let items = stockProducts
    if (stockSearch) {
      const q = stockSearch.toLowerCase()
      items = items.filter(p =>
        p.nome?.toLowerCase().includes(q) ||
        p.brand?.nome?.toLowerCase().includes(q)
      )
    }
    if (stockBrand) {
      items = items.filter(p => p.brand?.id === stockBrand)
    }
    if (stockTipo) {
      items = items.filter(p => p.tipo === stockTipo)
    }
    if (stockSottoSogliaOnly) {
      items = items.filter(p => p.soglia_minima != null && p.quantita_disponibile <= p.soglia_minima)
    }
    return items
  }, [stockProducts, stockSearch, stockBrand, stockTipo, stockSottoSogliaOnly])

  const sottoSogliaCount = stockProducts.filter(
    p => p.soglia_minima != null && p.quantita_disponibile <= p.soglia_minima
  ).length
  const totalStockUnits = stockProducts.reduce((acc, p) => acc + (p.quantita_disponibile ?? 0), 0)

  // Stock grouped by brand
  const stockByBrand = useMemo(() => {
    if (stockGrouping !== 'brand') return null
    const groups = {}
    for (const p of filteredStock) {
      const key = p.brand?.nome || 'Senza brand'
      if (!groups[key]) groups[key] = { label: key, items: [], totalUnits: 0 }
      groups[key].items.push(p)
      groups[key].totalUnits += p.quantita_disponibile ?? 0
    }
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label, 'it'))
  }, [filteredStock, stockGrouping])

  // Stock grouped by tipo
  const stockByTipo = useMemo(() => {
    if (stockGrouping !== 'tipo') return null
    const groups = {}
    for (const p of filteredStock) {
      const key = p.tipo || 'altro'
      const label = tipoLabels[key] || key
      if (!groups[key]) groups[key] = { label, items: [], totalUnits: 0 }
      groups[key].items.push(p)
      groups[key].totalUnits += p.quantita_disponibile ?? 0
    }
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label, 'it'))
  }, [filteredStock, stockGrouping, tipoLabels])

  // Unique product types in stock for filter dropdown
  const stockTipoOptions = useMemo(() => {
    const types = new Set()
    for (const p of stockProducts) {
      if (p.tipo) types.add(p.tipo)
    }
    return [...types].sort()
  }, [stockProducts])

  return (
    <div>
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget' }]} />
      </div>
      <PageHeader
        title="Materiale & Gadget"
        subtitle={
          mainTab === 'oggi' ? 'La tua giornata in magazzino'
          : mainTab === 'esemplari' ? (totalCount > 0 ? `${materials.length} di ${totalCount} elementi` : `${materials.length} elementi`)
          : `${stockProducts.length} prodotti`
        }
        actions={
          <div className="flex items-center gap-2">
            {canSeeMagazzinoOggi && <MagazzinoAlerts />}
            {mainTab === 'esemplari' && (
              <ExportButton onClick={() => handleExport({ columns: EXPORT_COLUMNS_MATERIALI, rows: materials, filename: 'materiale', sheetName: 'Materiale' })} loading={exporting} />
            )}
          </div>
        }
      />

      {/* Segmented control: Oggi / Esemplari / Stock */}
      <div className="px-4 md:px-6 mb-4">
        <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
          {canSeeMagazzinoOggi && (
            <button
              onClick={() => setMainTab('oggi')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[48px] transition-all ${
                mainTab === 'oggi'
                  ? 'bg-white text-mikai-700 shadow-sm ring-2 ring-mikai-300'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon icon={NAV_ICONS.dashboard} size={16} />
                Oggi
              </span>
            </button>
          )}
          <button
            onClick={() => setMainTab('esemplari')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[48px] transition-all ${
              mainTab === 'esemplari'
                ? 'bg-white text-mikai-700 shadow-sm ring-2 ring-mikai-300'
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
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[48px] transition-all ${
              mainTab === 'stock'
                ? 'bg-white text-mikai-700 shadow-sm ring-2 ring-mikai-300'
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

      {/* ── OGGI TAB (default per chi ha gestione_magazzino) ── */}
      {mainTab === 'oggi' && canSeeMagazzinoOggi && (
        <MagazzinoOggi onSwitchToStock={() => setMainTab('stock')} />
      )}

      {/* ── ESEMPLARI TAB ── */}
      {mainTab === 'esemplari' && (
        <>
          {/* Row 1: Info bar — display-only position counts */}
          {!loading && counts._total > 0 && (
            <div className={'mx-4 md:mx-6 mb-3 ' + SUMMARY_BAR_STYLE}>
              <div className="flex flex-wrap items-center gap-3 md:gap-5">
                <span className="text-sm font-semibold text-gray-700 shrink-0">
                  Totale: <span className="text-gray-900">{counts._total}</span> esemplari
                </span>
                <span className="hidden md:inline text-gray-300">|</span>
                {POSIZIONE_ORDER.map(pos => {
                  const count = counts[pos]
                  if (count === 0) return null
                  return (
                    <span
                      key={pos}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${POSIZIONE_BG[pos]}`}
                    >
                      <Icon icon={POSIZIONE_ICONS[pos]} size={14} />
                      <span className="font-bold">{count}</span>
                      <span className="hidden md:inline">{POSIZIONE_MATERIALE[pos]}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Row 2: Filters (search, brand, tipo, posizione dropdowns) */}
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
                className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center gap-2 justify-center transition-colors ${viewMode === 'product' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Vista per prodotto"
                title="Per prodotto"
              >
                <Icon icon={MATERIALE_ICONS.viewProduct} size={20} />
                <span className="hidden lg:inline text-sm font-medium">Per prodotto</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center gap-2 justify-center transition-colors ${viewMode === 'list' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Vista lista"
                title="Lista"
              >
                <Icon icon={MATERIALE_ICONS.viewList} size={20} />
                <span className="hidden lg:inline text-sm font-medium">Lista</span>
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-3 rounded-lg min-h-[48px] min-w-[48px] flex items-center gap-2 justify-center transition-colors ${viewMode === 'grouped' ? 'bg-mikai-100 text-mikai-600' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Vista per posizione"
                title="Per posizione"
              >
                <Icon icon={MATERIALE_ICONS.viewGrid} size={20} />
                <span className="hidden lg:inline text-sm font-medium">Per posizione</span>
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
              <div className="flex flex-wrap gap-4 md:gap-6 text-sm items-center">
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
                  <button
                    onClick={() => setStockSottoSogliaOnly(v => !v)}
                    className={`flex items-center gap-1.5 font-semibold min-h-[48px] px-3 py-1 rounded-lg transition-colors ${
                      stockSottoSogliaOnly
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    aria-label={stockSottoSogliaOnly ? 'Mostra tutti i prodotti' : 'Mostra solo prodotti sotto soglia'}
                  >
                    <Icon icon={FEEDBACK_ICONS.warning} size={16} />
                    <span className="font-bold">{sottoSogliaCount}</span>
                    <span>{sottoSogliaCount === 1 ? 'sotto soglia' : 'sotto soglia'}</span>
                    {stockSottoSogliaOnly && (
                      <Icon name="close" size={14} className="ml-1" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filters for stock */}
          <div className="px-4 md:px-6 mb-4 space-y-3">
            <SearchInput
              value={stockSearch}
              onChange={setStockSearch}
              placeholder="Cerca per nome o brand..."
              delay={0}
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={stockBrand}
                onChange={(e) => setStockBrand(e.target.value)}
                className={SELECT_STYLE}
                aria-label="Filtra per brand"
              >
                <option value="">Tutti i brand</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
              <select
                value={stockTipo}
                onChange={(e) => setStockTipo(e.target.value)}
                className={SELECT_STYLE}
                aria-label="Filtra per tipo prodotto"
              >
                <option value="">Tutti i tipi</option>
                {stockTipoOptions.map(t => (
                  <option key={t} value={t}>{tipoLabels[t] || t}</option>
                ))}
              </select>
              {(stockSearch || stockBrand || stockTipo || stockSottoSogliaOnly) && (
                <button
                  onClick={() => { setStockSearch(''); setStockBrand(''); setStockTipo(''); setStockSottoSogliaOnly(false) }}
                  className="px-4 py-2.5 text-base text-mikai-400 hover:text-mikai-500 min-h-[48px] font-medium"
                >
                  Azzera filtri
                </button>
              )}
            </div>
          </div>

          {/* Grouping toggle */}
          <div className="px-4 md:px-6 mb-4 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              {filteredStock.length === stockProducts.length
                ? `${filteredStock.length} prodotti`
                : `${filteredStock.length} di ${stockProducts.length} prodotti`
              }
            </span>
            <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5 shrink-0">
              {[
                { id: 'lista', label: 'Lista' },
                { id: 'brand', label: 'Per brand' },
                { id: 'tipo', label: 'Per tipo' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setStockGrouping(opt.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium min-h-[48px] transition-all ${
                    stockGrouping === opt.id
                      ? 'bg-white text-mikai-700 shadow-sm ring-2 ring-mikai-300'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 md:px-6 pb-4">
            {stockLoading ? (
              <LoadingSkeleton lines={4} />
            ) : filteredStock.length === 0 ? (
              <EmptyState
                title={stockSearch || stockBrand || stockTipo || stockSottoSogliaOnly ? 'Nessun prodotto trovato' : 'Nessun prodotto a stock'}
                description={stockSearch || stockBrand || stockTipo || stockSottoSogliaOnly ? 'Prova a cambiare i filtri.' : 'Non ci sono prodotti con quantità tracciata.'}
              />
            ) : stockGrouping === 'lista' ? (
              <div className="space-y-3">
                {filteredStock.map(p => (
                  <StockProductCard key={p.id} product={p} tipoLabels={tipoLabels} />
                ))}
              </div>
            ) : stockGrouping === 'brand' && stockByBrand ? (
              <div className="space-y-6">
                {stockByBrand.map(group => (
                  <StockGroup key={group.label} group={group} tipoLabels={tipoLabels} />
                ))}
              </div>
            ) : stockGrouping === 'tipo' && stockByTipo ? (
              <div className="space-y-6">
                {stockByTipo.map(group => (
                  <StockGroup key={group.label} group={group} tipoLabels={tipoLabels} />
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

// ── Collapsible stock group ────────────────────────────────────────────────

function StockGroup({ group, tipoLabels }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className={GROUP_HEADING_STYLE + ' w-full flex items-center justify-between gap-3 min-h-[48px] mb-3'}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          {group.label}
          <span className="text-gray-400 font-normal">
            {group.items.length} {group.items.length === 1 ? 'prodotto' : 'prodotti'}
            {' · '}{group.totalUnits} unità
          </span>
        </span>
        <Icon
          name={expanded ? 'chevronUp' : 'chevronDown'}
          size={16}
          className="text-gray-400"
        />
      </button>
      {expanded && (
        <div className="space-y-3">
          {group.items.map(p => (
            <StockProductCard key={p.id} product={p} tipoLabels={tipoLabels} />
          ))}
        </div>
      )}
    </div>
  )
}
