import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ACTION_ICONS, CATALOGO_ICONS } from '../../lib/icons'
import { TIPO_PRODOTTO } from '../../lib/constants'
import { CatalogSidebar } from './CatalogSidebar'
import { CatalogProductCard } from './CatalogProductCard'
import { CatalogProductModal } from './CatalogProductModal'
import { CatalogCartFloating } from './CatalogCartFloating'
import { ActiveFiltersChips } from './ActiveFiltersChips'

export function CatalogBrowser({ existingRows, onSave, onClose }) {
  const [brands, setBrands] = useState([])
  const [sections, setSections] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [brandIds, setBrandIds] = useState([])
  const [sectionIds, setSectionIds] = useState([])
  const [tipi, setTipi] = useState([])
  const [activeDrawer, setActiveDrawer] = useState(null)
  const [modalProduct, setModalProduct] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

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

  const fetchBrands = useMaterialsStore(s => s.fetchBrands)
  const fetchAllBodySections = useMaterialsStore(s => s.fetchAllBodySections)
  const fetchCatalogProducts = useMaterialsStore(s => s.fetchCatalogProducts)

  // On mount: fetch brands + sections in parallel
  useEffect(() => {
    Promise.all([fetchBrands(), fetchAllBodySections()]).then(([brandsRes, secsRes]) => {
      setBrands(brandsRes.data || [])
      setSections(secsRes.data || [])
    })
  }, [])

  // On filter/search change: fetch products
  useEffect(() => {
    setLoading(true)
    fetchCatalogProducts({ brandIds, sectionIds, tipi, search }).then(({ data }) => {
      setProducts(data || [])
      setLoading(false)
    })
  }, [brandIds, sectionIds, tipi, search])

  // ── Cart operations ──────────────────────────────────────────────────────────

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev[product.id]
      if (existing) {
        return { ...prev, [product.id]: { ...existing, quantity: existing.quantity + 1 } }
      }
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
        if (item.dbRowId) {
          next[pid] = { ...item, quantity: 0 }
        }
        // items without dbRowId are dropped
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

  // ── Filter chips ─────────────────────────────────────────────────────────────

  const activeFilters = [
    ...brandIds.map(id => {
      const b = brands.find(x => x.id === id)
      return b ? { id: `brand:${id}`, label: b.nome } : null
    }).filter(Boolean),
    ...sectionIds.map(id => {
      const s = sections.find(x => x.id === id)
      return s ? { id: `section:${id}`, label: s.nome } : null
    }).filter(Boolean),
    ...tipi.map(key => ({
      id: `tipo:${key}`,
      label: TIPO_PRODOTTO[key] || key,
    })),
  ]

  const handleRemoveFilter = (chipId) => {
    const [type, value] = chipId.split(/:(.+)/)
    if (type === 'brand') setBrandIds(prev => prev.filter(id => id !== value))
    if (type === 'section') setSectionIds(prev => prev.filter(id => id !== value))
    if (type === 'tipo') setTipi(prev => prev.filter(k => k !== value))
  }

  const handleClearAllFilters = () => {
    setBrandIds([])
    setSectionIds([])
    setTipi([])
    setSearch('')
  }

  // ── Sidebar toggle helpers ────────────────────────────────────────────────────

  const handleToggleBrand = (id) =>
    setBrandIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleToggleSection = (id) =>
    setSectionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleToggleTipo = (key) =>
    setTipi(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])

  // ── Close / save handlers ─────────────────────────────────────────────────────

  const handleClose = () => {
    if (hasChanges()) {
      setShowExitConfirm(true)
    } else {
      onClose()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(cart)
    setSaving(false)
  }

  // ── Filter badge count ────────────────────────────────────────────────────────

  const filterCount = brandIds.length + sectionIds.length + tipi.length

  return (
    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Torna alla lista materiale"
          className="flex items-center gap-2 min-h-[48px] px-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium text-base"
        >
          <Icon icon={ACTION_ICONS.back} size={18} />
          Torna alla lista materiale
        </button>
      </div>

      {/* Main layout */}
      <div className="flex gap-4">
        {/* Sidebar (desktop only — mobile drawer handled inside CatalogSidebar) */}
        <CatalogSidebar
          brands={brands}
          sections={sections}
          selectedBrandIds={brandIds}
          selectedSectionIds={sectionIds}
          selectedTipi={tipi}
          onToggleBrand={handleToggleBrand}
          onToggleSection={handleToggleSection}
          onToggleTipo={handleToggleTipo}
          open={activeDrawer === 'filters'}
          onClose={() => setActiveDrawer(null)}
        />

        {/* Product area */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Search row + mobile filter button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Cerca prodotto..."
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveDrawer(prev => prev === 'filters' ? null : 'filters')}
              aria-label="Apri filtri"
              className="md:hidden relative flex items-center justify-center min-h-[48px] min-w-[48px] rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Icon icon={CATALOGO_ICONS.filters} size={20} />
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-mikai-500 text-white text-xs font-bold flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active filter chips */}
          <ActiveFiltersChips
            filters={activeFilters}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearAllFilters}
          />

          {/* Product grid */}
          {loading ? (
            <LoadingSkeleton lines={4} />
          ) : products.length === 0 ? (
            <EmptyState
              title="Nessun prodotto trovato"
              description="Prova a cambiare i filtri o la ricerca."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map(p => (
                <CatalogProductCard
                  key={p.id}
                  product={p}
                  cartQuantity={getQuantity(p.id)}
                  onAdd={addToCart}
                  onUpdateQuantity={updateQuantity}
                  onShowDetails={setModalProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating cart */}
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

      {/* Product detail modal */}
      {modalProduct && (
        <CatalogProductModal
          product={modalProduct}
          cartQuantity={getQuantity(modalProduct.id)}
          onAdd={addToCart}
          onClose={() => setModalProduct(null)}
        />
      )}

      {/* Unsaved changes confirm dialog */}
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
