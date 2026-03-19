# Catalogo Prodotti + Materiale E-commerce — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product catalog (brands, body sections, products) and replace the material request form with a 3-step e-commerce picker (brand → body section → product/kit → cart → submit).

**Architecture:** New DB tables (brands, body_sections, products, product_body_sections) + FK on materials. Extend useMaterials store with catalog queries. Replace MaterialRequestForm with MaterialCatalogPicker (3-step + cart). Update MaterialCard/Filters/Detail to show product/brand info.

**Tech Stack:** React 19, Zustand, Supabase JS, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-17-catalogo-prodotti-design.md`

---

## File Structure

```
supabase/
  migrations/
    015_catalog.sql               # New tables, ALTER, RLS, triggers, seed

src/
  lib/
    constants.js                  # Add TIPO_BRAND
  hooks/
    useMaterials.js               # Extend: fetchBrands, fetchBodySections, fetchProductsWithMaterials, update fetchMaterials join
  components/
    materiale/
      MaterialCatalogPicker.jsx   # NEW: main 3-step picker + cart orchestrator
      CatalogStepBrand.jsx        # NEW: step 1 brand selection
      CatalogStepBodySection.jsx  # NEW: step 2 body section selection
      CatalogStepProducts.jsx     # NEW: step 3 products + kits list
      MaterialCart.jsx            # NEW: cart with dates, conflicts, submit
      MaterialCard.jsx            # MODIFY: add product/brand info
      MaterialFilters.jsx         # MODIFY: add brand/section filters
      MaterialRequestForm.jsx     # DELETE (replaced by MaterialCatalogPicker)
    eventi/
      EventMaterialsTab.jsx       # MODIFY: swap import to MaterialCatalogPicker
  pages/
    materiale/
      MaterialeList.jsx           # MODIFY: use updated filters
      MaterialeDetail.jsx         # MODIFY: show product/brand info
```

---

## Task C.1: Database migration

**Files:**
- Create: `supabase/migrations/015_catalog.sql`

- [ ] **Step 1: Write complete migration**

`supabase/migrations/015_catalog.sql`:
```sql
-- ============================================
-- Mikai Eventi — Product Catalog
-- Spec: docs/superpowers/specs/2026-03-17-catalogo-prodotti-design.md
-- ============================================

-- Enum
CREATE TYPE brand_tipo AS ENUM ('produttore', 'distributore');

-- Tables
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo brand_tipo NOT NULL DEFAULT 'produttore',
  logo_url text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE body_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordine integer DEFAULT 0,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id),
  nome text NOT NULL,
  descrizione text,
  codice text UNIQUE,
  foto_url text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE product_body_sections (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  body_section_id uuid NOT NULL REFERENCES body_sections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, body_section_id)
);

-- Add product_id to materials
ALTER TABLE materials ADD COLUMN product_id uuid REFERENCES products(id);

-- Indexes
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_body_sections_ordine ON body_sections(ordine);
CREATE INDEX idx_product_body_sections_section ON product_body_sections(body_section_id);
CREATE INDEX idx_materials_product ON materials(product_id);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_body_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_read" ON brands FOR SELECT USING (true);
CREATE POLICY "brands_write" ON brands FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "body_sections_read" ON body_sections FOR SELECT USING (true);
CREATE POLICY "body_sections_write" ON body_sections FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "products_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_write" ON products FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "product_body_sections_read" ON product_body_sections FOR SELECT USING (true);
CREATE POLICY "product_body_sections_write" ON product_body_sections FOR ALL USING (get_user_role() = 'admin');

-- Triggers
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed: Brands
INSERT INTO brands (id, nome, tipo) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Mikai', 'produttore'),
  ('b0000000-0000-0000-0000-000000000002', 'Medartis', 'distributore');

-- Seed: Body sections
INSERT INTO body_sections (id, nome, ordine) VALUES
  ('s0000000-0000-0000-0000-000000000001', 'Polso', 1),
  ('s0000000-0000-0000-0000-000000000002', 'Mano', 2),
  ('s0000000-0000-0000-0000-000000000003', 'Gomito', 3),
  ('s0000000-0000-0000-0000-000000000004', 'Spalla', 4),
  ('s0000000-0000-0000-0000-000000000005', 'Piede', 5),
  ('s0000000-0000-0000-0000-000000000006', 'Caviglia', 6),
  ('s0000000-0000-0000-0000-000000000007', 'Gamba', 7),
  ('s0000000-0000-0000-0000-000000000008', 'Ginocchio', 8),
  ('s0000000-0000-0000-0000-000000000009', 'Anca', 9),
  ('s0000000-0000-0000-0000-000000000010', 'Colonna', 10);

-- Seed: Products (Mikai)
INSERT INTO products (id, brand_id, nome, descrizione, codice) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Stylo', 'Fissatore esterno da polso', 'STYLO'),
  ('p0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'FEP', 'Fissatore esterno polivalente', 'FEP'),
  ('p0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'VCA', 'Viti piede piatto', 'VCA'),
  ('p0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'BSS', 'Viti per piccoli segmenti', 'BSS'),
  ('p0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'MiniStylo', 'Mini fissatore esterno da polso', 'MINISTYLO');

-- Seed: Products (Medartis)
INSERT INTO products (id, brand_id, nome, descrizione, codice) VALUES
  ('p0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Placche da polso', 'Placche per osteosintesi polso', 'MED-PLAC'),
  ('p0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Viti a compressione', 'Viti a compressione Medartis', 'MED-VITI');

-- Seed: Product ↔ Body section links
INSERT INTO product_body_sections (product_id, body_section_id) VALUES
  ('p0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001'),
  ('p0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000002'),
  ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001'),
  ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000003'),
  ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000007'),
  ('p0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000005'),
  ('p0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000002'),
  ('p0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000005'),
  ('p0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000001'),
  ('p0000000-0000-0000-0000-000000000006', 's0000000-0000-0000-0000-000000000001'),
  ('p0000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000001'),
  ('p0000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000002');

-- Link existing materials to products
UPDATE materials SET product_id = 'p0000000-0000-0000-0000-000000000001' WHERE codice_inventario LIKE 'KIT-STYLO-%';
UPDATE materials SET product_id = 'p0000000-0000-0000-0000-000000000007' WHERE codice_inventario LIKE 'KIT-MINI-%';
UPDATE materials SET product_id = NULL WHERE codice_inventario LIKE 'STR-%';
UPDATE materials SET product_id = NULL WHERE codice_inventario LIKE 'VEL-%';
```

- [ ] **Step 2: Copy to clipboard and run on Supabase SQL Editor**

```bash
cat supabase/migrations/015_catalog.sql | clip
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/015_catalog.sql
git commit -m "feat: add product catalog DB migration (brands, body_sections, products)"
```

---

## Task C.2: Extend useMaterials store + constants

**Files:**
- Modify: `src/lib/constants.js`
- Modify: `src/hooks/useMaterials.js`

- [ ] **Step 1: Add TIPO_BRAND to constants.js**

Add after the existing `STATO_GADGET_RICHIESTA`:
```js
export const TIPO_BRAND = {
  produttore: 'Produttore',
  distributore: 'Distributore',
}
```

- [ ] **Step 2: Extend useMaterials store**

Add these new methods to `useMaterials.js` (inside the create callback, after `createMovement`):

```js
  // Catalog queries
  fetchBrands: async () => {
    const { data } = await supabase
      .from('brands').select('*').eq('attivo', true).order('nome')
    return data || []
  },

  fetchBodySections: async (brandId) => {
    // Get sections that have products for this brand
    const { data } = await supabase
      .from('body_sections')
      .select('*, product_body_sections!inner(product_id, products!inner(brand_id))')
      .eq('product_body_sections.products.brand_id', brandId)
      .eq('attivo', true)
      .order('ordine')
    // Deduplicate (a section may appear multiple times due to joins)
    const unique = data ? [...new Map(data.map(s => [s.id, s])).values()] : []
    return unique
  },

  fetchProductsWithMaterials: async (brandId, sectionId) => {
    // Get products for brand + section, with their materials
    const { data: productIds } = await supabase
      .from('product_body_sections')
      .select('product_id')
      .eq('body_section_id', sectionId)

    if (!productIds?.length) return []

    const ids = productIds.map(p => p.product_id)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('brand_id', brandId)
      .in('id', ids)
      .eq('attivo', true)
      .order('nome')

    if (!products?.length) return []

    // Fetch materials for these products
    const { data: materials } = await supabase
      .from('materials')
      .select('*')
      .in('product_id', products.map(p => p.id))
      .eq('attivo', true)
      .order('nome')

    // Group materials by product
    return products.map(p => ({
      ...p,
      materials: (materials || []).filter(m => m.product_id === p.id),
    }))
  },
```

Also update `fetchMaterials` to join product/brand data:

Replace the existing `fetchMaterials` query line:
```js
// OLD:
let query = supabase.from('materials').select('*').eq('attivo', true).order('nome')
// NEW:
let query = supabase.from('materials').select('*, product:products(id, nome, codice, brand:brands(id, nome))').eq('attivo', true).order('nome')
```

Add brand and section filters to `fetchMaterials`, after existing filters:
```js
    const { search, tipo, posizione, brand, section } = get().filters
    // ... existing filters ...
    if (brand) query = query.eq('product.brand.id', brand)
    if (section) {
      // Filter by section requires a subquery via product_body_sections
      // For simplicity, filter client-side after fetch
    }
```

Update the `filters` initial state:
```js
  filters: { search: '', tipo: '', posizione: '', brand: '', section: '' },
```

Update `resetFilters`:
```js
  set({ filters: { search: '', tipo: '', posizione: '', brand: '', section: '' } })
```

Also update `fetchMaterial` to include product/brand:
```js
// OLD:
const { data, error } = await supabase.from('materials').select('*').eq('id', id).single()
// NEW:
const { data, error } = await supabase.from('materials').select('*, product:products(id, nome, codice, descrizione, brand:brands(id, nome, tipo)), body_sections:products(product_body_sections(body_section:body_sections(id, nome)))').eq('id', id).single()
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.js src/hooks/useMaterials.js
git commit -m "feat: extend materials store with catalog queries"
```

---

## Task C.3: Catalog picker components (NEW)

**Files:**
- Create: `src/components/materiale/CatalogStepBrand.jsx`
- Create: `src/components/materiale/CatalogStepBodySection.jsx`
- Create: `src/components/materiale/CatalogStepProducts.jsx`
- Create: `src/components/materiale/MaterialCart.jsx`
- Create: `src/components/materiale/MaterialCatalogPicker.jsx`

- [ ] **Step 1: Create CatalogStepBrand**

`src/components/materiale/CatalogStepBrand.jsx`:
```jsx
import { TIPO_BRAND } from '../../lib/constants'

export function CatalogStepBrand({ brands, onSelect }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Scegli l'azienda</h3>
      <p className="text-base text-gray-500 mb-4">Seleziona il produttore o distributore.</p>
      <div className="space-y-3">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b)}
            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-mikai-300 text-left min-h-[72px] transition-all"
          >
            <span className="text-3xl">{b.tipo === 'produttore' ? '\u{1F3ED}' : '\u{1F91D}'}</span>
            <div>
              <span className="text-lg font-medium text-gray-900">{b.nome}</span>
              <p className="text-sm text-gray-500">{TIPO_BRAND[b.tipo]}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create CatalogStepBodySection**

`src/components/materiale/CatalogStepBodySection.jsx`:
```jsx
import { Button } from '../ui/Button'

export function CatalogStepBodySection({ brandName, sections, onSelect, onBack }) {
  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-3">
        {'\u2190'} Indietro
      </Button>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{brandName} — Scegli la sezione</h3>
      <p className="text-base text-gray-500 mb-4">Per quale parte del corpo serve il materiale?</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-200 hover:border-mikai-300 min-h-[72px] transition-all"
          >
            <span className="text-lg font-medium text-gray-900">{s.nome}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CatalogStepProducts**

`src/components/materiale/CatalogStepProducts.jsx`:
```jsx
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'

export function CatalogStepProducts({ brandName, sectionName, products, cart, onAdd, onBack }) {
  const cartIds = cart.map(c => c.id)

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-3">
        {'\u2190'} Indietro
      </Button>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{brandName} \u00B7 {sectionName}</h3>
      <p className="text-base text-gray-500 mb-4">Seleziona i kit da aggiungere al carrello.</p>

      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="text-base font-semibold text-gray-900">{product.nome}</h4>
              {product.descrizione && <p className="text-sm text-gray-500">{product.descrizione}</p>}
            </div>
            <div className="divide-y divide-gray-100">
              {product.materials.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Nessun kit disponibile</p>
              ) : (
                product.materials.map((mat) => {
                  const inCart = cartIds.includes(mat.id)
                  return (
                    <div key={mat.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-base text-gray-900">{mat.nome}</span>
                        {mat.codice_inventario && (
                          <span className="text-sm text-gray-400 ml-2">{mat.codice_inventario}</span>
                        )}
                      </div>
                      <StatusBadge
                        stato={mat.posizione_attuale}
                        labels={POSIZIONE_MATERIALE}
                        colors={POSIZIONE_MATERIALE_COLORE}
                      />
                      {inCart ? (
                        <span className="text-sm font-medium text-green-600 min-w-[100px] text-right">Nel carrello \u2713</span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => onAdd(mat)}>
                          + Aggiungi
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create MaterialCart**

`src/components/materiale/MaterialCart.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { ConflictAlert } from './ConflictAlert'
import { useToastStore } from '../ui/Toast'

export function MaterialCart({ eventId, cart, onRemove, onDone }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(false)

  const checkConflict = useMaterialsStore(s => s.checkConflict)
  const requestMaterial = useMaterialsStore(s => s.requestMaterial)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    if (!startDate || !endDate || cart.length === 0) {
      setConflicts([])
      return
    }
    Promise.all(
      cart.map(mat => checkConflict(mat.id, startDate, endDate))
    ).then(results => {
      setConflicts(results.flat())
    })
  }, [startDate, endDate, cart.length])

  const handleSubmit = async () => {
    if (conflicts.length > 0 || cart.length === 0 || !startDate || !endDate) return
    setLoading(true)
    const results = await Promise.all(
      cart.map(mat =>
        requestMaterial({
          event_id: eventId,
          material_id: mat.id,
          quantita_richiesta: 1,
          data_inizio_utilizzo: startDate,
          data_fine_utilizzo: endDate,
          richiesto_da: user.id,
        })
      )
    )
    setLoading(false)
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      addToast(`Errore: ${errors[0].error}`, 'error')
    } else {
      addToast(`${cart.length} materiali richiesti!`, 'success')
      onDone?.()
    }
  }

  if (cart.length === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center text-base text-gray-400">
        Aggiungi almeno un materiale al carrello.
      </div>
    )
  }

  return (
    <div className="mt-6 bg-gray-50 rounded-xl p-5 space-y-4">
      <h4 className="text-base font-semibold text-gray-900">
        {'\u{1F6D2}'} Carrello ({cart.length} {cart.length === 1 ? 'articolo' : 'articoli'})
      </h4>

      <div className="space-y-2">
        {cart.map((mat) => (
          <div key={mat.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-200">
            <div>
              <span className="text-base text-gray-900">{mat.nome}</span>
              <span className="text-sm text-gray-400 ml-2">{mat.codice_inventario}</span>
            </div>
            <button
              onClick={() => onRemove(mat.id)}
              className="text-red-500 hover:text-red-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label={`Rimuovi ${mat.nome}`}
            >
              {'\u{1F5D1}\uFE0F'}
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DatePicker label="Data inizio utilizzo" value={startDate} onChange={setStartDate} required />
        <DatePicker label="Data fine utilizzo" value={endDate} onChange={setEndDate} min={startDate} required />
      </div>

      <ConflictAlert conflicts={conflicts} />

      <Button
        onClick={handleSubmit}
        loading={loading}
        disabled={cart.length === 0 || !startDate || !endDate || conflicts.length > 0}
        size="lg"
        className="w-full"
      >
        Invia richiesta ({cart.length} materiali)
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Create MaterialCatalogPicker (orchestrator)**

`src/components/materiale/MaterialCatalogPicker.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { CatalogStepBrand } from './CatalogStepBrand'
import { CatalogStepBodySection } from './CatalogStepBodySection'
import { CatalogStepProducts } from './CatalogStepProducts'
import { MaterialCart } from './MaterialCart'
import { Button } from '../ui/Button'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'

export function MaterialCatalogPicker({ eventId, onDone }) {
  const [step, setStep] = useState(0) // 0=brand, 1=section, 2=products
  const [brands, setBrands] = useState([])
  const [sections, setSections] = useState([])
  const [products, setProducts] = useState([])
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBrands = useMaterialsStore(s => s.fetchBrands)
  const fetchBodySections = useMaterialsStore(s => s.fetchBodySections)
  const fetchProductsWithMaterials = useMaterialsStore(s => s.fetchProductsWithMaterials)

  useEffect(() => {
    fetchBrands().then((data) => {
      setBrands(data)
      setLoading(false)
      // Auto-skip if only 1 brand
      if (data.length === 1) {
        handleSelectBrand(data[0])
      }
    })
  }, [])

  const handleSelectBrand = async (brand) => {
    setSelectedBrand(brand)
    setLoading(true)
    const secs = await fetchBodySections(brand.id)
    setSections(secs)
    setLoading(false)
    if (secs.length === 1) {
      handleSelectSection(brand, secs[0])
    } else {
      setStep(1)
    }
  }

  const handleSelectSection = async (brand, section) => {
    const b = brand || selectedBrand
    setSelectedSection(section)
    setLoading(true)
    const prods = await fetchProductsWithMaterials(b.id, section.id)
    setProducts(prods)
    setLoading(false)
    setStep(2)
  }

  const handleAddToCart = (material) => {
    if (!cart.find(m => m.id === material.id)) {
      setCart([...cart, material])
    }
  }

  const handleRemoveFromCart = (materialId) => {
    setCart(cart.filter(m => m.id !== materialId))
  }

  if (loading && step === 0) return <LoadingSkeleton lines={3} />

  return (
    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Richiedi materiale</h3>
        <Button variant="ghost" size="sm" onClick={onDone}>Chiudi</Button>
      </div>

      {loading ? (
        <LoadingSkeleton lines={3} />
      ) : (
        <>
          {step === 0 && (
            <CatalogStepBrand brands={brands} onSelect={handleSelectBrand} />
          )}
          {step === 1 && (
            <CatalogStepBodySection
              brandName={selectedBrand.nome}
              sections={sections}
              onSelect={(s) => handleSelectSection(null, s)}
              onBack={() => { setStep(0); setSelectedBrand(null) }}
            />
          )}
          {step === 2 && (
            <>
              <CatalogStepProducts
                brandName={selectedBrand.nome}
                sectionName={selectedSection.nome}
                products={products}
                cart={cart}
                onAdd={handleAddToCart}
                onBack={() => { setStep(1); setSelectedSection(null) }}
              />
              <MaterialCart
                eventId={eventId}
                cart={cart}
                onRemove={handleRemoveFromCart}
                onDone={onDone}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/materiale/MaterialCatalogPicker.jsx src/components/materiale/CatalogStep*.jsx src/components/materiale/MaterialCart.jsx
git commit -m "feat: add e-commerce catalog picker (3-step + cart)"
```

---

## Task C.4: Update existing components

**Files:**
- Modify: `src/components/eventi/EventMaterialsTab.jsx`
- Modify: `src/components/materiale/MaterialCard.jsx`
- Modify: `src/components/materiale/MaterialFilters.jsx`
- Modify: `src/pages/materiale/MaterialeDetail.jsx`
- Delete: `src/components/materiale/MaterialRequestForm.jsx`

- [ ] **Step 1: Swap import in EventMaterialsTab.jsx**

Replace line 9:
```jsx
// OLD:
import { MaterialRequestForm } from '../materiale/MaterialRequestForm'
// NEW:
import { MaterialCatalogPicker } from '../materiale/MaterialCatalogPicker'
```

Replace JSX usage (around line 77):
```jsx
// OLD:
{showRequestForm && (
  <MaterialRequestForm eventId={event.id} onDone={() => { setShowRequestForm(false); loadData() }} />
)}
// NEW:
{showRequestForm && (
  <MaterialCatalogPicker eventId={event.id} onDone={() => { setShowRequestForm(false); loadData() }} />
)}
```

- [ ] **Step 2: Update MaterialCard.jsx**

Add product/brand info below the existing title:
```jsx
// After the tipo line, add:
{material.product && (
  <p className="text-sm text-gray-500 mt-0.5">
    {material.product.brand?.nome && `${material.product.brand.nome} \u00B7 `}
    {material.product.nome}
  </p>
)}
```

- [ ] **Step 3: Update MaterialFilters.jsx**

Add brand and section filter dropdowns. Add imports and state for brands/sections fetched on mount. Add two `<select>` elements after the existing tipo/posizione selects.

- [ ] **Step 4: Update MaterialeDetail.jsx**

After the existing info card, add a section showing:
- Brand name
- Product name + description
- Body sections (comma-separated)

- [ ] **Step 5: Delete MaterialRequestForm.jsx**

```bash
rm src/components/materiale/MaterialRequestForm.jsx
```

- [ ] **Step 6: Verify build**

```bash
npx vite build
```
Expected: exit 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: integrate catalog picker, update cards/filters/detail, remove old request form"
```

---

## Summary

| Task | Files | What |
|------|-------|------|
| C.1 | 1 SQL migration | 4 new tables, ALTER, RLS, triggers, seed |
| C.2 | 2 modified | Store + constants for catalog queries |
| C.3 | 5 new components | CatalogPicker, 3 steps, Cart |
| C.4 | 4 modified, 1 deleted | Wire picker into event tab, update card/filters/detail |

**Total:** 5 new files, 6 modified, 1 deleted, 1 SQL migration
