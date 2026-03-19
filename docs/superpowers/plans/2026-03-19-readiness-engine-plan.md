# Readiness Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Event Readiness Engine — template-based activity tracking, convergence dashboard, role-differentiated home pages, cross-event logistics view, and active inventory management.

**Architecture:** Database-first approach. New migrations extend existing schema (template_items evolution, event_activities replacing event_tasks, magazzini table, enum changes). Frontend follows existing Zustand store + React component patterns. Role-based dashboard routing via permissions. Material position tracking via DB trigger rewrite.

**Tech Stack:** React 19, Zustand 5, Supabase 2, TailwindCSS v4, date-fns 4 (it locale), lucide-react via centralized Icon system.

**Spec:** `docs/superpowers/specs/2026-03-19-readiness-engine-design.md`

**Important conventions (from CLAUDE.md):**
- All UI text in Italian, no jargon
- Named exports only (except App.jsx)
- Icons only via `src/lib/icons.js` → `<Icon>` component, never import lucide-react directly
- Supabase calls only in Zustand stores (`src/hooks/`), never in components
- Zustand selectors: `useStore(s => s.field)`, never destructure full store
- 48px min touch targets, mobile-first responsive
- Files < 300 lines, functions < 50 lines
- No test framework configured — verify with `npm run build` at each task

---

## File Structure

### New files to create

```
supabase/migrations/
├── 20260319100000_readiness_enums.sql          — New enum values (permission_type, movement_tipo)
├── 20260319100001_readiness_schema.sql         — magazzini table, template_items evolution, event_activities, event drop
├── 20260319100002_readiness_rls.sql            — RLS for new tables
├── 20260319100003_readiness_triggers.sql       — sync_material_position rewrite, auto-transition trigger
├── 20260319100004_readiness_seed.sql           — Seed magazzini, update template_items seed data

src/hooks/
├── useActivities.js                            — Zustand store: event_activities CRUD, template instantiation

src/pages/
├── dashboard/
│   ├── DashboardRouter.jsx                     — Smart redirect based on role/permissions
│   ├── DashboardOperativa.jsx                  — Ufficio/Magazzino cross-event activity dashboard
│   └── DashboardStrategica.jsx                 — Direzione: approvals + semaphores + budget
├── logistica/
│   ├── LogisticaPage.jsx                       — Shell with tabs: Timeline / Matrice / Rientri / Inventario
│   ├── LogisticaTimeline.jsx                   — Shipping timeline by day
│   ├── LogisticaMatrice.jsx                    — Event × status matrix
│   ├── LogisticaRientri.jsx                    — Overdue returns tab
│   └── LogisticaInventario.jsx                 — Full inventory view

src/components/eventi/
├── EventPreparazioneTab.jsx                    — Convergence dashboard (progress, activities, gates)
├── ActivityCard.jsx                            — Single activity card (status, assignee, deadline)
├── ActivityGateBar.jsx                         — Gate-guarded state transition buttons

src/components/dashboard/
├── AlertBanner.jsx                             — Commerciale alert banner (overdue/today/upcoming)

src/pages/attivita/
├── MieAttivitaPage.jsx                         — "Le mie attività" page for commerciale tap-through
```

### Existing files to modify

```
src/lib/constants.js                            — New enums: STATO_ATTIVITA, CATEGORIA_ATTIVITA, POSIZIONE_MATERIALE updates
src/lib/icons.js                                — New icon maps: ATTIVITA_ICONS, ATTIVITA_STATO_ICONS, CATEGORIA_ICONS, NAV_ICONS.logistica
src/App.jsx                                     — New routes: /dashboard, /logistica, /mie-attivita; home redirect
src/components/layout/Sidebar.jsx               — Add Logistica nav item
src/components/layout/BottomBar.jsx             — Fix /profilo dead link
src/pages/eventi/EventiDetail.jsx               — Replace checklist placeholder with PreparazioneTab
src/pages/eventi/EventiList.jsx                 — Add AlertBanner for commerciale role
src/hooks/useEvents.js                          — Separate rejectEvent from cancelEvent, add gate checks
src/hooks/useMaterials.js                       — Update position enum references
src/components/eventi/EventApprovalBar.jsx      — Separate reject/cancel UI, add rifiutato state
src/components/eventi/EventStatusFlow.jsx       — Handle rifiutato as terminal state
src/components/materiale/MaterialMovementForm.jsx — Update position string literals
src/components/materiale/MaterialCard.jsx       — Update position references (if hardcoded)
src/components/ui/StatusBadge.jsx               — No changes needed (reads from maps)
```

---

## Phase A: Database Migrations

### Task 1: New enum values (separate migration — PostgreSQL requirement)

**Files:**
- Create: `supabase/migrations/20260319100000_readiness_enums.sql`

- [ ] **Step 1: Create the enum extension migration**

```sql
-- Readiness Engine: new enum values
-- Must be separate migration from policies that reference them (PostgreSQL limitation)

-- New permission types for activity categories
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_marketing';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_organizzazione';

-- New movement types for logistics tracking
ALTER TYPE movement_tipo ADD VALUE IF NOT EXISTS 'preparazione';
ALTER TYPE movement_tipo ADD VALUE IF NOT EXISTS 'consegna';

-- New event state: rifiutato (separate from cancellato)
ALTER TYPE evento_stato ADD VALUE IF NOT EXISTS 'rifiutato';

-- New material request state for agent custody
ALTER TYPE material_request_stato ADD VALUE IF NOT EXISTS 'chiuso_in_custodia';
```

- [ ] **Step 2: Push migration to verify syntax**

Run: `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319100000_readiness_enums.sql
git commit -m "Add Readiness Engine enum values: permissions, movement types, rifiutato, chiuso_in_custodia"
```

---

### Task 2: Core schema — magazzini, template_items evolution, event_activities

**Files:**
- Create: `supabase/migrations/20260319100001_readiness_schema.sql`

- [ ] **Step 1: Create the schema migration**

```sql
-- Readiness Engine: core schema changes

-- 1. Magazzini table (warehouses as records, not enum)
CREATE TABLE IF NOT EXISTS magazzini (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  indirizzo text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. New enums for activities
CREATE TYPE activity_categoria AS ENUM (
  'logistica', 'marketing', 'materiale', 'organizzazione', 'amministrazione'
);
CREATE TYPE activity_stato AS ENUM (
  'da_fare', 'in_corso', 'completata', 'disattivata'
);
CREATE TYPE verification_type AS ENUM ('manuale', 'automatica');

-- 3. Evolve template_items (checklist rows only)
-- Add new columns
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS categoria activity_categoria;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS permesso_responsabile permission_type;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS dipende_da uuid REFERENCES template_items(id);
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS tipo_verifica verification_type DEFAULT 'manuale';
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS verifica_automatica text;

-- Migrate assegnazione_ruolo_operativo → permesso_responsabile for existing seed data
UPDATE template_items SET permesso_responsabile = 'gestione_marketing'
  WHERE assegnazione_ruolo_operativo = 'marketing';
UPDATE template_items SET permesso_responsabile = 'gestione_spedizioni'
  WHERE assegnazione_ruolo_operativo = 'logistica_spedizioni';
UPDATE template_items SET permesso_responsabile = 'gestione_magazzino'
  WHERE assegnazione_ruolo_operativo = 'logistica_ordini';
UPDATE template_items SET permesso_responsabile = 'gestione_organizzazione'
  WHERE assegnazione_ruolo_operativo = 'segreteria_org';

-- Drop old column after migration
ALTER TABLE template_items DROP COLUMN IF EXISTS assegnazione_ruolo_operativo;

-- 4. Drop event_tasks (replaced by event_activities)
DROP TABLE IF EXISTS event_tasks;

-- 5. Create event_activities
CREATE TABLE event_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_item_id uuid REFERENCES template_items(id),
  descrizione text NOT NULL,
  categoria activity_categoria,
  permesso_responsabile permission_type,
  stato activity_stato NOT NULL DEFAULT 'da_fare',
  deadline date,
  dipende_da uuid REFERENCES event_activities(id),
  obbligatoria boolean DEFAULT true,
  tipo_verifica verification_type DEFAULT 'manuale',
  verifica_automatica text,
  assegnato_a uuid REFERENCES users(id),
  completata_il timestamptz,
  completata_da uuid REFERENCES users(id),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for dashboard queries
CREATE INDEX idx_activities_event ON event_activities(event_id);
CREATE INDEX idx_activities_assegnato ON event_activities(assegnato_a)
  WHERE stato IN ('da_fare', 'in_corso');
CREATE INDEX idx_activities_deadline ON event_activities(deadline)
  WHERE stato IN ('da_fare', 'in_corso');
CREATE INDEX idx_activities_permesso ON event_activities(permesso_responsabile)
  WHERE stato IN ('da_fare', 'in_corso');

-- 6. Add indirizzo_spedizione to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS indirizzo_spedizione text;

-- 7. Add magazzino_id and presso_utente_id to materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS magazzino_id uuid REFERENCES magazzini(id);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS presso_utente_id uuid REFERENCES users(id);

-- 8. Add rifiutato CHECK constraint on events
ALTER TABLE events DROP CONSTRAINT IF EXISTS cancellazione_motivo;
ALTER TABLE events ADD CONSTRAINT motivo_obbligatorio CHECK (
  (stato != 'cancellato' AND stato != 'rifiutato') OR motivo_cancellazione IS NOT NULL
);

-- 9. Add updated_at trigger to event_activities
CREATE TRIGGER set_updated_at_event_activities
  BEFORE UPDATE ON event_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. Add updated_at trigger to magazzini (reuse existing function)
-- Note: magazzini has no updated_at column, skip trigger
```

- [ ] **Step 2: Push migration**

Run: `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319100001_readiness_schema.sql
git commit -m "Add Readiness Engine schema: magazzini, event_activities, template_items evolution"
```

---

### Task 3: RLS policies for new tables

**Files:**
- Create: `supabase/migrations/20260319100002_readiness_rls.sql`

- [ ] **Step 1: Create the RLS migration**

```sql
-- Readiness Engine: RLS policies

-- Magazzini
ALTER TABLE magazzini ENABLE ROW LEVEL SECURITY;
CREATE POLICY "magazzini_read" ON magazzini FOR SELECT USING (true);
CREATE POLICY "magazzini_write" ON magazzini FOR ALL USING (
  has_permission('gestione_magazzino')
);

-- Event Activities
ALTER TABLE event_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_read" ON event_activities FOR SELECT USING (
  can_see_event(event_id)
);
CREATE POLICY "activities_insert" ON event_activities FOR INSERT WITH CHECK (
  can_see_event(event_id)
);
CREATE POLICY "activities_update" ON event_activities FOR UPDATE USING (
  assegnato_a = auth.uid() OR has_permission(permesso_responsabile)
);
CREATE POLICY "activities_delete" ON event_activities FOR DELETE USING (
  has_permission('gestione_utenti')
);
```

- [ ] **Step 2: Push migration**

Run: `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319100002_readiness_rls.sql
git commit -m "Add RLS policies for magazzini and event_activities"
```

---

### Task 4: Trigger rewrite — sync_material_position + auto-transition

**Files:**
- Create: `supabase/migrations/20260319100003_readiness_triggers.sql`

- [ ] **Step 1: Create the triggers migration**

```sql
-- Readiness Engine: trigger updates
-- IMPORTANT: This rewrites sync_material_position atomically with enum value changes

-- 1. Rename material_posizione enum values
-- PostgreSQL 10+ supports ALTER TYPE ... RENAME VALUE
ALTER TYPE material_posizione RENAME VALUE 'magazzino' TO 'in_magazzino';
ALTER TYPE material_posizione RENAME VALUE 'spedito' TO 'in_transito';
ALTER TYPE material_posizione RENAME VALUE 'evento' TO 'presso_evento';
ALTER TYPE material_posizione RENAME VALUE 'agente' TO 'magazzino_agente';

-- 2. Rewrite sync_material_position with new enum values + new fields
CREATE OR REPLACE FUNCTION sync_material_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Try to cast a_posizione to the enum directly
  BEGIN
    UPDATE materials SET
      posizione_attuale = NEW.a_posizione::material_posizione,
      magazzino_id = NEW.a_magazzino_id,
      presso_utente_id = NEW.a_utente_id
    WHERE id = NEW.material_id;
    RETURN NEW;
  EXCEPTION WHEN invalid_text_representation THEN
    -- Fallback: derive position from movement type
    CASE NEW.tipo
      WHEN 'uscita' THEN
        UPDATE materials SET
          posizione_attuale = 'in_transito',
          magazzino_id = NULL,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'rientro' THEN
        UPDATE materials SET
          posizione_attuale = 'in_magazzino',
          magazzino_id = NEW.a_magazzino_id,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'trasferimento' THEN
        UPDATE materials SET
          posizione_attuale = 'in_magazzino',
          magazzino_id = NEW.a_magazzino_id,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'preparazione' THEN
        -- Material is being prepared, still in warehouse
        UPDATE materials SET
          posizione_attuale = 'in_magazzino',
          magazzino_id = NEW.a_magazzino_id,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'consegna' THEN
        UPDATE materials SET
          posizione_attuale = 'presso_evento',
          magazzino_id = NULL,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      ELSE
        NULL; -- Unknown type, don't update
    END CASE;
  END;
  RETURN NEW;
END;
$$;

-- 3. Add new columns to material_movements for magazzino/utente tracking
ALTER TABLE material_movements ADD COLUMN IF NOT EXISTS a_magazzino_id uuid REFERENCES magazzini(id);
ALTER TABLE material_movements ADD COLUMN IF NOT EXISTS a_utente_id uuid REFERENCES users(id);

-- 4. Auto-transition trigger: confermato → in_preparazione
CREATE OR REPLACE FUNCTION auto_transition_in_preparazione()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only fire on status change to in_corso
  IF NEW.stato = 'in_corso' AND (OLD.stato IS NULL OR OLD.stato != 'in_corso') THEN
    -- Guard: only transition if event is currently confermato
    UPDATE events SET stato = 'in_preparazione'
    WHERE id = NEW.event_id AND stato = 'confermato';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_transition_preparazione
  AFTER UPDATE OF stato ON event_activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_in_preparazione();
```

- [ ] **Step 2: Push migration**

Run: `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319100003_readiness_triggers.sql
git commit -m "Rewrite sync_material_position for new enums, add auto-transition trigger"
```

---

### Task 5: Seed data — magazzini + updated template_items

**Files:**
- Create: `supabase/migrations/20260319100004_readiness_seed.sql`

- [ ] **Step 1: Create seed migration**

```sql
-- Readiness Engine: seed data

-- Magazzini
INSERT INTO magazzini (id, nome, indirizzo) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Monteviale', 'Via Monteviale, Monteviale (VI)'),
  ('20000000-0000-0000-0000-000000000002', 'Genova', 'Via Genova, Genova')
ON CONFLICT DO NOTHING;

-- Set magazzino_id for existing materials in 'in_magazzino' position
UPDATE materials SET magazzino_id = '20000000-0000-0000-0000-000000000001'
WHERE posizione_attuale = 'in_magazzino' AND magazzino_id IS NULL;

-- Update template_items with new fields for existing checklist items
-- Workshop template
UPDATE template_items SET
  categoria = 'marketing',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001'
  AND descrizione = 'Preparare locandina';

UPDATE template_items SET
  categoria = 'materiale',
  tipo_verifica = 'automatica',
  verifica_automatica = 'lista_materiale_compilata'
WHERE template_id = '10000000-0000-0000-0000-000000000001'
  AND descrizione = 'Ordinare materiale mancante';

UPDATE template_items SET
  categoria = 'logistica',
  tipo_verifica = 'automatica',
  verifica_automatica = 'materiale_tutto_spedito'
WHERE template_id = '10000000-0000-0000-0000-000000000001'
  AND descrizione = 'Preparare e spedire kit demo';

UPDATE template_items SET
  categoria = 'organizzazione',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001'
  AND descrizione = 'Confermare iscrizioni e inviare promemoria';

UPDATE template_items SET
  categoria = 'organizzazione',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001'
  AND descrizione = 'Verifica finale';

UPDATE template_items SET
  categoria = 'logistica',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001'
  AND descrizione = 'Verificare rientro materiale demo';

UPDATE template_items SET
  categoria = 'amministrazione',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000001'
  AND descrizione = 'Compilare report e chiudere consuntivo';

-- Congresso template
UPDATE template_items SET
  categoria = 'marketing',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000002'
  AND descrizione = 'Preparare materiale marketing';

UPDATE template_items SET
  categoria = 'logistica',
  tipo_verifica = 'automatica',
  verifica_automatica = 'materiale_tutto_spedito'
WHERE template_id = '10000000-0000-0000-0000-000000000002'
  AND descrizione = 'Preparare e spedire kit demo + gadget';

UPDATE template_items SET
  categoria = 'organizzazione',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000002'
  AND descrizione = 'Prenotare hotel e trasporti staff';

UPDATE template_items SET
  categoria = 'logistica',
  tipo_verifica = 'manuale'
WHERE template_id = '10000000-0000-0000-0000-000000000002'
  AND descrizione = 'Verificare rientro materiale';
```

- [ ] **Step 2: Push migration**

Run: `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319100004_readiness_seed.sql
git commit -m "Add Readiness Engine seed data: magazzini, template_items categories"
```

---

## Phase B: Constants, Icons, and Store Foundation

### Task 6: Update constants.js — new enums and updated position values

**Files:**
- Modify: `src/lib/constants.js`

- [ ] **Step 1: Add new enum maps and update existing ones**

Add after the existing `STATO_EVENTO_COLORE` block:

```js
// --- Readiness Engine: Activity enums ---

export const STATO_ATTIVITA = {
  da_fare: 'Da fare',
  in_corso: 'In corso',
  completata: 'Completata',
  disattivata: 'Disattivata',
}

export const STATO_ATTIVITA_COLORE = {
  da_fare: 'gray',
  in_corso: 'mikai',
  completata: 'green',
  disattivata: 'gray',
}

export const CATEGORIA_ATTIVITA = {
  logistica: 'Logistica',
  marketing: 'Marketing',
  materiale: 'Materiale',
  organizzazione: 'Organizzazione',
  amministrazione: 'Amministrazione',
}

export const CATEGORIA_ATTIVITA_COLORE = {
  logistica: 'blue',
  marketing: 'purple',
  materiale: 'emerald',
  organizzazione: 'yellow',
  amministrazione: 'gray',
}
```

Update `STATO_EVENTO` to add `rifiutato`:

```js
export const STATO_EVENTO = {
  proposto: 'Proposto',
  confermato: 'Confermato',
  in_preparazione: 'In preparazione',
  pronto: 'Pronto',
  in_corso: 'In corso',
  concluso: 'Concluso',
  cancellato: 'Cancellato',
  rifiutato: 'Rifiutato',
}
```

Add `rifiutato` to `STATO_EVENTO_COLORE`:

```js
rifiutato: 'red',
```

Update `POSIZIONE_MATERIALE`:

```js
export const POSIZIONE_MATERIALE = {
  in_magazzino: 'In magazzino',
  presso_evento: 'Presso evento',
  magazzino_agente: 'Presso agente',
  in_transito: 'In transito',
  manutenzione: 'In manutenzione',
}
```

Update `POSIZIONE_MATERIALE_COLORE` (if it exists, same key updates).

Add new permission labels to `PERMESSI`:

```js
gestione_marketing: 'Gestione marketing',
gestione_organizzazione: 'Gestione organizzazione',
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (may have warnings about unused imports, fix if so)

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.js
git commit -m "Add Readiness Engine constants: activity states, categories, updated positions"
```

---

### Task 7: Update icons.js — new icon maps

**Files:**
- Modify: `src/lib/icons.js`

- [ ] **Step 1: Add new Lucide imports at the top of the file**

Add to the existing import block (keep alphabetical within the block):

```js
import { Boxes, Calculator, Circle, CircleDot, ClipboardList, Gauge, LayoutDashboard, ListTodo, Lock, PackageCheck, Timer } from 'lucide-react'
```

Note: only import icons not already imported. Check the existing imports first.

- [ ] **Step 2: Add new icon maps**

```js
// Activity states
export const ATTIVITA_STATO_ICONS = {
  da_fare: Circle,          // empty circle
  in_corso: CircleDot,      // half circle
  completata: CheckCircle,  // green check
  in_ritardo: Timer,        // red clock (computed state)
  bloccata: Lock,           // locked (computed state)
  disattivata: XCircle,     // hidden
}

// Activity categories
export const CATEGORIA_ICONS = {
  logistica: Truck,
  marketing: FileText,
  materiale: Package,
  organizzazione: ClipboardList,
  amministrazione: Calculator,
}
```

Update `POSIZIONE_ICONS`:

```js
export const POSIZIONE_ICONS = {
  in_magazzino: Package,
  presso_evento: Calendar,
  magazzino_agente: User,
  in_transito: Truck,
  manutenzione: Wrench,
}
```

Update `STATO_EVENTO_ICONS` — add rifiutato:

```js
rifiutato: XCircle,
```

Add to `NAV_ICONS`:

```js
logistica: Truck,
dashboard: LayoutDashboard,
attivita: ListTodo,
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/lib/icons.js
git commit -m "Add Readiness Engine icons: activity states, categories, logistics nav"
```

---

### Task 8: Create useActivities.js — Zustand store

**Files:**
- Create: `src/hooks/useActivities.js`

- [ ] **Step 1: Create the store**

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { calculateDeadline } from '../lib/date-utils'

export const useActivitiesStore = create((set, get) => ({
  // State — separate keys to avoid collisions between views
  eventActivities: [],     // activities for a single event (convergence dashboard)
  myActivities: [],        // activities assigned to current user (banner + "le mie attività")
  dashboardActivities: [], // cross-event activities by permission (dashboard operativa)
  loading: false,
  error: null,

  // Fetch activities for a single event
  fetchEventActivities: async (eventId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_activities')
      .select(`
        *,
        assegnato:users!event_activities_assegnato_a_fkey(id, nome, cognome),
        dipendenza:event_activities!event_activities_dipende_da_fkey(id, descrizione, stato)
      `)
      .eq('event_id', eventId)
      .order('deadline', { ascending: true, nullsFirst: false })
    set({ eventActivities: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  // Fetch all activities assigned to current user (for banner + "Le mie attività")
  fetchMyActivities: async (userId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_activities')
      .select(`
        *,
        evento:events!event_activities_event_id_fkey(id, titolo, data_inizio, data_fine, stato)
      `)
      .eq('assegnato_a', userId)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })
    set({ myActivities: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  // Fetch all activities filtered by permissions (for dashboard operativa)
  fetchDashboardActivities: async (permissions) => {
    set({ loading: true, error: null })
    let query = supabase
      .from('event_activities')
      .select(`
        *,
        evento:events!event_activities_event_id_fkey(id, titolo, data_inizio, data_fine, stato),
        assegnato:users!event_activities_assegnato_a_fkey(id, nome, cognome)
      `)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })

    // Filter by permissions the user has
    if (permissions && permissions.length > 0) {
      query = query.in('permesso_responsabile', permissions)
    }

    const { data, error } = await query
    set({ dashboardActivities: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  // Instantiate template activities for an event
  instantiateTemplate: async (eventId, tipoEvento, modalita, dataInizio) => {
    // 1. Find matching template
    const { data: templates } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', tipoEvento)
      .eq('modalita', modalita)
      .limit(1)

    if (!templates || templates.length === 0) return { data: null, error: 'Nessun template trovato' }

    // 2. Fetch template items (checklist type only)
    const { data: items } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templates[0].id)
      .eq('tipo', 'checklist')
      .order('ordine')

    if (!items || items.length === 0) return { data: null, error: 'Template vuoto' }

    // 3. Calculate deadlines and create activities
    const eventDate = new Date(dataInizio)
    const templateIdMap = {} // old template_item_id → new activity_id

    // First pass: create activities without dependencies
    const activitiesToInsert = items.map(item => ({
      event_id: eventId,
      template_item_id: item.id,
      descrizione: item.descrizione,
      categoria: item.categoria,
      permesso_responsabile: item.permesso_responsabile,
      stato: 'da_fare',
      deadline: calculateDeadline(eventDate, item.giorni_prima_evento),
      obbligatoria: item.obbligatorio,
      tipo_verifica: item.tipo_verifica || 'manuale',
      verifica_automatica: item.verifica_automatica,
    }))

    const { data: inserted, error } = await supabase
      .from('event_activities')
      .insert(activitiesToInsert)
      .select()

    if (error) return { data: null, error: error.message }

    // Second pass: set up dependencies
    if (inserted) {
      // Map template_item_id → activity_id
      for (const act of inserted) {
        if (act.template_item_id) templateIdMap[act.template_item_id] = act.id
      }
      // Update dipende_da references
      for (const item of items) {
        if (item.dipende_da && templateIdMap[item.dipende_da]) {
          const activityId = templateIdMap[item.id]
          if (activityId) {
            await supabase
              .from('event_activities')
              .update({ dipende_da: templateIdMap[item.dipende_da] })
              .eq('id', activityId)
          }
        }
      }
    }

    // Refresh activities
    await get().fetchEventActivities(eventId)
    return { data: inserted, error: null }
  },

  // Update activity status
  updateActivity: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Self-assign activity
  assignActivity: async (id, userId) => {
    return get().updateActivity(id, { assegnato_a: userId })
  },

  // Complete activity
  completeActivity: async (id, userId) => {
    return get().updateActivity(id, {
      stato: 'completata',
      completata_il: new Date().toISOString(),
      completata_da: userId,
    })
  },

  // Start activity (da_fare → in_corso)
  startActivity: async (id) => {
    return get().updateActivity(id, { stato: 'in_corso' })
  },

  // Disable activity
  disableActivity: async (id) => {
    return get().updateActivity(id, { stato: 'disattivata' })
  },

  // Add custom activity to event
  addCustomActivity: async (eventId, activity) => {
    const { data, error } = await supabase
      .from('event_activities')
      .insert({ event_id: eventId, ...activity })
      .select()
      .single()
    if (!error) await get().fetchEventActivities(eventId)
    return { data, error }
  },
}))

// NOTE: calculateDeadline must be added to src/lib/date-utils.js:
//
// export function calculateDeadline(eventDate, giorniPrima) {
//   if (!giorniPrima && giorniPrima !== 0) return null
//   const d = new Date(eventDate)
//   d.setDate(d.getDate() + giorniPrima)
//   return d.toISOString().split('T')[0]
// }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useActivities.js
git commit -m "Add useActivities Zustand store: CRUD, template instantiation, dashboard queries"
```

---

## Phase C: Event State Fixes (rifiutato, gates, approval bar)

### Task 9: Update useEvents.js — separate reject from cancel, add gate checks

**Files:**
- Modify: `src/hooks/useEvents.js`

- [ ] **Step 1: Update rejectEvent to use 'rifiutato' state**

Find the `rejectEvent` function and change `stato: 'cancellato'` to `stato: 'rifiutato'`. Keep `cancelEvent` using `'cancellato'`.

- [ ] **Step 2: Add gate check functions**

Add after the existing actions:

```js
// Check if event can advance to 'pronto' (all mandatory activities complete)
checkGatePronto: async (eventId) => {
  const { data } = await supabase
    .from('event_activities')
    .select('id, descrizione, stato, obbligatoria')
    .eq('event_id', eventId)
    .eq('obbligatoria', true)
    .neq('stato', 'disattivata')
    .neq('stato', 'completata')

  const blocking = data || []
  return {
    canAdvance: blocking.length === 0,
    blocking,
  }
},

// Check if event can close (all materials returned or justified)
checkGateConcluded: async (eventId) => {
  const { data } = await supabase
    .from('event_materials')
    .select('id, stato')
    .eq('event_id', eventId)
    .in('stato', ['approvato', 'in_preparazione'])
    // Materials still active (not rifiutato, not chiuso_in_custodia)

  const unreturned = data || []
  return {
    canAdvance: unreturned.length === 0,
    unreturned,
  }
},

// Advance event state with gate check
advanceEventState: async (eventId, newStato) => {
  const { data, error } = await supabase
    .from('events')
    .update({ stato: newStato })
    .eq('id', eventId)
    .select()
    .single()
  if (!error) await get().fetchEvents()
  return { data, error }
},
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEvents.js
git commit -m "Separate rejectEvent (rifiutato) from cancelEvent, add gate check functions"
```

---

### Task 10: Update EventApprovalBar.jsx — separate reject from cancel

**Files:**
- Modify: `src/components/eventi/EventApprovalBar.jsx`

- [ ] **Step 1: Update the component to distinguish reject vs cancel**

The key change: when `event.stato === 'proposto'`, the action is "Rifiuta" → calls `rejectEvent()` (→ rifiutato). When stato is other active states, the action is "Annulla evento" → calls `cancelEvent()` (→ cancellato). Both still require a motivo.

Update the dialog title/message:
- Reject: title="Rifiuta evento", message="Inserisci il motivo del rifiuto"
- Cancel: title="Annulla evento", message="Inserisci il motivo dell'annullamento"

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/EventApprovalBar.jsx
git commit -m "Separate reject (rifiutato) from cancel (cancellato) in EventApprovalBar"
```

---

### Task 11: Update EventStatusFlow.jsx — handle rifiutato

**Files:**
- Modify: `src/components/eventi/EventStatusFlow.jsx`

- [ ] **Step 1: Add rifiutato handling alongside cancellato**

The steps array stays the same (the normal flow). Add a second special case for `rifiutato` similar to `cancellato`:

```jsx
if (event.stato === 'rifiutato') {
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3">
      <Icon icon={STATO_EVENTO_ICONS.rifiutato} size={20} />
      <span className="font-medium">Evento rifiutato</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/EventStatusFlow.jsx
git commit -m "Handle rifiutato terminal state in EventStatusFlow"
```

---

### Task 12: Update material position references in frontend

**Files:**
- Modify: `src/hooks/useMaterials.js` — update any hardcoded position strings
- Modify: `src/components/materiale/MaterialMovementForm.jsx` — update position string literals
- Modify: `src/pages/materiale/MaterialeList.jsx` — update filter comparisons
- Modify: `src/pages/admin/AdminMateriali.jsx` — update position string comparisons

- [ ] **Step 1: Search for old position enum values**

Search the entire `src/` directory for strings: `'magazzino'`, `'evento'`, `'agente'`, `'spedito'` that refer to `material_posizione` enum values. Update each to the new names: `'in_magazzino'`, `'presso_evento'`, `'magazzino_agente'`, `'in_transito'`.

Key locations to check:
- `MaterialMovementForm.jsx` — `a_posizione` and `da_posizione` values in form submission
- `MaterialeList.jsx` — filter comparisons like `=== 'magazzino'`
- `useMaterials.js` — any `.eq('posizione_attuale', ...)` queries
- `MaterialCard.jsx` — if it has any direct string comparisons
- `AdminMateriali.jsx` — position string comparisons in admin view
- `constants.js` — already updated in Task 6

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMaterials.js src/components/materiale/MaterialMovementForm.jsx src/pages/materiale/MaterialeList.jsx src/pages/admin/AdminMateriali.jsx
git commit -m "Update material position enum references: magazzino→in_magazzino, spedito→in_transito, etc."
```

---

## Phase D: Convergence Dashboard (Preparazione Tab)

### Task 13: Create ActivityCard.jsx

**Files:**
- Create: `src/components/eventi/ActivityCard.jsx`

- [ ] **Step 1: Create the activity card component**

```jsx
import { Icon } from '../ui/Icon'
import { ATTIVITA_STATO_ICONS, CATEGORIA_ICONS } from '../../lib/icons'
import { STATO_ATTIVITA, CATEGORIA_ATTIVITA } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { StatusBadge } from '../ui/StatusBadge'

export function ActivityCard({ activity, onStart, onComplete, onAssign, currentUserId }) {
  const { descrizione, categoria, stato, deadline, assegnato, obbligatoria, dipendenza } = activity

  const isOverdue = (stato === 'da_fare' || stato === 'in_corso') &&
    deadline && new Date(deadline) < new Date()
  const isBlocked = dipendenza && dipendenza.stato !== 'completata'

  const displayStato = isBlocked ? 'bloccata' : isOverdue ? 'in_ritardo' : stato

  const canStart = stato === 'da_fare' && !isBlocked
  const canComplete = stato === 'in_corso'
  const canAssign = !activity.assegnato_a

  return (
    <div className={`bg-white rounded-lg border p-4 ${
      isOverdue ? 'border-red-300 bg-red-50' :
      isBlocked ? 'border-gray-300 bg-gray-50' :
      'border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon icon={ATTIVITA_STATO_ICONS[displayStato]} size={20}
            className={
              displayStato === 'completata' ? 'text-green-500' :
              displayStato === 'in_ritardo' ? 'text-red-500' :
              displayStato === 'bloccata' ? 'text-gray-400' :
              displayStato === 'in_corso' ? 'text-mikai-500' :
              'text-gray-400'
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${stato === 'disattivata' ? 'line-through text-gray-400' : ''}`}>
              {descrizione}
            </span>
            {obbligatoria && (
              <span className="text-xs text-red-500 font-medium">Obbligatoria</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {categoria && (
              <span className="flex items-center gap-1">
                <Icon icon={CATEGORIA_ICONS[categoria]} size={14} />
                {CATEGORIA_ATTIVITA[categoria]}
              </span>
            )}
            {deadline && (
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                Scadenza: {formatDate(deadline)}
              </span>
            )}
          </div>

          {assegnato && (
            <div className="text-sm text-gray-500 mt-1">
              Assegnato a: {assegnato.nome} {assegnato.cognome}
            </div>
          )}

          {isBlocked && dipendenza && (
            <div className="text-sm text-gray-400 mt-1 flex items-center gap-1">
              <Icon icon={ATTIVITA_STATO_ICONS.bloccata} size={14} />
              Bloccata da: {dipendenza.descrizione}
            </div>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          {canAssign && (
            <button
              onClick={() => onAssign?.(activity.id, currentUserId)}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="Prendi in carico"
            >
              <Icon icon={ATTIVITA_STATO_ICONS.da_fare} size={20} className="text-gray-400" />
            </button>
          )}
          {canStart && (
            <button
              onClick={() => onStart?.(activity.id)}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg hover:bg-mikai-50 text-mikai-500"
              aria-label="Inizia attività"
            >
              <Icon icon={ATTIVITA_STATO_ICONS.in_corso} size={20} />
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => onComplete?.(activity.id, currentUserId)}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg hover:bg-green-50 text-green-500"
              aria-label="Completa attività"
            >
              <Icon icon={ATTIVITA_STATO_ICONS.completata} size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/ActivityCard.jsx
git commit -m "Add ActivityCard component for convergence dashboard"
```

---

### Task 14: Create EventPreparazioneTab.jsx

**Files:**
- Create: `src/components/eventi/EventPreparazioneTab.jsx`

- [ ] **Step 1: Create the convergence dashboard tab**

This component shows:
- Progress bar (N/M completate)
- Traffic light (overall status)
- Next deadline alert
- Activities grouped by category
- Gate-guarded state transition buttons

```jsx
import { useEffect, useState } from 'react'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { useEventsStore } from '../../hooks/useEvents'
import { CATEGORIA_ATTIVITA } from '../../lib/constants'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { useToastStore } from '../ui/Toast'
import { ActivityCard } from './ActivityCard'
import { ActivityGateBar } from './ActivityGateBar'

export function EventPreparazioneTab({ event }) {
  const userId = useAuthStore(s => s.user?.id)
  const activities = useActivitiesStore(s => s.eventActivities)
  const loading = useActivitiesStore(s => s.loading)
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)
  const startActivity = useActivitiesStore(s => s.startActivity)
  const completeActivity = useActivitiesStore(s => s.completeActivity)
  const assignActivity = useActivitiesStore(s => s.assignActivity)
  const instantiateTemplate = useActivitiesStore(s => s.instantiateTemplate)
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    if (event?.id) fetchEventActivities(event.id)
  }, [event?.id])

  // Filter out disattivata for display
  const activeActivities = activities.filter(a => a.stato !== 'disattivata')
  const totalActive = activeActivities.length
  const completed = activeActivities.filter(a => a.stato === 'completata').length
  const overdue = activeActivities.filter(a =>
    (a.stato === 'da_fare' || a.stato === 'in_corso') &&
    a.deadline && new Date(a.deadline) < new Date()
  ).length

  // Group by category
  const grouped = {}
  for (const a of activeActivities) {
    const cat = a.categoria || 'altro'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(a)
  }

  // Traffic light
  const trafficLight = overdue > 0 ? 'red' : completed === totalActive ? 'green' : 'yellow'

  // Next deadline
  const nextDeadline = activeActivities
    .filter(a => a.stato !== 'completata' && a.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0]

  const handleStart = async (id) => {
    const { error } = await startActivity(id)
    if (error) addToast('Errore nell\'avvio dell\'attività', 'error')
    else {
      addToast('Attività avviata', 'success')
      fetchEventActivities(event.id)
    }
  }

  const handleComplete = async (id) => {
    const { error } = await completeActivity(id, userId)
    if (error) addToast('Errore nel completamento', 'error')
    else {
      addToast('Attività completata!', 'success')
      fetchEventActivities(event.id)
    }
  }

  const handleAssign = async (id) => {
    const { error } = await assignActivity(id, userId)
    if (error) addToast('Errore nell\'assegnazione', 'error')
    else {
      addToast('Attività presa in carico', 'success')
      fetchEventActivities(event.id)
    }
  }

  const handleInstantiate = async () => {
    const { error } = await instantiateTemplate(
      event.id, event.tipo_evento, event.modalita, event.data_inizio
    )
    if (error) addToast(error, 'error')
    else addToast('Attività create dal template', 'success')
  }

  if (loading) return <LoadingSkeleton lines={6} />

  if (totalActive === 0) {
    return (
      <EmptyState
        title="Nessuna attività"
        description="Crea le attività dal template per iniziare la preparazione."
        action={
          event.stato === 'confermato' ? (
            <Button variant="primary" onClick={handleInstantiate}>
              Crea attività dal template
            </Button>
          ) : null
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {completed} di {totalActive} completate
          </span>
          <span className={`text-sm font-medium flex items-center gap-1 ${
            trafficLight === 'green' ? 'text-green-600' :
            trafficLight === 'yellow' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            <Icon icon={trafficLight === 'green' ? FEEDBACK_ICONS.success : FEEDBACK_ICONS.warning} size={16} />
            {trafficLight === 'green' ? 'In ordine' : trafficLight === 'yellow' ? 'In corso' : 'Ritardi'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-mikai-400 h-2 rounded-full transition-all"
            style={{ width: `${totalActive ? (completed / totalActive * 100) : 0}%` }}
          />
        </div>
        {overdue > 0 && (
          <div className="flex items-center gap-1 mt-2 text-sm text-red-600">
            <Icon icon={FEEDBACK_ICONS.warning} size={16} />
            {overdue} attività in ritardo
          </div>
        )}
      </div>

      {/* Gate bar */}
      <ActivityGateBar event={event} activities={activeActivities} />

      {/* Activities grouped by category */}
      {Object.entries(grouped).map(([cat, acts]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {CATEGORIA_ATTIVITA[cat] || cat}
          </h3>
          <div className="space-y-2">
            {acts.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                currentUserId={userId}
                onStart={handleStart}
                onComplete={handleComplete}
                onAssign={handleAssign}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/EventPreparazioneTab.jsx
git commit -m "Add EventPreparazioneTab: convergence dashboard with progress, grouping, actions"
```

---

### Task 15: Create ActivityGateBar.jsx

**Files:**
- Create: `src/components/eventi/ActivityGateBar.jsx`

- [ ] **Step 1: Create the gate bar component**

Shows state transition buttons that are disabled with explanation when gate conditions aren't met.

```jsx
import { useState } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'

export function ActivityGateBar({ event, activities }) {
  const advanceEventState = useEventsStore(s => s.advanceEventState)
  const checkGatePronto = useEventsStore(s => s.checkGatePronto)
  const addToast = useToastStore(s => s.add)
  const [loading, setLoading] = useState(false)
  const [gateResult, setGateResult] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [targetStato, setTargetStato] = useState(null)

  if (!event) return null

  const mandatory = activities.filter(a => a.obbligatoria)
  const mandatoryIncomplete = mandatory.filter(a => a.stato !== 'completata')
  const canAdvanceToPronto = mandatoryIncomplete.length === 0

  const handleAdvance = async (stato) => {
    if (stato === 'pronto' && !canAdvanceToPronto) {
      setGateResult(mandatoryIncomplete)
      return
    }
    setTargetStato(stato)
    setShowConfirm(true)
  }

  const confirmAdvance = async () => {
    setLoading(true)
    setShowConfirm(false)
    const { error } = await advanceEventState(event.id, targetStato)
    setLoading(false)
    if (error) addToast('Errore nel cambio stato', 'error')
    else addToast('Stato evento aggiornato', 'success')
  }

  // Which button to show based on current state
  const getNextAction = () => {
    switch (event.stato) {
      case 'in_preparazione':
        return { stato: 'pronto', label: 'Segna come pronto', enabled: canAdvanceToPronto }
      case 'pronto':
        return { stato: 'in_corso', label: 'Avvia evento', enabled: true }
      case 'in_corso':
        return { stato: 'concluso', label: 'Concludi evento', enabled: true }
      default:
        return null
    }
  }

  const action = getNextAction()
  if (!action) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          {!action.enabled && gateResult && (
            <div className="text-sm text-red-600 flex items-start gap-1">
              <Icon icon={FEEDBACK_ICONS.warning} size={16} className="mt-0.5 shrink-0" />
              <span>
                {gateResult.length} attività obbligatorie da completare:
                {gateResult.slice(0, 3).map(a => ` "${a.descrizione}"`).join(',')}
                {gateResult.length > 3 && ` e altre ${gateResult.length - 3}`}
              </span>
            </div>
          )}
          {!action.enabled && !gateResult && (
            <p className="text-sm text-gray-500">
              Completa tutte le attività obbligatorie per avanzare
            </p>
          )}
        </div>
        <Button
          variant="primary"
          disabled={!action.enabled || loading}
          loading={loading}
          onClick={() => handleAdvance(action.stato)}
        >
          {action.label}
        </Button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Conferma avanzamento"
        message={`Vuoi passare l'evento allo stato "${action.label}"?`}
        confirmLabel="Conferma"
        onConfirm={confirmAdvance}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/ActivityGateBar.jsx
git commit -m "Add ActivityGateBar: gate-guarded state transitions with explanations"
```

---

### Task 16: Wire PreparazioneTab into EventiDetail.jsx

**Files:**
- Modify: `src/pages/eventi/EventiDetail.jsx`

- [ ] **Step 1: Replace the checklist placeholder tab**

Import `EventPreparazioneTab`:

```jsx
import { EventPreparazioneTab } from '../../components/eventi/EventPreparazioneTab'
```

In the tabs array, update the checklist entry:

```jsx
{ id: 'preparazione', label: 'Preparazione' }
```

In the tab content rendering, replace the `PlaceholderTab` for checklist/preparazione with:

```jsx
{activeTab === 'preparazione' && <EventPreparazioneTab event={event} />}
```

Make the Preparazione tab visible to everyone (not just ufficio) — it's the core of the Readiness Engine.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/eventi/EventiDetail.jsx
git commit -m "Wire Preparazione tab into EventiDetail, replacing checklist placeholder"
```

---

## Phase E: Role-Based Dashboards

### Task 17: Create DashboardRouter.jsx — smart home redirect

**Files:**
- Create: `src/pages/dashboard/DashboardRouter.jsx`

- [ ] **Step 1: Create the router component**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { DashboardOperativa } from './DashboardOperativa'
import { DashboardStrategica } from './DashboardStrategica'

export function DashboardRouter() {
  const profile = useAuthStore(s => s.profile)
  const permissions = useAuthStore(s => s.permissions)
  const loading = useAuthStore(s => s.loading)

  if (loading) return <LoadingSkeleton lines={6} />
  if (!profile) return <Navigate to="/Eventi/login" replace />

  const ruolo = profile.ruolo

  // Direzione → dashboard strategica
  if (ruolo === 'direzione' || ruolo === 'admin') {
    return <DashboardStrategica />
  }

  // Ufficio: check if warehouse-focused or general
  if (ruolo === 'ufficio') {
    const hasWarehouse = permissions.includes('gestione_spedizioni') ||
      permissions.includes('gestione_magazzino')
    const hasOtherManagement = permissions.some(p =>
      p.startsWith('gestione_') && p !== 'gestione_spedizioni' && p !== 'gestione_magazzino'
    )
    // Pure warehouse user → operativa filtered. Mixed → operativa full.
    return <DashboardOperativa warehouseOnly={hasWarehouse && !hasOtherManagement} />
  }

  // Commerciale / Area Manager → event list (existing behavior)
  return <Navigate to="/Eventi/eventi" replace />
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/dashboard/DashboardRouter.jsx
git commit -m "Add DashboardRouter: role-based home page routing"
```

---

### Task 18: Create DashboardOperativa.jsx

**Files:**
- Create: `src/pages/dashboard/DashboardOperativa.jsx`

- [ ] **Step 1: Create the operative dashboard**

Shows cross-event activities ordered by urgency: overdue → today → next 3 days → next 7 days.

```jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { CATEGORIA_ATTIVITA } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { Icon } from '../../components/ui/Icon'
import { CATEGORIA_ICONS, ATTIVITA_STATO_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Breadcrumb } from '../../components/layout/Breadcrumb'

export function DashboardOperativa({ warehouseOnly = false }) {
  const permissions = useAuthStore(s => s.permissions)
  const activities = useActivitiesStore(s => s.dashboardActivities)
  const loading = useActivitiesStore(s => s.loading)
  const fetchDashboardActivities = useActivitiesStore(s => s.fetchDashboardActivities)
  const [categoriaFilter, setCategoriaFilter] = useState(null)

  useEffect(() => {
    if (!permissions || permissions.length === 0) return
    const perms = warehouseOnly
      ? permissions.filter(p => p === 'gestione_spedizioni' || p === 'gestione_magazzino')
      : permissions
    fetchDashboardActivities(perms)
  }, [warehouseOnly, permissions])

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in3days = new Date(today); in3days.setDate(in3days.getDate() + 3)
  const in7days = new Date(today); in7days.setDate(in7days.getDate() + 7)

  const filtered = categoriaFilter
    ? activities.filter(a => a.categoria === categoriaFilter)
    : activities

  const groups = {
    overdue: filtered.filter(a => a.deadline && new Date(a.deadline) < today),
    today: filtered.filter(a => {
      if (!a.deadline) return false
      const d = new Date(a.deadline)
      return d >= today && d < new Date(today.getTime() + 86400000)
    }),
    soon: filtered.filter(a => {
      if (!a.deadline) return false
      const d = new Date(a.deadline)
      return d >= new Date(today.getTime() + 86400000) && d < in3days
    }),
    week: filtered.filter(a => {
      if (!a.deadline) return false
      const d = new Date(a.deadline)
      return d >= in3days && d < in7days
    }),
    noDeadline: filtered.filter(a => !a.deadline),
  }

  if (loading) return <LoadingSkeleton lines={8} />

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      <PageHeader
        title={warehouseOnly ? 'Magazzino' : 'Dashboard operativa'}
        subtitle="Attività in scadenza su tutti gli eventi"
      />

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategoriaFilter(null)}
          className={`px-3 py-1.5 rounded-full text-sm min-h-[48px] ${
            !categoriaFilter ? 'bg-mikai-100 text-mikai-700 font-medium' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Tutte
        </button>
        {Object.entries(CATEGORIA_ATTIVITA).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategoriaFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm min-h-[48px] flex items-center gap-1 ${
              categoriaFilter === key ? 'bg-mikai-100 text-mikai-700 font-medium' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Icon icon={CATEGORIA_ICONS[key]} size={14} />
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState title="Nessuna attività" description="Non ci sono attività pendenti." />
      )}

      {/* Urgency groups */}
      {groups.overdue.length > 0 && (
        <ActivityGroup title="In ritardo" color="red" activities={groups.overdue} />
      )}
      {groups.today.length > 0 && (
        <ActivityGroup title="Oggi" color="yellow" activities={groups.today} />
      )}
      {groups.soon.length > 0 && (
        <ActivityGroup title="Prossimi 3 giorni" color="mikai" activities={groups.soon} />
      )}
      {groups.week.length > 0 && (
        <ActivityGroup title="Prossimi 7 giorni" color="gray" activities={groups.week} />
      )}
      {groups.noDeadline.length > 0 && (
        <ActivityGroup title="Senza scadenza" color="gray" activities={groups.noDeadline} />
      )}
    </div>
  )
}

function ActivityGroup({ title, color, activities }) {
  const colorMap = {
    red: 'border-red-300 bg-red-50 text-red-700',
    yellow: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    mikai: 'border-mikai-300 bg-mikai-50 text-mikai-700',
    gray: 'border-gray-200 bg-gray-50 text-gray-600',
  }

  return (
    <div>
      <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
        color === 'red' ? 'text-red-600' :
        color === 'yellow' ? 'text-yellow-600' :
        'text-gray-500'
      }`}>
        {title} ({activities.length})
      </h3>
      <div className="space-y-2">
        {activities.map(a => (
          <Link
            key={a.id}
            to={`/Eventi/eventi/${a.event_id}`}
            className={`block rounded-lg border p-3 ${colorMap[color]} hover:shadow-sm transition-all`}
          >
            <div className="font-medium">{a.descrizione}</div>
            <div className="text-sm mt-1 opacity-75">
              {a.evento?.titolo} · {a.deadline ? formatDate(a.deadline) : 'Senza scadenza'}
              {a.assegnato && ` · ${a.assegnato.nome} ${a.assegnato.cognome}`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/dashboard/DashboardOperativa.jsx
git commit -m "Add DashboardOperativa: cross-event activity dashboard grouped by urgency"
```

---

### Task 19: Create DashboardStrategica.jsx

**Files:**
- Create: `src/pages/dashboard/DashboardStrategica.jsx`

- [ ] **Step 1: Create the strategic dashboard**

Three widgets: approval queue, event semaphores, budget exposure.

```jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useActivitiesStore } from '../../hooks/useActivities'
import { supabase } from '../../lib/supabase'
import { STATO_EVENTO, STATO_EVENTO_COLORE } from '../../lib/constants'
import { formatDate, formatDateRange } from '../../lib/date-utils'
import { Icon } from '../../components/ui/Icon'
import { STATO_EVENTO_ICONS, ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Button } from '../../components/ui/Button'

export function DashboardStrategica() {
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const fetchEvents = useEventsStore(s => s.fetchEvents)

  useEffect(() => { fetchEvents() }, [])

  const pendingApproval = events.filter(e => e.stato === 'proposto')
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)
  const [semaphores, setSemaphores] = useState({})

  const upcoming = events
    .filter(e => !['cancellato', 'rifiutato', 'concluso', 'proposto'].includes(e.stato))
    .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio))
    .slice(0, 10)

  // Fetch activity-based semaphores for upcoming events
  useEffect(() => {
    async function loadSemaphores() {
      const results = {}
      for (const e of upcoming) {
        const { data } = await supabase
          .from('event_activities')
          .select('stato, obbligatoria, deadline')
          .eq('event_id', e.id)
          .neq('stato', 'disattivata')
        if (data) {
          const mandatory = data.filter(a => a.obbligatoria)
          const overdue = mandatory.filter(a =>
            (a.stato === 'da_fare' || a.stato === 'in_corso') &&
            a.deadline && new Date(a.deadline) < new Date()
          )
          const allDone = mandatory.every(a => a.stato === 'completata')
          results[e.id] = overdue.length > 0 ? 'red' : allDone ? 'green' : 'yellow'
        }
      }
      setSemaphores(results)
    }
    if (upcoming.length > 0) loadSemaphores()
  }, [events])
  const approvedThisQuarter = events.filter(e => {
    if (e.stato === 'cancellato' || e.stato === 'rifiutato') return false
    const d = new Date(e.created_at)
    const now = new Date()
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    return d >= quarterStart
  })
  const totalBudget = approvedThisQuarter.reduce((sum, e) => sum + (e.budget_previsto || 0), 0)

  if (loading) return <LoadingSkeleton lines={8} />

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      <PageHeader title="Dashboard Direzione" subtitle="Visione d'insieme e decisioni" />

      {/* Widget 1: Approval queue */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">
          Da approvare ({pendingApproval.length})
        </h2>
        {pendingApproval.length === 0 ? (
          <p className="text-gray-500 text-sm">Nessun evento in attesa di approvazione</p>
        ) : (
          <div className="space-y-3">
            {pendingApproval.map(e => (
              <Link
                key={e.id}
                to={`/Eventi/eventi/${e.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="font-medium">{e.titolo}</div>
                  <div className="text-sm text-gray-500">
                    {e.promotore && `${e.promotore.nome} ${e.promotore.cognome} · `}
                    {formatDateRange(e.data_inizio, e.data_fine)}
                    {e.budget_previsto ? ` · €${e.budget_previsto.toLocaleString('it')}` : ''}
                  </div>
                </div>
                <Icon icon={ACTION_ICONS.forward} size={20} className="text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Widget 2: Event semaphores */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">Prossimi eventi</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-500 text-sm">Nessun evento in programma</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(e => (
              <Link
                key={e.id}
                to={`/Eventi/eventi/${e.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Activity-based semaphore (spec 5.3 widget 2) */}
                  {semaphores[e.id] && (
                    <span className={`flex items-center gap-1 text-sm font-medium ${
                      semaphores[e.id] === 'green' ? 'text-green-600' :
                      semaphores[e.id] === 'red' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      <Icon icon={semaphores[e.id] === 'green' ? FEEDBACK_ICONS.success : FEEDBACK_ICONS.warning} size={16} />
                    </span>
                  )}
                  <StatusBadge stato={e.stato} />
                  <div>
                    <div className="font-medium">{e.titolo}</div>
                    <div className="text-sm text-gray-500">
                      {formatDateRange(e.data_inizio, e.data_fine)}
                    </div>
                  </div>
                </div>
                <Icon icon={ACTION_ICONS.forward} size={20} className="text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Widget 3: Budget exposure */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-1">Budget trimestre</h2>
        <div className="text-3xl font-bold text-mikai-600">
          €{totalBudget.toLocaleString('it')}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {approvedThisQuarter.length} eventi nel trimestre corrente
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/dashboard/DashboardStrategica.jsx
git commit -m "Add DashboardStrategica: approval queue, event semaphores, budget widget"
```

---

### Task 20: Create AlertBanner.jsx + wire into EventiList

**Files:**
- Create: `src/components/dashboard/AlertBanner.jsx`
- Modify: `src/pages/eventi/EventiList.jsx`

- [ ] **Step 1: Create the alert banner**

```jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'

export function AlertBanner() {
  const userId = useAuthStore(s => s.user?.id)
  const activities = useActivitiesStore(s => s.myActivities)
  const fetchMyActivities = useActivitiesStore(s => s.fetchMyActivities)

  useEffect(() => {
    if (userId) fetchMyActivities(userId)
  }, [userId])

  if (!activities || activities.length === 0) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in3days = new Date(today); in3days.setDate(in3days.getDate() + 3)

  const overdue = activities.filter(a => a.deadline && new Date(a.deadline) < today).length
  const todayCount = activities.filter(a => {
    if (!a.deadline) return false
    const d = new Date(a.deadline)
    return d >= today && d < new Date(today.getTime() + 86400000)
  }).length
  const soonCount = activities.filter(a => {
    if (!a.deadline) return false
    const d = new Date(a.deadline)
    return d >= new Date(today.getTime() + 86400000) && d < in3days
  }).length

  if (overdue === 0 && todayCount === 0 && soonCount === 0) return null

  return (
    <Link
      to="/Eventi/mie-attivita"
      className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-all"
    >
      <Icon icon={FEEDBACK_ICONS.warning} size={20} className="text-yellow-600 shrink-0" />
      <div className="flex gap-3 text-sm flex-wrap">
        {overdue > 0 && (
          <span className="text-red-600 font-medium">{overdue} in ritardo</span>
        )}
        {todayCount > 0 && (
          <span className="text-yellow-700 font-medium">{todayCount} scade oggi</span>
        )}
        {soonCount > 0 && (
          <span className="text-gray-600">{soonCount} prossimi 3gg</span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Wire into EventiList.jsx**

Import AlertBanner and add it between PageHeader and EventFilters, conditionally for commerciale/area_manager:

```jsx
import { AlertBanner } from '../../components/dashboard/AlertBanner'
import { useAuthStore } from '../../hooks/useAuth'

// Inside the component:
const ruolo = useAuthStore(s => s.profile?.ruolo)

// In JSX, after PageHeader:
{(ruolo === 'commerciale' || ruolo === 'area_manager') && <AlertBanner />}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/AlertBanner.jsx src/pages/eventi/EventiList.jsx
git commit -m "Add AlertBanner for commerciale/area_manager with activity urgency counts"
```

---

### Task 20b: Create MieAttivitaPage.jsx

**Files:**
- Create: `src/pages/attivita/MieAttivitaPage.jsx`

- [ ] **Step 1: Create the "Le mie attività" page**

Dedicated page for commerciale/area_manager, showing only activities assigned to the current user. Uses `fetchMyActivities` (not `fetchDashboardActivities` which filters by permissions).

```jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { formatDate } from '../../lib/date-utils'
import { Icon } from '../../components/ui/Icon'
import { ATTIVITA_STATO_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'

export function MieAttivitaPage() {
  const userId = useAuthStore(s => s.user?.id)
  const activities = useActivitiesStore(s => s.myActivities)
  const loading = useActivitiesStore(s => s.loading)
  const fetchMyActivities = useActivitiesStore(s => s.fetchMyActivities)

  useEffect(() => {
    if (userId) fetchMyActivities(userId)
  }, [userId])

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const overdue = activities.filter(a => a.deadline && new Date(a.deadline) < today)
  const upcoming = activities.filter(a => !a.deadline || new Date(a.deadline) >= today)

  if (loading) return <LoadingSkeleton lines={6} />

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <Breadcrumb items={[{ label: 'Eventi', to: '/Eventi/eventi' }, { label: 'Le mie attività' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Le mie attività" backTo="/Eventi/eventi" />
      </div>
      <PageHeader title="Le mie attività" subtitle="Attività assegnate a te su tutti gli eventi" />

      {activities.length === 0 && (
        <EmptyState title="Nessuna attività" description="Non hai attività pendenti." />
      )}

      {overdue.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">
            In ritardo ({overdue.length})
          </h3>
          <div className="space-y-2">
            {overdue.map(a => (
              <Link key={a.id} to={`/Eventi/eventi/${a.event_id}`}
                className="block rounded-lg border border-red-200 bg-red-50 p-3 hover:shadow-sm transition-all">
                <div className="font-medium">{a.descrizione}</div>
                <div className="text-sm text-red-600 mt-1">
                  {a.evento?.titolo} · Scadenza: {formatDate(a.deadline)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Prossime ({upcoming.length})
          </h3>
          <div className="space-y-2">
            {upcoming.map(a => (
              <Link key={a.id} to={`/Eventi/eventi/${a.event_id}`}
                className="block rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-all">
                <div className="font-medium">{a.descrizione}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {a.evento?.titolo} · {a.deadline ? `Scadenza: ${formatDate(a.deadline)}` : 'Senza scadenza'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/attivita/MieAttivitaPage.jsx
git commit -m "Add MieAttivitaPage: personal activity list for commerciale/area_manager"
```

---

### Task 21: Update App.jsx — new routes + dashboard redirect

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports for new pages**

```jsx
import { DashboardRouter } from './pages/dashboard/DashboardRouter'
import { MieAttivitaPage } from './pages/attivita/MieAttivitaPage'
```

Note: do NOT import `LogisticaPage` yet — it will be created in Task 23 and the route added then.

- [ ] **Step 2: Add new routes inside ProtectedRoute**

```jsx
<Route path="/Eventi/" element={<DashboardRouter />} />
<Route path="/Eventi/dashboard" element={<DashboardRouter />} />
<Route path="/Eventi/mie-attivita" element={<MieAttivitaPage />} />
```

Replace the existing home route (`/Eventi/` → placeholder) with the DashboardRouter.

Note: The `/Eventi/logistica` route will be added in Task 23 when LogisticaPage is created.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "Add routes: dashboard, mie-attivita, logistica; home redirects per role"
```

---

### Task 22: Update Sidebar.jsx and BottomBar.jsx — navigation

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/components/layout/BottomBar.jsx`

- [ ] **Step 1: Add Logistica to Sidebar navItems**

Add after the `materiale` nav item:

```js
{
  to: '/Eventi/logistica',
  label: 'Logistica',
  icon: NAV_ICONS.logistica,
  permissions: ['gestione_spedizioni', 'gestione_magazzino'],
},
```

Import `NAV_ICONS` if not already imported.

- [ ] **Step 2: Fix BottomBar /profilo dead link**

Replace `/Eventi/profilo` with `/Eventi/dashboard` or remove it if not needed. This fixes the appendix item "Link /profilo morto nel BottomBar".

- [ ] **Step 3:产Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.jsx src/components/layout/BottomBar.jsx
git commit -m "Add Logistica nav item, fix BottomBar profilo dead link"
```

---

## Phase F: Cross-Event Logistics

### Task 23: Create LogisticaPage.jsx — shell with tabs

**Files:**
- Create: `src/pages/logistica/LogisticaPage.jsx`

- [ ] **Step 1: Create the logistics page shell**

```jsx
import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LogisticaTimeline } from './LogisticaTimeline'
import { LogisticaMatrice } from './LogisticaMatrice'
import { LogisticaRientri } from './LogisticaRientri'
import { LogisticaInventario } from './LogisticaInventario'

const TABS = [
  { id: 'timeline', label: 'Spedizioni' },
  { id: 'matrice', label: 'Matrice' },
  { id: 'rientri', label: 'Rientri' },
  { id: 'inventario', label: 'Inventario' },
]

export function LogisticaPage() {
  const [activeTab, setActiveTab] = useState('timeline')

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <Breadcrumb items={[{ label: 'Logistica' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Logistica" />
      </div>
      <PageHeader title="Logistica" subtitle="Gestione spedizioni, rientri e inventario" />
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'timeline' && <LogisticaTimeline />}
      {activeTab === 'matrice' && <LogisticaMatrice />}
      {activeTab === 'rientri' && <LogisticaRientri />}
      {activeTab === 'inventario' && <LogisticaInventario />}
    </div>
  )
}
```

- [ ] **Step 2: Create placeholder files for the 4 sub-tabs**

Create `LogisticaTimeline.jsx`, `LogisticaMatrice.jsx`, `LogisticaRientri.jsx`, `LogisticaInventario.jsx` as basic components that render a placeholder message. They will be implemented in subsequent tasks.

```jsx
// LogisticaTimeline.jsx
export function LogisticaTimeline() {
  return <div className="text-gray-500 text-center py-8">Timeline spedizioni — in costruzione</div>
}
```

Same pattern for the other three files.

- [ ] **Step 3: Add LogisticaPage route to App.jsx**

Import LogisticaPage and add the route that was deferred from Task 21:

```jsx
import { LogisticaPage } from './pages/logistica/LogisticaPage'

// Inside ProtectedRoute:
<Route path="/Eventi/logistica" element={<LogisticaPage />} />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/logistica/ src/App.jsx
git commit -m "Add LogisticaPage shell with 4 tab placeholders, wire route"
```

---

### Task 24: Implement LogisticaTimeline.jsx

**Files:**
- Modify: `src/pages/logistica/LogisticaTimeline.jsx`

- [ ] **Step 1: Implement the shipping timeline view**

Fetches event_materials with stato='approvato' or later, joined with events and material_movements. Groups by day. Shows shipping status computed from movements (per spec section 9.4).

The component should:
1. Query `event_materials` with status `approvato` or `in_preparazione`, joined with `events` (for dates/title) and `materials` (for name)
2. Query `material_movements` for these materials to compute shipping state
3. Group by deadline day (using event.data_inizio - 7 days as default shipping deadline, or a custom field if available)
4. Render cards with: event name, material, quantity, destination, status, action buttons

Note: This is a complex component. Keep the data-fetching logic in `useMaterials.js` (add a new `fetchLogisticsTimeline` action). The component should only render.

- [ ] **Step 2: Add `fetchLogisticsTimeline` to useMaterials.js**

```js
fetchLogisticsTimeline: async () => {
  set({ loading: true, error: null })
  const { data, error } = await supabase
    .from('event_materials')
    .select(`
      *,
      evento:events!event_materials_event_id_fkey(id, titolo, data_inizio, data_fine, stato, indirizzo_spedizione),
      materiale:materials!event_materials_material_id_fkey(id, nome, codice_inventario)
    `)
    .in('stato', ['approvato', 'in_preparazione'])
    .order('created_at', { ascending: true })
  set({ logisticsTimeline: data || [], loading: false, error: error?.message })
  return { data: data || [], error }
},
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/pages/logistica/LogisticaTimeline.jsx src/hooks/useMaterials.js
git commit -m "Implement LogisticaTimeline: shipping timeline grouped by day with status"
```

---

### Task 25: Implement LogisticaMatrice.jsx

**Files:**
- Modify: `src/pages/logistica/LogisticaMatrice.jsx`

- [ ] **Step 1: Implement the event × status matrix**

Table with events as rows, shipping states as columns (da preparare / preparato / spedito / consegnato). Each cell shows a count with color semaphore. Tap on cell → navigates to event detail materiale tab.

Use the same `fetchLogisticsTimeline` data, grouped differently.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/logistica/LogisticaMatrice.jsx
git commit -m "Implement LogisticaMatrice: event × shipping status matrix"
```

---

### Task 26: Implement LogisticaRientri.jsx

**Files:**
- Modify: `src/pages/logistica/LogisticaRientri.jsx`

- [ ] **Step 1: Implement the returns tab**

Shows materials that are out and overdue for return. Query: `material_movements` where `tipo='uscita'` and `data_rientro_prevista < now()` and no matching `rientro` movement exists.

Each row: material name, event, person who has it, days out, expected return date, "Sollecito inviato" toggle.

- [ ] **Step 2: Add `fetchOverdueReturns` to useMaterials.js**

```js
fetchOverdueReturns: async () => {
  set({ loading: true, error: null })
  const { data, error } = await supabase
    .from('material_movements')
    .select(`
      *,
      materiale:materials!material_movements_material_id_fkey(id, nome, codice_inventario, posizione_attuale),
      evento:events!material_movements_event_id_fkey(id, titolo, data_fine),
      responsabile:users!material_movements_responsabile_id_fkey(id, nome, cognome)
    `)
    .eq('tipo', 'uscita')
    .not('data_rientro_prevista', 'is', null)
    .lt('data_rientro_prevista', new Date().toISOString())
    .order('data_rientro_prevista', { ascending: true })

  // Filter out materials that have already returned (posizione = in_magazzino)
  const overdue = (data || []).filter(m =>
    m.materiale && m.materiale.posizione_attuale !== 'in_magazzino'
  )
  set({ overdueReturns: overdue, loading: false, error: error?.message })
  return { data: overdue, error }
},
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/pages/logistica/LogisticaRientri.jsx src/hooks/useMaterials.js
git commit -m "Implement LogisticaRientri: overdue returns with solicitation tracking"
```

---

### Task 27: Implement LogisticaInventario.jsx

**Files:**
- Modify: `src/pages/logistica/LogisticaInventario.jsx`

- [ ] **Step 1: Implement the full inventory view**

Shows all materials with current position, last movement, days at position. Filter by position type, material type, agent. Red highlight for active alerts.

Uses existing `fetchMaterials` from useMaterials.js, enhanced with magazzino join.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/logistica/LogisticaInventario.jsx
git commit -m "Implement LogisticaInventario: full inventory with position filters and alerts"
```

---

## Phase G: Final Verification

### Task 28: Full build verification and integration check

**Files:** All modified files

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with zero errors

- [ ] **Step 2: Check for unused imports**

Run: `npm run build 2>&1 | grep -i "unused\|warning"`
Fix any unused imports or variables.

- [ ] **Step 3: Verify all new files follow conventions**

Check:
- All new components use named exports (not default)
- All icons go through Icon component + icons.js maps
- All Supabase calls are in hooks/ stores, not in components
- All UI text is in Italian
- All interactive elements have min-h-[48px]
- Files are < 300 lines

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "Fix lint issues and convention violations from Readiness Engine implementation"
```

---

### Task 29: Push all migrations to remote DB

**Files:** All migration files

- [ ] **Step 1: Check migration status**

Run: `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase migration list -p "$SUPABASE_DB_PASSWORD"`
Expected: All 5 new migrations listed as applied

- [ ] **Step 2: If any migrations failed, check error and fix**

Common issues:
- Enum value already exists → wrapped with `IF NOT EXISTS`
- Column already exists → wrapped with `IF NOT EXISTS`
- FK reference to non-existent table → check migration order

---

## Summary

| Phase | Tasks | What it builds |
|-------|-------|---------------|
| A (Migrations) | 1-5 | DB schema: enums, magazzini, event_activities, triggers |
| B (Foundation) | 6-8 | Constants, icons, useActivities store |
| C (Event States) | 9-12 | Rifiutato state, gate checks, position enum updates |
| D (Convergence) | 13-16 | Preparazione tab with activities, progress, gates |
| E (Dashboards) | 17-22 | Role-based home, operative + strategic dashboards, alert banner, "le mie attività" page |
| F (Logistics) | 23-27 | Logistica page with 4 tabs: timeline, matrix, returns, inventory |
| G (Verification) | 28-29 | Build check, convention check, migration verification |

Total: 30 tasks. Each task is independently committable and produces a working (even if incomplete) build.

---

## Known Limitations (deferred to follow-up)

These items from the spec are intentionally deferred to keep this plan focused:

1. **Automatic verification functions** (spec section 3) — the `tipo_verifica` and `verifica_automatica` fields are stored but the actual check logic (e.g. `lista_materiale_compilata`) is not implemented. Activities with `tipo_verifica = 'automatica'` must be completed manually for now.
2. **Partial return with custody UI** (spec section 7.2) — the DB schema supports `chiuso_in_custodia` but the dedicated per-piece "Rientrato / Resta in custodia" UI is not in this plan. Returns are managed via the existing MaterialMovementForm.
3. **Material overdue alerts in DashboardOperativa** — warehouse users see activity alerts but not material return alerts in the dashboard. Material alerts are visible in LogisticaRientri tab.
4. **Rientri tab badge counter** (spec section 6.2) — the badge on the Rientri tab showing overdue count is deferred.
5. **Admin UI for template management** — templates are manageable via SQL for now. A dedicated AdminTemplate page is a separate plan.
