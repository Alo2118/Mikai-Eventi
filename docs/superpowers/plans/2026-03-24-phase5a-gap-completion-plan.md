# Phase 5A Gap Completion — Implementation Plan

**Date:** 2026-03-24
**Spec:** `docs/superpowers/specs/2026-03-24-phase5a-gap-completion-design.md`
**Estimated tasks:** 17 tasks, ~30-60 min each

---

## Group A: Template Admin Enhancements (Feature 4)

### Task 1: VERIFICATION_FUNCTIONS shape change + constants update

**What:** Change `VERIFICATION_FUNCTIONS` in constants.js from `key -> string` to `key -> { label, desc }`. This is a prerequisite for the enhanced dropdown in AdminTemplate.

**Files to modify:**
- `src/lib/constants.js`

**Code changes:**
```js
// FROM:
export const VERIFICATION_FUNCTIONS = {
  lista_materiale_compilata: 'Lista materiale compilata',
  // ...
}

// TO:
export const VERIFICATION_FUNCTIONS = {
  lista_materiale_compilata: {
    label: 'Lista materiale compilata',
    desc: 'Almeno un prodotto nella lista materiale evento',
  },
  materiale_tutto_confermato: {
    label: 'Materiale tutto confermato',
    desc: 'Tutti i prodotti in lista hanno stato "approvato"',
  },
  indirizzo_spedizione_specificato: {
    label: 'Indirizzo spedizione specificato',
    desc: 'Il campo indirizzo spedizione evento non e vuoto',
  },
  titolo_orario_definitivi: {
    label: 'Titolo e orario definitivi',
    desc: 'Titolo, data inizio e data fine sono tutti compilati',
  },
  materiale_tutto_preparato: {
    label: 'Materiale tutto preparato',
    desc: 'Nessun prodotto in stato "richiesto" o "approvato" (tutti almeno in_preparazione)',
  },
  materiale_tutto_spedito: {
    label: 'Materiale tutto spedito',
    desc: 'Ogni materiale fisico ha un movimento di uscita registrato',
  },
}
```

**Dependencies:** None
**Verification:** `npm run build` — confirm no breakage. Search all consumers of `VERIFICATION_FUNCTIONS`: only `AdminTemplate.jsx` references the values (Task 2 will update it). `useActivities.js` `runAutoVerifications` uses only keys, not values — no change needed.

---

### Task 2: AdminTemplate — circular dependency validation + enhanced dependency picker

**What:** Add `wouldCreateCycle()` helper function to AdminTemplate. Update the "Dipende da" `<select>` to call the cycle check on change, disable cyclic options, show hint text on the FormField.

**Files to modify:**
- `src/pages/admin/AdminTemplate.jsx`

**Code changes:**

1. Add helper function before the component:
```js
function wouldCreateCycle(itemId, targetId, allItems) {
  if (!itemId || !targetId) return false
  const visited = new Set()
  let current = targetId
  while (current) {
    if (current === itemId) return true
    if (visited.has(current)) return false
    visited.add(current)
    const item = allItems.find(i => i.id === current)
    current = item?.dipende_da || null
  }
  return false
}
```

2. Replace the "Dipende da" `<FormField>` section (~line 339-353) with enhanced version:
   - Add `hint` prop: `"L'attivita non puo iniziare finche la dipendenza non e completata"`
   - In `onChange`: call `wouldCreateCycle(editing?.id, newValue, items)`. If true, show toast warning and return without updating form.
   - Each `<option>`: compute `isCyclic` and set `disabled={isCyclic}`. Append `[circolare]` to label text and deadline info `(Xgg)`.

3. Also update the `VERIFICATION_FUNCTIONS` dropdown (~line 323-335) to use `v.label` instead of `v` and show `v.desc` below the select when a function is selected.

**Dependencies:** Task 1 (constants shape change)
**Verification:** Open AdminTemplate in browser. Select a template with items. Edit an item, try to set "Dipende da" to create a cycle A->B->A. Confirm toast warning appears and selection is not saved.

---

### Task 3: AdminTemplate — tipo_verifica segmented control

**What:** Replace the `tipo_verifica` plain `<select>` with a segmented button control showing two options (Manuale/Automatica) with descriptions. Much clearer UX for admins.

**Files to modify:**
- `src/pages/admin/AdminTemplate.jsx`

**Code changes:**
Replace the tipo_verifica `<FormField>` (currently a `<select>` at ~line 311-320) with:
```jsx
<FormField label="Tipo verifica">
  <div className="flex gap-2">
    {[
      { value: 'manuale', label: 'Manuale', desc: 'Un responsabile segna il completamento' },
      { value: 'automatica', label: 'Automatica', desc: 'Il sistema verifica in base ai dati' },
    ].map(opt => (
      <button
        key={opt.value}
        type="button"
        onClick={() => setForm(f => ({ ...f, tipo_verifica: opt.value }))}
        className={`flex-1 px-4 py-3 rounded-lg border-2 text-left min-h-[48px] transition-all ${
          form.tipo_verifica === opt.value
            ? 'border-mikai-400 bg-mikai-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <p className="font-medium text-base">{opt.label}</p>
        <p className="text-sm text-gray-500 mt-0.5">{opt.desc}</p>
      </button>
    ))}
  </div>
</FormField>
```

Remove the old `<select>` for tipo_verifica from the grid. This field should be full-width (outside the 2-col grid), placed between the obbligatorio grid and the verifica_automatica section.

**Dependencies:** None (can run parallel with Task 2)
**Verification:** Open AdminTemplate, edit an item. Confirm two clickable cards for Manuale/Automatica with descriptions. Active state shows mikai border + bg.

---

### Task 4: AdminTemplate — topological sort + dependency chain visualization

**What:** Add `topologicalSort()` helper to sort template items so dependents appear after their parents. Items with `dipende_da` render with left indent and "Dopo: [parent descrizione]" label.

**Files to modify:**
- `src/pages/admin/AdminTemplate.jsx`

**Code changes:**

1. Add helper before component:
```js
function topologicalSort(items) {
  const sorted = []
  const visited = new Set()
  const itemMap = new Map(items.map(i => [i.id, i]))
  function visit(item) {
    if (visited.has(item.id)) return
    visited.add(item.id)
    if (item.dipende_da && itemMap.has(item.dipende_da)) {
      visit(itemMap.get(item.dipende_da))
    }
    sorted.push(item)
  }
  items.forEach(i => visit(i))
  return sorted
}

function getDepthLevel(item, items, maxDepth = 3) {
  let depth = 0
  let current = item
  while (current.dipende_da && depth < maxDepth) {
    depth++
    current = items.find(i => i.id === current.dipende_da) || { dipende_da: null }
  }
  return depth
}
```

2. In the items list rendering (~line 192-231), replace `items.map(...)` with `topologicalSort(items).map(...)`.

3. For each item, compute `depthLevel = getDepthLevel(item, items)`. Apply `ml-${depthLevel * 8}` (capped at ml-24) to the item card wrapper.

4. When `item.dipende_da`, show below the categoria line:
```jsx
{item.dipende_da && (
  <span className="text-gray-400 text-sm">
    <Icon icon={ACTION_ICONS.arrowRight} size={12} className="inline mr-1" />
    Dopo: {items.find(i => i.id === item.dipende_da)?.descrizione || 'Dipendenza rimossa'}
  </span>
)}
```

5. Handle orphaned dependency: if `dipende_da` references a non-existent item, show "Dipendenza rimossa" in red text.

**Dependencies:** None (can run parallel with Tasks 2-3)
**Verification:** Open AdminTemplate, select a template with dependencies. Confirm items are sorted parent-before-child, dependents are indented, and "Dopo:" labels are visible.

---

## Group B: Material Position UI (Feature 5)

### Task 5: NO MIGRATION NEEDED

**Note:** The columns `a_magazzino_id` and `a_utente_id` already exist on `material_movements` (added in migration `20260319100003`). No new migration is required. Tasks 6-7 reference these existing columns directly.

**Dependencies:** None
**Verification:** N/A — columns already exist.

---

### Task 6: useMaterials store — add fetchMagazzini, fetchAgenti, update createMovement

**What:** Add two new lightweight fetch actions for warehouse and agent dropdowns. Modify `createMovement` to include `a_magazzino_id` and `a_utente_id` in the movement payload and refresh materials after insert. The DB trigger `sync_material_position()` automatically updates `materials.posizione_attuale`, `materials.magazzino_id`, and `materials.presso_utente_id` — no client-side position update needed.

**Files to modify:**
- `src/hooks/useMaterials.js`

**Code changes:**

1. Add after `fetchProductAvailability`:
```js
fetchMagazzini: async () => {
  const { data, error } = await supabase
    .from('magazzini')
    .select('*')
    .eq('attivo', true)
    .order('nome')
  return { data: data || [], error: error?.message || null }
},

fetchAgenti: async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, nome, cognome, ruolo')
    .in('ruolo', ['commerciale', 'area_manager'])
    .order('cognome')
  return { data: data || [], error: error?.message || null }
},
```

2. Modify `createMovement` (~line 106-111):
```js
createMovement: async (movement) => {
  // movement payload should include a_magazzino_id and a_utente_id as appropriate
  const { data, error } = await supabase
    .from('material_movements').insert(movement).select().single()
  if (!error) {
    // DB trigger sync_material_position() handles updating materials.posizione_attuale,
    // materials.magazzino_id, and materials.presso_utente_id automatically.
    // Just refresh to pick up the trigger's changes.
    get().fetchMaterials()
  }
  return { data, error: error?.message || null }
},
```

3. Update `fetchMaterials` query (~line 24) to join magazzino and agente:
```js
let query = supabase.from('materials').select(`
  *,
  product:products(id, nome, codice, brand:brands(id, nome)),
  magazzino:magazzini!materials_magazzino_id_fkey(id, nome),
  agente:users!materials_presso_utente_id_fkey(id, nome, cognome)
`).eq('attivo', true).order('nome')
```

4. Update `fetchMaterial` (single, ~line 35-38) with same joins:
```js
const { data, error } = await supabase
  .from('materials').select(`
    *,
    product:products(id, nome, codice, descrizione, brand:brands(id, nome, tipo)),
    magazzino:magazzini!materials_magazzino_id_fkey(id, nome),
    agente:users!materials_presso_utente_id_fkey(id, nome, cognome)
  `).eq('id', id).single()
```

**Dependencies:** None (columns `a_magazzino_id` and `a_utente_id` already exist on `material_movements`)
**Verification:** `npm run build`. Then test in app: navigate to /materiale list and confirm materials load without error. Check console for Supabase query errors.

---

### Task 7: MaterialMovementForm — warehouse and agent selectors

**What:** Add destination position dropdown (full `POSIZIONE_MATERIALE` enum), conditional warehouse selector when `a_posizione === 'in_magazzino'`, and conditional agent selector when `a_posizione === 'magazzino_agente'`.

**Files to modify:**
- `src/components/materiale/MaterialMovementForm.jsx`

**Code changes:**

1. Add imports: `{ POSIZIONE_MATERIALE, SELECT_STYLE }` from constants, `{ FormField }` from ui, `{ useMaterialsStore }` for fetchMagazzini/fetchAgenti.

2. Add local state:
```js
const [magazzini, setMagazzini] = useState([])
const [agenti, setAgenti] = useState([])
const [targetMagazzino, setTargetMagazzino] = useState('')
const [targetUtente, setTargetUtente] = useState('')
const fetchMagazzini = useMaterialsStore(s => s.fetchMagazzini)
const fetchAgenti = useMaterialsStore(s => s.fetchAgenti)
```

3. Add useEffect to load magazzini/agenti on mount:
```js
useEffect(() => {
  fetchMagazzini().then(({ data }) => {
    setMagazzini(data)
    if (data.length > 0) setTargetMagazzino(data[0].id)
  })
  fetchAgenti().then(({ data }) => setAgenti(data))
}, [])
```
(Need to import `useEffect` from react.)

4. Replace the hardcoded `aPos` logic: Add a full position dropdown using `POSIZIONE_MATERIALE` entries between the modalita selector and the rientro date picker. For `tipo === 'rientro'`, default to `'in_magazzino'`. For `tipo === 'uscita'`, default to `'presso_evento'`.

5. Add conditional fields after the position dropdown:
```jsx
{aPos === 'in_magazzino' && magazzini.length > 0 && (
  <FormField label="Magazzino di destinazione" required>
    <select className={SELECT_STYLE} value={targetMagazzino} onChange={e => setTargetMagazzino(e.target.value)} required>
      {magazzini.map(m => (
        <option key={m.id} value={m.id}>{m.nome}{m.indirizzo ? ` — ${m.indirizzo}` : ''}</option>
      ))}
    </select>
  </FormField>
)}
{aPos === 'magazzino_agente' && (
  <FormField label="Agente" required>
    <select className={SELECT_STYLE} value={targetUtente} onChange={e => setTargetUtente(e.target.value)} required>
      <option value="">Seleziona agente...</option>
      {agenti.map(u => (
        <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>
      ))}
    </select>
  </FormField>
)}
```

6. In `handleSubmit`, add `a_magazzino_id` and `a_utente_id` to `baseMovement`:
```js
a_magazzino_id: aPos === 'in_magazzino' ? targetMagazzino : null,
a_utente_id: aPos === 'magazzino_agente' ? targetUtente : null,
```

7. **Dynamic `da_posizione`:** Instead of hardcoding `da_posizione` as `'in_magazzino'` or `'presso_evento'`, read it from the material's current `posizione_attuale`. The material object is available via props or store — use `material.posizione_attuale` as the value for `da_posizione` in the movement payload. This ensures the movement history accurately reflects where the material was before the movement.

**Dependencies:** Task 6 (store actions must exist)
**Verification:** Navigate to a material detail page, click "Registra uscita". Confirm destination dropdown shows all position options. Select "In magazzino" — warehouse dropdown appears. Select "Presso agente" — agent dropdown appears. Submit and verify material position updates in the list.

---

### Task 8: MaterialCard — show warehouse/agent name

**What:** Enhance MaterialCard to show the specific warehouse name or agent name next to the position badge.

**Files to modify:**
- `src/components/materiale/MaterialCard.jsx`

**Code changes:**
After the existing `<StatusBadge>` for posizione_attuale, add:
```jsx
{material.posizione_attuale === 'in_magazzino' && material.magazzino?.nome && (
  <span className="text-xs text-gray-500">({material.magazzino.nome})</span>
)}
{material.posizione_attuale === 'magazzino_agente' && material.agente && (
  <span className="text-xs text-gray-500">
    ({material.agente.cognome} {material.agente.nome})
  </span>
)}
```

Wrap the StatusBadge + these spans in a `<div className="flex items-center gap-1.5 flex-wrap">`.

**Dependencies:** Task 6 (store query must join magazzino/agente)
**Verification:** Navigate to /materiale. Confirm cards for materials in a warehouse show "(Monteviale)" or "(Genova)" next to the badge. Materials with an agent show the agent name.

---

### Task 9: LogisticaInventario — warehouse filter + name display

**What:** Add a warehouse filter dropdown to LogisticaInventario. Show warehouse name in each InventarioCard.

**Files to modify:**
- `src/pages/logistica/LogisticaInventario.jsx`

**Code changes:**

1. Add state: `const [magazzini, setMagazzini] = useState([])`, `const [filterMagazzino, setFilterMagazzino] = useState('')`
2. Fetch magazzini on mount using `useMaterialsStore(s => s.fetchMagazzini)`.
3. Add a `<select>` filter after the existing position filter:
```jsx
<select className={SELECT_STYLE} value={filterMagazzino} onChange={e => setFilterMagazzino(e.target.value)}>
  <option value="">Tutti i magazzini</option>
  {magazzini.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
</select>
```
4. Filter the materials list: when `filterMagazzino` is set, only show materials with matching `magazzino_id`.
5. In `InventarioCard`, show the warehouse name if `material.magazzino?.nome`:
```jsx
{material.magazzino?.nome && (
  <p className="text-xs text-gray-400">{material.magazzino.nome}</p>
)}
```

**Dependencies:** Task 6 (fetchMagazzini action + joined query)
**Verification:** Navigate to Logistica > Inventario. Confirm warehouse filter dropdown appears. Select a warehouse — list filters to materials in that warehouse. Each card shows warehouse name.

---

## Group C: New Icons (Feature 1 + 3 + 5 prerequisite)

### Task 10: Add new icons to icons.js

**What:** Add `sortAsc`, `sortDesc`, `chevronDown`, and `warehouse` icons to the central icon registry. `clipboardCheck` already exists as `checklist`.

**Files to modify:**
- `src/lib/icons.js`

**Code changes:**

1. In the import block, add:
```js
ArrowUpNarrowWide,
ArrowDownWideNarrow,
ChevronDown,
Warehouse,
```

2. In `ACTION_ICONS`, add:
```js
sortAsc: ArrowUpNarrowWide,
sortDesc: ArrowDownWideNarrow,
chevronDown: ChevronDown,
```

3. In `MATERIALE_ICONS`, add:
```js
warehouse: Warehouse,
```

**Dependencies:** None
**Verification:** `npm run build` passes. Icons are available for DataTable and movement form.

---

## Group D: DataTable Component (Feature 1)

### Task 11: DataTable — core component

**What:** Create the reusable `DataTable` component with sorting, row selection, grouping, and responsive column collapse.

**Files to create:**
- `src/components/ui/DataTable.jsx` (max 200 lines)

**Props API:**
```js
{
  columns: [{
    id: string,
    label: string,
    render: (row) => ReactNode,
    sortable?: boolean,
    sortValue?: (row) => any,
    priority?: 1 | 2,   // 1 = always visible, 2 = hidden on mobile
    className?: string,
  }],
  rows: array,
  rowKey: (row) => string,
  selectable?: boolean,
  selectedKeys?: Set,
  onSelectionChange?: (Set) => void,
  groupBy?: (row) => string | null,
  groupLabel?: (groupKey) => string,
  emptyMessage?: string,
  onRowClick?: (row) => void,
  renderExpandedRow?: (row) => ReactNode,  // optional inline expansion (e.g., EventLogisticaTab transport form)
}
```

**Internal state:**
```js
const [sort, setSort] = useState({ columnId: null, direction: null })
const [collapsedGroups, setCollapsedGroups] = useState(new Set())
```

**Key logic:**

1. **Sorting:** Click sortable header cycles: null -> 'asc' -> 'desc' -> null. Sort comparator uses `col.sortValue?.(row) ?? row[col.id]`. Sort applies within each group.

2. **Grouping:** If `groupBy` prop exists, call `groupBy(row)` for each row. Group into `Map<string, row[]>`. Render group header row with toggle + label + count. Skip group separator if only one group.

3. **Selection:** Prepend checkbox column when `selectable`. Header checkbox: select/deselect all visible rows. Group header checkbox: select/deselect within group. `selectedKeys` is `Set<string>` keyed by `rowKey(row)`.

4. **Responsive:** Columns with `priority: 2` get `className="hidden md:table-cell"`. When priority-2 columns exist, import and use `DataTableMobileRow` for mobile rendering.

5. **Expanded row:** If `renderExpandedRow` prop is provided, clicking a row toggles an inline expansion below it. The expanded content is rendered via `renderExpandedRow(row)` in a full-width `<tr><td colSpan>` row. Use case: EventLogisticaTab renders an inline transport detail form when a person row is clicked.

6. **Styling:** `<table className="w-full">`, header `bg-gray-50 text-sm font-medium text-gray-600 uppercase tracking-wide sticky top-0 z-[5]"`, rows `min-h-[48px] border-b border-gray-100 hover:bg-gray-50`, selected row `bg-mikai-50`.

7. **Empty state:** Render `emptyMessage` in a `<tr><td colSpan={cols}>` centered cell.

**Dependencies:** Task 10 (sortAsc/sortDesc icons)
**Verification:** `npm run build`. Component can be smoke-tested by temporarily rendering a DataTable in any existing page with test data.

---

### Task 12: DataTableMobileRow — expandable mobile row

**What:** Create helper component for DataTable's mobile view. Shows priority-1 columns inline; hidden columns expand on tap.

**Files to create:**
- `src/components/ui/DataTableMobileRow.jsx` (max 100 lines)

**Props API:**
```js
{
  row: object,
  columns: array,       // all columns
  visibleColumns: array, // priority 1 columns
  hiddenColumns: array,  // priority 2 columns
  rowKey: string,
  selectable?: boolean,
  selected?: boolean,
  onToggleSelect?: () => void,
  onClick?: () => void,
}
```

**Key logic:**
- Render as `<div>` (not `<tr>`) on mobile, visible only below `md:` breakpoint.
- Show priority-1 columns in a horizontal layout.
- Chevron icon (ACTION_ICONS.chevronDown) rotates 180deg when expanded.
- Expanded section: vertical key-value list of hidden columns `<dl>` with `<dt>` label + `<dd>` rendered value.
- Selection checkbox shown at left if `selectable`.

**Dependencies:** Task 10 (chevronDown icon), Task 11 (consumed by DataTable)
**Verification:** `npm run build`. Resize browser to mobile width — rows should collapse, chevron appears, tap expands hidden data.

---

## Group E: Tab Status Dots + Summary Bars (Feature 2)

### Task 13: EventiDetail — complete tab status calculation

**What:** Extend `computeTabStatus()` in EventiDetail.jsx from 2 tabs to 6 tabs. Add required data fetches for activities, materials, and costs on mount.

**Files to modify:**
- `src/pages/eventi/EventiDetail.jsx`

**Code changes:**

1. Add new imports:
```js
import { useActivitiesStore } from '../../hooks/useActivities'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useCostsStore } from '../../hooks/useCosts'
import { useTavoliStore } from '../../hooks/useTavoli'
```

2. Add new selectors at top of component:
```js
const eventActivities = useActivitiesStore(s => s.eventActivities)
const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)
const tavoli = useTavoliStore(s => s.tavoli)
const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
// For material status, use local state since store doesn't share this naturally
const [eventMaterials, setEventMaterials] = useState([])
const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
const fetchEventPreventivi = useCostsStore(s => s.fetchEventPreventivi)
```

3. Add useEffect for lightweight data fetches (after existing logistics fetch):
```js
useEffect(() => {
  if (event?.id) {
    fetchEventActivities(event.id)
    fetchEventTavoli(event.id)
    fetchEventMaterialList(event.id).then(({ data }) => setEventMaterials(data || []))
    fetchEventPreventivi(event.id)  // sets preventivi in store
  }
}, [event?.id])
```

4. Add `preventivi` selector: `const preventivi = useCostsStore(s => s.preventivi)`

5. Replace `computeTabStatus()` with the full 6-tab version from the spec:
   - **Persone:** green if all staff confirmed + all participants confermato/presente, yellow if some unconfirmed
   - **Tavoli:** green if all participants assigned to a tavolo, yellow if some unassigned (only for tavolo events)
   - **Logistica:** green if all hotels/andata/ritorno confirmed for all people, yellow if some bookings exist
   - **Materiale:** green if all `eventMaterials` approvato, red if any rifiutato, yellow otherwise
   - **Costi:** green if all `preventivi` approvato, red if any rifiutato, yellow otherwise
   - **Preparazione:** green if all visible activities completata, red if any mandatory overdue, yellow otherwise

**Dependencies:** None (all stores already exist)
**Verification:** Navigate to any event detail. Observe colored dots appearing on tabs as data loads. Tabs with no data show no dot. Tabs with all-complete data show green dot.

---

### Task 14: Summary bar — EventTavoliTab

**What:** Add ProgressIndicator summary bar to EventTavoliTab showing "Persone assegnate: X/Y". Summary bars for EventPersoneTab (lines 69-82), EventLogisticaTab (lines 221-248), and EventCostiTab (lines 78-93) already exist and do NOT need to be added again.

**Files to modify:**
- `src/components/eventi/EventTavoliTab.jsx`

**Code changes:**
1. Import `ProgressIndicator` from `'../ui/ProgressIndicator'`.
2. Compute total participants (staff + participants) and count of those assigned to any tavolo.
3. At the top of the component's return, before the tavoli list, add:
```jsx
{tavoli.length > 0 && (
  <div className="mb-4">
    <ProgressIndicator
      label="Persone assegnate"
      current={assignedCount}
      total={totalPeople}
    />
  </div>
)}
```
Where `assignedCount` = number of unique people (discenti + formatori) assigned across all tavoli, and `totalPeople` = total participants + staff.

**Dependencies:** None
**Verification:** Navigate to event > Tavoli tab (for a tavolo-type event). Confirm progress bar shows "Persone assegnate: X/Y" with correct count.

---

### Task 15: Summary bar — EventMaterialList

**What:** Add ProgressIndicator summary bar to EventMaterialList. This is the only tab component still missing a summary bar. EventLogisticaTab (lines 221-248) and EventCostiTab (lines 78-93) already have summary bars and do NOT need changes.

**Files to modify:**
- `src/components/eventi/EventMaterialList.jsx`

**Code changes:**

Import ProgressIndicator. After loading guard, add:
```jsx
{rows.length > 0 && (
  <div className="mb-4">
    <ProgressIndicator
      label="Materiale confermato"
      current={rows.filter(r => r.stato === 'approvato').length}
      total={rows.length}
    />
  </div>
)}
```

**Dependencies:** None
**Verification:** Navigate to event > Materiale tab. Confirm progress bar appears when materials exist and shows correct count. `npm run build` passes.

---

## Group F: EventChecklistView Integration (Feature 3)

### Task 16: EventPersoneTab — checklist mode toggle

**What:** Add a "Checklist presenze" toggle button in EventPersoneTab that swaps to EventChecklistView when clicked. Only visible when event is `pronto` or `in_corso`.

**Files to modify:**
- `src/components/eventi/EventPersoneTab.jsx`

**Code changes:**

1. Add imports:
```js
import { EventChecklistView } from './EventChecklistView'
import { NAV_ICONS } from '../../lib/icons'
```

2. Add local state:
```js
const [checklistMode, setChecklistMode] = useState(false)
```

3. Add toggle button near the tab header (in the actions area, near the existing "Importa" button):
```jsx
{['pronto', 'in_corso'].includes(event.stato) && (
  <Button
    variant={checklistMode ? 'primary' : 'secondary'}
    size="sm"
    onClick={() => setChecklistMode(!checklistMode)}
  >
    <Icon icon={NAV_ICONS.checklist} size={16} className="mr-1" />
    {checklistMode ? 'Gestione persone' : 'Checklist presenze'}
  </Button>
)}
```

4. Wrap the main content in a conditional:
```jsx
{checklistMode ? (
  <EventChecklistView event={event} participants={participants} />
) : (
  // ... existing staff + participant sections
)}
```

**Dependencies:** None (Task 14 now modifies EventTavoliTab, no conflict with EventPersoneTab)
**Verification:** Set an event to stato `in_corso`. Navigate to Persone tab. Confirm "Checklist presenze" button appears. Click it — view switches to checklist. Click "Gestione persone" — switches back. Button does not appear for events in `proposto` or other states.

---

### Task 17: EventChecklistView — ProgressIndicator + Icon cleanup

**What:** Replace the plain text counter with ProgressIndicator. Replace the inline SVG checkmark with Icon component. Optionally group by tavolo if event has tavoli.

**Files to modify:**
- `src/components/eventi/EventChecklistView.jsx`

**Code changes:**

1. Add imports:
```js
import { ProgressIndicator } from '../ui/ProgressIndicator'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { useTavoliStore } from '../../hooks/useTavoli'
```

2. Replace the counter section (~line 38-42):
```jsx
// FROM:
<p className="text-sm font-medium text-gray-700 mt-1">
  {attendees.length} partecipanti · {presenti.length} presenti
</p>

// TO:
<ProgressIndicator label="Presenti" current={presenti.length} total={attendees.length} color="green" />
```

3. Replace inline SVG checkmark (~line 73-78) with:
```jsx
{presente && <Icon icon={ACTION_ICONS.check} size={16} className="text-white" />}
```

4. **Tavolo grouping** (optional within this task — adds ~30 lines):
   - Get tavoli from store: `const tavoli = useTavoliStore(s => s.tavoli)`
   - If tavoli exist, group `filtered` participants by their tavolo assignment.
   - Render group headers: `<h3 className="text-sm font-semibold text-gray-600 mt-4 mb-2">Tavolo {number}</h3>`
   - Unassigned participants go in "Senza tavolo" group at bottom.

5. Add empty state: if `attendees.length === 0`, show `<EmptyState title="Nessun partecipante da registrare" />`

**Dependencies:** Task 16 (must be accessible from EventPersoneTab first)
**Verification:** Toggle checklist mode in Persone tab. Confirm ProgressIndicator bar shows at top. Confirm check icon renders properly (no raw SVG). Toggle presence — bar updates.

---

## Group G: Final Verification

### Task 18: Build verification + integration test

**What:** Run full build, verify no regressions, test all 5 features end-to-end in the browser.

**Files to modify:** None (verification only)

**Verification checklist:**

1. `npm run build` succeeds with zero errors
2. **Feature 1 (DataTable):** Component exists, exports correctly, can be rendered (not yet integrated into existing views — that's incremental per the spec)
3. **Feature 2 (Tab dots):** Open any event detail. All 6 data tabs show colored dots based on data state. Each tab has a summary progress bar at the top.
4. **Feature 3 (Checklist):** Set event to `in_corso`. Open Persone tab. Click "Checklist presenze". Toggle presence for a participant. Confirm toast + bar update.
5. **Feature 4 (Template admin):** Open Admin > Template. Select template. Verify:
   - Items sorted topologically with indentation
   - Edit item: segmented control for tipo_verifica with descriptions
   - Edit item: verifica_automatica shows label + description
   - Edit item: dipende_da blocks circular dependencies
6. **Feature 5 (Material position):** Open material detail. Register movement with destination "In magazzino" — select warehouse. Register with "Presso agente" — select agent. Check MaterialCard shows warehouse/agent name. Check LogisticaInventario shows warehouse filter.

**Dependencies:** All tasks 1-17 (Task 5 is a no-op)
**Verification:** All 6 checks pass. `npm run build` clean.

---

## Task Dependency Graph

```
Note: Task 5 is a no-op (columns already exist). Tasks 6-7 have no migration prerequisite.

Independent (can run in parallel):
  Task 1 → Task 2  (constants → template admin)
  Task 3            (template admin segmented control)
  Task 4            (template admin topological sort)
  Task 6 → Task 7, Task 8, Task 9  (store → form/card/inventario)
  Task 10           (icons)
  Task 11 → Task 12 (DataTable → mobile row)

Sequential:
  Task 10 → Task 11 → Task 12
  Task 1  → Task 2
  Task 6  → Task 7
  Task 6  → Task 8
  Task 6  → Task 9
  Task 13 (tab dots — no hard deps, but touch after group A/B to avoid conflicts)
  Task 14 (EventTavoliTab summary bar — independent)
  Task 15 (EventMaterialList summary bar — independent)
  Task 16 → Task 17 (checklist access → checklist enhancements, Task 16 modifies EventPersoneTab)
  Task 18 (final — after all)

Recommended execution order:
  Batch 1 (parallel): Tasks 1, 3, 4, 6, 10
  Batch 2 (parallel): Tasks 2, 7, 8, 9, 11
  Batch 3 (parallel): Tasks 12, 13, 14, 15
  Batch 4 (sequential): Task 16 → Task 17
  Batch 5: Task 18
```

---

## Files Summary

| Action | File | Tasks |
|--------|------|-------|
| Modify | `src/lib/constants.js` | 1 |
| Modify | `src/lib/icons.js` | 10 |
| Modify | `src/pages/admin/AdminTemplate.jsx` | 2, 3, 4 |
| Modify | `src/hooks/useMaterials.js` | 6 |
| Modify | `src/components/materiale/MaterialMovementForm.jsx` | 7 |
| Modify | `src/components/materiale/MaterialCard.jsx` | 8 |
| Modify | `src/pages/logistica/LogisticaInventario.jsx` | 9 |
| Create | `src/components/ui/DataTable.jsx` | 11 |
| Create | `src/components/ui/DataTableMobileRow.jsx` | 12 |
| Modify | `src/pages/eventi/EventiDetail.jsx` | 13 |
| Modify | `src/components/eventi/EventTavoliTab.jsx` | 14 |
| Modify | `src/components/eventi/EventMaterialList.jsx` | 15 |
| Modify | `src/components/eventi/EventPersoneTab.jsx` | 16 |
| Modify | `src/components/eventi/EventChecklistView.jsx` | 17 |
