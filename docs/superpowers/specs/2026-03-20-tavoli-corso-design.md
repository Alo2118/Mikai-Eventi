# Tavoli Corso — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Context:** Internal surgical courses are organized by "tavoli" (workstations). Each table has its own set of materials (demo kits), assigned students (discenti), and one or more trainers (formatori). The number of tables varies per course (3-6). Materials are the same across all tables. Student distribution is decided by management close to the event date.

---

## Database Changes

### New table: `event_tavoli`

The table/workstation unit within an event.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | DEFAULT gen_random_uuid() |
| `event_id` | uuid NOT NULL | FK events(id) ON DELETE CASCADE |
| `numero` | int NOT NULL | Table number (1, 2, 3...) |
| `nome` | text | Optional label ("Tavolo A", "Arto superiore") |
| `note` | text | |
| `created_at` | timestamptz | DEFAULT now() |

UNIQUE constraint on `(event_id, numero)` — no duplicate table numbers per event.

### New table: `event_tavoli_formatori`

Links tables to trainers (from event staff).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | DEFAULT gen_random_uuid() |
| `tavolo_id` | uuid NOT NULL | FK event_tavoli(id) ON DELETE CASCADE |
| `staff_id` | uuid NOT NULL | FK event_staff(id) ON DELETE CASCADE |

UNIQUE constraint on `(tavolo_id, staff_id)` — a trainer can only be assigned to a table once.

### New table: `event_tavoli_discenti`

Links tables to students (from event participants).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | DEFAULT gen_random_uuid() |
| `tavolo_id` | uuid NOT NULL | FK event_tavoli(id) ON DELETE CASCADE |
| `participant_id` | uuid NOT NULL | FK event_participants(id) ON DELETE CASCADE |

UNIQUE constraint on `(tavolo_id, participant_id)` — a student can only be at one table.
Additional UNIQUE on `(participant_id)` — prevents a discente from being on two different tables. This is safe because `event_participants.id` is already scoped to a single event (UNIQUE on `event_id, contact_id` in `event_participants`), so a bare unique on `participant_id` here is equivalent to "one table per discente per event".

### New table: `event_tavoli_materiale`

Links tables to products (from catalog).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | DEFAULT gen_random_uuid() |
| `tavolo_id` | uuid NOT NULL | FK event_tavoli(id) ON DELETE CASCADE |
| `product_id` | uuid NOT NULL | FK products(id) |
| `note` | text | |

UNIQUE constraint on `(tavolo_id, product_id)` — a product can be assigned to a table only once.

**Why `products` and not `materials`:** A tavolo needs a product type (e.g., "Kit Demo Polso XS") not a specific physical inventory item. The `products` table holds the catalog. The `materials` table holds individual physical items with serial numbers. When assigning "4 kit per tavolo", we're saying which product types are needed, not which specific serial-numbered items.

### RLS Policies

All four tables:
- **Read:** all authenticated users
- **Write (insert/update/delete):** users with `gestione_staff_evento` permission (same as event staff management — the people managing the course setup)

### Migration

Single migration file creating all four tables + RLS policies. No new enums needed.

---

## Store: `useTavoliStore`

**File:** `src/hooks/useTavoli.js`

New Zustand store with standard `{ data, error }` pattern.

### State
```js
{
  tavoli: [],        // array of tavolo objects with nested formatori, discenti, materiale
  loading: false,
}
```

### Actions

**`fetchEventTavoli(eventId)`**
- Fetches tavoli with nested joins:
  ```
  event_tavoli(*,
    formatori:event_tavoli_formatori(*, staff:event_staff(*, user:users(id, nome, cognome))),
    discenti:event_tavoli_discenti(*, participant:event_participants(*, contact:contacts(id, nome, cognome, azienda))),
    materiale:event_tavoli_materiale(*, product:products(id, nome, codice))
  )
  ```
- Orders by `numero`

**`createTavoli(eventId, count)`**
- Creates N tavoli with incrementing `numero` (starting from max existing + 1)
- Returns `{ data, error }`
- Refetches after success

**`removeTavolo(tavoloId)`**
- Deletes a tavolo (CASCADE removes formatori/discenti/materiale assignments)
- Updates local state

**`updateTavolo(tavoloId, updates)`**
- Updates nome/note on a tavolo
- Updates local state

**`addFormatore(tavoloId, staffId)`**
- Inserts into `event_tavoli_formatori`
- Refetches tavoli

**`removeFormatore(id)`**
- Deletes from `event_tavoli_formatori`
- Updates local state

**`addDiscente(tavoloId, participantId)`**
- Inserts into `event_tavoli_discenti`
- Refetches tavoli

**`removeDiscente(id)`**
- Deletes from `event_tavoli_discenti`
- Updates local state

**`assignProductToAllTavoli(eventId, productIds[])`**
- Fetches current tavoli with their materiale assignments
- For each tavolo × each productId: skip if already assigned, otherwise add to insert batch
- Single batch insert of all new (tavolo_id, product_id) pairs
- Refetches tavoli

**`removeProduct(id)`**
- Deletes from `event_tavoli_materiale`
- Updates local state

**`distributeDiscenti(eventId, mode)`**
- `mode = 'auto'`: distributes unassigned discenti evenly across tavoli (round-robin by tavolo numero)
- Two-step query to find unassigned discenti:
  1. Fetch all `tavolo_id`s for this event from `event_tavoli WHERE event_id = :eventId`
  2. Fetch all assigned `participant_id`s from `event_tavoli_discenti WHERE tavolo_id IN (:tavoloIds)`
  3. Filter `event_participants WHERE event_id = :eventId AND tipo = 'discente'` excluding assigned IDs
- Round-robin assignment: first unassigned discente → tavolo with fewest discenti, repeat
- Batch inserts
- Refetches tavoli

---

## UI: Tavoli Section

### Where it appears

New tab **"Tavoli"** in the event detail page, visible only for events with `tipo_evento` = `corso` or `cadaver_lab` (event types that use workstations).

### Layout

**Header:** "Tavoli" + count + action buttons

**Action buttons:**
- "Crea tavoli" — input number (1-10) + confirm. Creates N empty tavoli.
- "Assegna kit a tutti" — opens material picker, selected materials get assigned to ALL tavoli.
- "Distribuisci discenti" — auto-distributes unassigned discenti evenly.

**Tavoli grid:** Responsive cards, `grid-cols-1 md:grid-cols-2` (max 2 columns — tables can be tall).

### Tavolo Card

Each card shows:

```
┌─────────────────────────────────┐
│ Tavolo 1          [nome edit]   │
│                          [X]    │
│─────────────────────────────────│
│ Formatori                       │
│ [select staff] [+]              │
│ • Montresor Paolo      [x]     │
│ • Abbiati Alberto      [x]     │
│─────────────────────────────────│
│ Materiale                       │
│ [select material] [+]           │
│ • Kit Demo Polso XS    [x]     │
│ • Kit Demo Polso S     [x]     │
│─────────────────────────────────│
│ Discenti (5)                    │
│ [select participant] [+]        │
│ • El Ezzo Omar         [x]     │
│ • Cinelli Virginia     [x]     │
│ • Masci Giulia         [x]     │
│ • Speziale Tommaso     [x]     │
│ • Trotto Stefano       [x]     │
│─────────────────────────────────│
│ Note: _______________           │
└─────────────────────────────────┘
```

**Formatori select:** filtered to ALL event staff (any ruolo_evento — a formatore at a table might have any staff role), excluding those already assigned to this tavolo.

**Materiale select:** filtered to products already requested/approved for this event (from `event_materials` joined to `products`), excluding those already on this tavolo. If no event material requests exist, show all products from the catalog.

**Discenti select:** filtered to event participants with tipo = 'discente', excluding those already assigned to ANY tavolo in this event.

### Delete tavolo

"X" button on the card header → ConfirmDialog → removes tavolo and all its assignments.

---

## Component Structure

### `EventTavoliTab.jsx` (`src/components/eventi/EventTavoliTab.jsx`)

Main tab component. Manages:
- Fetching tavoli on mount
- "Crea tavoli" action with number input
- "Assegna kit a tutti" action
- "Distribuisci discenti" action
- Renders grid of TavoloCard components

Props: `event`, `staff` (from useStaffStore), `participants` (from useParticipantsStore)

### `TavoloCard.jsx` (`src/components/eventi/TavoloCard.jsx`)

Individual table card. Manages:
- Display of formatori, materiale, discenti lists
- Add/remove for each list
- Inline select dropdowns for adding
- Note editing

Props: `tavolo`, `availableStaff`, `availableMaterials`, `availableDiscenti`, `canEdit`

---

## Integration

### Route/Tab

Add "Tavoli" tab in `EventiDetail.jsx` tab list, conditionally shown when `event.tipo_evento` is `corso` or `cadaver_lab`.

### Navigation

The tab appears between "Persone" and "Logistica" in the tab order (logical flow: define people → organize into tables → arrange logistics).

### Constants

Add to `src/lib/constants.js`:
```js
// Tipi evento che usano i tavoli
export const TIPI_EVENTO_CON_TAVOLI = ['corso', 'cadaver_lab']
// Note: live_surgery excluded intentionally — live surgery events use a different setup
// (operating theatre, not workstation tables). Can be added later if needed.
```

### Icons

Add a `TAVOLI_ICONS` entry in `icons.js` using `LayoutGrid` (or similar) from lucide-react for the tab icon.

---

## Edge Cases

### Discente removed from event after table assignment
FK is `ON DELETE CASCADE` from `event_participants` — removing a participant automatically removes their tavolo assignment. The UI will reflect this on next fetch.

### Staff member removed from event after formatore assignment
Same CASCADE behavior via `event_staff` FK.

### Product deleted from catalog
FK to `products` has no CASCADE (product deletion is rare and should be blocked if assigned). The UI should handle this gracefully (show "prodotto rimosso" if the join returns null).

### Event with no tavoli
Normal state — the tab shows an empty state with "Crea tavoli" CTA.

### Changing number of tavoli after assignment
Users can add more tavoli later. Removing a tavolo that has assignments shows a ConfirmDialog warning.

---

## Out of Scope

- Drag-and-drop for discenti assignment (future — for now use select dropdowns)
- Template tavoli configurations (future — save a tavolo setup and reapply to new events)
- Material quantity per tavolo (1 unit per material per tavolo is assumed)
- Printing/export of tavolo assignments (future — Phase 6)
