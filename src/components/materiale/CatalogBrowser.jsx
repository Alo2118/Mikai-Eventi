import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { CatalogFilterBar } from './CatalogFilterBar'
import { CatalogProductCard } from './CatalogProductCard'
import { ActiveFiltersChips } from './ActiveFiltersChips'

export function CatalogBrowser({ existingRows, onSave, onClose }) {
  const [brands, setBrands] = useState([])
  const [sections, setSections] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [brandId, setBrandId] = useState(null)
  const [sectionId, setSectionId] = useState(null)
  const [productType, setProductType] = useState(null)

  // Cart: merged view of existing DB rows + new additions
  // { productId: { product, quantity, dbRowId (null if new) } }
  const [cart, setCart] = useState(() => {
    const initial = {}
    for (const row of (existingRows || [])) {
      if (row.product) {
        initial[row.product_id] = {
          product: row.product,
          quantity: row.quantita || 1,
          dbRowId: row.id,
        }
      }
    }
    return initial
  })

  const fetchBrands = useMaterialsStore(s => s.fetchBrands)
  const fetchAllBodySections = useMaterialsStore(s => s.fetchAllBodySections)
  const fetchCatalogProducts = useMaterialsStore(s => s.fetchCatalogProducts)

  useEffect(() => {
    Promise.all([
      fetchBrands(),
      fetchAllBodySections(),
    ]).then(([brandsRes, secsRes]) => {
      setBrands(brandsRes.data)
      setSections(secsRes.data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCatalogProducts({ brandId, sectionId, search, tipo: productType }).then(({ data }) => {
      setProducts(data)
      setLoading(false)
    })
  }, [brandId, sectionId, search, productType])

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev[product.id]
      if (existing) {
        return { ...prev, [product.id]: { ...existing, quantity: existing.quantity + 1 } }
      }
      return { ...prev, [product.id]: { product, quantity: 1, dbRowId: null } }
    })
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      setCart(prev => {
        const item = prev[productId]
        // If it's a DB row, set to 0 (will be removed on save)
        // If it's new, remove from cart
        if (item?.dbRowId) {
          return { ...prev, [productId]: { ...item, quantity: 0 } }
        }
        const next = { ...prev }
        delete next[productId]
        return next
      })
      return
    }
    setCart(prev => {
      const existing = prev[productId]
      if (existing) {
        return { ...prev, [productId]: { ...existing, quantity } }
      }
      return prev
    })
  }

  const getQuantity = (productId) => cart[productId]?.quantity || 0

  const cartItems = Object.values(cart).filter(item => item.quantity > 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const removedItems = Object.values(cart).filter(item => item.quantity === 0 && item.dbRowId)

  // Check if anything changed vs original
  const hasChanges = () => {
    const origMap = {}
    for (const row of (existingRows || [])) {
      origMap[row.product_id] = row.quantita || 1
    }
    for (const [pid, item] of Object.entries(cart)) {
      if (!origMap[pid] && item.quantity > 0) return true // new item
      if (origMap[pid] && item.quantity !== origMap[pid]) return true // qty changed
      if (origMap[pid] && item.quantity === 0) return true // removed
    }
    return false
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(cart)
    setSaving(false)
  }

  // Filters
  const activeFilters = []
  if (brandId) {
    const b = brands.find(b => b.id === brandId)
    if (b) activeFilters.push({ id: 'brand', label: b.nome })
  }
  if (sectionId) {
    const s = sections.find(s => s.id === sectionId)
    if (s) activeFilters.push({ id: 'section', label: s.nome })
  }
  if (productType) {
    const labels = { demo_kit: 'Demo Kit', strumentario: 'Strumentario', montaggio: 'Montaggio', pezzo_sfuso: 'Pezzo sfuso' }
    activeFilters.push({ id: 'type', label: labels[productType] || productType })
  }

  const handleRemoveFilter = (id) => {
    if (id === 'brand') setBrandId(null)
    if (id === 'section') setSectionId(null)
    if (id === 'type') setProductType(null)
  }

  const handleClearAll = () => {
    setBrandId(null)
    setSectionId(null)
    setProductType(null)
    setSearch('')
  }

  return (
    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Catalogo prodotti</h3>
        <Button variant="ghost" onClick={onClose}>Chiudi</Button>
      </div>

      {/* Two-column layout: catalog left, cart right on desktop */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: catalog */}
        <div className="flex-1 min-w-0 space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Cerca prodotto..." />

          <CatalogFilterBar
            brands={brands}
            sections={sections}
            selectedBrandId={brandId}
            selectedSectionId={sectionId}
            selectedType={productType}
            onBrandSelect={setBrandId}
            onSectionSelect={setSectionId}
            onTypeSelect={setProductType}
          />

          <ActiveFiltersChips
            filters={activeFilters}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearAll}
          />

          {loading ? (
            <LoadingSkeleton lines={4} />
          ) : products.length === 0 ? (
            <EmptyState title="Nessun prodotto trovato" description="Prova a cambiare i filtri di ricerca." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {products.map((p) => (
                <CatalogProductCard
                  key={p.id}
                  product={p}
                  cartQuantity={getQuantity(p.id)}
                  onAdd={addToCart}
                  onUpdateQuantity={updateQuantity}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: cart sidebar (sticky on desktop, bottom on mobile) */}
        <div className="md:w-80 md:flex-shrink-0">
          <div className="md:sticky md:top-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Icon icon={MATERIALE_ICONS.package} size={18} />
                Carrello
                {totalItems > 0 && (
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {totalItems} {totalItems === 1 ? 'articolo' : 'articoli'}
                  </span>
                )}
              </h4>

              {cartItems.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Carrello vuoto</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product.nome}</p>
                        <p className="text-xs text-gray-500">{item.product.brand?.nome}</p>
                      </div>

                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-md bg-gray-100 hover:bg-red-100 flex items-center justify-center text-sm font-bold text-gray-600 hover:text-red-600 transition-colors"
                          aria-label="Diminuisci"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-md bg-gray-100 hover:bg-mikai-100 flex items-center justify-center text-sm font-bold text-gray-600 hover:text-mikai-600 transition-colors"
                          aria-label="Aumenta"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {removedItems.length > 0 && (
                <p className="text-sm text-red-500">
                  {removedItems.length} {removedItems.length === 1 ? 'articolo verrà rimosso' : 'articoli verranno rimossi'}
                </p>
              )}

              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges() || saving}
                size="lg"
                className="w-full"
              >
                <Icon icon={ACTION_ICONS.check} size={18} className="mr-2" />
                Salva lista
              </Button>
              {!hasChanges() && cartItems.length > 0 && (
                <p className="text-sm text-gray-400 text-center">Nessuna modifica da salvare</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
