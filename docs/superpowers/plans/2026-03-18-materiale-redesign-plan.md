# Materiale UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the material management flow with editable event lists, visual catalog, granular permissions, venue directory, and admin CRUD section.

**Architecture:** Extend the existing React SPA + Supabase stack. New DB migration (016) adds tables and modifies existing ones. Frontend adds permission-based visibility, replaces the 3-step material wizard with a visual filter catalog, and adds a full admin section. All existing CLAUDE.md conventions apply.

**Tech Stack:** React 19, Vite 6, TailwindCSS v4, Zustand 5, Supabase 2, React Router DOM 7, date-fns 4, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-18-materiale-redesign-design.md`

---

## File Structure

```
supabase/
  migrations/
    016_materiale_redesign.sql         # New tables, altered tables, enum extensions, RLS updates

src/
  lib/
    constants.js                       # MODIFY: add new permissions, stato_lista, tipo_prodotto, role presets
    icons.js                           # MODIFY: add ADMIN_ICONS, new MATERIALE_ICONS entries
    # permissions.js NOT needed — hasPermission already in useAuthStore

  hooks/
    useAuth.js                         # MODIFY: load permissions array, expose hasPermission selector
    useMaterials.js                    # MODIFY: redesign for product-based list, new catalog actions
    useVenues.js                       # CREATE: venues CRUD + autocomplete
    useZones.js                        # CREATE: zones + provinces + courier defaults
    useCouriers.js                     # CREATE: couriers CRUD
    useAdmin.js                        # CREATE: admin CRUD for brands, products, body sections, kit contents, specimens

  components/
    layout/
      Sidebar.jsx                      # MODIFY: permission-based nav filtering, admin section
      BottomBar.jsx                    # MODIFY: permission-based filtering
      AdminLayout.jsx                  # CREATE: admin sub-navigation layout

    eventi/
      EventMaterialList.jsx            # CREATE: editable material list container
      MaterialListRow.jsx              # CREATE: single row with status, actions, notes
      MaterialListLockBanner.jsx       # CREATE: yellow "lista chiusa" banner
      MaterialApprovalActions.jsx      # CREATE: confirm/reject buttons for ufficio
      RejectMaterialDialog.jsx         # CREATE: rejection dialog with mandatory reason
      VenueAutocomplete.jsx            # CREATE: venue autocomplete for wizard
      WizardStepDove.jsx               # MODIFY: integrate VenueAutocomplete

    materiale/
      CatalogBrowser.jsx               # CREATE: visual catalog with filters + grid
      CatalogFilterBar.jsx             # CREATE: horizontal scrollable filter bar (logos, images, icons)
      CatalogProductCard.jsx           # CREATE: product card with expandable kit contents
      KitContentsList.jsx              # CREATE: collapsible kit pieces list
      ActiveFiltersChips.jsx           # CREATE: active filter chips with remove

    ui/
      AdminTable.jsx                   # CREATE: reusable CRUD table (search, sort, pagination)

  pages/
    eventi/
      EventiDetail.jsx                 # MODIFY: replace EventMaterialsTab with EventMaterialList
    admin/
      AdminBrand.jsx                   # CREATE: brand CRUD page
      AdminDistretti.jsx               # CREATE: body sections CRUD page
      AdminProdotti.jsx                # CREATE: products & kits CRUD page
      AdminMateriali.jsx               # CREATE: specimens CRUD page
      AdminGadget.jsx                  # CREATE: gadget master CRUD page
      AdminSedi.jsx                    # CREATE: venues & couriers CRUD page
      AdminZone.jsx                    # CREATE: zones CRUD page
      AdminUtenti.jsx                  # CREATE: users & permissions CRUD page

  App.jsx                              # MODIFY: add admin routes
```

---

## Phase 1: Database + Permissions Foundation

### Task 1.1: Database migration 016

**Files:**
- Create: `supabase/migrations/016_materiale_redesign.sql`

- [ ] **Step 1: Write enum extensions (must be outside transaction)**

```sql
-- Supabase: no transaction
-- ============================================
-- Mikai Eventi — Materiale Redesign Migration
-- Spec ref: 2026-03-18-materiale-redesign-design.md
-- Depends on: migration 015 (catalog tables)
-- NOTE: "Supabase: no transaction" disables wrapping so ALTER TYPE ADD VALUE works
-- ============================================

-- Extend permission_type enum (must be outside transactions)
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'richiedi_materiale';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_magazzino';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_spedizioni';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_gadget';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_sedi';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_catalogo';
```

- [ ] **Step 2: Write new tables**

```sql
-- Zones
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zone-province mapping
CREATE TABLE IF NOT EXISTS zone_provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  provincia text NOT NULL,
  UNIQUE(zone_id, provincia)
);

-- Couriers
CREATE TABLE IF NOT EXISTS couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contatto text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zone-courier default mapping
CREATE TABLE IF NOT EXISTS zone_couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  UNIQUE(zone_id, courier_id)
);

-- Venues (sede rubrica)
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  indirizzo text,
  cap text,
  citta text,
  provincia text,
  zone_id uuid REFERENCES zones(id),
  courier_id uuid REFERENCES couriers(id),
  note_consegna text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Kit contents (pieces inside a kit)
CREATE TABLE IF NOT EXISTS kit_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  piece_name text NOT NULL,
  piece_code text,
  quantity integer NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venues_nome ON venues(nome);
CREATE INDEX IF NOT EXISTS idx_venues_zona ON venues(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_provinces_zona ON zone_provinces(zone_id);
CREATE INDEX IF NOT EXISTS idx_kit_contents_product ON kit_contents(product_id);
```

- [ ] **Step 3: Write table modifications**

```sql
-- Events: add shipping/venue fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS data_spedizione_prevista date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS courier_id uuid REFERENCES couriers(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS note_consegna text;

-- Body sections: add image (brands.logo_url and products.foto_url already exist in 015)
ALTER TABLE body_sections ADD COLUMN IF NOT EXISTS immagine_url text;

-- Products: add tipo column for catalog filtering
DO $$ BEGIN
  CREATE TYPE product_tipo AS ENUM ('demo_kit', 'strumentario', 'montaggio', 'pezzo_sfuso');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tipo product_tipo;

-- Event materials: add new columns for lista model (product_id already exists from 015)
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS quantita integer DEFAULT 1;
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS note_commerciale text;
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS note_ufficio text;
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS motivo_rifiuto text;
```

- [ ] **Step 4: Write data migration for existing event_materials**

```sql
-- Populate product_id from materials for existing rows
UPDATE event_materials em
SET product_id = m.product_id
FROM materials m
WHERE em.material_id = m.id
  AND em.product_id IS NULL
  AND m.product_id IS NOT NULL;

-- Add constraint: rejection requires reason
ALTER TABLE event_materials ADD CONSTRAINT IF NOT EXISTS rifiuto_motivo_required
  CHECK (stato::text != 'rifiutato' OR motivo_rifiuto IS NOT NULL);
```

- [ ] **Step 5: Write updated_at triggers for new tables**

```sql
-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trg_venues_updated_at
  BEFORE UPDATE ON venues FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_zones_updated_at
  BEFORE UPDATE ON zones FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_couriers_updated_at
  BEFORE UPDATE ON couriers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 6: Write RLS policies — drop old conflicting policies**

```sql
-- Drop old role-based policies that conflict with permission-based model
DROP POLICY IF EXISTS "event_materials_write" ON event_materials;
DROP POLICY IF EXISTS "brands_write" ON brands;
DROP POLICY IF EXISTS "body_sections_write" ON body_sections;
DROP POLICY IF EXISTS "products_write" ON products;
DROP POLICY IF EXISTS "product_body_sections_write" ON product_body_sections;
DROP POLICY IF EXISTS "perms_write" ON user_permissions;
DROP POLICY IF EXISTS "users_write" ON users;
```

- [ ] **Step 7: Write RLS policies — new permission-based policies**

```sql
-- event_materials: commerciale can insert/update own, approva_materiale can update status
CREATE POLICY "event_materials_write_richiedi" ON event_materials
  FOR INSERT WITH CHECK (
    has_permission('richiedi_materiale') AND richiesto_da = auth.uid()
  );

CREATE POLICY "event_materials_update_richiedi" ON event_materials
  FOR UPDATE USING (
    has_permission('richiedi_materiale') AND richiesto_da = auth.uid() AND stato::text = 'in_lista'
  );

CREATE POLICY "event_materials_update_approva" ON event_materials
  FOR UPDATE USING (
    has_permission('approva_materiale')
  );

-- Catalog tables: gestione_catalogo for write
CREATE POLICY "brands_write_perm" ON brands
  FOR ALL USING (has_permission('gestione_catalogo'));

CREATE POLICY "body_sections_write_perm" ON body_sections
  FOR ALL USING (has_permission('gestione_catalogo'));

CREATE POLICY "products_write_perm" ON products
  FOR ALL USING (has_permission('gestione_catalogo'));

CREATE POLICY "product_body_sections_write_perm" ON product_body_sections
  FOR ALL USING (has_permission('gestione_catalogo'));

-- User management: gestione_utenti (not just admin role)
CREATE POLICY "perms_write_perm" ON user_permissions
  FOR ALL USING (has_permission('gestione_utenti'));

CREATE POLICY "users_write_perm" ON users
  FOR ALL USING (has_permission('gestione_utenti'));

-- New tables: RLS enable + policies
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_contents ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated
CREATE POLICY "venues_read" ON venues FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "zones_read" ON zones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "zone_provinces_read" ON zone_provinces FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "couriers_read" ON couriers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "zone_couriers_read" ON zone_couriers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kit_contents_read" ON kit_contents FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write: permission-based
CREATE POLICY "venues_write" ON venues FOR ALL USING (
  has_permission('gestione_sedi') OR has_permission('gestione_catalogo')
);
CREATE POLICY "zones_write" ON zones FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "zone_provinces_write" ON zone_provinces FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "couriers_write" ON couriers FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "zone_couriers_write" ON zone_couriers FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "kit_contents_write" ON kit_contents FOR ALL USING (has_permission('gestione_catalogo'));
```

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/016_materiale_redesign.sql
git commit -m "feat: add migration 016 — materiale redesign (tables, enums, RLS)"
```

### Task 1.2: Update constants and icons

**Files:**
- Modify: `src/lib/constants.js`
- Modify: `src/lib/icons.js`

- [ ] **Step 1: Add new constants to `src/lib/constants.js`**

Append after existing exports:

```js
// Material list row statuses — keyed by DB enum values (richiesto/approvato/rifiutato)
// UI shows friendlier labels: the commerciale sees "In attesa di conferma" not "Richiesto"
export const STATO_MATERIALE_LISTA = {
  richiesto: 'In attesa di conferma',
  approvato: 'Confermato',
  rifiutato: 'Non disponibile',
}

export const STATO_MATERIALE_LISTA_COLORE = {
  richiesto: 'gray',
  approvato: 'green',
  rifiutato: 'red',
}

// Product types for catalog
export const TIPO_PRODOTTO = {
  demo_kit: 'Demo Kit',
  strumentario: 'Strumentario',
  montaggio: 'Montaggio',
  pezzo_sfuso: 'Pezzo sfuso',
}

// Full permission registry
export const PERMESSI = {
  approva_eventi: 'Approvazione eventi',
  gestione_costi: 'Gestione costi',
  compliance: 'Compliance MedTech',
  gestione_utenti: 'Gestione utenti',
  richiedi_materiale: 'Richiesta materiale',
  approva_materiale: 'Approvazione materiale',
  gestione_magazzino: 'Gestione magazzino',
  gestione_spedizioni: 'Gestione spedizioni',
  gestione_gadget: 'Gestione gadget',
  gestione_sedi: 'Gestione sedi',
  gestione_catalogo: 'Gestione catalogo',
}

// Role permission presets (assigned at user creation)
export const ROLE_PERMISSION_PRESETS = {
  commerciale: ['richiedi_materiale'],
  area_manager: ['richiedi_materiale', 'approva_eventi'],
  direzione: ['approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance'],
  ufficio: ['approva_materiale', 'gestione_magazzino', 'gestione_spedizioni', 'gestione_gadget', 'gestione_sedi'],
  admin: ['gestione_utenti', 'gestione_catalogo', 'approva_eventi', 'gestione_costi', 'compliance'],
}
```

- [ ] **Step 2: Add new icons to `src/lib/icons.js`**

Add new Lucide imports:
```js
  // Admin
  Tag,
  Boxes,
  Map,
  Lock,
  FilterX,
```

Add new icon maps after existing maps:
```js
// ═══════════════════════════════════════════
// Admin section
// ═══════════════════════════════════════════
export const ADMIN_ICONS = {
  brand: Tag,
  distretti: Bone,
  prodotti: Package,
  materiali: Boxes,
  gadget: Gift,
  sedi: MapPin,
  zone: Map,
  utenti: Users,
  corrieri: Truck,
}
```

Add to existing `MATERIALE_ICONS`:
```js
  inLista: Clock,
  confermato: CheckCircle,
  rifiutato: XCircle,
  listLocked: Lock,
```

Add to existing `ACTION_ICONS`:
```js
  clearFilter: FilterX,
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: success, no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.js src/lib/icons.js
git commit -m "feat: add material redesign constants and icons"
```

### Task 1.3: Permission-based navigation

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/components/layout/BottomBar.jsx`
- Modify: `src/hooks/useAuth.js`

- [ ] **Step 1: Ensure useAuth loads and exposes permissions correctly**

Read `src/hooks/useAuth.js`. Verify that `hasPermission(perm)` is already implemented as a function that checks `get().permissions.includes(perm)`. If not, add it.

- [ ] **Step 2: Update Sidebar to use permission-based filtering**

Change `navItems` to support both `roles` (backward compat) and `permissions` filtering:

```js
const navItems = [
  { to: '/', label: 'Riepilogo', icon: NAV_ICONS.riepilogo, roles: ['admin', 'direzione', 'ufficio'] },
  { to: '/eventi', label: 'Eventi', icon: NAV_ICONS.eventi },
  { to: '/eventi/calendario', label: 'Calendario', icon: NAV_ICONS.calendario },
  { to: '/materiale', label: 'Magazzino', icon: NAV_ICONS.materiale, permissions: ['gestione_magazzino', 'gestione_spedizioni'] },
]

const adminItems = [
  { to: '/admin/brand', label: 'Brand', icon: ADMIN_ICONS.brand },
  { to: '/admin/distretti', label: 'Distretti', icon: ADMIN_ICONS.distretti },
  { to: '/admin/prodotti', label: 'Prodotti & Kit', icon: ADMIN_ICONS.prodotti },
  { to: '/admin/materiali', label: 'Materiali', icon: ADMIN_ICONS.materiali },
  { to: '/admin/gadget', label: 'Gadget', icon: ADMIN_ICONS.gadget },
  { to: '/admin/sedi', label: 'Sedi & Corrieri', icon: ADMIN_ICONS.sedi },
  { to: '/admin/zone', label: 'Zone', icon: ADMIN_ICONS.zone },
  { to: '/admin/utenti', label: 'Utenti', icon: ADMIN_ICONS.utenti, permissions: ['gestione_utenti'] },
]
```

Update filtering logic:
```js
const hasPermission = useAuthStore(s => s.hasPermission)
const profile = useAuthStore(s => s.profile)

const canSee = (item) => {
  if (item.roles && !item.roles.includes(profile?.ruolo)) return false
  if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false
  return true
}

const visibleItems = navItems.filter(canSee)
const showAdmin = hasPermission('gestione_catalogo')
const visibleAdminItems = showAdmin ? adminItems.filter(canSee) : []
```

Render admin section with separator:
```jsx
{showAdmin && (
  <>
    <div className="border-t border-gray-200 my-3" />
    <p className="px-4 text-sm font-medium text-gray-400 mb-2">Amministrazione</p>
    {visibleAdminItems.map(item => (
      <NavLink key={item.to} ... />
    ))}
  </>
)}
```

- [ ] **Step 3: Update BottomBar similarly**

Only show items the user has permission for. BottomBar remains simpler (fewer items for mobile).

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuth.js src/components/layout/Sidebar.jsx src/components/layout/BottomBar.jsx
git commit -m "feat: permission-based navigation with admin section"
```

---

## Phase 2: Event Material List

### Task 2.1: Material list store redesign

**Files:**
- Modify: `src/hooks/useMaterials.js`

- [ ] **Step 1: Add new actions for event material list**

Keep existing actions (fetchMaterials, fetchMaterial, fetchMovements, createMovement — warehouse still needs them). Add new product-based list actions:

```js
// Event material list (product-based, replaces individual requests)
fetchEventMaterialList: async (eventId) => {
  const { data, error } = await supabase
    .from('event_materials')
    .select('*, product:products(id, nome, codice, descrizione, foto_url, brand:brands(id, nome, logo_url)), richiesto:users!event_materials_richiesto_da_fkey(nome, cognome)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  return { data: data || [], error: error?.message || null }
},

addToMaterialList: async (eventId, productId, userId, note) => {
  const { data, error } = await supabase
    .from('event_materials')
    .insert({
      event_id: eventId,
      product_id: productId,
      quantita: 1,
      stato: 'richiesto', // DB keeps old enum; UI maps via STATO_MATERIALE_LISTA
      richiesto_da: userId,
      note_commerciale: note || null,
    })
    .select()
    .single()
  return { data, error: error?.message || null }
},

updateMaterialListRow: async (id, updates) => {
  const { data, error } = await supabase
    .from('event_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error: error?.message || null }
},

removeMaterialListRow: async (id) => {
  const { data, error } = await supabase
    .from('event_materials')
    .delete()
    .eq('id', id)
  return { data, error: error?.message || null }
},

confirmMaterialRow: async (id, noteUfficio) => {
  const { data, error } = await supabase
    .from('event_materials')
    .update({
      stato: 'approvato', // DB keeps old enum; UI maps via STATO_MATERIALE_LISTA
      note_ufficio: noteUfficio || null,
    })
    .eq('id', id)
    .select()
    .single()
  return { data, error: error?.message || null }
},

rejectMaterialRow: async (id, motivo) => {
  const { data, error } = await supabase
    .from('event_materials')
    .update({
      stato: 'rifiutato',
      motivo_rifiuto: motivo,
    })
    .eq('id', id)
    .select()
    .single()
  return { data, error: error?.message || null }
},

// Catalog browsing (replaces 3-step wizard)
fetchCatalogProducts: async (filters) => {
  let query = supabase
    .from('products')
    .select('*, brand:brands(id, nome, logo_url), body_sections:product_body_sections(body_section:body_sections(id, nome))')
    .eq('attivo', true)
    .order('nome')

  if (filters.brandId) query = query.eq('brand_id', filters.brandId)
  if (filters.search) query = query.ilike('nome', `%${filters.search}%`)

  const { data, error } = await query
  let products = data || []

  // Client-side filter by body section (since it's a join)
  if (filters.sectionId) {
    products = products.filter(p =>
      p.body_sections?.some(bs => bs.body_section?.id === filters.sectionId)
    )
  }

  return { data: products, error: error?.message || null }
},

fetchKitContents: async (productId) => {
  const { data, error } = await supabase
    .from('kit_contents')
    .select('*')
    .eq('product_id', productId)
    .order('piece_name')
  return { data: data || [], error: error?.message || null }
},
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMaterials.js
git commit -m "feat: add product-based material list and catalog store actions"
```

### Task 2.2: Material list lock banner

**Files:**
- Create: `src/components/eventi/MaterialListLockBanner.jsx`

- [ ] **Step 1: Create the lock banner component**

```jsx
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'

export function MaterialListLockBanner({ dataSpedizione }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4" role="alert">
      <Icon icon={MATERIALE_ICONS.listLocked} size={20} className="text-yellow-600 flex-shrink-0" />
      <p className="text-base font-medium text-yellow-800">
        Lista chiusa — materiale in preparazione.
        {dataSpedizione && ` Spedizione prevista: ${formatDate(dataSpedizione)}`}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eventi/MaterialListLockBanner.jsx
git commit -m "feat: add MaterialListLockBanner component"
```

### Task 2.3: Reject material dialog

**Files:**
- Create: `src/components/eventi/RejectMaterialDialog.jsx`

- [ ] **Step 1: Create dialog with mandatory reason**

```jsx
import { useState } from 'react'
import { Button } from '../ui/Button'

export function RejectMaterialDialog({ open, productName, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState('')

  if (!open) return null

  const handleConfirm = () => {
    if (!motivo.trim()) return
    onConfirm(motivo.trim())
    setMotivo('')
  }

  const handleCancel = () => {
    setMotivo('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Rifiuta materiale</h3>
        <p className="text-base text-gray-600">
          Stai rifiutando <strong>{productName}</strong>. Indica il motivo per il commerciale.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[100px] focus:ring-2 focus:ring-mikai-400"
          placeholder="Es. Kit non disponibile, prova alternativa Y..."
          required
        />
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleCancel}>Annulla</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!motivo.trim()}>
            Rifiuta
          </Button>
        </div>
        {!motivo.trim() && (
          <p className="text-sm text-gray-500">Il motivo è obbligatorio per informare il commerciale.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eventi/RejectMaterialDialog.jsx
git commit -m "feat: add RejectMaterialDialog with mandatory reason"
```

### Task 2.4: Material list row

**Files:**
- Create: `src/components/eventi/MaterialListRow.jsx`

- [ ] **Step 1: Create the row component**

Shows product name, quantity (editable if in_lista and not locked), notes, status badge, and approval actions.

```jsx
import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS, ACTION_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE } from '../../lib/constants'
import { StatusBadge } from '../ui/StatusBadge'

export function MaterialListRow({ row, locked, canEdit, canApprove, onUpdate, onRemove, onConfirm, onReject }) {
  const [expanded, setExpanded] = useState(false)
  const isPending = row.stato === 'richiesto'
  const isConfirmed = row.stato === 'approvato'
  const isRejected = row.stato === 'rifiutato'
  const product = row.product

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isConfirmed ? 'border-green-200 bg-green-50/30' :
      isRejected ? 'border-red-200 bg-red-50/30' :
      'border-gray-200 bg-white'
    }`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
      >
        {/* Status indicator */}
        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
          isConfirmed ? 'bg-green-400' :
          isRejected ? 'bg-red-400' :
          'bg-gray-300'
        }`} />

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900 truncate">{product?.nome}</p>
          <p className="text-sm text-gray-500">{product?.brand?.nome}</p>
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && isPending && !locked ? (
            <input
              type="number"
              min="1"
              value={row.quantita}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdate(row.id, { quantita: parseInt(e.target.value) || 1 })}
              className="w-16 px-2 py-1 text-base text-center border border-gray-300 rounded-lg min-h-[48px]"
              aria-label="Quantità"
            />
          ) : (
            <span className="text-base text-gray-600">×{row.quantita}</span>
          )}
        </div>

        {/* Status badge — labels/colors keyed by DB values (richiesto/approvato/rifiutato) */}
        <StatusBadge
          stato={row.stato}
          labels={STATO_MATERIALE_LISTA}
          colors={STATO_MATERIALE_LISTA_COLORE}
        />

        {/* Remove button (only in_lista, not locked, with edit permission) */}
        {canEdit && isPending && !locked && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(row.id) }}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-500"
            aria-label={`Rimuovi ${product?.nome}`}
          >
            <Icon icon={ACTION_ICONS.close} size={20} />
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Commerciale notes */}
          {row.note_commerciale && (
            <div>
              <p className="text-sm font-medium text-gray-500">Note commerciale</p>
              <p className="text-base text-gray-700">{row.note_commerciale}</p>
            </div>
          )}

          {/* Editable note field for commerciale */}
          {canEdit && isPending && !locked && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Le tue note</label>
              <input
                type="text"
                value={row.note_commerciale || ''}
                onChange={(e) => onUpdate(row.id, { note_commerciale: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
                placeholder="Es. Il chirurgo lo richiede specificamente..."
              />
            </div>
          )}

          {/* Office notes (visible to all, editable by approver) */}
          {row.note_ufficio && (
            <div>
              <p className="text-sm font-medium text-gray-500">Note ufficio</p>
              <p className="text-base text-gray-700">{row.note_ufficio}</p>
            </div>
          )}

          {/* Rejection reason */}
          {row.stato === 'rifiutato' && row.motivo_rifiuto && (
            <div className="bg-red-50 rounded-lg p-3" role="alert">
              <p className="text-sm font-medium text-red-600">Motivo rifiuto</p>
              <p className="text-base text-red-800">{row.motivo_rifiuto}</p>
            </div>
          )}

          {/* Approval actions */}
          {canApprove && isPending && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onConfirm(row.id)}
                className="flex items-center gap-2 px-5 py-3 bg-green-100 hover:bg-green-200 rounded-xl text-base font-medium text-green-800 min-h-[48px] transition-colors"
                aria-label="Conferma"
              >
                <Icon icon={ACTION_ICONS.approve} size={18} /> Conferma
              </button>
              <button
                onClick={() => onReject(row.id, product?.nome)}
                className="flex items-center gap-2 px-5 py-3 bg-red-100 hover:bg-red-200 rounded-xl text-base font-medium text-red-800 min-h-[48px] transition-colors"
                aria-label="Rifiuta"
              >
                <Icon icon={ACTION_ICONS.reject} size={18} /> Rifiuta
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eventi/MaterialListRow.jsx
git commit -m "feat: add MaterialListRow component with expandable details"
```

### Task 2.5: Event material list container

**Files:**
- Create: `src/components/eventi/EventMaterialList.jsx`

- [ ] **Step 1: Create the main list container**

Orchestrates: lock banner, list of rows, add button (opens CatalogBrowser), approval actions. Handles permission checks and lock date logic.

```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { MaterialListRow } from './MaterialListRow'
import { MaterialListLockBanner } from './MaterialListLockBanner'
import { RejectMaterialDialog } from './RejectMaterialDialog'
import { CatalogBrowser } from '../materiale/CatalogBrowser'
import { formatDate } from '../../lib/date-utils'

export function EventMaterialList({ event }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null) // { id, productName }

  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
  const addToMaterialList = useMaterialsStore(s => s.addToMaterialList)
  const updateMaterialListRow = useMaterialsStore(s => s.updateMaterialListRow)
  const removeMaterialListRow = useMaterialsStore(s => s.removeMaterialListRow)
  const confirmMaterialRow = useMaterialsStore(s => s.confirmMaterialRow)
  const rejectMaterialRow = useMaterialsStore(s => s.rejectMaterialRow)

  const hasPermission = useAuthStore(s => s.hasPermission)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const canEdit = hasPermission('richiedi_materiale')
  const canApprove = hasPermission('approva_materiale')

  // Lock logic: list locked the day before data_spedizione_prevista
  const today = new Date().toISOString().split('T')[0]
  const lockDate = event.data_spedizione_prevista
  const locked = lockDate ? today >= lockDate : false

  const loadData = async () => {
    setLoading(true)
    const { data } = await fetchEventMaterialList(event.id)
    setRows(data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [event.id])

  const handleAddProduct = async (product) => {
    // Check if already in list
    if (rows.some(r => r.product_id === product.id)) {
      addToast('Questo prodotto è già nella lista', 'warning')
      return
    }
    const { error } = await addToMaterialList(event.id, product.id, user.id)
    if (error) addToast(error, 'error')
    else { addToast(`${product.nome} aggiunto alla lista`, 'success'); loadData() }
  }

  const handleUpdate = async (id, updates) => {
    const { error } = await updateMaterialListRow(id, updates)
    if (error) addToast(error, 'error')
    else loadData()
  }

  const handleRemove = async (id) => {
    const { error } = await removeMaterialListRow(id)
    if (error) addToast(error, 'error')
    else { addToast('Rimosso dalla lista', 'success'); loadData() }
  }

  const handleConfirm = async (id) => {
    const { error } = await confirmMaterialRow(id)
    if (error) addToast(error, 'error')
    else { addToast('Confermato!', 'success'); loadData() }
  }

  const handleReject = async (motivo) => {
    if (!rejectTarget) return
    const { error } = await rejectMaterialRow(rejectTarget.id, motivo)
    setRejectTarget(null)
    if (error) addToast(error, 'error')
    else { addToast('Rifiutato', 'success'); loadData() }
  }

  if (loading) return <LoadingSkeleton lines={5} />

  const pendingCount = rows.filter(r => r.stato === 'richiesto').length

  return (
    <div className="space-y-4">
      {/* Lock banner */}
      {locked && <MaterialListLockBanner dataSpedizione={event.data_spedizione_prevista} />}

      {/* Header with lock date info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Lista materiale</h2>
          {!locked && lockDate && (
            <p className="text-sm text-gray-500">Modificabile fino al {formatDate(lockDate)}</p>
          )}
        </div>
        {canEdit && !locked && !showCatalog && (
          <Button onClick={() => setShowCatalog(true)}>
            <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
            Aggiungi materiale
          </Button>
        )}
      </div>

      {/* Bulk approve */}
      {canApprove && pendingCount > 1 && (
        <button
          onClick={async () => {
            const pending = rows.filter(r => r.stato === 'richiesto')
            for (const r of pending) await confirmMaterialRow(r.id)
            addToast(`${pending.length} materiali confermati!`, 'success')
            loadData()
          }}
          className="w-full py-3 px-4 bg-green-50 border border-green-200 rounded-xl text-base font-medium text-green-800 hover:bg-green-100 transition-colors min-h-[48px]"
        >
          <Icon icon={ACTION_ICONS.check} size={18} className="inline mr-1" />
          Conferma tutto ({pendingCount} in attesa)
        </button>
      )}

      {/* Catalog browser (inline panel) */}
      {showCatalog && (
        <CatalogBrowser
          onAdd={handleAddProduct}
          existingProductIds={rows.map(r => r.product_id)}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Material list */}
      {rows.length === 0 ? (
        <EmptyState
          title="Nessun materiale nella lista"
          description={canEdit && !locked ? 'Aggiungi il materiale necessario per questo evento.' : undefined}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <MaterialListRow
              key={row.id}
              row={row}
              locked={locked}
              canEdit={canEdit}
              canApprove={canApprove}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onConfirm={handleConfirm}
              onReject={(id, name) => setRejectTarget({ id, productName: name })}
            />
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <RejectMaterialDialog
        open={!!rejectTarget}
        productName={rejectTarget?.productName}
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eventi/EventMaterialList.jsx
git commit -m "feat: add EventMaterialList container with lock/approval logic"
```

---

## Phase 3: Visual Catalog

### Task 3.1: Active filters chips

**Files:**
- Create: `src/components/materiale/ActiveFiltersChips.jsx`

- [ ] **Step 1: Create chips component**

```jsx
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function ActiveFiltersChips({ filters, onRemove, onClearAll }) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => onRemove(f.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-mikai-50 text-mikai-700 rounded-full text-sm font-medium hover:bg-mikai-100 transition-colors min-h-[36px]"
          aria-label={`Rimuovi filtro ${f.label}`}
        >
          {f.label}
          <Icon icon={ACTION_ICONS.close} size={14} />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-gray-500 hover:text-gray-700 min-h-[36px] px-2"
      >
        Cancella filtri
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/materiale/ActiveFiltersChips.jsx
git commit -m "feat: add ActiveFiltersChips component"
```

### Task 3.2: Kit contents list

**Files:**
- Create: `src/components/materiale/KitContentsList.jsx`

- [ ] **Step 1: Create collapsible kit contents**

```jsx
export function KitContentsList({ contents }) {
  if (!contents || contents.length === 0) return null

  return (
    <div className="mt-2 bg-gray-50 rounded-lg p-3">
      <p className="text-sm font-medium text-gray-500 mb-2">Contenuto kit ({contents.length} pezzi)</p>
      <div className="space-y-1">
        {contents.map((piece) => (
          <div key={piece.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{piece.piece_name}</span>
            <span className="text-gray-400">
              {piece.piece_code && `${piece.piece_code} · `}×{piece.quantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/materiale/KitContentsList.jsx
git commit -m "feat: add KitContentsList component"
```

### Task 3.3: Catalog product card

**Files:**
- Create: `src/components/materiale/CatalogProductCard.jsx`

- [ ] **Step 1: Create product card with expandable contents**

```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { KitContentsList } from './KitContentsList'

export function CatalogProductCard({ product, alreadyInList, onAdd }) {
  const [expanded, setExpanded] = useState(false)
  const [contents, setContents] = useState([])
  const fetchKitContents = useMaterialsStore(s => s.fetchKitContents)

  useEffect(() => {
    if (expanded && contents.length === 0) {
      fetchKitContents(product.id).then(({ data }) => setContents(data))
    }
  }, [expanded])

  const brandLogo = product.brand?.logo_url
  const sections = product.body_sections?.map(bs => bs.body_section?.nome).filter(Boolean)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          {/* Product image or placeholder */}
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.foto_url ? (
              <img src={product.foto_url} alt={product.nome} className="w-full h-full object-cover" />
            ) : (
              <Icon icon={ACTION_ICONS.add} size={24} className="text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-gray-900 truncate">{product.nome}</h4>
            <div className="flex items-center gap-2 mt-1">
              {brandLogo && <img src={brandLogo} alt="" className="w-5 h-5 rounded object-contain" />}
              <span className="text-sm text-gray-500">{product.brand?.nome}</span>
            </div>
            {sections?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {sections.map((s) => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: kit contents + add button */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {product.descrizione && (
            <p className="text-sm text-gray-600 mb-2">{product.descrizione}</p>
          )}
          <KitContentsList contents={contents} />
          <div className="mt-3">
            {alreadyInList ? (
              <span className="inline-flex items-center gap-1 text-base font-medium text-green-600">
                <Icon icon={ACTION_ICONS.check} size={16} /> Già nella lista
              </span>
            ) : (
              <Button onClick={(e) => { e.stopPropagation(); onAdd(product) }} className="w-full">
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                Aggiungi alla lista
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/materiale/CatalogProductCard.jsx
git commit -m "feat: add CatalogProductCard with expandable kit contents"
```

### Task 3.4: Catalog filter bar

**Files:**
- Create: `src/components/materiale/CatalogFilterBar.jsx`

- [ ] **Step 1: Create the visual filter bar**

Horizontal scrollable bar with brand logos, body section images, and product type icons. All clickable, multi-select, combinable.

```jsx
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'
import { TIPO_PRODOTTO } from '../../lib/constants'

const typeIcons = {
  demo_kit: MATERIALE_ICONS.package,
  strumentario: MATERIALE_ICONS.package_open,
  montaggio: MATERIALE_ICONS.manutenzione,
  pezzo_sfuso: MATERIALE_ICONS.gadget,
}

export function CatalogFilterBar({ brands, sections, selectedBrandId, selectedSectionId, selectedType, onBrandSelect, onSectionSelect, onTypeSelect }) {
  return (
    <div className="space-y-4">
      {/* Brands row */}
      {brands.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Azienda</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => onBrandSelect(b.id === selectedBrandId ? null : b.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 min-w-[80px] flex-shrink-0 transition-all ${
                  b.id === selectedBrandId ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`Filtra per ${b.nome}`}
                aria-pressed={b.id === selectedBrandId}
              >
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Icon icon={MATERIALE_ICONS.produttore} size={24} className="text-gray-400" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{b.nome}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body sections row */}
      {sections.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Distretto anatomico</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => onSectionSelect(s.id === selectedSectionId ? null : s.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 min-w-[80px] flex-shrink-0 transition-all ${
                  s.id === selectedSectionId ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`Filtra per ${s.nome}`}
                aria-pressed={s.id === selectedSectionId}
              >
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                  {s.immagine_url ? (
                    <img src={s.immagine_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-lg font-bold text-gray-300">{s.nome.charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{s.nome}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product type row */}
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Tipo</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Object.entries(TIPO_PRODOTTO).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onTypeSelect(key === selectedType ? null : key)}
              className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 min-w-[80px] flex-shrink-0 transition-all ${
                key === selectedType ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`Filtra per ${label}`}
              aria-pressed={key === selectedType}
            >
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon icon={typeIcons[key] || MATERIALE_ICONS.package} size={24} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/materiale/CatalogFilterBar.jsx
git commit -m "feat: add CatalogFilterBar with visual brand/section/type filters"
```

### Task 3.5: Catalog browser

**Files:**
- Create: `src/components/materiale/CatalogBrowser.jsx`

- [ ] **Step 1: Create the catalog browser container**

Orchestrates filter bar + search + product grid. Mounted inline inside EventMaterialList.

```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { CatalogFilterBar } from './CatalogFilterBar'
import { CatalogProductCard } from './CatalogProductCard'
import { ActiveFiltersChips } from './ActiveFiltersChips'

export function CatalogBrowser({ onAdd, existingProductIds, onClose }) {
  const [brands, setBrands] = useState([])
  const [sections, setSections] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brandId, setBrandId] = useState(null)
  const [sectionId, setSectionId] = useState(null)
  const [productType, setProductType] = useState(null)

  const fetchBrands = useMaterialsStore(s => s.fetchBrands)
  const fetchAllBodySections = useMaterialsStore(s => s.fetchAllBodySections)
  const fetchCatalogProducts = useMaterialsStore(s => s.fetchCatalogProducts)

  // Load brands and sections on mount
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

  // Fetch products when filters change
  useEffect(() => {
    setLoading(true)
    fetchCatalogProducts({ brandId, sectionId, search }).then(({ data }) => {
      let filtered = data
      if (productType) {
        filtered = filtered.filter(p => p.tipo === productType)
      }
      setProducts(filtered)
      setLoading(false)
    })
  }, [brandId, sectionId, search, productType])

  // Build active filters for chips
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
    activeFilters.push({ id: 'type', label: productType })
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Catalogo prodotti</h3>
        <Button variant="ghost" onClick={onClose}>Chiudi</Button>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((p) => (
            <CatalogProductCard
              key={p.id}
              product={p}
              alreadyInList={existingProductIds.includes(p.id)}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Prerequisite:** `fetchAllBodySections` must already be in `useMaterials.js` (added in Task 2.1). If not, add:

```js
fetchAllBodySections: async () => {
  const { data, error } = await supabase
    .from('body_sections')
    .select('*')
    .eq('attivo', true)
    .order('ordine')
  return { data: data || [], error: error?.message || null }
},
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/materiale/CatalogBrowser.jsx src/hooks/useMaterials.js
git commit -m "feat: add CatalogBrowser with visual filters and product grid"
```

---

## Phase 4: Integration — Wire New Components

### Task 4.1: Replace EventMaterialsTab with EventMaterialList

**Files:**
- Modify: `src/pages/eventi/EventiDetail.jsx`

- [ ] **Step 1: Read EventiDetail.jsx to understand current tab structure**

- [ ] **Step 2: Replace the import and usage of EventMaterialsTab with EventMaterialList**

Change:
```jsx
import { EventMaterialsTab } from '../../components/eventi/EventMaterialsTab'
```
To:
```jsx
import { EventMaterialList } from '../../components/eventi/EventMaterialList'
```

And replace `<EventMaterialsTab event={event} />` with `<EventMaterialList event={event} />` in the materiale tab.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/eventi/EventiDetail.jsx
git commit -m "feat: replace EventMaterialsTab with new EventMaterialList"
```

### Task 4.2: Add admin routes to App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add admin route imports and routes**

Add placeholder pages initially (will be built in Phase 5):

```jsx
import { AdminBrand } from './pages/admin/AdminBrand'
import { AdminDistretti } from './pages/admin/AdminDistretti'
import { AdminProdotti } from './pages/admin/AdminProdotti'
import { AdminMateriali } from './pages/admin/AdminMateriali'
import { AdminGadget } from './pages/admin/AdminGadget'
import { AdminSedi } from './pages/admin/AdminSedi'
import { AdminZone } from './pages/admin/AdminZone'
import { AdminUtenti } from './pages/admin/AdminUtenti'
```

Add routes inside ProtectedRoute:
```jsx
<Route path="/admin/brand" element={<AdminBrand />} />
<Route path="/admin/distretti" element={<AdminDistretti />} />
<Route path="/admin/prodotti" element={<AdminProdotti />} />
<Route path="/admin/materiali" element={<AdminMateriali />} />
<Route path="/admin/gadget" element={<AdminGadget />} />
<Route path="/admin/sedi" element={<AdminSedi />} />
<Route path="/admin/zone" element={<AdminZone />} />
<Route path="/admin/utenti" element={<AdminUtenti />} />
```

- [ ] **Step 2: Create placeholder admin pages**

Each page is a simple placeholder with PageHeader:

```jsx
// src/pages/admin/AdminBrand.jsx (and similar for all 8)
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'

export function AdminBrand() {
  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Brand' }]} />
      </div>
      <PageHeader title="Brand" subtitle="Gestisci i brand del catalogo" />
      <div className="px-4 md:px-8">
        <p className="text-base text-gray-500">In costruzione...</p>
      </div>
    </div>
  )
}
```

Create all 8 placeholder files.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/pages/admin/
git commit -m "feat: add admin routes and placeholder pages"
```

---

## Phase 5: Admin CRUD

### Task 5.1: Reusable AdminTable component

**Files:**
- Create: `src/components/ui/AdminTable.jsx`

- [ ] **Step 1: Create reusable table with search, sort, and row actions**

```jsx
import { useState } from 'react'
import { SearchInput } from './SearchInput'
import { Button } from './Button'
import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { EmptyState } from './EmptyState'

export function AdminTable({ columns, rows, searchField, onAdd, onEdit, onDelete, addLabel = 'Nuovo' }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)

  // Filter
  let filtered = rows
  if (search && searchField) {
    const q = search.toLowerCase()
    filtered = filtered.filter(r => String(r[searchField] || '').toLowerCase().includes(q))
  }

  // Sort
  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? ''
      const vb = b[sortCol] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'it')
      return sortAsc ? cmp : -cmp
    })
  }

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Cerca..." />
        </div>
        {onAdd && (
          <Button onClick={onAdd}>
            <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
            {addLabel}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nessun risultato" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortCol === col.key && (
                      <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer min-h-[48px]"
                  onClick={() => onEdit?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-base text-gray-900">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {onDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(row) }}
                        className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                        aria-label="Elimina"
                      >
                        <Icon icon={ACTION_ICONS.close} size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AdminTable.jsx
git commit -m "feat: add reusable AdminTable component"
```

### Task 5.2: Admin store

**Files:**
- Create: `src/hooks/useAdmin.js`

- [ ] **Step 1: Create admin Zustand store**

CRUD actions for all admin entities: brands, body_sections, products, product_body_sections, kit_contents, materials (specimens), gadgets (master), venues, couriers, zones, zone_provinces, zone_couriers, users + user_permissions.

Each entity follows the same pattern:
```js
fetch{Entity}: async () => { ... select ... return { data, error } },
create{Entity}: async (record) => { ... insert ... return { data, error } },
update{Entity}: async (id, updates) => { ... update ... return { data, error } },
delete{Entity}: async (id) => { ... delete ... return { data, error } },
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAdmin.js
git commit -m "feat: add useAdmin store with CRUD for all admin entities"
```

### Task 5.3: Implement admin CRUD pages

**Files:**
- Replace placeholders in: `src/pages/admin/Admin*.jsx`

- [ ] **Step 1: Implement AdminBrand.jsx**

Uses AdminTable + a form dialog for create/edit. Columns: Nome, Tipo, Attivo. Form fields: nome, tipo (select), logo_url, attivo (toggle).

- [ ] **Step 2: Implement AdminDistretti.jsx**

Columns: Nome, Ordine, Attivo. Form: nome, immagine_url, ordine, attivo.

- [ ] **Step 3: Implement AdminProdotti.jsx**

Most complex: columns: Nome, Brand, Tipo, Attivo. Form: nome, brand_id (select), tipo (select), descrizione, codice, immagine_url, attivo. Plus: multi-select body sections (checkboxes), kit contents sub-table (inline add/remove pieces).

- [ ] **Step 4: Implement AdminMateriali.jsx**

Columns: Codice inventario, Prodotto, Posizione, Attivo. Form: codice_inventario, product_id (select), posizione_attuale, note, attivo.

- [ ] **Step 5: Implement AdminGadget.jsx**

Columns: Nome, Stock, Soglia, Fornitore. Form: nome, quantita_disponibile, soglia_minima, fornitore_abituale, attivo.

- [ ] **Step 6: Implement AdminSedi.jsx**

Two tabs: Sedi + Corrieri. Sedi columns: Nome, Città, Provincia, Zona. Corrieri columns: Nome, Contatto.

- [ ] **Step 7: Implement AdminZone.jsx**

Columns: Nome, Province (count). Form: nome + province checklist (107 Italian provinces).

- [ ] **Step 8: Implement AdminUtenti.jsx**

Columns: Nome, Cognome, Email, Ruolo, Attivo. Form: user fields + permission checklist (all permissions with checkboxes, pre-filled from role preset).

- [ ] **Step 9: Verify build after each page**

```bash
npm run build
```

- [ ] **Step 10: Commit after all admin pages**

```bash
git add src/pages/admin/ src/hooks/useAdmin.js
git commit -m "feat: implement all admin CRUD pages"
```

---

## Phase 6: Venue Directory + Event Integration

### Task 6.1: Venues store

**Files:**
- Create: `src/hooks/useVenues.js`

- [ ] **Step 1: Create venue store with autocomplete**

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useVenuesStore = create((set, get) => ({
  venues: [],
  loading: false,

  searchVenues: async (query) => {
    if (!query || query.length < 2) return { data: [], error: null }
    const { data, error } = await supabase
      .from('venues')
      .select('*, zone:zones(id, nome)')
      .ilike('nome', `%${query}%`)
      .order('nome')
      .limit(5)
    return { data: data || [], error: error?.message || null }
  },

  createVenue: async (venue) => {
    const { data, error } = await supabase
      .from('venues')
      .insert(venue)
      .select()
      .single()
    return { data, error: error?.message || null }
  },

  getDefaultCourier: async (provincia) => {
    // Lookup zone by province, then get default courier
    const { data: zp } = await supabase
      .from('zone_provinces')
      .select('zone_id')
      .eq('provincia', provincia)
      .single()
    if (!zp) return { data: null, error: null }

    const { data: zc } = await supabase
      .from('zone_couriers')
      .select('courier:couriers(id, nome)')
      .eq('zone_id', zp.zone_id)
      .single()
    return { data: zc?.courier || null, error: null }
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useVenues.js
git commit -m "feat: add useVenues store with autocomplete and courier lookup"
```

### Task 6.2: Venue autocomplete component

**Files:**
- Create: `src/components/eventi/VenueAutocomplete.jsx`

- [ ] **Step 1: Create autocomplete component**

Debounced search (300ms), shows max 5 results, "Crea nuova sede" as last option. On select: fills address fields. On create new: opens inline form.

- [ ] **Step 2: Commit**

```bash
git add src/components/eventi/VenueAutocomplete.jsx
git commit -m "feat: add VenueAutocomplete component"
```

### Task 6.3: Integrate venue into event wizard

**Files:**
- Modify: `src/components/eventi/WizardStepDove.jsx`

- [ ] **Step 1: Read current WizardStepDove.jsx**

- [ ] **Step 2: Add VenueAutocomplete to the "Dove" step**

Replace the plain text input for `luogo` with VenueAutocomplete. When a venue is selected, auto-fill address, courier, and delivery notes. Keep fields editable for override.

Add new fields to the wizard step:
- `data_spedizione_prevista` (DatePicker)
- `note_consegna` (text input)
- Display auto-selected courier (from zone) with option to change

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/eventi/WizardStepDove.jsx
git commit -m "feat: integrate VenueAutocomplete into event wizard"
```

---

## Phase 7: Final Verification

### Task 7.1: Full build + review

- [ ] **Step 1: Run production build**

```bash
npm run build
```
Expected: success, no errors

- [ ] **Step 2: Run dev server and manually verify**

```bash
npm run dev
```

Check:
- Login works
- Sidebar shows admin section only for users with `gestione_catalogo`
- Event detail → Material tab shows new list UI
- Add material → catalog browser opens with visual filters
- Admin pages load and show tables
- Venue autocomplete works in event wizard

- [ ] **Step 3: Update CLAUDE.md**

Update the Phase table to mark this work, add new conventions:
- Permission system section
- Admin section routes
- New stores (useVenues, useZones, useCouriers, useAdmin)
- Updated file ownership rules

- [ ] **Step 4: Commit all**

```bash
git add -A
git commit -m "feat: complete materiale UX redesign — permissions, list, catalog, admin, venues"
```
