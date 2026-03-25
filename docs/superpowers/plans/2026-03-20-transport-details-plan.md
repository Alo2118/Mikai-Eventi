# Transport Details — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured transport fields (mezzo, codice, orario, autista, orario_pickup) to event_trasporti and a "Copia a..." feature for group assignment.

**Architecture:** Two migrations (enum + columns), constants/icons additions, a new TrasportoForm inline component, a TrasportoCopyDialog for group copy, and modifications to EventLogisticaTab for rich transport display and editing.

**Tech Stack:** React 19, Zustand 5, Supabase 2, TailwindCSS v4, lucide-react icons via centralized system.

**Spec:** `docs/superpowers/specs/2026-03-20-transport-details-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260320140000_trasporto_mezzo_enum.sql` | New enum `trasporto_mezzo` |
| Create | `supabase/migrations/20260320140001_trasporto_details_columns.sql` | Add 5 columns to `event_trasporti` |
| Modify | `src/lib/constants.js` | Add `MEZZO_TRASPORTO` |
| Modify | `src/lib/icons.js` | Add `TrainFront`, `Car`, `UserX` imports + `TRASPORTO_ICONS` |
| Modify | `src/hooks/useLogistics.js` | Add `copyTrasportoToMany` action |
| Create | `src/components/eventi/TrasportoForm.jsx` | Inline form for transport detail editing |
| Create | `src/components/eventi/TrasportoCopyDialog.jsx` | Multi-select dialog for copying transport to group |
| Modify | `src/components/eventi/EventLogisticaTab.jsx` | Rich transport cells, inline form, copy button |

---

## Task 1: Database Migrations

**Files:**
- Create: `supabase/migrations/20260320140000_trasporto_mezzo_enum.sql`
- Create: `supabase/migrations/20260320140001_trasporto_details_columns.sql`

- [ ] **Step 1: Create enum migration**

```sql
-- New enum for transport mode
-- Separate migration: new enum values not visible in same transaction as references
-- Note: legacy mezzo_tipo enum exists from migration 20260315000005 (event_logistics_legacy). Do not reuse.
CREATE TYPE trasporto_mezzo AS ENUM ('treno', 'volo', 'auto', 'navetta', 'indipendente');
```

- [ ] **Step 2: Create columns migration**

```sql
-- Add structured transport detail fields to event_trasporti
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS mezzo trasporto_mezzo;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS codice text;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS orario timestamptz;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS autista text;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS orario_pickup timestamptz;
```

- [ ] **Step 3: Push migrations to Supabase**

```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260320140000_trasporto_mezzo_enum.sql supabase/migrations/20260320140001_trasporto_details_columns.sql
git commit -m "feat: add trasporto_mezzo enum and transport detail columns"
```

---

## Task 2: Constants and Icons

**Files:**
- Modify: `src/lib/constants.js`
- Modify: `src/lib/icons.js`

- [ ] **Step 1: Add MEZZO_TRASPORTO to constants.js**

Add after the `DIREZIONE_TRASPORTO` block:

```js
// Mezzo trasporto
export const MEZZO_TRASPORTO = {
  treno: 'Treno',
  volo: 'Volo',
  auto: 'Auto',
  navetta: 'Navetta',
  indipendente: 'Indipendente',
}
```

- [ ] **Step 2: Add transport icons to icons.js**

Add `TrainFront`, `Car`, `UserX` to the lucide-react import (alphabetical position). `Plane` and `Bus` are already imported.

Then add a new `TRASPORTO_ICONS` export:

```js
// ═══════════════════════════════════════════
// Trasporti
// ═══════════════════════════════════════════
export const TRASPORTO_ICONS = {
  treno: TrainFront,
  volo: Plane,
  auto: Car,
  navetta: Bus,
  indipendente: UserX,
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.js src/lib/icons.js
git commit -m "feat: add MEZZO_TRASPORTO constants and TRASPORTO_ICONS"
```

---

## Task 3: Store Action — copyTrasportoToMany

**Files:**
- Modify: `src/hooks/useLogistics.js`

- [ ] **Step 1: Add copyTrasportoToMany action**

Add after `removeTrasporto` (before the cross-event queries section):

```js
  copyTrasportoToMany: async (sourceId, targetPersons, eventId) => {
    // 1. Fetch source record
    const source = get().trasporti.find(t => t.id === sourceId)
    if (!source) return { data: null, error: 'Record sorgente non trovato' }

    // 2. Build fresh payloads — respects XOR constraint (num_nonnulls(user_id, contact_id) = 1)
    const payloads = targetPersons.map(target => ({
      event_id: eventId,
      user_id: target.userId || null,
      contact_id: target.contactId || null,
      direzione: source.direzione,
      stato: source.stato,
      mezzo: source.mezzo,
      codice: source.codice,
      orario: source.orario,
      autista: source.autista,
      orario_pickup: source.orario_pickup,
      note: source.note,
    }))

    // 3. Batch insert
    const { data, error } = await supabase
      .from('event_trasporti')
      .insert(payloads)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
    if (!error && data) {
      // Append to local state — no refetch to avoid loading flash
      set(s => ({ trasporti: [...s.trasporti, ...data] }))
    }
    return { data, error: error?.message || null }
  },
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLogistics.js
git commit -m "feat: add copyTrasportoToMany store action for group transport copy"
```

---

## Task 4: TrasportoForm Component

**Files:**
- Create: `src/components/eventi/TrasportoForm.jsx`

- [ ] **Step 1: Create TrasportoForm**

Inline form for editing transport details. Conditionally shows/hides fields based on `mezzo` value.

**Props:**
- `trasporto` — existing record (for editing) or null (for new)
- `eventId` — the event UUID
- `personId` — user_id or contact_id
- `personType` — 'staff' | 'participant'
- `direzione` — 'andata' | 'ritorno'
- `onSave` — callback after save
- `onCancel` — callback to close form

**Behavior:**
- If `trasporto` is provided, pre-fills fields from existing record (edit mode)
- If `trasporto` is null, starts empty (create mode)
- Calls `createTrasporto` or `updateTrasporto` from useLogisticsStore
- Conditional field visibility:
  - `mezzo = 'indipendente'`: only mezzo + stato + note
  - `mezzo = 'auto'`: mezzo + orario + stato + note
  - All others: all fields visible
- `orario` and `orario_pickup` use `<input type="datetime-local">` — convert to/from ISO for Supabase
- On save: builds payload with correct `user_id` or `contact_id` based on `personType`

```jsx
import { useState } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { MEZZO_TRASPORTO, STATO_PRENOTAZIONE } from '../../lib/constants'

const INPUT = 'w-full px-3 py-2 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'

function toLocalDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TrasportoForm({ trasporto, eventId, personId, personType, direzione, onSave, onCancel }) {
  const [form, setForm] = useState({
    mezzo: trasporto?.mezzo || '',
    codice: trasporto?.codice || '',
    orario: toLocalDateTime(trasporto?.orario),
    autista: trasporto?.autista || '',
    orario_pickup: toLocalDateTime(trasporto?.orario_pickup),
    stato: trasporto?.stato || 'da_prenotare',
    note: trasporto?.note || '',
  })
  const [saving, setSaving] = useState(false)

  const createTrasporto = useLogisticsStore(s => s.createTrasporto)
  const updateTrasporto = useLogisticsStore(s => s.updateTrasporto)
  const addToast = useToastStore(s => s.add)

  const mezzo = form.mezzo
  const showCodice = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto'
  const showOrario = mezzo && mezzo !== 'indipendente'
  const showAutista = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto'
  const showPickup = showAutista

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      mezzo: form.mezzo || null,
      codice: form.codice.trim() || null,
      orario: form.orario ? new Date(form.orario).toISOString() : null,
      autista: form.autista.trim() || null,
      orario_pickup: form.orario_pickup ? new Date(form.orario_pickup).toISOString() : null,
      stato: form.stato,
      note: form.note.trim() || null,
    }

    let result
    if (trasporto) {
      // Edit existing
      result = await updateTrasporto(trasporto.id, payload)
    } else {
      // Create new
      payload.event_id = eventId
      payload.direzione = direzione
      if (personType === 'staff') payload.user_id = personId
      else payload.contact_id = personId
      result = await createTrasporto(payload)
    }

    setSaving(false)
    if (result.error) {
      addToast('Errore nel salvataggio', 'error')
    } else {
      addToast(trasporto ? 'Trasporto aggiornato' : 'Trasporto creato', 'success')
      onSave()
    }
  }

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mezzo</label>
          <select className={INPUT} value={form.mezzo} onChange={e => set('mezzo', e.target.value)}>
            <option value="">— Scegli —</option>
            {Object.entries(MEZZO_TRASPORTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {showCodice && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice treno/volo</label>
            <input className={INPUT} value={form.codice} onChange={e => set('codice', e.target.value)} placeholder="FR9728, AZ1605 AHO→LIN" />
          </div>
        )}

        {showOrario && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orario partenza</label>
            <input type="datetime-local" className={INPUT} value={form.orario} onChange={e => set('orario', e.target.value)} />
          </div>
        )}

        {showAutista && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Autista / accompagnatore</label>
            <input className={INPUT} value={form.autista} onChange={e => set('autista', e.target.value)} placeholder="Nome autista" />
          </div>
        )}

        {showPickup && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orario pickup</label>
            <input type="datetime-local" className={INPUT} value={form.orario_pickup} onChange={e => set('orario_pickup', e.target.value)} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
          <select className={INPUT} value={form.stato} onChange={e => set('stato', e.target.value)}>
            {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea className={INPUT + ' min-h-[64px]'} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Note aggiuntive..." rows={2} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} loading={saving} size="sm">Salva</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/TrasportoForm.jsx
git commit -m "feat: add TrasportoForm — inline form for transport detail editing"
```

---

## Task 5: TrasportoCopyDialog Component

**Files:**
- Create: `src/components/eventi/TrasportoCopyDialog.jsx`

- [ ] **Step 1: Create TrasportoCopyDialog**

Dialog for copying a transport record to multiple people. Shows people without transport for that direction.

**Props:**
- `sourceRecord` — the transport record to copy from
- `eventId` — event UUID
- `direzione` — 'andata' | 'ritorno'
- `staff` — array of staff from useStaffStore
- `participants` — array of participants from useParticipantsStore
- `existingTrasporti` — array of all trasporti for this event
- `onCopy` — callback after copy completes
- `onClose` — callback to close

```jsx
import { useState } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function TrasportoCopyDialog({ sourceRecord, eventId, direzione, staff, participants, existingTrasporti, onCopy, onClose }) {
  const copyTrasportoToMany = useLogisticsStore(s => s.copyTrasportoToMany)
  const addToast = useToastStore(s => s.add)
  const [selected, setSelected] = useState(new Set())
  const [copying, setCopying] = useState(false)

  // Build list of people WITHOUT transport for this direction
  // Namespace-aware: staff uses user_id, participants uses contact_id
  const staffWithout = staff.filter(s => {
    return !existingTrasporti.some(t => t.direzione === direzione && t.user_id === s.user_id)
  }).map(s => ({
    key: `staff-${s.user_id}`,
    label: `${s.user?.cognome} ${s.user?.nome} (staff)`,
    target: { userId: s.user_id },
  }))

  const participantsWithout = participants.filter(p => {
    return !existingTrasporti.some(t => t.direzione === direzione && t.contact_id === p.contact_id)
  }).map(p => ({
    key: `part-${p.contact_id}`,
    label: `${p.contact?.cognome} ${p.contact?.nome}${p.contact?.azienda ? ` — ${p.contact.azienda}` : ''}`,
    target: { contactId: p.contact_id },
  }))

  const available = [...staffWithout, ...participantsWithout]

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === available.length) setSelected(new Set())
    else setSelected(new Set(available.map(a => a.key)))
  }

  const handleCopy = async () => {
    const targets = available.filter(a => selected.has(a.key)).map(a => a.target)
    if (targets.length === 0) return
    setCopying(true)
    const { error } = await copyTrasportoToMany(sourceRecord.id, targets, eventId)
    setCopying(false)
    if (error) {
      addToast(`Errore: ${error}`, 'error')
    } else {
      addToast(`Trasporto copiato a ${targets.length} persone`, 'success')
      onCopy()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-3 max-w-md">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-base">Copia trasporto a...</h4>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px]" aria-label="Chiudi">
          <Icon icon={ACTION_ICONS.close} size={18} />
        </button>
      </div>

      {available.length === 0 ? (
        <p className="text-gray-400 text-sm py-2">Tutti hanno già un trasporto per {direzione === 'andata' ? "l'andata" : 'il ritorno'}.</p>
      ) : (
        <>
          <button onClick={selectAll} className="text-sm text-mikai-500 hover:text-mikai-600 min-h-[36px]">
            {selected.size === available.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
          </button>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {available.map(item => (
              <label key={item.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[48px]">
                <input
                  type="checkbox"
                  checked={selected.has(item.key)}
                  onChange={() => toggleSelect(item.key)}
                  className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                />
                <span className="text-base">{item.label}</span>
              </label>
            ))}
          </div>
          <Button onClick={handleCopy} loading={copying} disabled={selected.size === 0} size="sm">
            Copia a {selected.size} {selected.size === 1 ? 'persona' : 'persone'}
          </Button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/TrasportoCopyDialog.jsx
git commit -m "feat: add TrasportoCopyDialog — multi-select copy transport to group"
```

---

## Task 6: Modify EventLogisticaTab

**Files:**
- Modify: `src/components/eventi/EventLogisticaTab.jsx`

This is the largest task. The existing component (132 lines) needs:
1. New imports for TrasportoForm, TrasportoCopyDialog, icons, constants
2. State for editing/copying
3. Rich transport cells replacing the simple status dropdowns
4. Inline form opening on cell click
5. "Copia a..." button per transport record

- [ ] **Step 1: Rewrite EventLogisticaTab**

The full component must be rewritten. Key changes:
- Add `useState` import
- Import `TrasportoForm` and `TrasportoCopyDialog`
- Import `Icon` and `TRASPORTO_ICONS`, `MEZZO_TRASPORTO`
- Add `formatDateTime` from `date-utils` (for orario display — format as `HH:mm` only showing time, but the data is timestamptz)
- Add state: `editingTransport` (which record is being edited/created), `copyingTransport` (which record is being copied)
- Replace the andata/ritorno cells: instead of a status `<select>`, show a compact summary cell. If `canEdit`, clicking opens the inline TrasportoForm.
- The "+Andata"/"+Ritorno" buttons still create a new record but now open the form
- After each transport cell, show a "Copia a..." button that opens TrasportoCopyDialog

**Transport cell display logic:**
```jsx
function TrasportoCell({ record, mezzo icons }) {
  // If record exists, show: icon + codice + orario on line 1, autista + pickup on line 2, status badge on line 3
  // If no record, show "+ Andata" or "+ Ritorno" button
}
```

Since this is a significant rewrite of a 132-line component, the implementer should:
1. Read the current file fully
2. Keep all existing functionality (hotel cells, people list building, permissions)
3. Replace only the transport cell rendering and add the form/copy integration
4. Add `date-fns` `format` for time display (use existing `date-utils.js` or inline `format(new Date(orario), 'HH:mm')`)

**Important:** The `date-utils.js` file has `formatDateTime` which gives "17 mar 2026 alle 14:30" — too verbose for a table cell. For the compact cell display, format the time inline: `new Date(orario).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })` → "14:30".

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Manual test**

1. Go to the event → tab Logistica
2. Click "+Andata" for a person → inline form opens
3. Select mezzo "Treno", fill codice "FR9728", set orario, autista "Rudatis", pickup time
4. Save → cell shows compact summary with train icon
5. Click "Copia a..." → dialog shows people without andata
6. Select 5 people → "Copia a 5 persone" → all get the same transport
7. Verify the table updates without full page reload

- [ ] **Step 4: Commit**

```bash
git add src/components/eventi/EventLogisticaTab.jsx
git commit -m "feat: rich transport cells with inline form and copy-to-group in EventLogisticaTab"
```

---

## Task 7: Build Verification

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 2: End-to-end test with Federica's data**

Enter the real transport data for the Corso MMC event:
1. Create andata for Omar El Ezzo: Treno, FR9728, 16 aprile 12:32, Rudatis, pickup 14:45
2. "Copia a..." → select Virginia Cinelli, Giulia Masci, Tommaso Speziale, Stefano Trotto, Giovanni Guarascio
3. Create andata for Francesco Cadoni: Volo, AZ1605 AHO→LIN, 16 aprile 10:05, Alberto
4. "Copia a..." → select Enrico Tanferna, Daniele Tramaglino
5. Create andata for Stefano Paladini: Indipendente → only mezzo + stato shown
6. Repeat for ritorno records
