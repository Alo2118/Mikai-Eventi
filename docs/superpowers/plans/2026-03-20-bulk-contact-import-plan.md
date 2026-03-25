# Bulk Contact Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bulk import grid that creates contacts and optionally assigns them to events, replacing manual one-by-one entry during initial rollout.

**Architecture:** A `BulkImportModal` orchestrates a two-step flow (grid → review) using controlled state. A Supabase RPC handles case-insensitive duplicate detection in a single query. New store actions follow the existing `{ data, error }` pattern.

**Tech Stack:** React 19, Zustand 5, Supabase 2 (RPC + JS client), TailwindCSS v4, lucide-react icons via centralized Icon system.

**Spec:** `docs/superpowers/specs/2026-03-20-bulk-contact-import-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260320120000_bulk_import.sql` | Add `contacts.citta`, `contacts.note_salute`, RPC `find_contact_duplicates` |
| Modify | `src/lib/constants.js` | Add `TIPOLOGIA_IMPORT` mapping |
| Modify | `src/lib/icons.js` | Add `Upload` icon for import buttons |
| Create | `src/components/contatti/BulkImportGrid.jsx` | Editable grid table (controlled) |
| Create | `src/components/contatti/BulkImportReview.jsx` | Duplicate review screen |
| Create | `src/components/contatti/BulkImportModal.jsx` | Orchestrator: grid → review → confirm |
| Modify | `src/hooks/useContacts.js` | Add `findDuplicates`, `bulkCreateContacts`, `reactivateContacts` |
| Modify | `src/hooks/useParticipants.js` | Add `bulkAddParticipants` |
| Modify | `src/pages/contatti/ContattiList.jsx` | Add "Importa" button |
| Modify | `src/components/eventi/EventPersoneTab.jsx` | Add "Importa lista" button |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260320120000_bulk_import.sql`

- [ ] **Step 1: Write migration file**

```sql
-- Bulk import support: new contact fields + duplicate detection RPC

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS citta text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS note_salute text;

CREATE INDEX IF NOT EXISTS idx_contacts_citta ON contacts(citta);

-- RPC: batch duplicate detection (case-insensitive, trimmed)
-- Accepts JSON array: [{"nome":"Omar","cognome":"El Ezzo"}, ...]
-- Returns matched contacts with pair_index to correlate with input rows
CREATE OR REPLACE FUNCTION find_contact_duplicates(pairs jsonb)
RETURNS TABLE(pair_index int, id uuid, nome text, cognome text, azienda text, tipo_contatto contact_tipo, attivo boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.idx::int, c.id, c.nome, c.cognome, c.azienda, c.tipo_contatto, c.attivo
  FROM jsonb_array_elements(pairs) WITH ORDINALITY AS p(val, idx)
  JOIN contacts c
    ON LOWER(TRIM(c.cognome)) = LOWER(TRIM(p.val->>'cognome'))
   AND LOWER(TRIM(c.nome)) = LOWER(TRIM(p.val->>'nome'))
$$;
```

- [ ] **Step 2: Push migration to Supabase**

Run:
```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
```
Expected: migration applied successfully, no errors.

- [ ] **Step 3: Verify RPC works**

Test via Supabase dashboard SQL editor or `supabase` CLI:
```sql
SELECT * FROM find_contact_duplicates('[{"nome":"Test","cognome":"User"}]'::jsonb);
```
Expected: empty result set (no contacts match).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260320120000_bulk_import.sql
git commit -m "feat: add bulk import migration — contacts.citta, contacts.note_salute, find_contact_duplicates RPC"
```

---

## Task 2: Constants and Icons

**Files:**
- Modify: `src/lib/constants.js`
- Modify: `src/lib/icons.js`

- [ ] **Step 1: Add TIPOLOGIA_IMPORT to constants.js**

Add after the existing `TIPO_CONTATTO` block (after line 113):

```js
// Tipologia per import in blocco — labels familiari, mapping a tipo_contatto + ruolo_medico
export const TIPOLOGIA_IMPORT = {
  medico:          { label: 'Medico',          tipo_contatto: 'medico',        ruolo_medico: 'medico' },
  specializzando:  { label: 'Specializzando',  tipo_contatto: 'medico',        ruolo_medico: 'specializzando' },
  strumentista:    { label: 'Strumentista',     tipo_contatto: 'tecnico',       ruolo_medico: 'strumentista' },
  fornitore:       { label: 'Fornitore',        tipo_contatto: 'fornitore',     ruolo_medico: null },
  tecnico:         { label: 'Tecnico',          tipo_contatto: 'tecnico',       ruolo_medico: null },
  istituzionale:   { label: 'Istituzionale',    tipo_contatto: 'istituzionale', ruolo_medico: null },
  altro:           { label: 'Altro',            tipo_contatto: 'altro',         ruolo_medico: null },
}
```

- [ ] **Step 2: Add Upload icon to icons.js**

Add `Upload` to the lucide-react import block (alphabetical position). Then add to `ACTION_ICONS`:

```js
// In the import block, add:
Upload,

// In ACTION_ICONS, add:
upload: Upload,
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.js src/lib/icons.js
git commit -m "feat: add TIPOLOGIA_IMPORT constants and Upload icon for bulk import"
```

---

## Task 3: Store Actions

**Files:**
- Modify: `src/hooks/useContacts.js`
- Modify: `src/hooks/useParticipants.js`

- [ ] **Step 1: Add findDuplicates to useContactsStore**

Add after the `searchContacts` action (before the closing `})`):

```js
  findDuplicates: async (rows) => {
    const pairs = rows.map(r => ({ nome: r.nome?.trim(), cognome: r.cognome?.trim() }))
    const { data, error } = await supabase.rpc('find_contact_duplicates', { pairs: JSON.stringify(pairs) })
    if (error) return { data: null, error: error.message }
    // Group matches by pair_index (1-based from SQL ORDINALITY)
    const grouped = rows.map((row, i) => ({
      row,
      matches: (data || []).filter(m => m.pair_index === i + 1),
    }))
    return { data: grouped, error: null }
  },
```

- [ ] **Step 2: Add bulkCreateContacts to useContactsStore**

Add after `findDuplicates`:

```js
  bulkCreateContacts: async (contacts) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contacts)
      .select()
    if (!error) get().fetchContacts()
    return { data: data || [], error: error?.message || null }
  },
```

- [ ] **Step 3: Add reactivateContacts to useContactsStore**

Add after `bulkCreateContacts`:

```js
  reactivateContacts: async (ids) => {
    const { data, error } = await supabase
      .from('contacts')
      .update({ attivo: true })
      .in('id', ids)
      .select()
    if (!error) get().fetchContacts()
    return { data, error: error?.message || null }
  },
```

- [ ] **Step 4: Add bulkAddParticipants to useParticipantsStore**

Add after the `removeParticipant` action (before closing `})`):

```js
  bulkAddParticipants: async (eventId, participants) => {
    // Check which contacts are already assigned to this event
    const { data: existing } = await supabase
      .from('event_participants')
      .select('contact_id')
      .eq('event_id', eventId)
    const existingIds = new Set((existing || []).map(e => e.contact_id))
    const toInsert = participants.filter(p => !existingIds.has(p.contactId))
    const skipped = participants.length - toInsert.length

    if (toInsert.length === 0) return { data: { inserted: 0, skipped }, error: null }

    const rows = toInsert.map(p => ({
      event_id: eventId,
      contact_id: p.contactId,
      tipo: p.tipo,
      note: p.note || null,
      stato_iscrizione: 'invitato',
    }))
    const { data, error } = await supabase
      .from('event_participants')
      .insert(rows)
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono)')
    if (!error) get().fetchEventParticipants(eventId)
    return { data: { inserted: toInsert.length, skipped }, error: error?.message || null }
  },
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useContacts.js src/hooks/useParticipants.js
git commit -m "feat: add bulk import store actions — findDuplicates, bulkCreateContacts, reactivateContacts, bulkAddParticipants"
```

---

## Task 4: BulkImportGrid Component

**Files:**
- Create: `src/components/contatti/BulkImportGrid.jsx`

- [ ] **Step 1: Create BulkImportGrid**

This is a controlled editable table. It receives `rows` and `onRowsChange` from parent.

```jsx
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { TIPOLOGIA_IMPORT, TIPO_PARTECIPANTE } from '../../lib/constants'

const CELL = 'px-2 py-2 text-base border border-gray-200 min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
const SELECT_CELL = CELL + ' bg-white'

function makeEmptyRow() {
  return { cognome: '', nome: '', tipologia: '', azienda: '', citta: '', email: '', telefono: '', note_salute: '', ruolo_evento: 'discente', note_evento: '' }
}

export function makeEmptyRows(count = 5) {
  return Array.from({ length: count }, () => makeEmptyRow())
}

export function BulkImportGrid({ rows, onRowsChange, showEventColumns, onSubmit }) {
  const updateCell = (index, field, value) => {
    const updated = rows.map((r, i) => i === index ? { ...r, [field]: value } : r)
    onRowsChange(updated)
  }

  const addRows = () => {
    onRowsChange([...rows, ...makeEmptyRows(5)])
  }

  const removeRow = (index) => {
    if (rows.length <= 1) return
    onRowsChange(rows.filter((_, i) => i !== index))
  }

  const validate = () => {
    const errors = []
    const nonEmpty = rows.filter((r, i) => {
      const empty = !r.cognome.trim() && !r.nome.trim() && !r.tipologia
      if (empty) return false
      if (!r.cognome.trim()) errors.push({ row: i, field: 'cognome', msg: 'Cognome obbligatorio' })
      if (!r.nome.trim()) errors.push({ row: i, field: 'nome', msg: 'Nome obbligatorio' })
      if (!r.tipologia) errors.push({ row: i, field: 'tipologia', msg: 'Tipologia obbligatoria' })
      if (showEventColumns && !r.ruolo_evento) errors.push({ row: i, field: 'ruolo_evento', msg: 'Ruolo obbligatorio' })
      return true
    })
    return { nonEmpty, errors }
  }

  const handleSubmit = () => {
    const { nonEmpty, errors } = validate()
    if (nonEmpty.length === 0) return
    onSubmit(nonEmpty, errors)
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600 font-medium">
              <th className="px-2 py-2">Cognome *</th>
              <th className="px-2 py-2">Nome *</th>
              <th className="px-2 py-2">Tipologia *</th>
              <th className="px-2 py-2">Ospedale/Ente</th>
              <th className="px-2 py-2">Città</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Telefono</th>
              <th className="px-2 py-2">Allergie</th>
              {showEventColumns && <th className="px-2 py-2">Ruolo *</th>}
              {showEventColumns && <th className="px-2 py-2">Note evento</th>}
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td><input className={CELL + ' w-full'} value={row.cognome} onChange={e => updateCell(i, 'cognome', e.target.value)} /></td>
                <td><input className={CELL + ' w-full'} value={row.nome} onChange={e => updateCell(i, 'nome', e.target.value)} /></td>
                <td>
                  <select className={SELECT_CELL + ' w-full'} value={row.tipologia} onChange={e => updateCell(i, 'tipologia', e.target.value)}>
                    <option value="">—</option>
                    {Object.entries(TIPOLOGIA_IMPORT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </td>
                <td><input className={CELL + ' w-full'} value={row.azienda} onChange={e => updateCell(i, 'azienda', e.target.value)} /></td>
                <td><input className={CELL + ' w-full'} value={row.citta} onChange={e => updateCell(i, 'citta', e.target.value)} /></td>
                <td><input className={CELL + ' w-full'} type="email" value={row.email} onChange={e => updateCell(i, 'email', e.target.value)} /></td>
                <td><input className={CELL + ' w-full'} type="tel" value={row.telefono} onChange={e => updateCell(i, 'telefono', e.target.value)} /></td>
                <td><input className={CELL + ' w-full'} value={row.note_salute} onChange={e => updateCell(i, 'note_salute', e.target.value)} /></td>
                {showEventColumns && (
                  <td>
                    <select className={SELECT_CELL + ' w-full'} value={row.ruolo_evento} onChange={e => updateCell(i, 'ruolo_evento', e.target.value)}>
                      {Object.entries(TIPO_PARTECIPANTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                )}
                {showEventColumns && (
                  <td><input className={CELL + ' w-full'} value={row.note_evento} onChange={e => updateCell(i, 'note_evento', e.target.value)} /></td>
                )}
                <td>
                  <button onClick={() => removeRow(i)} className="p-2 text-gray-400 hover:text-red-500 min-h-[36px]" aria-label="Rimuovi riga">
                    <Icon icon={ACTION_ICONS.close} size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <Button variant="ghost" size="sm" onClick={addRows}>
          <Icon icon={ACTION_ICONS.add} size={16} />
          <span className="ml-1">Aggiungi righe</span>
        </Button>
        <Button onClick={handleSubmit}>
          Verifica e importa
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors (component not yet used, but must compile).

- [ ] **Step 3: Commit**

```bash
git add src/components/contatti/BulkImportGrid.jsx
git commit -m "feat: add BulkImportGrid — editable table for bulk contact entry"
```

---

## Task 5: BulkImportReview Component

**Files:**
- Create: `src/components/contatti/BulkImportReview.jsx`

- [ ] **Step 1: Create BulkImportReview**

Displays match results with color-coded rows and resolution controls.

```jsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { TIPOLOGIA_IMPORT } from '../../lib/constants'

// result shape: { row, matches: [], status: 'new'|'matched'|'inactive'|'error', errors: [], resolution: null }

export function BulkImportReview({ results, onConfirm, onCancel }) {
  const [resolutions, setResolutions] = useState(() =>
    results.map(r => {
      if (r.errors?.length > 0) return { action: 'error' }
      if (r.matches.length === 0) return { action: 'create' }
      // Default to linking the first active match, or create if all inactive
      const activeMatch = r.matches.find(m => m.attivo)
      const inactiveMatch = r.matches.find(m => !m.attivo)
      if (activeMatch) return { action: 'link', contactId: activeMatch.id }
      if (inactiveMatch) return { action: 'reactivate', contactId: inactiveMatch.id }
      return { action: 'create' }
    })
  )

  const setResolution = (index, resolution) => {
    setResolutions(prev => prev.map((r, i) => i === index ? resolution : r))
  }

  const hasErrors = resolutions.some(r => r.action === 'error')

  const rowColor = (r, i) => {
    const res = resolutions[i]
    if (res.action === 'error') return 'bg-red-50 border-l-4 border-red-400'
    if (res.action === 'create' && r.matches.length === 0) return 'bg-green-50 border-l-4 border-green-400'
    if (res.action === 'create' && r.matches.length > 0) return 'bg-green-50 border-l-4 border-green-400'
    if (res.action === 'reactivate') return 'bg-orange-50 border-l-4 border-orange-400'
    if (res.action === 'link') return 'bg-yellow-50 border-l-4 border-yellow-400'
    return ''
  }

  const summary = {
    create: resolutions.filter(r => r.action === 'create').length,
    link: resolutions.filter(r => r.action === 'link').length,
    reactivate: resolutions.filter(r => r.action === 'reactivate').length,
    error: resolutions.filter(r => r.action === 'error').length,
  }

  return (
    <div>
      <div className="flex gap-4 text-sm mb-4">
        {summary.create > 0 && <span className="text-green-700 font-medium">{summary.create} nuovi</span>}
        {summary.link > 0 && <span className="text-yellow-700 font-medium">{summary.link} già esistenti</span>}
        {summary.reactivate > 0 && <span className="text-orange-700 font-medium">{summary.reactivate} da riattivare</span>}
        {summary.error > 0 && <span className="text-red-700 font-medium">{summary.error} con errori</span>}
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className={`rounded-lg p-3 ${rowColor(r, i)}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{r.row.cognome} {r.row.nome}</span>
                {r.row.azienda && <span className="text-gray-500 ml-2">— {r.row.azienda}</span>}
                <span className="text-gray-400 ml-2 text-sm">{TIPOLOGIA_IMPORT[r.row.tipologia]?.label}</span>
              </div>

              {r.errors?.length > 0 && (
                <span className="text-red-600 text-sm">{r.errors.map(e => e.msg).join(', ')}</span>
              )}

              {r.matches.length > 0 && resolutions[i].action !== 'error' && (
                <div className="flex items-center gap-2">
                  {r.matches.map(m => (
                    <span key={m.id} className={`text-xs px-2 py-1 rounded ${m.attivo ? 'bg-yellow-100' : 'bg-orange-100'}`}>
                      {m.cognome} {m.nome} — {m.azienda || 'N/A'} {!m.attivo && '(disattivato)'}
                    </span>
                  ))}
                  <select
                    value={resolutions[i].action === 'link' || resolutions[i].action === 'reactivate' ? resolutions[i].contactId : 'create'}
                    onChange={e => {
                      if (e.target.value === 'create') {
                        setResolution(i, { action: 'create' })
                      } else {
                        const match = r.matches.find(m => m.id === e.target.value)
                        setResolution(i, { action: match.attivo ? 'link' : 'reactivate', contactId: match.id })
                      }
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded min-h-[36px]"
                  >
                    <option value="create">Crea nuovo</option>
                    {r.matches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.attivo ? 'È lo stesso' : 'Riattiva'}: {m.cognome} {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {r.matches.length === 0 && resolutions[i].action !== 'error' && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <Icon icon={ACTION_ICONS.check} size={14} />
                  Nuovo contatto
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={onCancel}>
          <Icon icon={ACTION_ICONS.back} size={18} className="mr-1" />
          Modifica lista
        </Button>
        <Button onClick={() => onConfirm(resolutions)} disabled={hasErrors}>
          {hasErrors ? 'Correggi gli errori prima di confermare' : 'Conferma import'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/contatti/BulkImportReview.jsx
git commit -m "feat: add BulkImportReview — duplicate detection review with color-coded rows"
```

---

## Task 6: BulkImportModal Component

**Files:**
- Create: `src/components/contatti/BulkImportModal.jsx`

- [ ] **Step 1: Create BulkImportModal**

Orchestrates the full flow: grid → review → confirm. Owns the row state.

```jsx
import { useState } from 'react'
import { BulkImportGrid, makeEmptyRows } from './BulkImportGrid'
import { BulkImportReview } from './BulkImportReview'
import { useContactsStore } from '../../hooks/useContacts'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { TIPOLOGIA_IMPORT } from '../../lib/constants'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'

export function BulkImportModal({ open, eventId, onComplete, onClose }) {
  const [step, setStep] = useState('grid') // 'grid' | 'review'
  const [rows, setRows] = useState(() => makeEmptyRows(5))
  const [reviewData, setReviewData] = useState(null)
  const [loading, setLoading] = useState(false)

  const findDuplicates = useContactsStore(s => s.findDuplicates)
  const bulkCreateContacts = useContactsStore(s => s.bulkCreateContacts)
  const reactivateContacts = useContactsStore(s => s.reactivateContacts)
  const bulkAddParticipants = useParticipantsStore(s => s.bulkAddParticipants)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)

  if (!open) return null

  const handleVerify = async (nonEmptyRows, validationErrors) => {
    // Build error map by row index
    const errorMap = {}
    validationErrors.forEach(e => {
      if (!errorMap[e.row]) errorMap[e.row] = []
      errorMap[e.row].push(e)
    })

    setLoading(true)
    const { data, error } = await findDuplicates(nonEmptyRows)
    setLoading(false)

    if (error) { addToast(error, 'error'); return }

    // Merge validation errors into results
    const results = data.map((d, i) => ({
      ...d,
      errors: errorMap[i] || [],
    }))

    setReviewData(results)
    setStep('review')
  }

  const handleConfirm = async (resolutions) => {
    setLoading(true)

    const toCreate = []
    const toReactivate = []
    const contactIds = [] // final contact IDs for event assignment

    reviewData.forEach((r, i) => {
      const res = resolutions[i]
      if (res.action === 'create') {
        const mapping = TIPOLOGIA_IMPORT[r.row.tipologia] || {}
        toCreate.push({
          nome: r.row.nome.trim(),
          cognome: r.row.cognome.trim(),
          tipo_contatto: mapping.tipo_contatto || 'altro',
          ruolo_medico: mapping.ruolo_medico || null,
          azienda: r.row.azienda.trim() || null,
          citta: r.row.citta.trim() || null,
          email: r.row.email.trim() || null,
          telefono: r.row.telefono.trim() || null,
          note_salute: r.row.note_salute.trim() || null,
          created_by: profile.id,
          proprietario_id: profile.ruolo === 'commerciale' ? profile.id : null,
          _rowIndex: i, // track for event assignment
        })
      } else if (res.action === 'link') {
        contactIds.push({ index: i, contactId: res.contactId })
      } else if (res.action === 'reactivate') {
        toReactivate.push(res.contactId)
        contactIds.push({ index: i, contactId: res.contactId })
      }
    })

    // 1. Create new contacts
    let createdCount = 0
    if (toCreate.length > 0) {
      const payloads = toCreate.map(({ _rowIndex, ...rest }) => rest)
      const { data: created, error } = await bulkCreateContacts(payloads)
      if (error) { addToast(`Errore creazione: ${error}`, 'error'); setLoading(false); return }
      createdCount = created.length
      // Map created contacts back to their row indices
      toCreate.forEach((tc, ci) => {
        if (created[ci]) contactIds.push({ index: tc._rowIndex, contactId: created[ci].id })
      })
    }

    // 2. Reactivate inactive contacts
    if (toReactivate.length > 0) {
      const { error } = await reactivateContacts(toReactivate)
      if (error) addToast(`Errore riattivazione: ${error}`, 'warning')
    }

    // 3. Add participants to event (if eventId provided)
    let insertedCount = 0
    let skippedCount = 0
    if (eventId && contactIds.length > 0) {
      const participants = contactIds.map(({ index, contactId }) => ({
        contactId,
        tipo: reviewData[index].row.ruolo_evento || 'discente',
        note: reviewData[index].row.note_evento?.trim() || null,
      }))
      const { data: result, error } = await bulkAddParticipants(eventId, participants)
      if (error) { addToast(`Errore assegnazione: ${error}`, 'error'); setLoading(false); return }
      insertedCount = result.inserted
      skippedCount = result.skipped
    }

    setLoading(false)

    // Success message
    const parts = []
    if (createdCount > 0) parts.push(`${createdCount} contatti creati`)
    if (toReactivate.length > 0) parts.push(`${toReactivate.length} riattivati`)
    if (contactIds.length - createdCount - toReactivate.length > 0) parts.push(`${contactIds.length - createdCount - toReactivate.length} già esistenti collegati`)
    if (eventId && insertedCount > 0) parts.push(`${insertedCount} assegnati all'evento`)
    if (skippedCount > 0) parts.push(`${skippedCount} già presenti nell'evento`)
    addToast(parts.join(', ') || 'Import completato', 'success')

    // Reset and close
    setStep('grid')
    setRows(makeEmptyRows(5))
    setReviewData(null)
    onComplete()
  }

  const handleClose = () => {
    setStep('grid')
    setRows(makeEmptyRows(5))
    setReviewData(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'grid' ? 'Importa contatti' : 'Verifica duplicati'}
            </h2>
            <p className="text-sm text-gray-500">
              {step === 'grid'
                ? (eventId ? 'Compila la tabella e i contatti verranno creati e assegnati all\'evento' : 'Compila la tabella per aggiungere contatti alla rubrica')
                : 'Controlla i risultati e risolvi eventuali duplicati'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px]" aria-label="Chiudi">
            <Icon icon={ACTION_ICONS.close} size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <LoadingSkeleton lines={8} />
          ) : step === 'grid' ? (
            <BulkImportGrid
              rows={rows}
              onRowsChange={setRows}
              showEventColumns={!!eventId}
              onSubmit={handleVerify}
            />
          ) : (
            <BulkImportReview
              results={reviewData}
              onConfirm={handleConfirm}
              onCancel={() => setStep('grid')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/contatti/BulkImportModal.jsx
git commit -m "feat: add BulkImportModal — orchestrates bulk import grid → review → confirm flow"
```

---

## Task 7: Integration — ContattiList and EventPersoneTab

**Files:**
- Modify: `src/pages/contatti/ContattiList.jsx`
- Modify: `src/components/eventi/EventPersoneTab.jsx`

- [ ] **Step 1: Add import button to ContattiList**

In `ContattiList.jsx`:

1. Add imports at top:
```jsx
import { BulkImportModal } from '../../components/contatti/BulkImportModal'
```

2. Add state:
```jsx
const [showImport, setShowImport] = useState(false)
```

3. Add a second button in the `PageHeader` action area. Replace the `action` prop to include both buttons:
```jsx
action={canCreate && (
  <div className="flex gap-2">
    <Button variant="secondary" onClick={() => setShowImport(true)}>
      <Icon icon={ACTION_ICONS.upload} size={18} />
      <span className="ml-2">Importa</span>
    </Button>
    <Button onClick={() => setShowForm(true)}>
      <Icon icon={CONTATTI_ICONS.aggiungi} size={18} />
      <span className="ml-2">Nuovo contatto</span>
    </Button>
  </div>
)}
```

4. Add modal before closing `</div>`:
```jsx
<BulkImportModal
  open={showImport}
  onComplete={() => { setShowImport(false); fetchContacts() }}
  onClose={() => setShowImport(false)}
/>
```

- [ ] **Step 2: Add import button to EventPersoneTab**

In `EventPersoneTab.jsx`:

1. Add import at top:
```jsx
import { BulkImportModal } from '../contatti/BulkImportModal'
```

2. Add state (alongside existing state):
```jsx
const [showImport, setShowImport] = useState(false)
```

3. In the Partecipanti section header (the `<div>` with "Aggiungi" button, around line 134-141), add "Importa lista" button before the existing "Aggiungi" button:
```jsx
{canEditPart && !partForm && (
  <div className="flex gap-2">
    <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
      <Icon icon={ACTION_ICONS.upload} size={16} />
      <span className="ml-1">Importa lista</span>
    </Button>
    <Button variant="secondary" size="sm" onClick={() => setPartForm({ contact: null, tipo: 'discente' })}>
      <Icon icon={ACTION_ICONS.add} size={16} />
      <span className="ml-1">Aggiungi</span>
    </Button>
  </div>
)}
```

4. Add modal before the `<ConfirmDialog>` at the bottom:
```jsx
<BulkImportModal
  open={showImport}
  eventId={event.id}
  onComplete={() => { setShowImport(false); fetchEventParticipants(event.id) }}
  onClose={() => setShowImport(false)}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Manual test — ContattiList**

1. Go to `/contatti`
2. Click "Importa"
3. Fill 2-3 rows with test data (e.g. "Rossi Mario Medico Test Hospital")
4. Click "Verifica e importa"
5. Review screen should show green rows (new contacts)
6. Click "Conferma import"
7. Toast: "3 contatti creati"
8. Contacts appear in the list

- [ ] **Step 5: Manual test — EventPersoneTab**

1. Go to an existing event → tab "Persone"
2. Click "Importa lista" in the Partecipanti section
3. Fill rows with the real data from Federica's email (Omar El Ezzo, Virginia Cinelli, etc.)
4. Click "Verifica e importa"
5. If contacts were already created in step 4, they show as yellow (match found)
6. Resolve matches → "Conferma import"
7. Participants appear in the event's Persone tab

- [ ] **Step 6: Commit**

```bash
git add src/pages/contatti/ContattiList.jsx src/components/eventi/EventPersoneTab.jsx
git commit -m "feat: integrate bulk import — Importa button in ContattiList + Importa lista in EventPersoneTab"
```

---

## Task 8: Build Verification

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: no errors, no warnings.

- [ ] **Step 2: End-to-end test with Federica's data**

Import the full list from the email:
1. Open the event "Corso MMC Monteviale 16-17 aprile"
2. Tab Persone → Importa lista
3. Enter all 21 discenti + set ruolo "Discente" for all
4. Verifica → all green (first time)
5. Conferma → toast "21 contatti creati, 21 assegnati all'evento"
6. All participants visible in the Persone tab

- [ ] **Step 3: Final commit if any fixes needed**
