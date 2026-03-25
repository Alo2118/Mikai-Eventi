# Catalogo E-commerce — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing System B catalog (`CatalogBrowser`) into a full e-commerce experience with multi-select filters in a sidebar/drawer, product detail modal with availability, and a floating cart — then wire it into `EventiDetail` replacing the legacy `EventMaterialsTab`.

**Architecture:** Evolve existing `CatalogBrowser.jsx` to use a new `CatalogSidebar` (checkbox filters, desktop sidebar/mobile drawer), replace inline product expand with `CatalogProductModal`, replace inline cart sidebar with `CatalogCartFloating` (FAB + drawer). Update `useMaterials.js` store for multi-select filters and product availability. Finally wire `EventMaterialList` into `EventiDetail` (adding gadget + movement sections) and delete legacy System A files.

**Tech Stack:** React 19, Zustand, Supabase JS, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-19-catalogo-ecommerce-design.md`

---

## File Structure

```
src/
  lib/
    icons.js                              # ADD: ShoppingCart import + CATALOGO_ICONS map
  hooks/
    useMaterials.js                       # MODIFY: multi-select fetchCatalogProducts, add fetchProductAvailability
  components/
    materiale/
      CatalogSidebar.jsx                  # NEW: checkbox filters (desktop sidebar, mobile drawer)
      CatalogProductModal.jsx             # NEW: product detail modal with availability
      CatalogCartFloating.jsx             # NEW: floating FAB + cart drawer
      CatalogBrowser.jsx                  # MODIFY: replace CatalogFilterBar with CatalogSidebar, remove inline cart, add floating cart + modal
      CatalogProductCard.jsx              # MODIFY: remove expand, add "Dettagli" button for modal
      CatalogFilterBar.jsx                # DELETE after CatalogBrowser is updated
      ActiveFiltersChips.jsx              # MODIFY: support multi-select filter IDs (e.g. brand:uuid)
    eventi/
      EventMaterialList.jsx               # MODIFY: add gadget + movement sections from EventMaterialsTab
      EventMaterialsTab.jsx               # DELETE after EventiDetail is wired
  pages/
    eventi/
      EventiDetail.jsx                    # MODIFY: swap EventMaterialsTab → EventMaterialList

  # Legacy files to DELETE (System A):
  components/materiale/MaterialCatalogPicker.jsx
  components/materiale/CatalogStepBrand.jsx
  components/materiale/CatalogStepBodySection.jsx
  components/materiale/CatalogStepProducts.jsx
  components/materiale/MaterialCart.jsx
```

---

## Task 1: Store — multi-select filters + fetchProductAvailability

**Files:**
- Modify: `src/hooks/useMaterials.js:255-280` (fetchCatalogProducts)
- Modify: `src/hooks/useMaterials.js` (add fetchProductAvailability after fetchKitContents)

- [ ] **Step 1: Update `fetchCatalogProducts` to accept multi-select filters**

In `src/hooks/useMaterials.js`, replace the current `fetchCatalogProducts` (lines 255-280) with:

```js
  fetchCatalogProducts: async (filters) => {
    let query = supabase
      .from('products')
      .select('*, brand:brands(id, nome, logo_url), body_sections:product_body_sections(body_section:body_sections(id, nome))')
      .eq('attivo', true)
      .order('nome')

    // Multi-select brand filter
    if (filters.brandIds?.length > 0) query = query.in('brand_id', filters.brandIds)
    // Legacy single-select fallback
    else if (filters.brandId) query = query.eq('brand_id', filters.brandId)

    if (filters.search) query = query.ilike('nome', `%${filters.search}%`)

    const { data, error } = await query
    let products = data || []

    // Client-side: multi-select body section (OR within group)
    if (filters.sectionIds?.length > 0) {
      products = products.filter(p =>
        p.body_sections?.some(bs => filters.sectionIds.includes(bs.body_section?.id))
      )
    } else if (filters.sectionId) {
      products = products.filter(p =>
        p.body_sections?.some(bs => bs.body_section?.id === filters.sectionId)
      )
    }

    // Client-side: multi-select product type (OR within group)
    if (filters.tipi?.length > 0) {
      products = products.filter(p => filters.tipi.includes(p.tipo))
    } else if (filters.tipo) {
      products = products.filter(p => p.tipo === filters.tipo)
    }

    return { data: products, error: error?.message || null }
  },
```

- [ ] **Step 2: Add `fetchProductAvailability` after `fetchKitContents`**

In `src/hooks/useMaterials.js`, after `fetchKitContents` (line 299), add:

```js
  fetchProductAvailability: async (productId) => {
    const { data, error } = await supabase
      .from('materials')
      .select('id, nome, codice_inventario, posizione_attuale, magazzino_id')
      .eq('product_id', productId)
      .eq('attivo', true)
    return { data: data || [], error: error?.message || null }
  },
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: exit 0, no errors (the old CatalogBrowser still calls with old filter shape, but the legacy fallbacks handle it).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMaterials.js
git commit -m "feat: multi-select catalog filters + fetchProductAvailability in store"
```

---

## Task 2: Icons — add ShoppingCart + CATALOGO_ICONS

**Files:**
- Modify: `src/lib/icons.js`

- [ ] **Step 1: Add `ShoppingCart` and `SlidersHorizontal` imports and CATALOGO_ICONS map**

In `src/lib/icons.js`, add `ShoppingCart` and `SlidersHorizontal` to the import block (after `Gift,` in the Materiale section):

```js
  // Catalogo
  ShoppingCart,
  SlidersHorizontal,
```

After `MATERIALE_ICONS` (line 199), add:

```js
// ═══════════════════════════════════════════
// Catalogo e-commerce
// ═══════════════════════════════════════════
export const CATALOGO_ICONS = {
  cart: ShoppingCart,
  filters: SlidersHorizontal,
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/icons.js
git commit -m "feat: add CATALOGO_ICONS (cart, filters) to icon registry"
```

---

## Task 3: CatalogSidebar — checkbox multi-select filters

**Files:**
- Create: `src/components/materiale/CatalogSidebar.jsx`

This component renders:
- **Desktop:** visible sidebar with checkbox groups for Brand, Sezione corpo, Tipo prodotto
- **Mobile:** hidden by default, shown as a drawer (controlled by parent via `open` prop)

- [ ] **Step 1: Create `CatalogSidebar.jsx`**

```jsx
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, CATALOGO_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { TIPO_PRODOTTO } from '../../lib/constants'

function FilterGroup({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function FilterCheckbox({ label, checked, onChange, icon }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[40px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4.5 h-4.5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400"
      />
      {icon && (
        <span className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {typeof icon === 'string' ? (
            <img src={icon} alt="" className="w-full h-full object-contain" />
          ) : icon}
        </span>
      )}
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

export function CatalogSidebar({
  brands, sections,
  selectedBrandIds, selectedSectionIds, selectedTipi,
  onToggleBrand, onToggleSection, onToggleTipo,
  // Mobile drawer
  open, onClose,
}) {
  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between md:hidden">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Icon icon={CATALOGO_ICONS.filters} size={18} />
          Filtri
        </h3>
        <button onClick={onClose} className="min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Chiudi filtri">
          <Icon icon={ACTION_ICONS.close} size={20} />
        </button>
      </div>

      {brands.length > 0 && (
        <FilterGroup title="Azienda">
          {brands.map(b => (
            <FilterCheckbox
              key={b.id}
              label={b.nome}
              checked={selectedBrandIds.includes(b.id)}
              onChange={() => onToggleBrand(b.id)}
              icon={b.logo_url || <Icon icon={MATERIALE_ICONS.produttore} size={16} className="text-gray-400" />}
            />
          ))}
        </FilterGroup>
      )}

      {sections.length > 0 && (
        <FilterGroup title="Distretto anatomico">
          {sections.map(s => (
            <FilterCheckbox
              key={s.id}
              label={s.nome}
              checked={selectedSectionIds.includes(s.id)}
              onChange={() => onToggleSection(s.id)}
              icon={s.immagine_url || <span className="text-xs font-bold text-gray-300">{s.nome.charAt(0)}</span>}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Tipo prodotto">
        {Object.entries(TIPO_PRODOTTO).map(([key, label]) => (
          <FilterCheckbox
            key={key}
            label={label}
            checked={selectedTipi.includes(key)}
            onChange={() => onToggleTipo(key)}
          />
        ))}
      </FilterGroup>
    </div>
  )

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:block w-56 flex-shrink-0">{content}</div>

      {/* Mobile: drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl p-4 overflow-y-auto">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/materiale/CatalogSidebar.jsx
git commit -m "feat: add CatalogSidebar with checkbox multi-select filters"
```

---

## Task 4: CatalogProductModal — detail modal with availability

**Files:**
- Create: `src/components/materiale/CatalogProductModal.jsx`

Shows product details, body sections, kit contents, and physical material availability (new store action). Has "Aggiungi al carrello" button.

- [ ] **Step 1: Create `CatalogProductModal.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { POSIZIONE_MATERIALE } from '../../lib/constants'
import { KitContentsList } from './KitContentsList'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'

export function CatalogProductModal({ product, cartQuantity, onAdd, onClose }) {
  const [contents, setContents] = useState([])
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchKitContents = useMaterialsStore(s => s.fetchKitContents)
  const fetchProductAvailability = useMaterialsStore(s => s.fetchProductAvailability)

  useEffect(() => {
    if (!product) return
    setLoading(true)
    Promise.all([
      fetchKitContents(product.id),
      fetchProductAvailability(product.id),
    ]).then(([kit, avail]) => {
      setContents(kit.data)
      setAvailability(avail.data)
      setLoading(false)
    })
  }, [product?.id])

  if (!product) return null

  const sections = product.body_sections?.map(bs => bs.body_section?.nome).filter(Boolean)
  const inCart = cartQuantity > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-xl">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{product.nome}</h2>
            <p className="text-sm text-gray-500">{product.brand?.nome}</p>
          </div>
          <button onClick={onClose} className="min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Chiudi">
            <Icon icon={ACTION_ICONS.close} size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Type + Code */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {product.tipo && <span className="px-2.5 py-1 bg-gray-100 rounded-full">{product.tipo}</span>}
            {product.codice && <span className="px-2.5 py-1 bg-gray-100 rounded-full">Cod. {product.codice}</span>}
          </div>

          {/* Body sections */}
          {sections?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1.5">Distretti anatomici</p>
              <div className="flex flex-wrap gap-1.5">
                {sections.map(s => (
                  <span key={s} className="text-xs bg-mikai-50 text-mikai-700 px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.descrizione && (
            <p className="text-sm text-gray-600">{product.descrizione}</p>
          )}

          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : (
            <>
              {/* Kit contents */}
              {contents.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1.5">Contenuto kit</p>
                  <KitContentsList contents={contents} />
                </div>
              )}

              {/* Availability */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1.5">
                  Disponibilita ({availability.length} {availability.length === 1 ? 'unita' : 'unita'})
                </p>
                {availability.length === 0 ? (
                  <p className="text-sm text-gray-400">Nessun materiale fisico censito per questo prodotto.</p>
                ) : (
                  <div className="space-y-1.5">
                    {availability.map(mat => (
                      <div key={mat.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
                        <div className="min-w-0">
                          <span className="text-gray-900 font-medium">{mat.nome || mat.codice_inventario}</span>
                          {mat.codice_inventario && mat.nome && (
                            <span className="text-gray-400 ml-1.5">{mat.codice_inventario}</span>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full flex-shrink-0">
                          {POSIZIONE_MATERIALE[mat.posizione_attuale] || mat.posizione_attuale || 'N/D'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer — add to cart */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 rounded-b-xl">
          {inCart ? (
            <p className="text-center text-sm font-medium text-mikai-600">
              <Icon icon={ACTION_ICONS.check} size={16} className="inline mr-1" />
              Gia nel carrello ({cartQuantity})
            </p>
          ) : (
            <Button onClick={() => { onAdd(product); onClose() }} size="lg" className="w-full">
              <Icon icon={ACTION_ICONS.add} size={18} className="mr-1.5" />
              Aggiungi al carrello
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/materiale/CatalogProductModal.jsx
git commit -m "feat: add CatalogProductModal with kit contents + availability"
```

---

## Task 5: CatalogCartFloating — floating cart FAB + drawer

**Files:**
- Create: `src/components/materiale/CatalogCartFloating.jsx`

Floating action button (bottom-right) with badge showing item count. Tap opens a drawer (from bottom on mobile, modal on desktop) with cart items, quantity controls, note per item, save button.

- [ ] **Step 1: Create `CatalogCartFloating.jsx`**

```jsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, CATALOGO_ICONS, MATERIALE_ICONS } from '../../lib/icons'

function CartItem({ item, onUpdateQuantity, onUpdateNote }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.product.nome}</p>
          <p className="text-xs text-gray-500">{item.product.brand?.nome}</p>
        </div>

        {/* Quantity stepper */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-sm font-bold text-gray-600 hover:text-red-600 transition-colors"
            aria-label="Diminuisci"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-mikai-100 flex items-center justify-center text-sm font-bold text-gray-600 hover:text-mikai-600 transition-colors"
            aria-label="Aumenta"
          >
            +
          </button>
        </div>
      </div>

      {/* Note field */}
      <input
        type="text"
        value={item.note || ''}
        onChange={e => onUpdateNote(item.product.id, e.target.value)}
        placeholder="Nota..."
        className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 min-h-[40px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400"
      />
    </div>
  )
}

export function CatalogCartFloating({
  cartItems, removedCount, totalItems,
  hasChanges, saving,
  onUpdateQuantity, onUpdateNote, onSave, onClear,
  // Drawer state managed by parent (mutua esclusione con filtri)
  open, onToggle,
}) {
  // Hide FAB if cart is empty and nothing removed
  if (totalItems === 0 && removedCount === 0 && !open) return null

  return (
    <>
      {/* FAB — floating action button */}
      {!open && (
        <button
          onClick={onToggle}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-mikai-500 text-white shadow-lg hover:bg-mikai-600 flex items-center justify-center transition-all"
          aria-label={`Carrello, ${totalItems} articoli`}
        >
          <Icon icon={CATALOGO_ICONS.cart} size={24} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      )}

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onToggle} />

          {/* Mobile: bottom drawer. Desktop: right-side panel */}
          <div className="absolute bottom-0 left-0 right-0 md:top-0 md:left-auto md:right-0 md:w-96 bg-white rounded-t-2xl md:rounded-none shadow-xl max-h-[80vh] md:max-h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Icon icon={CATALOGO_ICONS.cart} size={18} />
                Carrello
                {totalItems > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    {totalItems} {totalItems === 1 ? 'articolo' : 'articoli'}
                  </span>
                )}
              </h3>
              <button onClick={onToggle} className="min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Chiudi carrello">
                <Icon icon={ACTION_ICONS.close} size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5">
              {cartItems.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Carrello vuoto</p>
              ) : (
                cartItems.map(item => (
                  <CartItem
                    key={item.product.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onUpdateNote={onUpdateNote}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              {removedCount > 0 && (
                <p className="text-sm text-red-500">
                  {removedCount} {removedCount === 1 ? 'articolo verra rimosso' : 'articoli verranno rimossi'}
                </p>
              )}

              <Button
                onClick={onSave}
                loading={saving}
                disabled={!hasChanges || saving}
                size="lg"
                className="w-full"
              >
                <Icon icon={ACTION_ICONS.check} size={18} className="mr-2" />
                Salva lista
              </Button>

              {cartItems.length > 0 && (
                <button
                  onClick={onClear}
                  className="w-full text-sm text-gray-500 hover:text-red-500 py-2 min-h-[44px] transition-colors"
                >
                  Svuota carrello
                </button>
              )}

              {!hasChanges && cartItems.length > 0 && (
                <p className="text-sm text-gray-400 text-center">Nessuna modifica da salvare</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/materiale/CatalogCartFloating.jsx
git commit -m "feat: add CatalogCartFloating with FAB + drawer"
```

---

## Task 6: Evolve CatalogProductCard — remove expand, add Dettagli button

**Files:**
- Modify: `src/components/materiale/CatalogProductCard.jsx`

Remove the inline expand/collapse. Add a "Dettagli" button that calls `onShowDetails(product)`. Keep the +/- quantity controls. Add "Nel carrello" visual feedback.

- [ ] **Step 1: Rewrite `CatalogProductCard.jsx`**

Replace the entire file content with:

```jsx
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'

export function CatalogProductCard({ product, cartQuantity = 0, onAdd, onUpdateQuantity, onShowDetails }) {
  const sections = product.body_sections?.map(bs => bs.body_section?.nome).filter(Boolean)
  const inCart = cartQuantity > 0

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      inCart ? 'border-mikai-300 ring-1 ring-mikai-200' : 'border-gray-200 hover:shadow-md'
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Product image */}
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.foto_url ? (
              <img src={product.foto_url} alt={product.nome} className="w-full h-full object-cover" />
            ) : (
              <Icon icon={MATERIALE_ICONS.package} size={22} className="text-gray-300" />
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-gray-900 truncate">{product.nome}</h4>
            <p className="text-sm text-gray-500 truncate">{product.brand?.nome}</p>
            {sections?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {sections.slice(0, 3).map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{s}</span>
                ))}
                {sections.length > 3 && (
                  <span className="text-xs text-gray-400">+{sections.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions column */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Dettagli button */}
            <button
              onClick={() => onShowDetails(product)}
              className="text-sm text-mikai-600 hover:text-mikai-700 font-medium min-h-[36px] px-2"
              aria-label={`Dettagli ${product.nome}`}
            >
              Dettagli
            </button>

            {/* Cart controls */}
            <div className="flex items-center gap-1">
              {inCart && (
                <button
                  onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-lg font-bold text-gray-600 hover:text-red-600 transition-colors"
                  aria-label="Diminuisci quantita"
                >
                  −
                </button>
              )}
              {inCart && (
                <span className="w-8 text-center text-base font-bold text-mikai-700">{cartQuantity}</span>
              )}
              <button
                onClick={() => inCart ? onUpdateQuantity(product.id, cartQuantity + 1) : onAdd(product)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold transition-colors ${
                  inCart
                    ? 'bg-mikai-100 hover:bg-mikai-200 text-mikai-600'
                    : 'bg-mikai-500 hover:bg-mikai-600 text-white'
                }`}
                aria-label={inCart ? 'Aumenta quantita' : 'Aggiungi al carrello'}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* In-cart badge */}
        {inCart && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-mikai-600 font-medium">
            <Icon icon={ACTION_ICONS.check} size={14} />
            Nel carrello
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: might have warnings if CatalogBrowser still passes old props. That's fine — Task 7 fixes it.

- [ ] **Step 3: Commit**

```bash
git add src/components/materiale/CatalogProductCard.jsx
git commit -m "feat: CatalogProductCard — remove expand, add Dettagli button + in-cart badge"
```

---

## Task 7: Evolve CatalogBrowser — integrate sidebar, modal, floating cart

**Files:**
- Modify: `src/components/materiale/CatalogBrowser.jsx`

Major rewrite: replace `CatalogFilterBar` with `CatalogSidebar`, remove inline cart sidebar, add `CatalogCartFloating`, add `CatalogProductModal`, manage `activeDrawer` state for mutual exclusion, use multi-select filter arrays.

- [ ] **Step 1: Rewrite `CatalogBrowser.jsx`**

Replace the entire file content with:

```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, CATALOGO_ICONS } from '../../lib/icons'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmDialog } from '../ui/ConfirmDialog'
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

  // Multi-select filters
  const [brandIds, setBrandIds] = useState([])
  const [sectionIds, setSectionIds] = useState([])
  const [tipi, setTipi] = useState([])

  // Drawers: mutual exclusion
  const [activeDrawer, setActiveDrawer] = useState(null) // null | 'filters' | 'cart'

  // Product detail modal
  const [modalProduct, setModalProduct] = useState(null)

  // Unsaved changes confirm dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Cart: { productId: { product, quantity, note, dbRowId } }
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

  useEffect(() => {
    Promise.all([fetchBrands(), fetchAllBodySections()]).then(([b, s]) => {
      setBrands(b.data)
      setSections(s.data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchCatalogProducts({ brandIds, sectionIds, tipi, search }).then(({ data }) => {
      setProducts(data)
      setLoading(false)
    })
  }, [brandIds, sectionIds, tipi, search])

  // Toggle helpers for multi-select
  const toggleArray = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev[product.id]
      if (existing) {
        return { ...prev, [product.id]: { ...existing, quantity: existing.quantity + 1 } }
      }
      return { ...prev, [product.id]: { product, quantity: 1, note: '', dbRowId: null } }
    })
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      setCart(prev => {
        const item = prev[productId]
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
      if (existing) return { ...prev, [productId]: { ...existing, quantity } }
      return prev
    })
  }

  const updateNote = (productId, note) => {
    setCart(prev => {
      const existing = prev[productId]
      if (existing) return { ...prev, [productId]: { ...existing, note } }
      return prev
    })
  }

  const clearCart = () => {
    // Keep DB rows but set quantity to 0 (will be removed on save)
    setCart(prev => {
      const next = {}
      for (const [pid, item] of Object.entries(prev)) {
        if (item.dbRowId) {
          next[pid] = { ...item, quantity: 0 }
        }
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
      if (!origMap[pid] && item.quantity > 0) return true
      if (origMap[pid] && item.quantity !== origMap[pid].qty) return true
      if (origMap[pid] && item.note !== origMap[pid].note) return true
      if (origMap[pid] && item.quantity === 0) return true
    }
    return false
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(cart)
    setSaving(false)
  }

  const handleClose = () => {
    if (hasChanges()) {
      setShowExitConfirm(true)
    } else {
      onClose()
    }
  }

  // Active filter chips
  const activeFilters = [
    ...brandIds.map(id => {
      const b = brands.find(b => b.id === id)
      return b ? { id: `brand:${id}`, label: b.nome } : null
    }).filter(Boolean),
    ...sectionIds.map(id => {
      const s = sections.find(s => s.id === id)
      return s ? { id: `section:${id}`, label: s.nome } : null
    }).filter(Boolean),
    ...tipi.map(t => {
      const labels = { demo_kit: 'Demo Kit', strumentario: 'Strumentario', montaggio: 'Montaggio', pezzo_sfuso: 'Pezzo sfuso' }
      return { id: `tipo:${t}`, label: labels[t] || t }
    }),
  ]

  const handleRemoveFilter = (chipId) => {
    const [type, value] = chipId.split(':')
    if (type === 'brand') setBrandIds(prev => prev.filter(id => id !== value))
    if (type === 'section') setSectionIds(prev => prev.filter(id => id !== value))
    if (type === 'tipo') setTipi(prev => prev.filter(t => t !== value))
  }

  const handleClearAllFilters = () => {
    setBrandIds([])
    setSectionIds([])
    setTipi([])
    setSearch('')
  }

  const filterCount = brandIds.length + sectionIds.length + tipi.length

  return (
    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleClose}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 min-h-[48px] px-2"
        >
          <Icon icon={ACTION_ICONS.back} size={16} />
          Torna alla lista materiale
        </button>
      </div>

      {/* Content: sidebar + grid */}
      <div className="flex gap-4">
        {/* Sidebar (desktop) */}
        <CatalogSidebar
          brands={brands}
          sections={sections}
          selectedBrandIds={brandIds}
          selectedSectionIds={sectionIds}
          selectedTipi={tipi}
          onToggleBrand={(id) => toggleArray(brandIds, setBrandIds, id)}
          onToggleSection={(id) => toggleArray(sectionIds, setSectionIds, id)}
          onToggleTipo={(t) => toggleArray(tipi, setTipi, t)}
          open={activeDrawer === 'filters'}
          onClose={() => setActiveDrawer(null)}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Search + mobile filter button */}
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Cerca prodotto..." />
            </div>
            <button
              onClick={() => setActiveDrawer(activeDrawer === 'filters' ? null : 'filters')}
              className="md:hidden min-h-[48px] min-w-[48px] flex items-center justify-center border border-gray-200 rounded-lg bg-white relative"
              aria-label="Filtri"
            >
              <Icon icon={CATALOGO_ICONS.filters} size={20} />
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-mikai-500 text-white text-xs font-bold flex items-center justify-center">
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
            <EmptyState title="Nessun prodotto trovato" description="Prova a cambiare i filtri di ricerca." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
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
        onToggle={() => setActiveDrawer(activeDrawer === 'cart' ? null : 'cart')}
      />

      {/* Product detail modal */}
      <CatalogProductModal
        product={modalProduct}
        cartQuantity={modalProduct ? getQuantity(modalProduct.id) : 0}
        onAdd={addToCart}
        onClose={() => setModalProduct(null)}
      />

      {/* Exit confirmation */}
      <ConfirmDialog
        open={showExitConfirm}
        title="Modifiche non salvate"
        message="Hai articoli non salvati nel carrello. Vuoi uscire senza salvare?"
        confirmLabel="Esci"
        onConfirm={() => { setShowExitConfirm(false); onClose() }}
        onCancel={() => setShowExitConfirm(false)}
        danger
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: exit 0. The old `CatalogFilterBar` import is removed, `CatalogFilterBar.jsx` is now unused.

- [ ] **Step 3: Commit**

```bash
git add src/components/materiale/CatalogBrowser.jsx
git commit -m "feat: evolve CatalogBrowser — multi-select sidebar, floating cart, product modal"
```

---

## Task 8: Update ActiveFiltersChips for multi-select IDs

**Files:**
- Modify: `src/components/materiale/ActiveFiltersChips.jsx`

The current `ActiveFiltersChips` already works with `{ id, label }` objects. The new filter IDs use `brand:uuid`, `section:uuid`, `tipo:key` format, which is already handled. **No changes needed** — verify it works with the new format.

- [ ] **Step 1: Verify no changes needed**

Read `ActiveFiltersChips.jsx` and confirm it uses `f.id` and `f.label` generically. Already confirmed — no modification required.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

---

## Task 9: Wire EventMaterialList into EventiDetail + add gadgets/movements

**Files:**
- Modify: `src/components/eventi/EventMaterialList.jsx` (add gadget + movement sections)
- Modify: `src/pages/eventi/EventiDetail.jsx` (swap import)

The spec says: `EventMaterialsTab` manages gadgets and movements too. These sections must be in `EventMaterialList` before we can delete `EventMaterialsTab`.

- [ ] **Step 1: Add gadget + movement imports and state to `EventMaterialList.jsx`**

Add these imports at the top of `EventMaterialList.jsx` (after existing imports):

```jsx
import { useGadgetsStore } from '../../hooks/useGadgets'
import { GadgetRequestForm } from '../materiale/GadgetRequestForm'
import { GadgetCard } from '../materiale/GadgetCard'
import { MovementHistory } from '../materiale/MovementHistory'
```

- [ ] **Step 2: Add gadget + movement state and data fetching**

Inside the `EventMaterialList` component, add after the existing state declarations (after `const [rejectTarget, setRejectTarget] = useState(null)`):

```jsx
  const [gadgets, setGadgets] = useState([])
  const [movements, setMovements] = useState([])
  const [showGadgetForm, setShowGadgetForm] = useState(false)

  const fetchEventGadgets = useGadgetsStore(s => s.fetchEventGadgets)
  const fetchEventMovements = useMaterialsStore(s => s.fetchEventMovements)
```

Update the `loadData` function to also fetch gadgets and movements:

Replace the current `loadData`:
```jsx
  const loadData = async () => {
    setLoading(true)
    const { data } = await fetchEventMaterialList(event.id)
    setRows(data)
    setLoading(false)
  }
```

With:
```jsx
  const loadData = async () => {
    setLoading(true)
    const [matRes, gadRes, movRes] = await Promise.all([
      fetchEventMaterialList(event.id),
      fetchEventGadgets(event.id),
      fetchEventMovements(event.id),
    ])
    setRows(matRes.data)
    setGadgets(gadRes.data)
    setMovements(movRes.data)
    setLoading(false)
  }
```

- [ ] **Step 3: Add gadget + movement sections to JSX**

After the `<RejectMaterialDialog>` closing tag, before the final `</div>`, add:

```jsx
      {/* Gadgets */}
      <section className="pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Gadget</h2>
          {canEdit && !showGadgetForm && (
            <Button variant="secondary" onClick={() => setShowGadgetForm(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
              Richiedi
            </Button>
          )}
        </div>

        {showGadgetForm && (
          <GadgetRequestForm eventId={event.id} onDone={() => { setShowGadgetForm(false); loadData() }} />
        )}

        {gadgets.length === 0 ? (
          <EmptyState title="Nessun gadget richiesto" />
        ) : (
          <div className="space-y-2">
            {gadgets.map(eg => (
              <GadgetCard key={eg.id} gadget={eg.gadget} eventGadget={eg} />
            ))}
          </div>
        )}
      </section>

      {/* Movements */}
      {movements.length > 0 && (
        <section className="pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Movimenti</h2>
          <MovementHistory movements={movements} />
        </section>
      )}
```

- [ ] **Step 4: Add guard for closed events**

In `EventMaterialList.jsx`, update the `canEdit` line to also check event state:

Replace:
```jsx
  const canEdit = hasPermission('richiedi_materiale')
```

With:
```jsx
  const closedStates = ['concluso', 'cancellato', 'rifiutato']
  const canEdit = hasPermission('richiedi_materiale') && !closedStates.includes(event.stato)
```

- [ ] **Step 5: Wire EventiDetail to use EventMaterialList**

In `src/pages/eventi/EventiDetail.jsx`:

Replace the import (line 11):
```jsx
import { EventMaterialsTab } from '../../components/eventi/EventMaterialsTab'
```
With:
```jsx
import { EventMaterialList } from '../../components/eventi/EventMaterialList'
```

Replace the usage (line 110):
```jsx
        {activeTab === 'materiale' && <EventMaterialsTab event={event} />}
```
With:
```jsx
        {activeTab === 'materiale' && <EventMaterialList event={event} />}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/eventi/EventMaterialList.jsx src/pages/eventi/EventiDetail.jsx
git commit -m "feat: wire EventMaterialList into EventiDetail with gadgets + movements"
```

---

## Task 10: Delete legacy System A files

**Files:**
- Delete: `src/components/materiale/MaterialCatalogPicker.jsx`
- Delete: `src/components/materiale/CatalogStepBrand.jsx`
- Delete: `src/components/materiale/CatalogStepBodySection.jsx`
- Delete: `src/components/materiale/CatalogStepProducts.jsx`
- Delete: `src/components/materiale/CatalogFilterBar.jsx`
- Delete: `src/components/materiale/MaterialCart.jsx`
- Delete: `src/components/eventi/EventMaterialsTab.jsx`

- [ ] **Step 1: Verify no remaining imports of legacy files**

```bash
grep -r "MaterialCatalogPicker\|CatalogStepBrand\|CatalogStepBodySection\|CatalogStepProducts\|CatalogFilterBar\|MaterialCart\|EventMaterialsTab" src/ --include="*.jsx" --include="*.js" -l
```

Expected: only the files being deleted should appear. If any other file still imports them, fix that first.

- [ ] **Step 2: Delete the files**

```bash
rm src/components/materiale/MaterialCatalogPicker.jsx
rm src/components/materiale/CatalogStepBrand.jsx
rm src/components/materiale/CatalogStepBodySection.jsx
rm src/components/materiale/CatalogStepProducts.jsx
rm src/components/materiale/CatalogFilterBar.jsx
rm src/components/materiale/MaterialCart.jsx
rm src/components/eventi/EventMaterialsTab.jsx
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: exit 0, no import errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy System A catalog files (replaced by evolved CatalogBrowser)"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full build**

```bash
npm run build
```

- [ ] **Step 2: Dev server smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/Eventi/` and verify:
1. Navigate to any event → Materiale tab
2. "Aggiungi materiale" opens the catalog browser
3. Desktop: filters visible in left sidebar with checkboxes
4. Multi-select works (check multiple brands, sections, types)
5. Active filter chips appear and are removable
6. "Dettagli" on a product card opens the modal with availability
7. Floating cart FAB appears when items added
8. Cart drawer opens with quantity controls + note fields
9. Save works (toast "Lista aggiornata!")
10. Gadget section visible below material list
11. Movements section visible if movements exist
12. Back button with unsaved changes shows confirm dialog

---

## Summary

| Task | Files | What |
|------|-------|------|
| 1 | 1 modified | Store: multi-select filters + fetchProductAvailability |
| 2 | 1 modified | Icons: ShoppingCart + CATALOGO_ICONS |
| 3 | 1 new | CatalogSidebar — checkbox filters (sidebar/drawer) |
| 4 | 1 new | CatalogProductModal — detail + availability |
| 5 | 1 new | CatalogCartFloating — FAB + drawer |
| 6 | 1 modified | CatalogProductCard — remove expand, add Dettagli |
| 7 | 1 modified | CatalogBrowser — integrate sidebar, modal, floating cart |
| 8 | 0 | ActiveFiltersChips — verify (no changes needed) |
| 9 | 2 modified | EventMaterialList + EventiDetail wiring |
| 10 | 7 deleted | Remove legacy System A files |
| 11 | 0 | Final verification |

**Total:** 3 new, 5 modified, 7 deleted
