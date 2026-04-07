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

// ── Lightweight group divider ────────────────────────────────────────────────

function GroupDivider({ title, count, logoUrl }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1 px-1">
      {logoUrl && <img src={logoUrl} alt="" aria-hidden="true" className="h-3.5 w-auto object-contain" />}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      <span className="text-xs text-gray-300">{count}</span>
      <div className="flex-1 border-t border-gray-200 ml-1" />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CatalogBrowser({ existingRows, onSave, onClose }) {
  const { labels: tipoLabels, productTypes } = useProductTypes()
  const [brands, setBrands] = useState([])
  const [sections, setSections] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [brandIds, setBrandIds] = useState([])
  const [sectionIds, setSectionIds] = useState([])
  const [tipi, setTipi] = useState([])
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
  const fetchCatalogProducts = useCatalogStore(s => s.fetchCatalogProducts)

  useEffect(() => {
    Promise.all([fetchBrands(), fetchAllBodySections()])
      .then(([brandsRes, secsRes]) => {
        setBrands(brandsRes.data || [])
        setSections(secsRes.data || [])
      })
      .catch(() => { setBrands([]); setSections([]) })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCatalogProducts({ brandIds, sectionIds, tipi, search })
      .then(({ data }) => { setProducts(data || []) })
      .catch(() => { setProducts([]) })
      .finally(() => { setLoading(false) })
  }, [brandIds, sectionIds, tipi, search])

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
    setBrandIds([]); setSectionIds([]); setTipi([]); setSearch('')
  }

  const filterCount = brandIds.length + sectionIds.length + tipi.length

  const activeFilterSummary = useMemo(() => {
    const parts = []
    for (const id of brandIds) { const b = brands.find(x => x.id === id); if (b) parts.push(b.nome) }
    for (const id of sectionIds) { const s = sections.find(x => x.id === id); if (s) parts.push(s.nome) }
    for (const key of tipi) { parts.push(tipoLabels[key] || key) }
    return parts.join(', ')
  }, [brandIds, sectionIds, tipi, brands, sections, tipoLabels])

  const brandChips = brands.map(b => ({ id: b.id, label: b.nome, imageUrl: b.logo_url }))
  const sectionChips = sections.map(s => ({ id: s.id, label: s.nome, imageUrl: s.immagine_url }))
  const tipoChips = (productTypes || []).map(pt => ({ id: pt.codice, label: pt.nome }))

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
          className="min-h-[44px] px-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm"
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
          className="w-full flex items-center justify-between px-3 py-2 min-h-[44px] text-left"
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
          {groupedProducts.map(([name, group]) => (
            <div key={name}>
              <GroupDivider title={name} count={group.products.length} logoUrl={group.logoUrl} />
              {renderGrid(group.products, groupBy === 'brand')}
            </div>
          ))}
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
