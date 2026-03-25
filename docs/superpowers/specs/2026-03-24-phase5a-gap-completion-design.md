# Phase 5A — Completamento Gap Interni — Design Spec

**Date:** 2026-03-24
**Status:** Draft
**Context:** The design system spec (2026-03-23) defined 12 components and patterns. Block 1 (Modal, FormField, StatusPill, ProgressIndicator, ActionToolbar, FilterBar, FilterSelect, ChipFilter) was implemented. Block 2 items (DataTable, summary bars wired into tabs, EventChecklistView integration) and two admin/material gaps remain unbuilt. This spec closes those gaps with 5 focused features.

**Prerequisite reading:**
- `docs/superpowers/specs/2026-03-23-design-system-spec.md` (original design system spec)
- `docs/superpowers/specs/2026-03-19-readiness-engine-design.md` (readiness engine, magazzini)
- `docs/superpowers/plans/2026-03-23-phase5a-readiness-completion-plan.md` (what was planned)

---

## Feature 1: DataTable Component

### Problem

The app has 5+ operational tables built ad-hoc (EventLogisticaTab, ContattiList, LogisticaTimeline, LogisticaMatrice, LogisticaRientri). Each implements its own selection, grouping, and mobile patterns. The design system spec (section 1.5) defined a reusable `DataTable` but it was not implemented.

AdminTable exists for simple CRUD admin screens and is NOT being replaced. DataTable targets operational views with selection, grouping, sorting, and mobile collapse.

### Component API

**File:** `src/components/ui/DataTable.jsx` (main, <=200 lines)
**File:** `src/components/ui/DataTableMobileRow.jsx` (expandable mobile row)

```jsx
<DataTable
  columns={[
    {
      id: 'nome',
      label: 'Persona',
      render: (row) => <span>{row.cognome} {row.nome}</span>,
      sortable: true,
      priority: 1,          // 1 = always visible, 2 = hidden on mobile (expandable)
    },
    {
      id: 'hotel',
      label: 'Hotel',
      render: (row) => <StatusPill ... />,
      priority: 2,
    },
  ]}
  rows={people}
  rowKey={row => `${row.type}-${row.id}`}
  selectable={canEdit}
  selectedKeys={selected}
  onSelectionChange={setSelected}
  groupBy={groupConfig}
  groupLabel={(groupKey) => `Tavolo ${groupKey}`}
  emptyMessage="Nessuna persona"
  onRowClick={(row) => navigate(`/contatti/${row.id}`)}
/>
```

### Column Definition Schema

```js
{
  id: string,           // unique key, used for sort state
  label: string,        // header text (Italian)
  render: (row) => ReactNode,  // cell renderer
  sortable?: boolean,   // default false, enables click-to-sort on header
  sortValue?: (row) => any,    // custom sort value extractor (default: row[id])
  priority?: 1 | 2,     // 1 = always visible, 2 = collapse on mobile (default: 1)
  className?: string,    // additional header/cell class (e.g., 'w-40' for fixed width)
}
```

### Sorting (client-side)

- Click column header toggles: ascending -> descending -> none
- Visual indicator: up/down chevron icon from `ACTION_ICONS` (add `sortAsc` and `sortDesc` to `icons.js`)
- Sort state: `{ columnId, direction: 'asc' | 'desc' | null }` stored in component local state
- Sort applies after grouping (items sorted within each group)
- Only columns with `sortable: true` respond to header clicks

### Row Selection

- `selectable` prop enables checkbox column (prepended as first column)
- Header checkbox: select all / deselect all (within current group if grouped)
- `selectedKeys` is a `Set<string>` managed externally (parent owns state)
- `onSelectionChange(newSet)` called on every toggle
- Selected row: `bg-mikai-50` highlight
- Checkbox: 24px size, `min-h-[48px]` row height, `accent-mikai-400`

### Grouping

- `groupBy` prop: a function `(row) => string | null` that returns group key
- `groupLabel` prop: `(groupKey) => string` for display
- Group separator: full-width row with `bg-gray-50`, bold label, item count, collapsible (click to toggle)
- Group header has its own select-all checkbox when `selectable` is true
- Groups default to expanded

### Mobile Responsive Collapse

- Columns with `priority: 2` are hidden below `md:` breakpoint
- When hidden columns exist, each row gets an expand/collapse toggle (chevron icon)
- Expanded state shows hidden columns as a vertical key-value list below the row
- Implementation in `DataTableMobileRow.jsx` (separate file, <100 lines)

### Styling

- Table: `w-full` with `border-collapse`
- Header: `bg-gray-50 text-sm font-medium text-gray-600 uppercase tracking-wide`
- Rows: `min-h-[48px] border-b border-gray-100 hover:bg-gray-50 transition-colors`
- No outer border (fits inside card containers that provide their own border)
- Sticky header: `sticky top-0 z-[5]` (below ActionToolbar z-10)

### Integration Points

| Consumer | columns | selectable | groupBy |
|----------|---------|-----------|---------|
| EventLogisticaTab | nome, tavolo, hotel, andata, ritorno | yes (existing bulk modals) | tavolo/tipo/zona |
| ContattiList | cognome+nome, tipo, azienda, zona | no (initially) | tipo |
| LogisticaTimeline | evento, materiale, stato, indirizzo | no | evento |
| LogisticaRientri | materiale, evento, data_rientro, stato | no | none |
| LogisticaInventario | nome, codice, posizione, magazzino | no | posizione |

Migration is incremental: DataTable is introduced in new views first, then migrates existing tables one at a time without breaking existing code.

### Edge Cases

- **Zero rows:** Renders `emptyMessage` in a centered cell spanning all columns
- **Single group:** Renders without group separator (skip when only one group exists)
- **No columns with priority 1:** At least the first column is always visible on mobile
- **Very long text:** Cells use `truncate` by default; `render` can override with custom layout
- **Keyboard:** Tab navigates checkboxes; Enter/Space toggles selection

---

## Feature 2: Tab Status Dots + Summary Bars

### Problem

The `Tabs` component already supports a `status` prop with colored dots (implemented in Block 1). The `ProgressIndicator` component exists and works. However:

1. `computeTabStatus()` in `EventiDetail.jsx` only calculates `persone` and `logistica` status — missing `costi`, `materiale`, `preparazione`, and `tavoli`
2. Summary bars are missing from Materiale and Tavoli tabs only. Persone (EventPersoneTab lines 69-82), Logistica (EventLogisticaTab lines 221-248), and Costi (EventCostiTab lines 78-93) already have ProgressIndicator bars.
3. The status calculation is incomplete and uses naive heuristics

### 2A: Complete Tab Status Calculation

**File:** `src/pages/eventi/EventiDetail.jsx` — modify `computeTabStatus()`

Current implementation computes status for 2 tabs. Extend to all 6 data tabs:

```js
function computeTabStatus() {
  const statuses = {}

  // ── Persone ──────────────────────────────────────
  if (staff.length > 0 || participants.length > 0) {
    const staffOk = staff.length === 0 || staff.every(s => s.confermato)
    const partOk = participants.length === 0 || participants.every(p =>
      ['confermato', 'presente'].includes(p.stato_iscrizione)
    )
    statuses.persone = (staffOk && partOk) ? 'complete' : 'warning'
  }

  // ── Tavoli ───────────────────────────────────────
  // Requires tavoli store data (add selector in EventiDetail)
  if (TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento)) {
    if (tavoli.length > 0) {
      const allAssigned = participants.every(p =>
        tavoli.some(t =>
          t.discenti?.some(d => d.participant_id === p.id) ||
          t.formatori?.some(f => f.staff_id === p.id)
        )
      )
      statuses.tavoli = allAssigned ? 'complete' : 'warning'
    }
  }

  // ── Logistica ────────────────────────────────────
  const totalPeople = staff.length + participants.length
  if (totalPeople > 0) {
    const hotelDone = hotels.filter(h => h.stato === 'confermato').length
    const andataDone = trasporti.filter(t => t.direzione === 'andata' && t.stato === 'confermato').length
    const ritornoDone = trasporti.filter(t => t.direzione === 'ritorno' && t.stato === 'confermato').length
    const allDone = hotelDone >= totalPeople && andataDone >= totalPeople && ritornoDone >= totalPeople
    const anyStarted = hotels.length > 0 || trasporti.length > 0
    statuses.logistica = allDone ? 'complete' : anyStarted ? 'warning' : undefined
  }

  // ── Materiale ────────────────────────────────────
  // Requires eventMaterials data (add fetch + selector in EventiDetail)
  if (eventMaterials.length > 0) {
    const allConfirmed = eventMaterials.every(m => ['approvato', 'in_preparazione'].includes(m.stato))
    const anyRejected = eventMaterials.some(m => m.stato === 'rifiutato')
    statuses.materiale = allConfirmed ? 'complete' : anyRejected ? 'incomplete' : 'warning'
  }

  // ── Costi ────────────────────────────────────────
  // Requires preventivi data (add fetch + selector in EventiDetail)
  if (preventivi.length > 0) {
    const allApproved = preventivi.every(q => q.stato === 'approvato')
    const anyRejected = preventivi.some(q => q.stato === 'rifiutato')
    statuses.costi = allApproved ? 'complete' : anyRejected ? 'incomplete' : 'warning'
  }

  // ── Preparazione ─────────────────────────────────
  // Requires eventActivities data (already available in useActivitiesStore)
  if (eventActivities.length > 0) {
    const visible = eventActivities.filter(a => a.stato !== 'disattivata')
    const completed = visible.filter(a => a.stato === 'completata').length
    const overdue = visible.filter(a =>
      ['da_fare', 'in_corso'].includes(a.stato) && a.deadline && new Date(a.deadline) < new Date()
    ).length
    statuses.preparazione = completed === visible.length ? 'complete' : overdue > 0 ? 'incomplete' : 'warning'
  }

  return statuses
}
```

**New store selectors needed in EventiDetail:**
- `useActivitiesStore(s => s.eventActivities)` — already fetched by EventPreparazioneTab, but needs fetch in EventiDetail on mount for dot computation before tab is visited
- `useMaterialsStore` — add `eventMaterials` state + `fetchEventMaterialList` call
- `useCostsStore(s => s.preventivi)` — already available, add fetch on mount

**Data fetch strategy:** EventiDetail already fetches logistics on mount. Add lightweight fetches for activities, materials, and costs on mount (same as logistics). These are small payloads (<100 rows) and the status dots provide immediate value.

### 2B: Summary Bars in Tab Headers

Materiale and Tavoli tabs need new summary bars using `ProgressIndicator`. Persone, Logistica, and Costi already have them. The data is computed locally within each tab component from its own store data. No new props needed.

| Tab | Summary bars | Data source |
|-----|-------------|-------------|
| **Persone** | **Already implemented** (EventPersoneTab lines 69-82) | `useStaffStore`, `useParticipantsStore` |
| **Tavoli** | Persone assegnate: X/Y — **NEW** | `useTavoliStore`, staff+participants count |
| **Logistica** | **Already implemented** (EventLogisticaTab lines 221-248) | `useLogisticsStore`, total people count |
| **Materiale** | Materiale confermato: X/Y — **NEW** | `useMaterialsStore` event materials |
| **Costi** | **Already implemented** (EventCostiTab lines 78-93) | `useCostsStore` |
| **Preparazione** | Already has progress bar (keep existing TrafficLight + bar) | `useActivitiesStore` |

**Implementation pattern per tab:**

```jsx
// At top of tab component, before main content:
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
  <ProgressIndicator label="Hotel" current={hotelConfirmed} total={totalPeople} />
  <ProgressIndicator label="Andata" current={andataConfirmed} total={totalPeople} />
  <ProgressIndicator label="Ritorno" current={ritornoConfirmed} total={totalPeople} />
</div>
```

The grid is responsive: 2 columns on mobile, up to 4 on desktop. Each ProgressIndicator is compact (max 40px height per the original spec).

### Status Calculation Rules Summary

| Tab | green (complete) | yellow (warning) | red (incomplete) | no dot |
|-----|-----------------|------------------|------------------|--------|
| Persone | All staff confirmed + all participants confermato/presente | Some unconfirmed | n/a | No people added |
| Tavoli | All participants assigned to a tavolo | Some unassigned | n/a | Not a tavolo event or no tavoli |
| Logistica | All hotels + andata + ritorno confirmed for all people | Some bookings exist but incomplete | n/a | No people |
| Materiale | All materials approvato or in_preparazione | Some richiesto (pending) | Any rifiutato | No materials |
| Costi | All preventivi approvato | Some in_attesa | Any rifiutato | No preventivi |
| Preparazione | All activities completata | Some in progress | Any obbligatoria overdue | No activities |

### Edge Cases

- **Empty tabs:** No dot shown (undefined status). This preserves the pre-feature behavior.
- **Lazy data:** Status dots update reactively as store data changes. Initial render may show no dots until fetches complete; this is acceptable (dots appear within 200-500ms).
- **Tab not visible due to role:** Status not computed for hidden tabs (no wasted queries).

---

## Feature 3: EventChecklistView Integration

### Problem

`EventChecklistView` exists in `src/components/eventi/EventChecklistView.jsx` (103 lines) and is fully functional: search, toggle presente/assente, real-time counter. But it is not routed or accessible from any UI.

### Solution: Access via EventPersoneTab

Add a "Modalita checklist" toggle button in `EventPersoneTab` that swaps the view between the normal people management and the checklist view. This avoids adding a new route and keeps the checklist contextual.

**File:** `src/components/eventi/EventPersoneTab.jsx`

### UX Flow

1. In `EventPersoneTab`, add a button in the tab header area: "Vista checklist" with a clipboard icon
2. Clicking toggles `checklistMode` local state
3. When `checklistMode === true`, render `<EventChecklistView event={event} participants={participants} />` instead of the normal staff/participant tables
4. A "Torna alla gestione" button returns to normal view
5. The toggle is only visible when the event is in states `in_corso` or `pronto` (day-of-event relevance)

### Button Design

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

### Enhancements to EventChecklistView

The existing component is good but needs these refinements:

1. **Group by tavolo:** If the event has tavoli, group participants by tavolo assignment (show tavolo name as group separator). Unassigned participants go in a "Senza tavolo" group at the bottom.

2. **Counter bar:** Replace the plain text counter with a `ProgressIndicator`:
   ```jsx
   <ProgressIndicator label="Presenti" current={presenti.length} total={attendees.length} color="green" />
   ```

3. **Icons instead of inline SVG checkbox:** Replace the hand-drawn SVG checkmark with `<Icon icon={ACTION_ICONS.check}>` wrapped in the same styling.

4. **Use existing `NAV_ICONS.checklist`** for the checklist toggle button. `ClipboardCheck` is already imported in `icons.js` (line 99) and mapped as `NAV_ICONS.checklist` (line 183) — no new icon entry needed.

### Edge Cases

- **No participants:** Show EmptyState "Nessun partecipante da registrare"
- **All present:** ProgressIndicator shows 100% green, counter at top turns green
- **Offline:** Not supported (Phase 6). Connection required for toggle to save.
- **Concurrent editing:** Multiple devices can toggle presence simultaneously. Each toggle is an independent atomic update. No conflict possible (last write wins on same participant, which is correct for presence).

---

## Feature 4: Template Admin Complete UX

### Problem

`AdminTemplate.jsx` (368 lines) already has a working template editor with:
- Template selector (tipo_evento + modalita cards)
- Item list with create/edit/delete
- Modal form with: descrizione, categoria, permesso_responsabile, giorni_prima_evento, obbligatorio, tipo_verifica, verifica_automatica, dipende_da

All fields work. But the UX has gaps:

1. **Dependency picker** is a flat dropdown of all items. No visual indication of what depends on what. No circular dependency protection beyond "can't select self".
2. **No circular dependency validation.** A -> B -> C -> A is possible and would cause infinite loops in the readiness engine.
3. **tipo_verifica** selector works but has no explanation of what "automatica" means.
4. **verifica_automatica** dropdown works but shows raw function names with no description of what each check verifies.

### 4A: Enhanced Dependency Picker

**File:** `src/pages/admin/AdminTemplate.jsx` — modify the "Dipende da" section in the edit modal

Replace the flat `<select>` with a richer display:

```jsx
<FormField label="Dipende da" hint="L'attivita non puo iniziare finche la dipendenza non e completata">
  <select
    className={SELECT_STYLE}
    value={form.dipende_da}
    onChange={e => {
      const newDep = e.target.value
      if (newDep && wouldCreateCycle(editing?.id, newDep, items)) {
        addToast('Dipendenza circolare rilevata. Scegli un altro elemento.', 'warning')
        return
      }
      setForm(f => ({ ...f, dipende_da: newDep }))
    }}
  >
    <option value="">Nessuna dipendenza</option>
    {items
      .filter(i => i.id !== editing?.id)
      .map(i => {
        const isCyclic = wouldCreateCycle(editing?.id, i.id, items)
        return (
          <option key={i.id} value={i.id} disabled={isCyclic}>
            {i.descrizione}{i.giorni_prima_evento ? ` (${i.giorni_prima_evento}gg)` : ''}
            {isCyclic ? ' [circolare]' : ''}
          </option>
        )
      })}
  </select>
</FormField>
```

### 4B: Circular Dependency Validation

**File:** `src/pages/admin/AdminTemplate.jsx` — add helper function

```js
/**
 * Checks if setting `itemId.dipende_da = targetId` would create a cycle.
 * Walks the dependency chain from targetId upward. If it reaches itemId, it's a cycle.
 */
function wouldCreateCycle(itemId, targetId, allItems) {
  if (!itemId || !targetId) return false
  const visited = new Set()
  let current = targetId
  while (current) {
    if (current === itemId) return true
    if (visited.has(current)) return false // already a cycle elsewhere, don't stack overflow
    visited.add(current)
    const item = allItems.find(i => i.id === current)
    current = item?.dipende_da || null
  }
  return false
}
```

This runs client-side on every dependency selection. Server-side validation is not needed because:
- Only admins access template editing
- The check is deterministic and fast (max ~30 items per template)
- The consequence of a missed cycle is a stuck activity, not data corruption

### 4C: tipo_verifica Enhanced UX

Replace the plain dropdown with a segmented control + explanation:

```jsx
<FormField label="Tipo verifica">
  <div className="space-y-2">
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
  </div>
</FormField>
```

### 4D: verifica_automatica Enhanced Dropdown

When `tipo_verifica === 'automatica'`, show the function picker with descriptions:

**File:** `src/lib/constants.js` — enhance `VERIFICATION_FUNCTIONS` with descriptions:

```js
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

**Breaking change note:** `VERIFICATION_FUNCTIONS` currently maps `key -> string`. Changing to `key -> { label, desc }` breaks two consumers:
1. `AdminTemplate.jsx` dropdown: `Object.entries(VERIFICATION_FUNCTIONS).map(([k, v]) => <option>{v}</option>)` becomes `<option>{v.label}</option>`
2. `useActivities.js` `runAutoVerifications`: references `checks[activity.verifica_automatica]` which uses the key, not the value — **no change needed** in the verification engine.

**Updated dropdown in AdminTemplate:**

```jsx
{form.tipo_verifica === 'automatica' && (
  <FormField label="Funzione di verifica">
    <select
      className={SELECT_STYLE}
      value={form.verifica_automatica}
      onChange={e => setForm(f => ({ ...f, verifica_automatica: e.target.value }))}
    >
      <option value="">Seleziona...</option>
      {Object.entries(VERIFICATION_FUNCTIONS).map(([k, v]) => (
        <option key={k} value={k}>{v.label}</option>
      ))}
    </select>
    {form.verifica_automatica && VERIFICATION_FUNCTIONS[form.verifica_automatica] && (
      <p className="text-sm text-gray-500 mt-1">
        {VERIFICATION_FUNCTIONS[form.verifica_automatica].desc}
      </p>
    )}
  </FormField>
)}
```

### 4E: Dependency Chain Visualization

In the items list (below the template selector), show the dependency chain visually:

- Items with `dipende_da` get an indented display (left margin + arrow icon)
- The dependency target is shown as a subtle link: "Dopo: [nome attivita dipendenza]"
- Items are sorted to show dependencies after their parent (topological sort for display order)

**Sorting function:**

```js
function topologicalSort(items) {
  const sorted = []
  const visited = new Set()
  const itemMap = new Map(items.map(i => [i.id, i]))

  function visit(item) {
    if (visited.has(item.id)) return
    visited.add(item.id)
    // Visit dependency first (parent before child)
    if (item.dipende_da && itemMap.has(item.dipende_da)) {
      visit(itemMap.get(item.dipende_da))
    }
    sorted.push(item)
  }

  items.forEach(i => visit(i))
  return sorted
}
```

Items that depend on something render with `ml-8` indent and a small connecting line or arrow icon.

### Edge Cases

- **Orphaned dependency:** If a template item's `dipende_da` references a deleted item, show "Dipendenza rimossa" in red and allow clearing it.
- **Deep chains:** Max practical depth is ~5 levels. Indentation capped at `ml-8 * 3 = ml-24` (3 levels visual, deeper chains flatten).
- **Migration:** The `VERIFICATION_FUNCTIONS` shape change must update both `AdminTemplate.jsx` and any other consumer. Grep confirms only `AdminTemplate.jsx` uses the values directly.

---

## Feature 5: Material Position UI

### Problem

The materials system tracks position (`posizione_attuale` enum) and has DB columns for `magazzino_id` (FK to `magazzini`) and `presso_utente_id` (FK to `users`). But the UI:

1. **MaterialMovementForm** hardcodes `a_posizione` as 'in_magazzino' or 'presso_evento' — no way to select target warehouse or agent
2. **MaterialCard** shows generic "In magazzino" regardless of which warehouse
3. **No way to set `presso_utente_id`** when moving material to an agent

The DB tables exist with seed data (Monteviale and Genova warehouses). The `magazzino_id` and `presso_utente_id` columns are already on the `materials` table.

### 5A: Movement Form — Warehouse Selector

**File:** `src/components/materiale/MaterialMovementForm.jsx`

When `a_posizione === 'in_magazzino'`:
- Show a dropdown to select target `a_magazzino_id` from `magazzini` table
- Default to the material's current `magazzino_id` if it has one, otherwise first warehouse

When `a_posizione === 'magazzino_agente'`:
- Show a user picker to select `a_utente_id`
- Filter users to roles: `commerciale`, `area_manager` (agents who can hold material)
- Show as: "Cognome Nome — Zona" in the dropdown

**Note:** `da_posizione` should be read dynamically from the material's current `posizione_attuale`, not hardcoded.

**New form fields:**

```jsx
{aPos === 'in_magazzino' && (
  <FormField label="Magazzino di destinazione" required>
    <select
      className={SELECT_STYLE}
      value={targetMagazzino}
      onChange={e => setTargetMagazzino(e.target.value)}
      required
    >
      {magazzini.map(m => (
        <option key={m.id} value={m.id}>{m.nome} — {m.indirizzo}</option>
      ))}
    </select>
  </FormField>
)}

{aPos === 'magazzino_agente' && (
  <FormField label="Agente" required>
    <select
      className={SELECT_STYLE}
      value={targetUtente}
      onChange={e => setTargetUtente(e.target.value)}
      required
    >
      <option value="">Seleziona agente...</option>
      {agenti.map(u => (
        <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>
      ))}
    </select>
  </FormField>
)}
```

**Position selector:** Replace the hardcoded `aPos` with a full dropdown of `POSIZIONE_MATERIALE` values:

```jsx
<FormField label="Destinazione" required>
  <select
    className={SELECT_STYLE}
    value={aPos}
    onChange={e => setAPos(e.target.value)}
  >
    {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => (
      <option key={k} value={k}>{v}</option>
    ))}
  </select>
</FormField>
```

### 5B: Movement Creation — DB Trigger Handles Position Update

**File:** `src/hooks/useMaterials.js` — modify `createMovement`

**IMPORTANT:** A DB trigger `sync_material_position()` (from migration `20260319100003_readiness_triggers.sql`) already handles updating `materials.posizione_attuale`, `materials.magazzino_id`, and `materials.presso_utente_id` automatically on movement insert. **No client-side position update logic is needed.**

The columns `a_magazzino_id` and `a_utente_id` already exist on `material_movements` (from the same migration). The store just needs to include them in the insert payload:

```js
createMovement: async (movement) => {
  // movement payload should include:
  //   da_posizione (read dynamically from material's current posizione_attuale)
  //   a_posizione, a_magazzino_id (when destination is warehouse), a_utente_id (when destination is agent)
  // The DB trigger sync_material_position() automatically updates materials.posizione_attuale,
  // materials.magazzino_id, and materials.presso_utente_id — no client-side update needed.
  const { data, error } = await supabase
    .from('material_movements').insert(movement).select().single()
  if (!error) {
    get().fetchMaterials()
  }
  return { data, error: error?.message || null }
},
```

**Movement payload:** The `MaterialMovementForm` must include `a_magazzino_id` (not `magazzino_id`) and `a_utente_id` (not `presso_utente_id`) in the movement record — these columns already exist on `material_movements`. Also, `da_posizione` should be read dynamically from the material's current `posizione_attuale`, not hardcoded.

### 5C: Database Changes

**NO MIGRATION NEEDED.** The columns `a_magazzino_id` and `a_utente_id` already exist on `material_movements` (added in migration `20260319100003_readiness_triggers.sql`). The DB trigger `sync_material_position()` from the same migration automatically syncs `materials.posizione_attuale`, `materials.magazzino_id`, and `materials.presso_utente_id` on movement insert.

### 5D: MaterialCard — Show Warehouse/Agent Name

**File:** `src/components/materiale/MaterialCard.jsx`

Update the card to show specific location:

```jsx
<div className="flex items-center gap-1.5">
  <StatusBadge
    stato={material.posizione_attuale}
    labels={POSIZIONE_MATERIALE}
    colors={POSIZIONE_MATERIALE_COLORE}
  />
  {material.posizione_attuale === 'in_magazzino' && material.magazzino?.nome && (
    <span className="text-xs text-gray-500">({material.magazzino.nome})</span>
  )}
  {material.posizione_attuale === 'magazzino_agente' && material.agente && (
    <span className="text-xs text-gray-500">
      ({material.agente.cognome} {material.agente.nome})
    </span>
  )}
</div>
```

**Store query update:** `fetchMaterials` must join `magazzino` and `agente`:

```js
// In useMaterials.js fetchMaterials:
let query = supabase
  .from('materials')
  .select(`
    *,
    product:products(id, nome, codice, brand:brands(id, nome)),
    magazzino:magazzini!materials_magazzino_id_fkey(id, nome),
    agente:users!materials_presso_utente_id_fkey(id, nome, cognome)
  `)
  .eq('attivo', true)
  .order('nome')
```

Also update `fetchMaterial` (single) with the same joins.

### 5E: Data Fetching for Magazzini and Agenti

**File:** `src/hooks/useMaterials.js` — add new actions:

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

These are called by `MaterialMovementForm` on mount, with results stored in local state (not Zustand — these are small, form-scoped lookups).

### 5F: LogisticaInventario Enhancement

**File:** `src/pages/logistica/LogisticaInventario.jsx`

Add a "Magazzino" filter dropdown that filters materials by `magazzino_id`. Shows all warehouses from `magazzini` table.

Add a column or info line showing the warehouse name for each material in the inventory list.

### Edge Cases

- **Material with no magazzino_id:** Possible for legacy data. Show "In magazzino" without parenthetical. Warehouse assignment happens on next movement.
- **Agent user deleted:** `presso_utente_id` FK won't cascade delete (the material stays). Show "Agente sconosciuto" if the join returns null.
- **Bulk movements:** `MaterialMovementForm` already supports `allMaterialIds`. The warehouse/agent selection applies to all materials in the batch — all go to the same destination.
- **Warehouse list empty:** Should never happen (seed data), but show "Nessun magazzino configurato" message and disable warehouse-dependent fields.

---

## Database Changes Summary

**No new migrations needed.** All required columns (`a_magazzino_id`, `a_utente_id` on `material_movements`) and the `sync_material_position()` trigger already exist from migration `20260319100003_readiness_triggers.sql`.

---

## New Icons

| Icon name | Lucide component | Registry | Usage |
|-----------|-----------------|----------|-------|
| `sortAsc` | `ArrowUpNarrowWide` | `ACTION_ICONS` | DataTable sortable header (ascending) |
| `sortDesc` | `ArrowDownWideNarrow` | `ACTION_ICONS` | DataTable sortable header (descending) |
| ~~clipboardCheck~~ | `ClipboardCheck` | **Already exists** as `NAV_ICONS.checklist` | Checklist mode toggle button — use `NAV_ICONS.checklist` |
| `chevronDown` | `ChevronDown` | `ACTION_ICONS` | DataTable mobile row expand (if not already present) |
| `warehouse` | `Warehouse` | `MATERIALE_ICONS` | Warehouse selector in movement form |

Check existing icons before adding — some may already exist in `icons.js`.

---

## Files Changed (Full Map)

| Action | File | Feature |
|--------|------|---------|
| Create | `src/components/ui/DataTable.jsx` | F1 |
| Create | `src/components/ui/DataTableMobileRow.jsx` | F1 |
| Modify | `src/lib/icons.js` | F1, F3, F5 |
| Modify | `src/pages/eventi/EventiDetail.jsx` | F2 |
| Modify | `src/components/eventi/EventPersoneTab.jsx` | F3 (checklist toggle) — summary bar already exists |
| Modify | `src/components/eventi/EventLogisticaTab.jsx` | Summary bar already exists — no changes needed for F2 |
| Modify | `src/components/eventi/EventMaterialList.jsx` | F2 (summary bar — NEW) |
| Modify | `src/components/eventi/EventCostiTab.jsx` | Summary bar already exists — no changes needed for F2 |
| Modify | `src/components/eventi/EventTavoliTab.jsx` | F2 (summary bar — NEW) |
| Modify | `src/components/eventi/EventChecklistView.jsx` | F3 (grouping, ProgressIndicator) |
| Modify | `src/pages/admin/AdminTemplate.jsx` | F4 |
| Modify | `src/lib/constants.js` | F4 (VERIFICATION_FUNCTIONS shape) |
| Modify | `src/components/materiale/MaterialMovementForm.jsx` | F5 |
| Modify | `src/components/materiale/MaterialCard.jsx` | F5 |
| Modify | `src/hooks/useMaterials.js` | F5 |
| Modify | `src/pages/logistica/LogisticaInventario.jsx` | F5 |
| ~~Create~~ | ~~`supabase/migrations/YYYYMMDDHHMMSS_material_position_fields.sql`~~ | ~~F5~~ — **NOT NEEDED** (columns already exist) |

---

## Implementation Order

| Step | Feature | Depends on | Effort |
|------|---------|-----------|--------|
| 1 | F4: Template admin enhancements | None | Small (single file + constants) |
| 2 | F5: Material position UI | None (DB columns + trigger already exist) | Medium (4 files, no migration) |
| 3 | F1: DataTable component | None | Medium (new component, 2 files) |
| 4 | F2: Tab status dots + summary bars | None (ProgressIndicator exists) | Medium (6 files touched) |
| 5 | F3: EventChecklistView integration | F2 (needs EventPersoneTab changes) | Small (2 files) |

Steps 1-3 are fully independent and can run in parallel.
Step 4 depends on nothing but touches many files — do after 1-3 to avoid merge conflicts.
Step 5 depends on step 4 only because both modify EventPersoneTab.

---

## Implementation Notes

- **EventiDetail data fetching:** EventiDetail must fetch tavoli (`useTavoliStore`), costs (`useCostsStore`), and materials (`useMaterialsStore`) data on mount for tab status dots to work. Currently only logistics and staff/participants are fetched eagerly — the other stores need the same treatment.
- **DataTable `renderExpandedRow` prop:** DataTable should support a `renderExpandedRow: (row) => ReactNode` prop for inline form expansion. This is used by EventLogisticaTab's transport detail form, which expands a row to show an inline editing form.
- **Logistica status semantic change:** The tab status calculation uses `stato === 'confermato'` for logistics (hotels, transport). This is an intentional change from the previous behavior which checked for "assigned" — the new semantic requires actual confirmation, which better reflects real-world readiness.
- **Materiale `in_preparazione` as confirmed:** The materiale status treats `in_preparazione` as a "confirmed" state alongside `approvato`, because material in preparation has been approved and is actively being handled — it should not show as a warning.

---

## Out of Scope

- DataTable server-side sorting/pagination (client-side is sufficient for current data volumes: max ~100 rows per event)
- DataTable column resizing or reordering
- Drag-and-drop template item reordering (use `ordine` field via manual edit)
- Offline checklist mode (Phase 6 PWA)
- Material barcode scanning (hardware dependency, future)
- New warehouse CRUD admin page (use direct DB insert for now; admin CRUD is Phase 6)
- Dark mode
- Test framework (prerequisite not configured)
