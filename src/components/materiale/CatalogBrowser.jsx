import { useState, useEffect, useMemo } from 'react'
import { useCatalogStore } from '../../hooks/useCatalog'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ACTION_ICONS, CATALOGO_ICONS } from '../../lib/icons'
import { useProductTypes } from '../../hooks/useProductTypes'
import { CatalogProductCard } from './CatalogProductCard'
import { CatalogProductModal } from './CatalogProductModal'
import { CatalogCartFloating } from './CatalogCartFloating'

const GROUP_OPTIONS = [
  { key: 'none', label: 'Nessuno' },
  { key: 'brand', label: 'Brand' },
  { key: 'distretto', label: 'Distretto' },
  { key: 'tipologia', label: 'Tipologia' },
  { key: 'famiglia', label: 'Famiglia' },
]

// ── Inline chip row ──────────────────────────────────────────────────────────

function ChipRow({ items, selectedIds, onToggle }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const active = selectedIds.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium min-h-[32px] transition-colors border ${
              active
                ? 'bg-mikai-500 text-white border-mikai-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-mikai-300'
            }`}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.label} className={`h-5 w-auto object-contain shrink-0 ${active ? 'brightness-0 invert' : ''}`} />
            ) : (
              item.label
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Group divider with colored accent (sticks while scrolling) ───────────────
// Each group instance gets a distinct color rotating through the palette.

const GROUP_PALETTE = [
  { bg: 'bg-blue-50',     bar: 'bg-blue-500',     text: 'text-blue-800',     count: 'bg-blue-100 text-blue-800' },
  { bg: 'bg-purple-50',   bar: 'bg-purple-500',   text: 'text-purple-800',   count: 'bg-purple-100 text-purple-800' },
  { bg: 'bg-emerald-50',  bar: 'bg-emerald-500',  text: 'text-emerald-800',  count: 'bg-emerald-100 text-emerald-800' },
  { bg: 'bg-amber-50',    bar: 'bg-amber-500',    text: 'text-amber-800',    count: 'bg-amber-100 text-amber-800' },
  { bg: 'bg-pink-50',     bar: 'bg-pink-500',     text: 'text-pink-800',     count: 'bg-pink-100 text-pink-800' },
  { bg: 'bg-sky-50',      bar: 'bg-sky-500',      text: 'text-sky-800',      count: 'bg-sky-100 text-sky-800' },
  { bg: 'bg-orange-50',   bar: 'bg-orange-500',   text: 'text-orange-800',   count: 'bg-orange-100 text-orange-800' },
  { bg: 'bg-mikai-50',    bar: 'bg-mikai-500',    text: 'text-mikai-700',    count: 'bg-mikai-100 text-mikai-700' },
]

const FALLBACK_ACCENT = { bg: 'bg-gray-50', bar: 'bg-gray-400', text: 'text-gray-700', count: 'bg-gray-100 text-gray-700' }

function GroupDivider({ title, count, logoUrl, accent }) {
  const a = accent || FALLBACK_ACCENT
  return (
    <div className={`sticky top-0 z-10 flex items-stretch gap-3 mt-4 mb-2 rounded-lg overflow-hidden ${a.bg} border border-gray-200 shadow-sm`}>
      <div className={`w-1.5 shrink-0 ${a.bar}`} aria-hidden="true" />
      <div className="flex items-center gap-3 flex-1 px-3 py-2">
        {logoUrl && <img src={logoUrl} alt="" aria-hidden="true" className="h-6 w-auto object-contain" />}
        <h4 className={`text-base font-bold ${a.text} truncate`}>{title}</h4>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.count} shrink-0`}>{count}</span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CatalogBrowser({ existingRows, onSave, onClose }) {
  const { labels: tipoLabels, productTypes } = useProductTypes()
  const [brands, setBrands] = useState([])
  const [sections, setSections] = useState([])
  const [families, setFamilies] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [brandIds, setBrandIds] = useState([])
  const [sectionIds, setSectionIds] = useState([])
  const [tipi, setTipi] = useState([])
  const [famiglie, setFamiglie] = useState([])
  const [groupBy, setGroupBy] = useState('none')
  const [activeDrawer, setActiveDrawer] = useState(null)
  const [modalProduct, setModalProduct] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [cart, setCart] = useState(() => {
    const initial = {}
    for (const row of (existingRows || [])) {
      if (row.product) {
        initial[row.product_id] = {
          product: row.product,
          quantity: row.quantita || 1,
          note: row.note_commerciale || '',
          dbRowId: row.id,
        }
      }
    }
    return initial
  })

  const fetchBrands = useCatalogStore(s => s.fetchBrands)
  const fetchAllBodySections = useCatalogStore(s => s.fetchAllBodySections)
  const fetchAllFamilies = useCatalogStore(s => s.fetchAllFamilies)
  const fetchCatalogProducts = useCatalogStore(s => s.fetchCatalogProducts)

  useEffect(() => {
    Promise.all([fetchBrands(), fetchAllBodySections(), fetchAllFamilies()])
      .then(([brandsRes, secsRes, famRes]) => {
        setBrands(brandsRes.data || [])
        setSections(secsRes.data || [])
        setFamilies(famRes.data || [])
      })
      .catch(() => { setBrands([]); setSections([]); setFamilies([]) })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCatalogProducts({ brandIds, sectionIds, tipi, famiglie, search })
      .then(({ data }) => { setProducts(data || []) })
      .catch(() => { setProducts([]) })
      .finally(() => { setLoading(false) })
  }, [brandIds, sectionIds, tipi, famiglie, search])

  // ── Cart operations ────────────────────────────────────────────────────────

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev[product.id]
      if (existing) return { ...prev, [product.id]: { ...existing, quantity: existing.quantity + 1 } }
      return { ...prev, [product.id]: { product, quantity: 1, note: '', dbRowId: null } }
    })
  }

  const updateQuantity = (productId, qty) => {
    setCart(prev => {
      const item = prev[productId]
      if (!item) return prev
      if (qty < 1) {
        if (item.dbRowId) return { ...prev, [productId]: { ...item, quantity: 0 } }
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return { ...prev, [productId]: { ...item, quantity: qty } }
    })
  }

  const updateNote = (productId, note) => {
    setCart(prev => {
      const item = prev[productId]
      if (!item) return prev
      return { ...prev, [productId]: { ...item, note } }
    })
  }

  const clearCart = () => {
    setCart(prev => {
      const next = {}
      for (const [pid, item] of Object.entries(prev)) {
        if (item.dbRowId) next[pid] = { ...item, quantity: 0 }
      }
      return next
    })
  }

  const getQuantity = (productId) => cart[productId]?.quantity || 0
  const cartItems = Object.values(cart).filter(item => item.quantity > 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const removedItems = Object.values(cart).filter(item => item.quantity === 0 && item.dbRowId)

  const hasChanges = () => {
    const origMap = {}
    for (const row of (existingRows || [])) {
      origMap[row.product_id] = { qty: row.quantita || 1, note: row.note_commerciale || '' }
    }
    for (const [pid, item] of Object.entries(cart)) {
      const orig = origMap[pid]
      if (!orig && item.quantity > 0) return true
      if (orig && item.quantity !== orig.qty) return true
      if (orig && item.quantity === 0) return true
      if (orig && item.note !== orig.note) return true
    }
    return false
  }

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const toggle = (setter) => (id) =>
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleClearAllFilters = () => {
    setBrandIds([]); setSectionIds([]); setTipi([]); setFamiglie([]); setSearch('')
  }

  const filterCount = brandIds.length + sectionIds.length + tipi.length + famiglie.length

  const activeFilterSummary = useMemo(() => {
    const parts = []
    for (const id of brandIds) { const b = brands.find(x => x.id === id); if (b) parts.push(b.nome) }
    for (const id of sectionIds) { const s = sections.find(x => x.id === id); if (s) parts.push(s.nome) }
    for (const key of tipi) { parts.push(tipoLabels[key] || key) }
    for (const f of famiglie) { parts.push(f) }
    return parts.join(', ')
  }, [brandIds, sectionIds, tipi, famiglie, brands, sections, tipoLabels])

  const brandChips = brands.map(b => ({ id: b.id, label: b.nome, imageUrl: b.logo_url }))
  const sectionChips = sections.map(s => ({ id: s.id, label: s.nome, imageUrl: s.immagine_url }))
  const tipoChips = (productTypes || []).map(pt => ({ id: pt.codice, label: pt.nome }))
  const famigliaChips = families.map(f => ({ id: f, label: f }))

  // ── Grouping ───────────────────────────────────────────────────────────────

  const groupedProducts = useMemo(() => {
    if (groupBy === 'none') return null
    const groups = new Map()
    const ensure = (key, meta) => { if (!groups.has(key)) groups.set(key, { products: [], ...meta }) }
    for (const product of products) {
      if (groupBy === 'brand') {
        const key = product.brand?.nome || 'Altro'
        ensure(key, { logoUrl: product.brand?.logo_url })
        groups.get(key).products.push(product)
      } else if (groupBy === 'distretto') {
        const secs = product.body_sections?.map(bs => bs.body_section?.nome).filter(Boolean)
        if (!secs?.length) { ensure('Altro', {}); groups.get('Altro').products.push(product) }
        else { for (const sec of secs) { ensure(sec, {}); groups.get(sec).products.push(product) } }
      } else if (groupBy === 'tipologia') {
        const key = tipoLabels[product.tipo] || product.tipo || 'Altro'
        ensure(key, {})
        groups.get(key).products.push(product)
      } else if (groupBy === 'famiglia') {
        const key = product.famiglia || 'Senza famiglia'
        ensure(key, {})
        groups.get(key).products.push(product)
      }
    }
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === 'Altro') return 1
      if (b[0] === 'Altro') return -1
      return a[0].localeCompare(b[0], 'it')
    })
  }, [products, groupBy, tipoLabels])

  const handleClose = () => { hasChanges() ? setShowExitConfirm(true) : onClose() }
  const handleSave = async () => { setSaving(true); await onSave(cart); setSaving(false) }

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderGrid = (list, hideBrand = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
      {list.map(p => (
        <CatalogProductCard
          key={p.id}
          product={p}
          cartQuantity={getQuantity(p.id)}
          onAdd={addToCart}
          onUpdateQuantity={updateQuantity}
          onShowDetails={setModalProduct}
          hideBrand={hideBrand}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-2">
      {/* Row 1: Search + Chiudi */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SearchInput value={search} onChange={setSearch} placeholder="Cerca prodotto..." />
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="min-h-[48px] px-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm"
          aria-label="Chiudi catalogo"
        >
          <Icon icon={ACTION_ICONS.close} size={18} />
        </button>
      </div>

      {/* Row 2: Collapsible filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Filter header — always visible */}
        <button
          type="button"
          onClick={() => setFiltersExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 min-h-[48px] text-left"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon icon={CATALOGO_ICONS.filters} size={16} className="text-gray-400 shrink-0" />
            {filterCount > 0 ? (
              <span className="text-sm text-gray-700 truncate">{activeFilterSummary}</span>
            ) : (
              <span className="text-sm text-gray-400">Filtri e raggruppamento</span>
            )}
            {filterCount > 0 && (
              <span className="bg-mikai-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold leading-none shrink-0">{filterCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filterCount > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClearAllFilters() }}
                className="text-xs text-gray-400 hover:text-gray-600 px-1"
              >
                Cancella
              </button>
            )}
            <Icon
              icon={filtersExpanded ? ACTION_ICONS.chevronUp : ACTION_ICONS.chevronDown}
              size={16}
              className="text-gray-400"
            />
          </div>
        </button>

        {/* Filter content — expanded */}
        {filtersExpanded && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-gray-100 pt-2">
            <div>
              <p className="text-xs text-gray-400 mb-1">Brand</p>
              <ChipRow items={brandChips} selectedIds={brandIds} onToggle={toggle(setBrandIds)} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Distretto</p>
              <ChipRow items={sectionChips} selectedIds={sectionIds} onToggle={toggle(setSectionIds)} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Tipologia</p>
              <ChipRow items={tipoChips} selectedIds={tipi} onToggle={toggle(setTipi)} />
            </div>
            {famigliaChips.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Famiglia</p>
                <ChipRow items={famigliaChips} selectedIds={famiglie} onToggle={toggle(setFamiglie)} />
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Raggruppa per</p>
              <ChipRow
                items={GROUP_OPTIONS.map(o => ({ id: o.key, label: o.label }))}
                selectedIds={[groupBy]}
                onToggle={(key) => setGroupBy(key)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-xs text-gray-400 px-1">{products.length} prodotti</p>
      )}

      {/* Product grid */}
      {loading ? (
        <LoadingSkeleton lines={4} />
      ) : products.length === 0 ? (
        <EmptyState title="Nessun prodotto trovato" description="Prova a cambiare i filtri o la ricerca." />
      ) : groupedProducts ? (
        <div>
          {groupedProducts.map(([name, group], idx) => {
            const accent = name === 'Altro' || name === 'Senza famiglia'
              ? FALLBACK_ACCENT
              : GROUP_PALETTE[idx % GROUP_PALETTE.length]
            return (
              <div key={name}>
                <GroupDivider title={name} count={group.products.length} logoUrl={group.logoUrl} accent={accent} />
                {renderGrid(group.products, groupBy === 'brand')}
              </div>
            )
          })}
        </div>
      ) : (
        renderGrid(products)
      )}

      {/* Cart bar */}
      <CatalogCartFloating
        cartItems={cartItems}
        removedCount={removedItems.length}
        totalItems={totalItems}
        hasChanges={hasChanges()}
        saving={saving}
        onUpdateQuantity={updateQuantity}
        onUpdateNote={updateNote}
        onSave={handleSave}
        onClear={clearCart}
        open={activeDrawer === 'cart'}
        onToggle={() => setActiveDrawer(prev => prev === 'cart' ? null : 'cart')}
      />

      {/* Detail modal */}
      {modalProduct && (
        <CatalogProductModal
          product={modalProduct}
          cartQuantity={getQuantity(modalProduct.id)}
          onAdd={addToCart}
          onUpdateQuantity={updateQuantity}
          onClose={() => setModalProduct(null)}
        />
      )}

      <ConfirmDialog
        open={showExitConfirm}
        title="Modifiche non salvate"
        message="Hai modifiche nel carrello non ancora salvate. Se esci, le perderai."
        confirmLabel="Esci senza salvare"
        onConfirm={onClose}
        onCancel={() => setShowExitConfirm(false)}
        danger
      />
    </div>
  )
}
