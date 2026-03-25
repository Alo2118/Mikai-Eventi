# Bulk Contact Import — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Context:** During initial rollout, Nicola imports participant lists from emails (typically sent by Federica as tables). Manual one-by-one entry is too slow for 20+ people per event. This feature bridges the gap until the app is widely adopted.

---

## Entry Points

### 1. Pagina Contatti
- Button "Importa" in PageHeader
- Opens the import grid
- Creates contacts in rubrica only (no event assignment)
- Columns: cognome, nome, tipologia, ospedale/ente, città, email, telefono, allergie

### 2. Tab Persone dell'evento
- Button "Importa lista" next to "Aggiungi" in the Partecipanti section
- Opens the import grid with additional event-specific columns
- Creates contacts in rubrica AND assigns them to the event as participants
- Additional columns: ruolo evento, note evento

---

## Import Grid

Editable table with these columns:

| Column | Required | Field type | DB mapping |
|--------|----------|-----------|------------|
| Cognome | Yes | text | `contacts.cognome` |
| Nome | Yes | text | `contacts.nome` |
| Tipologia | Yes | select | See mapping below |
| Ospedale/Ente | No | text | `contacts.azienda` |
| Città | No | text | `contacts.citta` (new field) |
| Email | No | text | `contacts.email` |
| Telefono | No | text | `contacts.telefono` |
| Allergie/intolleranze | No | text | `contacts.note_salute` (new field) |
| Ruolo evento | Yes (event only) | select | `event_participants.tipo` |
| Note evento | No (event only) | text | `event_participants.note` (existing field) |

### Tipologia select → DB mapping

The select shows familiar labels from Federica's emails. DB stores the correct enum values:

| Select label | `tipo_contatto` | `ruolo_medico` |
|-------------|-----------------|----------------|
| Medico | `medico` | `medico` |
| Specializzando | `medico` | `specializzando` |
| Strumentista | `tecnico` | `strumentista` |
| Fornitore | `fornitore` | — |
| Tecnico | `tecnico` | — |
| Istituzionale | `istituzionale` | — |
| Altro | `altro` | — |

**Note:** `ruolo_medico` is a free-text column in the DB and in `ContactForm`. The bulk import writes controlled values (`medico`, `specializzando`, `strumentista`) but the single-contact form allows arbitrary text. This inconsistency is accepted for now — a future improvement should convert `ContactForm.ruolo_medico` to a select with the same options for data consistency.

### Ruolo evento select (event import only)

Maps to `event_participants.tipo` enum:
- Discente → `discente`
- Relatore esterno → `relatore_esterno`
- Ospite → `ospite`
- Accompagnatore → `accompagnatore`

### Grid behavior

- Starts with 5 empty rows
- Button "+ Aggiungi righe" adds 5 more
- Rows with all fields empty are ignored on submit
- Tab key moves between cells for fast data entry

---

## Duplicate Detection (Match + Review)

### Flow

1. User fills the grid and clicks "Verifica e importa"
2. System searches for matches by **cognome + nome** (case-insensitive, trimmed) in `contacts` table
3. Results shown in a review screen:
   - **Green rows** — no match found → new contact will be created
   - **Yellow rows** — match found → shows existing contact details (name, ospedale). User chooses:
     - "È lo stesso" → link to existing contact (no duplicate created)
     - "Crea nuovo" → create as new contact anyway
   - **Red rows** — validation errors (missing required fields) → must fix before proceeding
4. User clicks "Conferma import" to execute

### Match algorithm

```sql
SELECT id, nome, cognome, azienda, tipo_contatto, attivo
FROM contacts
WHERE LOWER(TRIM(cognome)) = LOWER(TRIM(:cognome))
  AND LOWER(TRIM(nome)) = LOWER(TRIM(:nome))
```

Includes inactive contacts. The review screen shows:
- **Yellow rows** — active match found → "È lo stesso?" / "Crea nuovo"
- **Orange rows** — inactive match found → "Riattiva?" / "Crea nuovo"

If multiple matches found, show all and let user pick.

---

## Database Changes

### New field: `contacts.note_salute`
- Type: `text`
- Purpose: allergies, intolerances, health issues — permanent per-person data
- Nullable, no default

### New field: `contacts.citta`
- Type: `text`
- Purpose: city, used to associate contact with a zone
- Nullable, no default

### Existing field: `event_participants.note`
- Already exists in the DB (migration `20260315000004_people.sql`). No migration needed for this column.

### Migration

Single migration adding:
- Two columns: `contacts.note_salute` and `contacts.citta`
- One RPC function: `find_contact_duplicates`
No enum changes needed.

---

## Store Changes

### `useContactsStore` — new actions

**`findDuplicates(rows[])`** — called at "Verifica" step:
```js
findDuplicates(rows[]) → { data: { row, matches: [] }[], error }
```
- Implemented as a Supabase RPC (`find_contact_duplicates`) that accepts an array of `{nome, cognome}` pairs and performs case-insensitive trimmed matching in SQL. The Supabase JS `.or()` API cannot express `LOWER(TRIM(...))` inside nested `and()` clauses, so an RPC is required.
- Includes both active AND inactive contacts (inactive shown as "disattivato — vuoi riattivarlo?")
- Returns standard `{ data, error }` pattern

The RPC function:
```sql
CREATE FUNCTION find_contact_duplicates(pairs jsonb)
RETURNS TABLE(pair_index int, id uuid, nome text, cognome text, azienda text, tipo_contatto contact_tipo, attivo boolean)
AS $$
  SELECT p.idx, c.id, c.nome, c.cognome, c.azienda, c.tipo_contatto, c.attivo
  FROM jsonb_array_elements(pairs) WITH ORDINALITY AS p(val, idx)
  JOIN contacts c
    ON LOWER(TRIM(c.cognome)) = LOWER(TRIM(p.val->>'cognome'))
   AND LOWER(TRIM(c.nome)) = LOWER(TRIM(p.val->>'nome'))
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
```

**`bulkCreateContacts(contacts[])`** — called at "Conferma" step after user resolved all duplicates:
```js
bulkCreateContacts(contacts[]) → { data: contact[], error }
```
- Accepts only the contacts decided to be new (user already resolved matches in review step)
- Sets `created_by: auth.uid()` on all new contacts
- `proprietario_id`: for `commerciale` users, set to `auth.uid()` (required by RLS policy); for admin/ufficio/direzione, left null — assigned later when associating contacts to agents/zones
- Returns standard `{ data, error }` pattern

**Permission note:** Bulk import requires one of:
- Role `admin`, `direzione`, or `ufficio` (unconditional insert)
- Role `area_manager` or `commerciale` with `gestione_contatti` permission
- Role `commerciale` without `gestione_contatti` — can only import with `proprietario_id = self` (RLS enforced)

**`reactivateContacts(ids[])`** — called at "Conferma" step for contacts the user chose to reactivate:
```js
reactivateContacts(ids[]) → { data, error }
```
- Updates `attivo = true` for the given contact IDs
- Returns standard `{ data, error }` pattern

### `useParticipantsStore` — new action

**`bulkAddParticipants(eventId, participants[])`**:
```js
bulkAddParticipants(eventId, participants[]) → { data, error }
```
- Accepts array of `{ contactId, tipo, note }`
- Inserts all as `stato_iscrizione: 'invitato'`
- Skips contacts already assigned to this event (queries existing participants first, filters them out, reports skipped count in result)
- After insert, calls `fetchEventParticipants(eventId)` to update store state (consistent with existing `addParticipant` pattern)
- Returns standard `{ data, error }` pattern (data includes `{ inserted: number, skipped: number }`)

---

## UI Components

### `BulkImportModal` (`src/components/contatti/BulkImportModal.jsx`)
- Orchestrates the full grid → review → confirm flow
- Props: `open`, `eventId?` (if from event context), `onComplete`, `onClose`
- **Owns the row state** — passes `rows`/`onRowsChange` down to child components (controlled pattern)
- Manages current step (grid → review → done)

### `BulkImportGrid` (`src/components/contatti/BulkImportGrid.jsx`)
- The editable grid table (controlled component)
- Props: `rows`, `onRowsChange`, `showEventColumns` (boolean), `onSubmit`
- Renders the grid, handles cell editing, validates on submit
- Does not own row state — receives it from parent

### `BulkImportReview` (`src/components/contatti/BulkImportReview.jsx`)
- The match review screen
- Props: `results` (green/yellow/orange/red rows), `onConfirm`, `onCancel`
- User resolves yellow/orange rows (link, reactivate, or create new), fixes red rows
- Confirm button triggers final import

---

## Integration Points

### Pagina Contatti (`ContattiList.jsx`)
- Add "Importa" button in PageHeader
- Opens `BulkImportModal` without `eventId`
- On complete: refetch contacts

### Tab Persone (`EventPersoneTab.jsx`)
- Add "Importa lista" button in Partecipanti section header
- Opens `BulkImportModal` with `eventId`
- On complete: refetch participants

---

## Error Handling

- Validation errors shown inline on the grid (red border + message on the cell)
- Supabase insert errors shown as toast
- Partial success: if 18 of 20 succeed, show "18 importati, 2 errori" with details
- RLS: import runs as authenticated user — must have `gestione_contatti` permission

---

## Out of Scope

- Excel/CSV file upload (future enhancement)
- Paste-from-Excel detection (future — for now, manual cell entry)
- Auto-mapping città → zone (future — zone assignment done manually after import)
- Bulk import for staff (internal users) — staff are added from the existing user dropdown
