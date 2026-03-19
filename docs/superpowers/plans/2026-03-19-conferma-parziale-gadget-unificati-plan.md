# Conferma Parziale + Gadget Unificati — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add partial approval to material requests (approve 2 of 3 requested) and unify gadgets into the product catalog, eliminating the separate gadget system.

**Architecture:** Two SQL migrations (enum extension + schema changes/data migration). Evolve `confirmMaterialRow` store action to accept `quantitaApprovata`. Add inline confirmation form with quantity stepper in `MaterialListRow`. Migrate gadget data to `products` table, add stock tracking with atomic `adjust_product_stock` RPC. Delete gadget-specific files (store, components, admin page).

**Tech Stack:** React 19, Zustand, Supabase JS, TailwindCSS v4, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-19-conferma-parziale-gadget-unificati-design.md`

**Worktree:** `C:/Users/Nicola_MussolinAdmin/Documents/Mikai/Eventi/.worktrees/catalogo-ecommerce`

---

## File Structure

```
supabase/migrations/
  TIMESTAMP_a_add_gadget_fornitore_enum.sql    # NEW: enum extension (separate migration)
  TIMESTAMP_b_conferma_parziale_gadget.sql     # NEW: columns + function + data migration

src/
  hooks/
    useMaterials.js          # MODIFY: confirmMaterialRow, restoreGadgetStock, fetchEventMaterialList join
    useAdmin.js              # MODIFY: remove gadget master actions (lines 159-186)
    useGadgets.js            # DELETE
  components/
    eventi/
      MaterialListRow.jsx    # MODIFY: add inline confirm form with stepper + nota
      EventMaterialList.jsx  # MODIFY: remove gadget section, add stock restore logic, update bulk confirm
    materiale/
      CatalogProductCard.jsx # MODIFY: add stock badge for gadgets
      CatalogProductModal.jsx# MODIFY: show stock for gadgets instead of physical availability
      GadgetRequestForm.jsx  # DELETE
      GadgetCard.jsx         # DELETE
    layout/
      Sidebar.jsx            # MODIFY: remove gadget admin nav item (line 23)
  pages/
    admin/
      AdminGadget.jsx        # DELETE
  lib/
    constants.js             # MODIFY: add gadget to TIPO_PRODOTTO, fornitore to TIPO_BRAND, remove STATO_GADGET_RICHIESTA
  App.jsx                    # MODIFY: remove AdminGadget route + import
```

---

## Task 1: SQL Migrations

**Files:**
- Create: `supabase/migrations/20260319100000_add_gadget_fornitore_enum.sql`
- Create: `supabase/migrations/20260319100001_conferma_parziale_gadget.sql`

- [ ] **Step 1: Create enum extension migration**

`supabase/migrations/20260319100000_add_gadget_fornitore_enum.sql`:
```sql
-- Must be separate from policies referencing new values (PostgreSQL limitation)
ALTER TYPE product_tipo ADD VALUE 'gadget';
ALTER TYPE brand_tipo ADD VALUE 'fornitore';
```

- [ ] **Step 2: Create main migration**

`supabase/migrations/20260319100001_conferma_parziale_gadget.sql`:
```sql
-- ============================================
-- Conferma parziale + Gadget unificati
-- Spec: docs/superpowers/specs/2026-03-19-conferma-parziale-gadget-unificati-design.md
-- ============================================

-- === Schema changes ===

-- Conferma parziale
ALTER TABLE event_materials ADD COLUMN quantita_approvata integer;

-- richiesto_da nullable (gadget migrati non hanno questo dato)
ALTER TABLE event_materials ALTER COLUMN richiesto_da DROP NOT NULL;

-- Stock consumabile (per gadget). CHECK impedisce stock negativo.
ALTER TABLE products ADD COLUMN quantita_disponibile integer CHECK (quantita_disponibile >= 0);
ALTER TABLE products ADD COLUMN soglia_minima integer DEFAULT 0;

-- === Atomic stock adjustment function (SECURITY DEFINER) ===

CREATE OR REPLACE FUNCTION adjust_product_stock(p_product_id uuid, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_qty integer;
BEGIN
  UPDATE products
  SET quantita_disponibile = quantita_disponibile + p_delta
  WHERE id = p_product_id AND quantita_disponibile IS NOT NULL
  RETURNING quantita_disponibile INTO new_qty;
  RETURN COALESCE(new_qty, -1);
END;
$$;

REVOKE ALL ON FUNCTION adjust_product_stock FROM public;
GRANT EXECUTE ON FUNCTION adjust_product_stock TO authenticated;

-- === Gadget data migration ===

-- 1. Fallback brand for gadgets without fornitore
INSERT INTO brands (id, nome, tipo)
VALUES ('b0000000-0000-0000-0000-000000000099', 'Altro fornitore', 'fornitore');

-- 2. Create brand per distinct fornitore_abituale
INSERT INTO brands (nome, tipo)
SELECT DISTINCT fornitore_abituale, 'fornitore'
FROM gadgets
WHERE fornitore_abituale IS NOT NULL;

-- 3. Move gadgets → products
INSERT INTO products (id, brand_id, nome, descrizione, foto_url, tipo, quantita_disponibile, soglia_minima, attivo)
SELECT
  g.id,
  COALESCE(b.id, 'b0000000-0000-0000-0000-000000000099'),
  g.nome,
  g.descrizione,
  g.foto_url,
  'gadget',
  g.quantita_disponibile,
  g.soglia_minima,
  g.attivo
FROM gadgets g
LEFT JOIN brands b ON b.nome = g.fornitore_abituale AND b.tipo = 'fornitore';

-- 4. Move event_gadgets → event_materials
INSERT INTO event_materials (event_id, product_id, quantita, stato, note_commerciale)
SELECT
  eg.event_id,
  eg.gadget_id,
  eg.quantita_richiesta,
  CASE eg.stato
    WHEN 'richiesto' THEN 'richiesto'
    WHEN 'pronto' THEN 'approvato'
    WHEN 'consegnato' THEN 'approvato'
    ELSE 'richiesto'
  END::material_request_stato,
  eg.note
FROM event_gadgets eg;

-- 5. Drop old tables and enum
DROP TABLE event_gadgets;
DROP TABLE gadgets;
DROP TYPE gadget_request_stato;
```

- [ ] **Step 3: Verify migrations parse correctly**

```bash
# Just check SQL syntax by reading; actual push happens after frontend is ready
cat supabase/migrations/20260319100000_add_gadget_fornitore_enum.sql
cat supabase/migrations/20260319100001_conferma_parziale_gadget.sql
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add migrations for partial approval + gadget unification"
```

---

## Task 2: Store — confirmMaterialRow + restoreGadgetStock + fetchEventMaterialList

**Files:**
- Modify: `src/hooks/useMaterials.js`

- [ ] **Step 1: Update `confirmMaterialRow` (line 227-238)**

Replace the current `confirmMaterialRow` with:

```js
  confirmMaterialRow: async (id, quantitaApprovata, noteUfficio) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update({
        stato: 'approvato',
        quantita_approvata: quantitaApprovata,
        note_ufficio: noteUfficio || null,
      })
      .eq('id', id)
      .select('*, product:products(id, tipo, quantita_disponibile)')
      .single()

    // Atomic stock decrement for gadgets
    if (!error && data?.product?.tipo === 'gadget' && data.product.quantita_disponibile != null) {
      await supabase.rpc('adjust_product_stock', {
        p_product_id: data.product_id,
        p_delta: -quantitaApprovata,
      })
    }

    return { data, error: error?.message || null }
  },
```

- [ ] **Step 2: Add `restoreGadgetStock` after `rejectMaterialRow` (after line ~251)**

```js
  restoreGadgetStock: async (row) => {
    if (row.stato === 'approvato' && row.quantita_approvata && row.product?.tipo === 'gadget') {
      await supabase.rpc('adjust_product_stock', {
        p_product_id: row.product_id,
        p_delta: row.quantita_approvata,
      })
    }
  },
```

- [ ] **Step 3: Update `fetchEventMaterialList` join (line 187)**

Replace the `.select(...)` in `fetchEventMaterialList` with:

```js
      .select('*, product:products(id, nome, codice, descrizione, foto_url, tipo, quantita_disponibile, soglia_minima, brand:brands(id, nome, logo_url)), richiesto:users!event_materials_richiesto_da_fkey(nome, cognome)')
```

This adds `tipo`, `quantita_disponibile`, `soglia_minima` to the product join.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMaterials.js
git commit -m "feat: confirmMaterialRow with partial approval + stock management"
```

---

## Task 3: Constants — add gadget/fornitore, remove gadget enum

**Files:**
- Modify: `src/lib/constants.js`

- [ ] **Step 1: Add `gadget` to `TIPO_PRODOTTO` (line ~198)**

After `pezzo_sfuso: 'Pezzo sfuso',` add:
```js
  gadget: 'Gadget',
```

- [ ] **Step 2: Add `fornitore` to `TIPO_BRAND`**

Find `TIPO_BRAND` and add:
```js
  fornitore: 'Fornitore',
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Note: `STATO_GADGET_RICHIESTA` removal is deferred to Task 7 (after gadget files are deleted) to keep build green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.js
git commit -m "feat: add gadget/fornitore constants, remove STATO_GADGET_RICHIESTA"
```

---

## Task 4: MaterialListRow — inline confirm form with stepper

**Files:**
- Modify: `src/components/eventi/MaterialListRow.jsx`

- [ ] **Step 1: Add confirm form state**

After `const product = row.product` (line 13), add:

```jsx
  const [showConfirmForm, setShowConfirmForm] = useState(false)
  const [confirmQty, setConfirmQty] = useState(row.quantita || 1)
  const [confirmNote, setConfirmNote] = useState('')
```

- [ ] **Step 2: Update quantity display to show approved quantity**

Replace the quantity display section (lines 48-70) — the `{/* Quantity */}` block — with:

```jsx
        {/* Quantity display */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {rowEditable ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate(row.id, { quantita: Math.max(1, (row.quantita || 1) - 1) }) }}
                className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 transition-colors"
                aria-label="Diminuisci"
              >
                −
              </button>
              <span className="w-8 text-center text-base font-bold text-gray-900">{row.quantita || 1}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate(row.id, { quantita: (row.quantita || 1) + 1 }) }}
                className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 transition-colors"
                aria-label="Aumenta"
              >
                +
              </button>
            </>
          ) : (
            <div className="text-right">
              {isConfirmed && row.quantita_approvata != null && row.quantita_approvata < (row.quantita || 1) ? (
                <div>
                  <span className="text-sm text-gray-400 line-through">{row.quantita}</span>
                  <span className="text-base font-bold text-yellow-700 ml-1">{row.quantita_approvata}</span>
                </div>
              ) : (
                <span className="text-base text-gray-600 font-medium">×{row.quantita_approvata || row.quantita || 1}</span>
              )}
            </div>
          )}
        </div>
```

- [ ] **Step 3: Override StatusBadge for partial approval**

After the `{/* Status badge */}` section (line 73-77), replace the `<StatusBadge>` with a conditional:

```jsx
        {/* Status badge — override for partial approval */}
        {isConfirmed && row.quantita_approvata != null && row.quantita_approvata < (row.quantita || 1) ? (
          <span className="px-3 py-1 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-full">
            Approvato parziale
          </span>
        ) : (
          <StatusBadge
            stato={row.stato}
            labels={STATO_MATERIALE_LISTA}
            colors={STATO_MATERIALE_LISTA_COLORE}
          />
        )}
```

- [ ] **Step 4: Replace the confirm/reject buttons (lines 144-161) with confirm form logic**

Replace the `{/* Approval actions for ufficio */}` block with:

```jsx
          {/* Approval actions for ufficio */}
          {canApprove && isPending && !showConfirmForm && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setConfirmQty(row.quantita || 1); setConfirmNote(''); setShowConfirmForm(true) }}
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

          {/* Inline confirm form */}
          {canApprove && isPending && showConfirmForm && (
            <div className="bg-green-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-green-800">Conferma materiale</p>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Quantita approvata</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setConfirmQty(q => Math.max(1, q - 1))}
                    className="w-12 h-12 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600 transition-colors"
                    aria-label="Diminuisci approvati"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-lg font-bold text-gray-900">{confirmQty}</span>
                  <button
                    onClick={() => setConfirmQty(q => Math.min(row.quantita || 1, q + 1))}
                    className="w-12 h-12 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600 transition-colors"
                    aria-label="Aumenta approvati"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-400">/ {row.quantita || 1} richiesti</span>
              </div>

              {confirmQty < (row.quantita || 1) && (
                <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
                  Approvazione parziale: {confirmQty} su {row.quantita || 1}
                </p>
              )}

              <input
                type="text"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder="Nota ufficio (opzionale)"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { onConfirm(row.id, confirmQty, confirmNote); setShowConfirmForm(false) }}
                  className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-base font-medium text-white min-h-[48px] transition-colors"
                >
                  <Icon icon={ACTION_ICONS.approve} size={18} /> Conferma {confirmQty}
                </button>
                <button
                  onClick={() => setShowConfirmForm(false)}
                  className="px-5 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-base font-medium text-gray-600 min-h-[48px] transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
```

- [ ] **Step 5: Update the `onConfirm` prop type**

The `onConfirm` callback now receives `(id, quantitaApprovata, noteUfficio)` instead of just `(id)`. This change flows to `EventMaterialList.jsx` (Task 5).

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/eventi/MaterialListRow.jsx
git commit -m "feat: MaterialListRow inline confirm form with quantity stepper + partial badge"
```

---

## Task 5: EventMaterialList — update confirm handler, remove gadgets, add stock restore

**Files:**
- Modify: `src/components/eventi/EventMaterialList.jsx`

- [ ] **Step 1: Remove gadget imports and state**

Remove these imports:
```jsx
import { useGadgetsStore } from '../../hooks/useGadgets'
import { GadgetRequestForm } from '../materiale/GadgetRequestForm'
import { GadgetCard } from '../materiale/GadgetCard'
```

Remove these state/selector lines:
```jsx
  const [gadgets, setGadgets] = useState([])
  const [showGadgetForm, setShowGadgetForm] = useState(false)
  const fetchEventGadgets = useGadgetsStore(s => s.fetchEventGadgets)
```

- [ ] **Step 2: Update `loadData` to remove gadget fetch**

Replace the current `loadData` with:
```jsx
  const loadData = async () => {
    setLoading(true)
    const [matRes, movRes] = await Promise.all([
      fetchEventMaterialList(event.id),
      fetchEventMovements(event.id),
    ])
    setRows(matRes.data)
    setMovements(movRes.data)
    setLoading(false)
  }
```

- [ ] **Step 3: Add `restoreGadgetStock` selector**

After the existing store selectors, add:
```jsx
  const restoreGadgetStock = useMaterialsStore(s => s.restoreGadgetStock)
```

- [ ] **Step 4: Update `handleConfirm` to pass quantity + note**

Replace the current `handleConfirm`:
```jsx
  const handleConfirm = async (id) => {
    const { error } = await confirmMaterialRow(id)
    if (error) addToast(error, 'error')
    else { addToast('Confermato!', 'success'); loadData() }
  }
```

With:
```jsx
  const handleConfirm = async (id, quantitaApprovata, noteUfficio) => {
    const { error } = await confirmMaterialRow(id, quantitaApprovata, noteUfficio)
    if (error) addToast(error, 'error')
    else { addToast('Confermato!', 'success'); loadData() }
  }
```

- [ ] **Step 5: Update `handleUpdate` to restore stock when approved row goes back to pending**

Replace the current `handleUpdate`:
```jsx
  const handleUpdate = async (id, updates) => {
    const row = rows.find(r => r.id === id)
    if (row?.stato === 'approvato' && updates.quantita) {
      updates.stato = 'richiesto'
    }
    const { error } = await updateMaterialListRow(id, updates)
    if (error) addToast(error, 'error')
    else loadData()
  }
```

With:
```jsx
  const handleUpdate = async (id, updates) => {
    const row = rows.find(r => r.id === id)
    if (row?.stato === 'approvato' && updates.quantita) {
      // Restore gadget stock before reverting to pending
      await restoreGadgetStock(row)
      updates.stato = 'richiesto'
      updates.quantita_approvata = null
    }
    const { error } = await updateMaterialListRow(id, updates)
    if (error) addToast(error, 'error')
    else loadData()
  }
```

- [ ] **Step 6: Update `handleRemove` to restore stock before delete**

Replace the current `handleRemove`:
```jsx
  const handleRemove = async (id) => {
    const { error } = await removeMaterialListRow(id)
    if (error) addToast(error, 'error')
    else { addToast('Rimosso dalla lista', 'success'); loadData() }
  }
```

With:
```jsx
  const handleRemove = async (id) => {
    const row = rows.find(r => r.id === id)
    if (row) await restoreGadgetStock(row)
    const { error } = await removeMaterialListRow(id)
    if (error) addToast(error, 'error')
    else { addToast('Rimosso dalla lista', 'success'); loadData() }
  }
```

- [ ] **Step 7: Update bulk confirm to pass quantity**

Replace the bulk confirm button `onClick`:
```jsx
            const pending = rows.filter(r => r.stato === 'richiesto')
            for (const r of pending) await confirmMaterialRow(r.id)
```

With:
```jsx
            const pending = rows.filter(r => r.stato === 'richiesto')
            for (const r of pending) await confirmMaterialRow(r.id, r.quantita || 1)
```

- [ ] **Step 8: Update `handleSaveCart` to restore stock when approved gadget rows change**

In `handleSaveCart`, find the branch that handles quantity changes on existing rows (`item.dbRowId && existingRow`). Before updating, restore stock if the row was approved and is a gadget:

Add before the `const updates = {}` line in that branch:
```jsx
        // Restore gadget stock if row was approved and is changing
        if (existingRow.stato === 'approvato' && existingRow.quantita_approvata && existingRow.product?.tipo === 'gadget') {
          await restoreGadgetStock(existingRow)
        }
```

Also in the branch that handles removed items (`item.quantity === 0 && item.dbRowId`), add stock restore before the delete:
```jsx
        // Restore stock before removing approved gadget
        const removedRow = rows.find(r => r.id === item.dbRowId)
        if (removedRow) await restoreGadgetStock(removedRow)
```

- [ ] **Step 9: Remove gadget section JSX**

Remove the entire `{/* Gadgets */}` section (the `<section className="pt-6 border-t">` block with `GadgetRequestForm` and `GadgetCard` rendering).

- [ ] **Step 10: Verify build**

```bash
npm run build
```

- [ ] **Step 11: Commit**

```bash
git add src/components/eventi/EventMaterialList.jsx
git commit -m "feat: partial confirm + stock restore, remove gadget section"
```

---

## Task 6: CatalogProductCard + CatalogProductModal — stock badge + gadget availability

**Files:**
- Modify: `src/components/materiale/CatalogProductCard.jsx`
- Modify: `src/components/materiale/CatalogProductModal.jsx`

- [ ] **Step 1: Add stock badge to CatalogProductCard**

In `CatalogProductCard.jsx`, after the body sections chips (the `{sections?.length > 0 && ...}` block), add:

```jsx
            {product.quantita_disponibile != null && (
              <p className={`text-xs font-medium mt-0.5 ${
                product.soglia_minima != null && product.quantita_disponibile <= product.soglia_minima
                  ? 'text-red-600'
                  : 'text-gray-400'
              }`}>
                {product.soglia_minima != null && product.quantita_disponibile <= product.soglia_minima
                  ? `Scorte basse: ${product.quantita_disponibile}`
                  : `Disp: ${product.quantita_disponibile}`
                }
              </p>
            )}
```

- [ ] **Step 2: Update CatalogProductModal availability section**

In `CatalogProductModal.jsx`, find the `{/* Physical availability */}` section. Wrap it in a conditional that shows stock info for gadgets and physical availability for other products:

Replace the availability `<div>` block with:

```jsx
          {/* Availability — stock for gadgets, physical units for demo kits */}
          <div>
            {product.tipo === 'gadget' ? (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Giacenza
                </p>
                {loading ? (
                  <LoadingSkeleton lines={1} />
                ) : (
                  <div className="space-y-2">
                    <p className="text-base font-medium text-gray-900">
                      {product.quantita_disponibile ?? 0} disponibili
                    </p>
                    {product.soglia_minima != null && product.quantita_disponibile != null &&
                     product.quantita_disponibile <= product.soglia_minima && (
                      <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        Sotto la soglia minima ({product.soglia_minima})
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Disponibilita fisica
                  {!loading && availability.length > 0 && (
                    <span className="ml-2 normal-case font-normal text-gray-400">
                      ({availability.length} {availability.length === 1 ? 'esemplare' : 'esemplari'})
                    </span>
                  )}
                </p>
                {loading ? (
                  <LoadingSkeleton lines={3} />
                ) : (
                  <AvailabilityList items={availability} />
                )}
              </>
            )}
          </div>
```

Note: `product.tipo` and `product.quantita_disponibile` must come from the catalog query. The `fetchCatalogProducts` query already includes `*` on products, so these fields will be available once the DB migration is applied.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/materiale/CatalogProductCard.jsx src/components/materiale/CatalogProductModal.jsx
git commit -m "feat: stock badge on product cards, gadget availability in modal"
```

---

## Task 7: Delete gadget files + update App/Sidebar/useAdmin

**Files:**
- Delete: `src/components/materiale/GadgetRequestForm.jsx`
- Delete: `src/components/materiale/GadgetCard.jsx`
- Delete: `src/hooks/useGadgets.js`
- Delete: `src/pages/admin/AdminGadget.jsx`
- Modify: `src/App.jsx` (remove AdminGadget route + import, line 17, 65)
- Modify: `src/components/layout/Sidebar.jsx` (remove gadget nav item, line 23)
- Modify: `src/hooks/useAdmin.js` (remove gadget master actions, lines 159-186)

- [ ] **Step 1: Verify no remaining imports of gadget files**

```bash
grep -r "GadgetRequestForm\|GadgetCard\|useGadgets\|AdminGadget\|STATO_GADGET_RICHIESTA" src/ --include="*.jsx" --include="*.js" -l
```

Expected: only the files being deleted + already-modified files should appear.

- [ ] **Step 2: Remove AdminGadget import and route from App.jsx**

In `src/App.jsx`:
- Remove line 17: `import { AdminGadget } from './pages/admin/AdminGadget'`
- Remove line 65: the route `<Route path="admin/gadget" element={<AdminGadget />} />`

- [ ] **Step 3: Remove gadget nav item from Sidebar.jsx**

In `src/components/layout/Sidebar.jsx`, remove line 23:
```jsx
    { to: '/admin/gadget', label: 'Gadget', icon: ADMIN_ICONS.gadget },
```

- [ ] **Step 4: Remove gadget actions from useAdmin.js**

In `src/hooks/useAdmin.js`, remove lines 159-186 (the `gadgetsMaster`, `gadgetsMasterLoading`, `fetchGadgetsMaster`, `createGadgetMaster`, `updateGadgetMaster`, `deleteGadgetMaster` entries).

- [ ] **Step 5: Remove `STATO_GADGET_RICHIESTA` from constants.js**

In `src/lib/constants.js`, delete lines 166-170:
```js
export const STATO_GADGET_RICHIESTA = {
  richiesto: 'Richiesto',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
}
```

- [ ] **Step 6: Verify no gadget-only icons need removal from icons.js**

Check `src/lib/icons.js` — the `gadget: Gift` entry in `MATERIALE_ICONS` and `ADMIN_ICONS` is still used by the product type filter UI. Keep it. No cleanup needed unless `ADMIN_ICONS.gadget` is no longer referenced (the admin nav item was removed). If the only reference was `Sidebar.jsx`, remove `gadget: Gift` from `ADMIN_ICONS`.

- [ ] **Step 8: Delete the files**

```bash
rm src/components/materiale/GadgetRequestForm.jsx
rm src/components/materiale/GadgetCard.jsx
rm src/hooks/useGadgets.js
rm src/pages/admin/AdminGadget.jsx
```

- [ ] **Step 9: Verify build**

```bash
npm run build
```
Expected: exit 0, no import errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: remove gadget-specific files (unified into product catalog)"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full build**

```bash
npm run build
```

- [ ] **Step 2: Verify no stale references**

```bash
grep -r "gadget" src/ --include="*.jsx" --include="*.js" -l
```

Expected: only `icons.js` (the `gadget: Gift` icon mapping is still valid — it's used by `TIPO_PRODOTTO` filter UI).

- [ ] **Step 3: Dev server smoke test**

```bash
npm run dev
```

Verify:
1. Navigate to any event → Materiale tab
2. Product cards for gadgets show stock badge ("Disp: N" or "Scorte basse: N")
3. Product modal for gadgets shows "Giacenza" instead of "Disponibilita fisica"
4. "Conferma" button on pending row opens inline form with stepper
5. Stepper allows reducing quantity (min 1, max = requested)
6. Partial approval shows yellow "Approvato parziale" badge + crossed-out quantity
7. Bulk "Conferma tutto" works (approves all at full quantity)
8. Modifying approved row quantity restores stock and resets to pending
9. Deleting approved gadget row restores stock
10. No "Gadget" section below material list (unified)
11. Admin sidebar has no "Gadget" nav item
12. `/admin/gadget` route no longer exists

---

## Summary

| Task | Files | What |
|------|-------|------|
| 1 | 2 new SQL | Migrations: enum extension + schema + data migration |
| 2 | 1 modified | Store: confirmMaterialRow + restoreGadgetStock + join update |
| 3 | 1 modified | Constants: TIPO_PRODOTTO + gadget, TIPO_BRAND + fornitore, remove gadget enum |
| 4 | 1 modified | MaterialListRow: inline confirm form with stepper + partial badge |
| 5 | 1 modified | EventMaterialList: partial confirm handler, stock restore, remove gadgets |
| 6 | 2 modified | CatalogProductCard + Modal: stock badge + gadget availability |
| 7 | 4 deleted, 3 modified | Delete gadget files, clean up App/Sidebar/useAdmin |
| 8 | 0 | Final verification |

**Total:** 2 new SQL, 8 modified, 4 deleted
