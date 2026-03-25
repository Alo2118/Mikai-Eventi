# Tavoli Corso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add workstation tables (tavoli) to surgical courses — each table groups formatori, discenti, and products, with bulk assignment and auto-distribution.

**Architecture:** 4 new DB tables (event_tavoli + 3 junction tables), a dedicated Zustand store (useTavoli), two new UI components (EventTavoliTab + TavoloCard), and integration into EventiDetail as a conditional tab for corso/cadaver_lab events.

**Tech Stack:** React 19, Zustand 5, Supabase 2, TailwindCSS v4, lucide-react icons via centralized system.

**Spec:** `docs/superpowers/specs/2026-03-20-tavoli-corso-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260320150000_tavoli_corso.sql` | 4 tables + RLS |
| Modify | `src/lib/constants.js` | Add `TIPI_EVENTO_CON_TAVOLI` |
| Modify | `src/lib/icons.js` | Add `LayoutGrid` import + `TAVOLI_ICONS` |
| Create | `src/hooks/useTavoli.js` | Zustand store with all tavoli CRUD actions |
| Create | `src/components/eventi/TavoloCard.jsx` | Individual table card with formatori/materiale/discenti |
| Create | `src/components/eventi/EventTavoliTab.jsx` | Tab component: create tavoli, bulk assign, distribute |
| Modify | `src/pages/eventi/EventiDetail.jsx` | Add conditional "Tavoli" tab |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260320150000_tavoli_corso.sql`

- [ ] **Step 1: Write migration**

```sql
-- Tavoli Corso: workstation tables for surgical courses
-- Links formatori (staff), discenti (participants), and products to tables within an event

-- 1. Main tavoli table
CREATE TABLE event_tavoli (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  numero int NOT NULL,
  nome text,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, numero)
);

-- 2. Formatori per tavolo (from event_staff)
CREATE TABLE event_tavoli_formatori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tavolo_id uuid NOT NULL REFERENCES event_tavoli(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES event_staff(id) ON DELETE CASCADE,
  UNIQUE(tavolo_id, staff_id)
);

-- 3. Discenti per tavolo (from event_participants)
CREATE TABLE event_tavoli_discenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tavolo_id uuid NOT NULL REFERENCES event_tavoli(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
  UNIQUE(tavolo_id, participant_id),
  UNIQUE(participant_id) -- one table per discente per event (safe: participant_id is event-scoped)
);

-- 4. Materiale (products) per tavolo
CREATE TABLE event_tavoli_materiale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tavolo_id uuid NOT NULL REFERENCES event_tavoli(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  note text,
  UNIQUE(tavolo_id, product_id)
);

-- Indexes
CREATE INDEX idx_event_tavoli_event ON event_tavoli(event_id);
CREATE INDEX idx_tavoli_formatori_tavolo ON event_tavoli_formatori(tavolo_id);
CREATE INDEX idx_tavoli_discenti_tavolo ON event_tavoli_discenti(tavolo_id);
CREATE INDEX idx_tavoli_materiale_tavolo ON event_tavoli_materiale(tavolo_id);

-- RLS
ALTER TABLE event_tavoli ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tavoli_formatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tavoli_discenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tavoli_materiale ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated
CREATE POLICY "event_tavoli_read" ON event_tavoli FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_tavoli_formatori_read" ON event_tavoli_formatori FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_tavoli_discenti_read" ON event_tavoli_discenti FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_tavoli_materiale_read" ON event_tavoli_materiale FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write: gestione_staff_evento permission
CREATE POLICY "event_tavoli_write" ON event_tavoli FOR ALL USING (has_permission('gestione_staff_evento'));
CREATE POLICY "event_tavoli_formatori_write" ON event_tavoli_formatori FOR ALL USING (has_permission('gestione_staff_evento'));
CREATE POLICY "event_tavoli_discenti_write" ON event_tavoli_discenti FOR ALL USING (has_permission('gestione_staff_evento'));
CREATE POLICY "event_tavoli_materiale_write" ON event_tavoli_materiale FOR ALL USING (has_permission('gestione_staff_evento'));
```

- [ ] **Step 2: Push migration**

```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260320150000_tavoli_corso.sql
git commit -m "feat: add tavoli corso tables — event_tavoli + formatori/discenti/materiale junction tables"
```

---

## Task 2: Constants and Icons

**Files:**
- Modify: `src/lib/constants.js`
- Modify: `src/lib/icons.js`

- [ ] **Step 1: Add TIPI_EVENTO_CON_TAVOLI to constants.js**

Add after the `MEZZO_TRASPORTO` block:

```js
// Tipi evento che usano i tavoli
export const TIPI_EVENTO_CON_TAVOLI = ['corso', 'cadaver_lab']
```

- [ ] **Step 2: Add LayoutGrid icon and TAVOLI_ICONS to icons.js**

Add `LayoutGrid` to the lucide-react import. Then add:

```js
// ═══════════════════════════════════════════
// Tavoli
// ═══════════════════════════════════════════
export const TAVOLI_ICONS = {
  tavoli: LayoutGrid,
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.js src/lib/icons.js
git commit -m "feat: add TIPI_EVENTO_CON_TAVOLI constant and TAVOLI_ICONS"
```

---

## Task 3: useTavoli Store

**Files:**
- Create: `src/hooks/useTavoli.js`

- [ ] **Step 1: Create the store**

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useTavoliStore = create((set, get) => ({
  tavoli: [],
  loading: false,

  fetchEventTavoli: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_tavoli')
      .select(`
        *,
        formatori:event_tavoli_formatori(*, staff:event_staff(*, user:users(id, nome, cognome))),
        discenti:event_tavoli_discenti(*, participant:event_participants(*, contact:contacts(id, nome, cognome, azienda))),
        materiale:event_tavoli_materiale(*, product:products(id, nome, codice))
      `)
      .eq('event_id', eventId)
      .order('numero')
    set({ tavoli: data || [], loading: false })
    return { data, error }
  },

  createTavoli: async (eventId, count) => {
    // Find max existing numero
    const existing = get().tavoli.filter(t => t.event_id === eventId)
    const maxNumero = existing.length > 0 ? Math.max(...existing.map(t => t.numero)) : 0
    const rows = Array.from({ length: count }, (_, i) => ({
      event_id: eventId,
      numero: maxNumero + i + 1,
    }))
    const { data, error } = await supabase
      .from('event_tavoli')
      .insert(rows)
      .select()
    if (!error) get().fetchEventTavoli(eventId)
    return { data, error: error?.message || null }
  },

  updateTavolo: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_tavoli')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) set(s => ({ tavoli: s.tavoli.map(t => t.id === id ? { ...t, ...data } : t) }))
    return { data, error: error?.message || null }
  },

  removeTavolo: async (id) => {
    const { error } = await supabase.from('event_tavoli').delete().eq('id', id)
    if (!error) set(s => ({ tavoli: s.tavoli.filter(t => t.id !== id) }))
    return { error: error?.message || null }
  },

  addFormatore: async (tavoloId, staffId, eventId) => {
    const { error } = await supabase
      .from('event_tavoli_formatori')
      .insert({ tavolo_id: tavoloId, staff_id: staffId })
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  removeFormatore: async (id, eventId) => {
    const { error } = await supabase.from('event_tavoli_formatori').delete().eq('id', id)
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  addDiscente: async (tavoloId, participantId, eventId) => {
    const { error } = await supabase
      .from('event_tavoli_discenti')
      .insert({ tavolo_id: tavoloId, participant_id: participantId })
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  removeDiscente: async (id, eventId) => {
    const { error } = await supabase.from('event_tavoli_discenti').delete().eq('id', id)
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  assignProductToAllTavoli: async (eventId, productIds) => {
    // Fetch current state to know what's already assigned
    const tavoli = get().tavoli.filter(t => t.event_id === eventId)
    const rows = []
    for (const tavolo of tavoli) {
      const existingProductIds = new Set((tavolo.materiale || []).map(m => m.product_id))
      for (const pid of productIds) {
        if (!existingProductIds.has(pid)) {
          rows.push({ tavolo_id: tavolo.id, product_id: pid })
        }
      }
    }
    if (rows.length === 0) return { data: null, error: null }
    const { data, error } = await supabase
      .from('event_tavoli_materiale')
      .insert(rows)
      .select()
    if (!error) get().fetchEventTavoli(eventId)
    return { data, error: error?.message || null }
  },

  removeProduct: async (id, eventId) => {
    const { error } = await supabase.from('event_tavoli_materiale').delete().eq('id', id)
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  distributeDiscenti: async (eventId) => {
    const tavoli = get().tavoli.filter(t => t.event_id === eventId)
    if (tavoli.length === 0) return { error: 'Nessun tavolo presente' }

    // Find already-assigned participant IDs
    const assignedIds = new Set()
    for (const t of tavoli) {
      for (const d of (t.discenti || [])) {
        assignedIds.add(d.participant_id)
      }
    }

    // Fetch all discenti for this event
    const { data: allParticipants, error: fetchError } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('tipo', 'discente')
    if (fetchError) return { error: fetchError.message }

    const unassigned = (allParticipants || []).filter(p => !assignedIds.has(p.id))
    if (unassigned.length === 0) return { data: null, error: null }

    // Round-robin: assign to tavolo with fewest discenti
    const counts = tavoli.map(t => ({ id: t.id, count: (t.discenti || []).length }))
    const rows = []
    for (const participant of unassigned) {
      // Find tavolo with fewest
      counts.sort((a, b) => a.count - b.count)
      rows.push({ tavolo_id: counts[0].id, participant_id: participant.id })
      counts[0].count++
    }

    const { data, error } = await supabase
      .from('event_tavoli_discenti')
      .insert(rows)
      .select()
    if (!error) get().fetchEventTavoli(eventId)
    return { data, error: error?.message || null }
  },
}))
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTavoli.js
git commit -m "feat: add useTavoliStore — CRUD for tavoli, formatori, discenti, materiale with bulk actions"
```

---

## Task 4: TavoloCard Component

**Files:**
- Create: `src/components/eventi/TavoloCard.jsx`

- [ ] **Step 1: Create TavoloCard**

Individual card for one tavolo. Shows 3 sections (formatori, materiale, discenti) with add/remove.

**Props:**
- `tavolo` — the tavolo object with nested formatori, discenti, materiale
- `eventId` — for store action calls
- `availableStaff` — staff NOT already assigned to THIS tavolo
- `availableProducts` — products available for assignment
- `availableDiscenti` — participants with tipo='discente' NOT assigned to ANY tavolo
- `canEdit` — boolean

**Key behavior:**
- Each section has a `<select>` dropdown + "+" button to add
- Each item has an "x" button to remove (with the item id)
- Card header shows `Tavolo {numero}` + optional editable nome + delete button
- Note field at the bottom

The component calls store actions directly: `addFormatore`, `removeFormatore`, `addDiscente`, `removeDiscente`, `removeProduct` (all from useTavoliStore, passing eventId).

For adding materiale to a single tavolo, use direct supabase insert through the store — add an inline handler that calls `supabase.from('event_tavoli_materiale').insert(...)` via a helper, or add a simple `addProduct(tavoloId, productId, eventId)` action to the store (not in spec but needed for per-card add).

**Important:** keep under 200 lines. The three sections (formatori, materiale, discenti) follow the same pattern — extract a small internal `AssignmentSection` helper.

```jsx
// Internal helper for each section
function AssignmentSection({ title, items, renderItem, options, optionLabel, onAdd, onRemove, canEdit }) {
  const [selected, setSelected] = useState('')
  // ... select + add button + list with remove buttons
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/TavoloCard.jsx
git commit -m "feat: add TavoloCard — individual workstation card with formatori/materiale/discenti"
```

---

## Task 5: EventTavoliTab Component

**Files:**
- Create: `src/components/eventi/EventTavoliTab.jsx`

- [ ] **Step 1: Create EventTavoliTab**

Main tab component. Orchestrates tavoli creation, bulk assignment, distribution.

**Props:** `event`, `staff` (from useStaffStore), `participants` (from useParticipantsStore)

**Layout:**
- Header: "Tavoli" + count + 3 action buttons
- Grid of TavoloCard components

**Action buttons:**
1. **"Crea tavoli"** — shows a small inline form: `<input type="number" min="1" max="10">` + "Crea" button. Calls `createTavoli(eventId, count)`.
2. **"Assegna kit a tutti"** — opens a multi-select of products (from `event_materials` for this event, joined to products). Selected products get assigned to ALL tavoli via `assignProductToAllTavoli`. If no event_materials exist, show products directly from catalog.
3. **"Distribuisci discenti"** — calls `distributeDiscenti(eventId)`. Shows count of unassigned discenti on the button.

**Computed props for TavoloCard:**
- `availableStaff`: all event staff, filtered to exclude those already on THIS tavolo
- `availableProducts`: products from event_materials or catalog, filtered to exclude those already on THIS tavolo
- `availableDiscenti`: participants with tipo='discente', filtered to exclude those assigned to ANY tavolo (using all tavoli's discenti lists)

**Empty state:** "Nessun tavolo configurato" + "Crea tavoli" CTA.

**Product picker for "Assegna kit a tutti":** Fetch products from `event_materials` joined to `products` for this event. If no event_materials, fetch all active products. Show as checkbox list in a small modal/dropdown.

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/EventTavoliTab.jsx
git commit -m "feat: add EventTavoliTab — tavoli management with bulk product assign and auto-distribute"
```

---

## Task 6: Integration in EventiDetail

**Files:**
- Modify: `src/pages/eventi/EventiDetail.jsx`

- [ ] **Step 1: Add imports and conditional tab**

1. Add imports:
```js
import { EventTavoliTab } from '../../components/eventi/EventTavoliTab'
import { TIPI_EVENTO_CON_TAVOLI } from '../../lib/constants'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
```

2. In `getVisibleTabs`, add the tavoli tab conditionally AFTER `persone` and BEFORE `programma`:
```js
tabs.push({ id: 'persone', label: 'Persone' })
if (TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento)) {
  tabs.push({ id: 'tavoli', label: 'Tavoli' })
}
tabs.push({ id: 'programma', label: 'Programma' })
```

3. In the component body, get staff and participants from stores (they may already be fetched by PersoneTab):
```js
const staff = useStaffStore(s => s.staff)
const participants = useParticipantsStore(s => s.participants)
```

4. Add the tab content rendering:
```jsx
{activeTab === 'tavoli' && <EventTavoliTab event={event} staff={staff} participants={participants} />}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Manual test**

1. Open the Corso MMC Monteviale event
2. Verify "Tavoli" tab appears (it's a corso)
3. Click "Crea tavoli" → enter 4 → creates Tavolo 1-4
4. Assign formatori to each tavolo
5. "Assegna kit a tutti" → select 4 products → all tavoli get them
6. "Distribuisci discenti" → 21 discenti distributed ~5 per tavolo
7. Open a congresso event → verify "Tavoli" tab does NOT appear

- [ ] **Step 4: Commit**

```bash
git add src/pages/eventi/EventiDetail.jsx
git commit -m "feat: integrate Tavoli tab in EventiDetail — conditional for corso/cadaver_lab"
```

---

## Task 7: Build Verification

- [ ] **Step 1: Final build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 2: End-to-end test with Corso MMC data**

1. Open Corso MMC Monteviale → tab Tavoli
2. "Crea 4 tavoli"
3. Assign Paolo Montresor as formatore to Tavolo 1, Alberto Abbiati to Tavolo 2, etc.
4. "Assegna kit a tutti" → select the demo kits
5. "Distribuisci discenti" → 21 discenti spread across 4 tavoli (5-5-5-6)
6. Verify each card shows the correct assignments
