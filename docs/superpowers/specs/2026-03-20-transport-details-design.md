# Transport Details — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Context:** The logistics tab currently only tracks booking status for transports. Real event emails (from Federica) contain structured transport data: train/flight codes, times, drivers, pickup times. This enhancement adds structured fields and a "copy to group" feature for fast entry.

---

## Database Changes

### New enum: `trasporto_mezzo`

Values: `treno`, `volo`, `auto`, `navetta`, `indipendente`

Must be in a **separate migration** from the ALTER TABLE (PostgreSQL enum ADD VALUE transaction rule).

### New columns on `event_trasporti`

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| `mezzo` | `trasporto_mezzo` | Transport mode | `treno` |
| `codice` | `text` | Train/flight code + route (free text) | `FR9728`, `AZ1605 AHO→LIN` |
| `orario` | `timestamptz` | Departure date+time | `2026-04-16 12:32:00+02` |
| `autista` | `text` | Driver/pickup person name | `Rudatis` |
| `orario_pickup` | `timestamptz` | Pickup date+time | `2026-04-17 14:45:00+02` |

All nullable. The `codice` field intentionally conflates booking code and route info as free text — the legacy `luogo_partenza`/`luogo_arrivo` fields are not reintroduced (YAGNI).

**Why `timestamptz` instead of `time`:** Events span multiple days. Andata may be day 1, ritorno day 2. A `time`-only field loses the date context. Using `timestamptz` captures both day and time, which is critical for multi-day events and cross-event logistics views.

### Migrations

1. **Migration A** (enum only): `CREATE TYPE trasporto_mezzo AS ENUM (...)`
2. **Migration B** (columns): `ALTER TABLE event_trasporti ADD COLUMN ...` for all 5 new columns

**Note:** A legacy `mezzo_tipo` enum exists from migration `20260315000005` (used only by `event_logistics_legacy` table). It has different values (`aereo` vs `volo`, `bus` vs `navetta`). Do not reuse or extend it — create `trasporto_mezzo` as a new distinct enum.

---

## UI: Transport Detail Form

### Where it appears

In the `EventLogisticaTab`, clicking on a transport cell (or "+Andata"/"+Ritorno") opens an **inline form** below the row — same pattern as the staff/participant add forms in `EventPersoneTab`.

### Form fields

| Field | Component | Visible when |
|-------|-----------|-------------|
| Mezzo | `<select>` | Always |
| Codice | `<input text>` | mezzo != `indipendente` AND mezzo != `auto` |
| Orario | `<input datetime-local>` | mezzo != `indipendente` |
| Autista | `<input text>` | mezzo != `indipendente` AND mezzo != `auto` |
| Orario pickup | `<input datetime-local>` | mezzo != `indipendente` AND mezzo != `auto` |
| Stato | `<select>` | Always |
| Note | `<textarea>` | Always |

When `mezzo = 'indipendente'`: only mezzo + stato + note are shown.
When `mezzo = 'auto'`: mezzo + orario + stato + note (no codice/autista/pickup — they drive themselves).

### Transport cell display (in the logistics table)

Each andata/ritorno cell shows a compact summary:
- **Line 1:** Mezzo icon + codice + orario (formatted as `HH:mm`)
- **Line 2:** Autista + pickup orario (if present, smaller text)
- **Line 3:** Status badge

Examples:
- Train: `[train icon] FR9728 12:32` / `Rudatis pickup 14:45` / `[Prenotato]`
- Flight: `[plane icon] AZ1605 10:05` / `Alberto` / `[Confermato]`
- Independent: `[user-x icon] Indipendente` / `[—]`

Icons: use lucide-react icons added to `icons.js` in a new `TRASPORTO_ICONS` category (TrainFront, Plane, Car, Bus, UserX for indipendente).

---

## "Copia a..." Feature

### Flow

1. After saving a transport record, a **"Copia a..."** button appears next to it
2. Opens a dropdown/popover showing event participants and staff who **don't yet have a transport for that direction**
3. Multi-select with checkboxes (name + azienda/ruolo for identification)
4. Click "Copia" → creates new transport records for all selected

### Critical implementation details

**XOR constraint:** `event_trasporti` has `CHECK (num_nonnulls(user_id, contact_id) = 1)`. The copy MUST build a fresh payload per target:
- If target is staff → set `user_id`, leave `contact_id` null
- If target is participant → set `contact_id`, leave `user_id` null
- Copy ONLY: `mezzo`, `codice`, `orario`, `autista`, `orario_pickup`, `direzione`, `stato` from source
- Never spread the source record (would carry both user_id and contact_id)

**Namespace-aware "already has transport" check:**
- For staff: check `event_trasporti WHERE user_id = :id AND direzione = :dir AND event_id = :eid`
- For participants: check `event_trasporti WHERE contact_id = :id AND direzione = :dir AND event_id = :eid`

### Store action

```js
copyTrasportoToMany(sourceId, targetPersons[], eventId) → { data, error }
```
- `targetPersons` = array of `{ userId?, contactId? }` (exactly one set per item)
- Reads source record, builds N fresh payloads, inserts batch
- Returns standard `{ data, error }`

---

## Constants

### `MEZZO_TRASPORTO` in `constants.js`

```js
export const MEZZO_TRASPORTO = {
  treno: 'Treno',
  volo: 'Volo',
  auto: 'Auto',
  navetta: 'Navetta',
  indipendente: 'Indipendente',
}
```

### `TRASPORTO_ICONS` in `icons.js`

```js
export const TRASPORTO_ICONS = {
  treno: TrainFront,  // `Train` does not exist in lucide-react — use TrainFront
  volo: Plane,
  auto: Car,
  navetta: Bus,
  indipendente: UserX,
}
```

---

## Store Changes

### `useLogisticsStore` — modified actions

**`createTrasporto(payload)`** — already exists. No change needed, just pass new fields in payload.

**`updateTrasporto(id, updates)`** — already exists. No change needed.

### New action

**`copyTrasportoToMany(sourceId, targetPersons, eventId)`**:
```js
copyTrasportoToMany(sourceId, targetPersons, eventId) → { data, error }
```
- Fetches source record by ID
- Extracts copyable fields: mezzo, codice, orario, autista, orario_pickup, direzione, stato
- For each target: builds fresh payload with correct user_id/contact_id + copied fields
- Batch inserts with `.select()` to get full records back
- Appends new records to local `trasporti` state (`set(s => ({ trasporti: [...s.trasporti, ...newRecords] }))`) — does NOT call `fetchEventLogistics` to avoid loading flash
- Returns `{ data, error }`

---

## Component Changes

### `EventLogisticaTab.jsx` — modifications

1. Transport cells show compact summary (icon + codice + orario + autista + stato) instead of just stato badge
2. Clicking a cell opens inline detail form
3. "Copia a..." button per transport record
4. Form handles conditional field visibility based on mezzo value

### New subcomponent: `TrasportoForm.jsx` (`src/components/eventi/TrasportoForm.jsx`)

Inline form for transport detail editing. Props: `trasporto` (existing record or null for new), `eventId`, `personId`, `personType` ('staff'|'participant'), `direzione`, `onSave`, `onCancel`.

### New subcomponent: `TrasportoCopyDialog.jsx` (`src/components/eventi/TrasportoCopyDialog.jsx`)

Popover/dialog for selecting copy targets. Props: `sourceRecord`, `eventId`, `direzione`, `staff`, `participants`, `existingTrasporti`, `onCopy`, `onClose`.

---

## Edge Cases

### Person removed from event after transport booked
`event_trasporti` FK to `users`/`contacts` has no cascade. If a person is removed from `event_staff`/`event_participants`, their transport record remains orphaned in the DB. The logistics tab won't show it (list is built from staff + participants), so it's invisible but harmless. A future cleanup job can purge orphans. Not blocking for this feature.

### Duplicate transport for same person+direction
`event_trasporti` has no unique constraint on `(event_id, user_id/contact_id, direzione)`. The UI prevents this by hiding people who already have a transport for that direction in the "Copia a..." list, and by checking before creating via "+Andata"/"+Ritorno". But a race condition or direct DB edit could create duplicates. Acceptable risk for now.

---

## Out of Scope

- Bulk import grid for transports (future — use "Copia a..." for groups instead)
- Route/tratta as separate structured fields (stays as free text in `codice`)
- Integration with external booking systems
- Automatic navetta scheduling
- Cross-event transport view (exists as `LogisticaPage`, already works with new fields)
