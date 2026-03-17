# Mikai Eventi — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-cost event management system for Mikai (medical devices) — React SPA + Supabase, PWA-capable, elderly-proof UI.

**Architecture:** React SPA (Vite + TailwindCSS) communicating directly with Supabase (PostgreSQL + Auth + Realtime + Storage). RLS policies enforce visibility per role. GitHub Pages for hosting. External cron service for scheduled automations.

**Tech Stack:** React 18, Vite, TailwindCSS, Supabase JS client, React Router v6, Zustand (state), React Hook Form, date-fns (date handling)

**Spec:** `docs/superpowers/specs/2026-03-17-eventi-mikai-design.md`

---

## Decomposition — 6 Phases

The project is large (23 tables, 6 flows, 11 automations, full UI). It is split into 6 phases, each producing working, testable, deployable software. Each phase builds on the previous but can be shipped independently.

| Phase | What it delivers | Tables | Can be used standalone? |
|-------|-----------------|--------|----------------------|
| 1 | Project scaffold + DB schema + Auth + seed data | All 23 | No (backend only) |
| 2 | Core UI: eventi CRUD + lista + dettaglio + wizard | events, users, user_permissions, event_templates, template_items, approval_thresholds | Yes — basic event management |
| 3 | Materiale: inventario + richieste + movimenti + conflitti | materials, event_materials, material_movements, gadgets, event_gadgets | Yes — material tracking |
| 4 | Persone & Logistica: contatti, staff, partecipanti, sub-activities, logistics, costi | contacts, event_participants, event_staff, event_sub_activities, event_logistics, event_costs | Yes — full event detail |
| 5 | Workflow: tasks, auto-pilota, notifiche, documenti | event_tasks, activity_log, documents, notifications, notification_preferences, template_suggestions | Yes — automated workflow |
| 6 | Polish: dashboard per ruolo, packing list, compliance report, PWA, cron jobs | — | Full system |

---

## Phase 1: Scaffold + Database + Auth

**Goal:** Project structure, all Supabase tables with RLS, auth system, seed data for testing.

### File Structure

```
src/
  main.jsx                        # Entry point
  App.jsx                         # Router setup
  lib/
    supabase.js                   # Supabase client init
    constants.js                  # Enums, status labels, role labels (Italian)
    date-utils.js                 # date-fns wrappers for Italian locale
  hooks/
    useAuth.js                    # Auth state + user profile + permissions
  components/
    layout/
      AppShell.jsx                # Desktop sidebar + mobile bottom bar
      Breadcrumb.jsx              # Desktop breadcrumb
      MobileHeader.jsx            # Mobile header with back arrow + event context
      Sidebar.jsx                 # Desktop sidebar nav
      BottomBar.jsx               # Mobile bottom nav
    ui/
      Button.jsx                  # Primary/secondary/danger button variants
      StatusBadge.jsx             # Colored status badges with icon + text
      LoadingSkeleton.jsx         # Skeleton loading states
      EmptyState.jsx              # "Nessun evento trovato" states
      Toast.jsx                   # Success/error toast notifications
      ConfirmDialog.jsx           # "Sei sicuro?" confirmation modal
  pages/
    auth/
      Login.jsx                   # Login page
supabase/
  migrations/
    001_core.sql                  # users, user_permissions, contacts
    002_events.sql                # events, event_templates, template_items, approval_thresholds
    003_materials.sql             # materials, event_materials, material_movements, gadgets, event_gadgets
    004_people.sql                # event_staff, event_participants
    005_logistics.sql             # event_sub_activities, event_logistics
    006_costs.sql                 # event_costs
    007_workflow.sql              # event_tasks, activity_log
    008_documents.sql             # documents
    009_notifications.sql         # notifications, notification_preferences, template_suggestions
    010_rls.sql                   # All Row Level Security policies
    011_triggers.sql              # updated_at triggers, material position sync
    012_seed.sql                  # Test data: users, events, materials
  .env.example                    # SUPABASE_URL, SUPABASE_ANON_KEY
```

### Task 1.1: Initialize project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `tailwind.config.js`, `postcss.config.js`, `src/main.jsx`, `src/App.jsx`, `.env.example`, `.gitignore`

- [ ] **Step 1: Create Vite React project**

```bash
npm create vite@latest . -- --template react
npm install
npm install tailwindcss @tailwindcss/vite
npm install @supabase/supabase-js
npm install react-router-dom zustand react-hook-form date-fns
```

- [ ] **Step 2: Configure TailwindCSS v4**

`src/index.css`:
```css
@import "tailwindcss";
```

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/Eventi/'
})
```

- [ ] **Step 3: Create minimal App.jsx with router**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter basename="/Eventi">
      <Routes>
        <Route path="/" element={<div className="p-8 text-lg">Mikai Eventi — In costruzione</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```
Expected: App running at localhost:5173, showing "Mikai Eventi — In costruzione"

- [ ] **Step 5: Create .gitignore and .env.example**

`.gitignore`:
```
node_modules/
dist/
.env
.env.local
```

`.env.example`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html tailwind.config.js postcss.config.js src/ .gitignore .env.example
git commit -m "feat: initialize Vite + React + TailwindCSS + Supabase project"
```

### Task 1.2: Supabase client + constants

**Files:**
- Create: `src/lib/supabase.js`, `src/lib/constants.js`, `src/lib/date-utils.js`

- [ ] **Step 1: Create Supabase client**

`src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Mancano le variabili VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Create constants with Italian labels**

`src/lib/constants.js`:
```js
// Enum values match database enums exactly.
// Labels are user-facing Italian text (spec section 10.2).

export const RUOLI = {
  admin: 'Amministratore',
  direzione: 'Direzione',
  ufficio: 'Ufficio',
  area_manager: 'Area Manager',
  commerciale: 'Commerciale',
}

export const TIPO_EVENTO = {
  workshop: 'Workshop',
  corso: 'Corso',
  congresso: 'Congresso',
  convegno: 'Convegno',
  cadaver_lab: 'Cadaver Lab',
  live_surgery: 'Live Surgery',
}

export const MODALITA_EVENTO = {
  interno: 'Evento organizzato da noi',
  esterno: 'Partecipiamo a evento di altri',
  contributo: 'Solo contributo economico',
}

export const STATO_EVENTO = {
  proposto: 'In attesa di approvazione',
  confermato: 'Approvato',
  in_preparazione: 'In preparazione',
  pronto: 'Tutto pronto',
  in_corso: 'In corso',
  concluso: 'Concluso',
  cancellato: 'Annullato',
}

export const STATO_EVENTO_COLORE = {
  proposto: 'yellow',
  confermato: 'blue',
  in_preparazione: 'indigo',
  pronto: 'green',
  in_corso: 'emerald',
  concluso: 'gray',
  cancellato: 'red',
}

export const STATO_MATERIALE_RICHIESTA = {
  richiesto: 'Richiesto',
  approvato: 'Approvato',
  rifiutato: 'Rifiutato',
}

export const STATO_DOCUMENTO = {
  bozza: 'Bozza',
  in_revisione: 'In revisione',
  approvato: 'Approvato',
  definitivo: 'Definitivo',
}

export const STATO_ISCRIZIONE = {
  invitato: 'Invitato',
  confermato: 'Confermato',
  presente: 'Presente',
  assente: 'Assente',
}

export const PERMESSI = {
  approva_eventi: 'Approva eventi',
  approva_materiale: 'Approva materiale',
  gestione_costi: 'Gestione costi',
  compliance: 'Compliance',
  gestione_utenti: 'Gestione utenti',
}

export const RUOLI_OPERATIVI = {
  segreteria_org: 'Segreteria organizzativa',
  marketing: 'Marketing',
  logistica_spedizioni: 'Logistica spedizioni',
  logistica_ordini: 'Logistica ordini',
  amministrazione: 'Amministrazione',
  formatore: 'Formatore',
}
```

- [ ] **Step 3: Create date utils**

`src/lib/date-utils.js`:
```js
import { format, parseISO, isValid } from 'date-fns'
import { it } from 'date-fns/locale'

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (!isValid(d)) return ''
  return format(d, 'd MMM yyyy', { locale: it })
}

export function formatDateRange(start, end) {
  if (!start) return ''
  const s = formatDate(start)
  if (!end || start === end) return s
  return `${formatDate(start)} — ${formatDate(end)}`
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (!isValid(d)) return ''
  return format(d, "d MMM yyyy 'alle' HH:mm", { locale: it })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: add Supabase client, Italian constants, date utils"
```

### Task 1.3: Database migrations — Core tables

**Files:**
- Create: `supabase/migrations/001_core.sql`

- [ ] **Step 1: Write core migration (users, user_permissions, contacts)**

`supabase/migrations/001_core.sql`:
```sql
-- ============================================
-- Mikai Eventi — Core Tables
-- Spec ref: Section 4.1
-- ============================================

-- Custom types
CREATE TYPE user_role AS ENUM ('admin', 'direzione', 'ufficio', 'area_manager', 'commerciale');
CREATE TYPE permission_type AS ENUM ('approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance', 'gestione_utenti');

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nome text NOT NULL,
  cognome text NOT NULL,
  telefono text,
  avatar_url text,
  ruolo user_role NOT NULL DEFAULT 'commerciale',
  ruoli_operativi text[] DEFAULT '{}',
  responsabile_id uuid REFERENCES users(id),
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User permissions
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission permission_type NOT NULL,
  UNIQUE(user_id, permission)
);

-- Contacts (external people: doctors, speakers, etc.)
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cognome text NOT NULL,
  email text,
  telefono text,
  ente_ospedaliero text,
  ruolo_medico text,
  specializzazione text,
  note text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_ruolo ON users(ruolo);
CREATE INDEX idx_users_responsabile ON users(responsabile_id);
CREATE INDEX idx_users_attivo ON users(attivo);
CREATE INDEX idx_contacts_nome ON contacts(nome, cognome);
CREATE INDEX idx_contacts_ente ON contacts(ente_ospedaliero);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: add core DB migration (users, permissions, contacts)"
```

### Task 1.4: Database migrations — Events tables

**Files:**
- Create: `supabase/migrations/002_events.sql`

- [ ] **Step 1: Write events migration**

`supabase/migrations/002_events.sql`:
```sql
-- ============================================
-- Mikai Eventi — Events Tables
-- Spec ref: Section 4.2, 5.5
-- ============================================

CREATE TYPE evento_tipo AS ENUM ('workshop', 'corso', 'congresso', 'convegno', 'cadaver_lab', 'live_surgery');
CREATE TYPE evento_modalita AS ENUM ('interno', 'esterno', 'contributo');
CREATE TYPE evento_stato AS ENUM ('proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso', 'cancellato');
CREATE TYPE evento_ricorrenza AS ENUM ('annuale', 'semestrale');

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo text NOT NULL,
  tipo_evento evento_tipo NOT NULL,
  modalita evento_modalita NOT NULL,
  luogo text,
  sede_dettaglio text,
  data_inizio date,
  data_fine date,
  desk_richiesto boolean DEFAULT false,
  n_postazioni integer,
  stato evento_stato NOT NULL DEFAULT 'proposto',
  motivo_cancellazione text,
  parent_event_id uuid REFERENCES events(id),
  promotore_id uuid NOT NULL REFERENCES users(id),
  manager_user_id uuid REFERENCES users(id),
  clonato_da_id uuid REFERENCES events(id),
  budget_previsto decimal,
  ricorrenza evento_ricorrenza,
  mese_tipico integer CHECK (mese_tipico BETWEEN 1 AND 12),
  note text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT cancellazione_motivo CHECK (
    stato != 'cancellato' OR motivo_cancellazione IS NOT NULL
  )
);

-- Event templates
CREATE TABLE event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento evento_tipo NOT NULL,
  modalita evento_modalita NOT NULL,
  nome_template text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TYPE template_item_tipo AS ENUM ('checklist', 'sub_activity', 'logistics');
CREATE TYPE sub_activity_tipo AS ENUM ('pranzo', 'cena', 'aperitivo', 'coffee_break', 'meeting', 'altro');
CREATE TYPE logistics_tipo AS ENUM ('trasporto', 'alloggio');

CREATE TABLE template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  tipo template_item_tipo NOT NULL,
  descrizione text NOT NULL,
  assegnazione_ruolo_operativo text,
  giorni_prima_evento integer NOT NULL DEFAULT 0,
  obbligatorio boolean DEFAULT true,
  pre_approvazione boolean DEFAULT false,
  ordine integer NOT NULL DEFAULT 0,
  sub_tipo sub_activity_tipo,
  n_pax_default integer,
  logistics_tipo logistics_tipo,
  CONSTRAINT sub_tipo_check CHECK (tipo != 'sub_activity' OR sub_tipo IS NOT NULL),
  CONSTRAINT logistics_tipo_check CHECK (tipo != 'logistics' OR logistics_tipo IS NOT NULL)
);

-- Approval thresholds
CREATE TABLE approval_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento evento_tipo,
  soglia_importo decimal NOT NULL,
  area_manager_can_approve boolean DEFAULT true
);

-- Indexes
CREATE INDEX idx_events_stato ON events(stato);
CREATE INDEX idx_events_date ON events(data_inizio, data_fine);
CREATE INDEX idx_events_promotore ON events(promotore_id);
CREATE INDEX idx_events_manager ON events(manager_user_id);
CREATE INDEX idx_events_tipo ON events(tipo_evento);
CREATE INDEX idx_template_items_template ON template_items(template_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/002_events.sql
git commit -m "feat: add events DB migration (events, templates, thresholds)"
```

### Task 1.5: Database migrations — Materials tables

**Files:**
- Create: `supabase/migrations/003_materials.sql`

- [ ] **Step 1: Write materials migration**

`supabase/migrations/003_materials.sql`:
```sql
-- ============================================
-- Mikai Eventi — Materials Tables
-- Spec ref: Section 4.3
-- ============================================

CREATE TYPE material_tipo AS ENUM ('demo_kit', 'montaggio', 'strumentario', 'altro');
CREATE TYPE material_posizione AS ENUM ('magazzino', 'evento', 'agente', 'spedito', 'manutenzione');
CREATE TYPE material_request_stato AS ENUM ('richiesto', 'approvato', 'rifiutato');
CREATE TYPE movement_tipo AS ENUM ('uscita', 'rientro', 'trasferimento');
CREATE TYPE movement_modalita AS ENUM ('spedizione', 'mano', 'gia_in_loco', 'trasferimento_da_altro_evento');
CREATE TYPE rientro_stato AS ENUM ('integro', 'parziale', 'danneggiato');
CREATE TYPE gadget_request_stato AS ENUM ('richiesto', 'pronto', 'consegnato');

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo material_tipo NOT NULL,
  codice_inventario text UNIQUE,
  quantita_totale integer NOT NULL DEFAULT 1,
  posizione_attuale material_posizione NOT NULL DEFAULT 'magazzino',
  posizione_dettaglio text,
  foto_url text,
  note text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id),
  quantita_richiesta integer NOT NULL DEFAULT 1,
  data_inizio_utilizzo date NOT NULL,
  data_fine_utilizzo date NOT NULL,
  stato material_request_stato NOT NULL DEFAULT 'richiesto',
  richiesto_da uuid NOT NULL REFERENCES users(id),
  approvato_da uuid REFERENCES users(id),
  data_richiesta timestamptz DEFAULT now(),
  data_approvazione timestamptz,
  note text,
  CONSTRAINT date_range_valid CHECK (data_fine_utilizzo >= data_inizio_utilizzo)
);

CREATE TABLE material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id),
  event_id uuid REFERENCES events(id),
  tipo movement_tipo NOT NULL,
  modalita movement_modalita NOT NULL,
  da_posizione text,
  a_posizione text,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  data_rientro_prevista date,
  responsabile_id uuid NOT NULL REFERENCES users(id),
  tracking_spedizione text,
  stato_rientro rientro_stato,
  quantita_rientrata integer,
  note_danni text,
  foto_danno_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT rientro_check CHECK (tipo != 'rientro' OR stato_rientro IS NOT NULL)
);

CREATE TABLE gadgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  foto_url text,
  quantita_disponibile integer NOT NULL DEFAULT 0,
  soglia_minima integer NOT NULL DEFAULT 10,
  fornitore_abituale text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_gadgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  gadget_id uuid NOT NULL REFERENCES gadgets(id),
  quantita_richiesta integer NOT NULL DEFAULT 0,
  quantita_consegnata integer DEFAULT 0,
  stato gadget_request_stato NOT NULL DEFAULT 'richiesto',
  note text
);

-- Indexes for conflict detection (spec section 6.2)
CREATE INDEX idx_event_materials_conflict ON event_materials(material_id, data_inizio_utilizzo, data_fine_utilizzo) WHERE stato != 'rifiutato';
CREATE INDEX idx_event_materials_event ON event_materials(event_id);
CREATE INDEX idx_movements_material ON material_movements(material_id);
CREATE INDEX idx_movements_event ON material_movements(event_id);
CREATE INDEX idx_movements_rientro ON material_movements(data_rientro_prevista) WHERE tipo = 'uscita' AND data_rientro_prevista IS NOT NULL;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/003_materials.sql
git commit -m "feat: add materials DB migration (materials, movements, gadgets)"
```

### Task 1.6: Database migrations — People, Logistics, Costs

**Files:**
- Create: `supabase/migrations/004_people.sql`, `supabase/migrations/005_logistics.sql`, `supabase/migrations/006_costs.sql`

- [ ] **Step 1: Write people migration**

`supabase/migrations/004_people.sql`:
```sql
-- ============================================
-- Mikai Eventi — People Tables
-- Spec ref: Section 4.4
-- ============================================

CREATE TYPE ruolo_evento AS ENUM ('formatore', 'responsabile', 'staff', 'commerciale', 'relatore', 'ospite');
CREATE TYPE participant_tipo AS ENUM ('discente', 'relatore_esterno', 'ospite', 'accompagnatore');
CREATE TYPE iscrizione_stato AS ENUM ('invitato', 'confermato', 'presente', 'assente');

CREATE TABLE event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  ruolo_evento ruolo_evento NOT NULL,
  confermato boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id),
  tipo participant_tipo NOT NULL,
  stato_iscrizione iscrizione_stato NOT NULL DEFAULT 'invitato',
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, contact_id)
);

CREATE INDEX idx_staff_event ON event_staff(event_id);
CREATE INDEX idx_staff_user ON event_staff(user_id);
CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_contact ON event_participants(contact_id);
```

- [ ] **Step 2: Write logistics migration**

`supabase/migrations/005_logistics.sql`:
```sql
-- ============================================
-- Mikai Eventi — Logistics Tables
-- Spec ref: Section 4.5
-- ============================================

CREATE TYPE logistics_record_tipo AS ENUM ('trasporto', 'alloggio', 'transfer');
CREATE TYPE mezzo_tipo AS ENUM ('treno', 'aereo', 'auto', 'bus', 'altro');

CREATE TABLE event_sub_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tipo sub_activity_tipo NOT NULL,
  data_ora timestamptz,
  durata_minuti integer,
  luogo text,
  indirizzo text,
  n_partecipanti_previsti integer,
  fornitore text,
  confermata boolean DEFAULT false,
  template_item_id uuid REFERENCES template_items(id),
  generato_da_template boolean DEFAULT false,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  user_id uuid REFERENCES users(id),
  persona_nome text,
  tipo logistics_record_tipo NOT NULL,
  mezzo mezzo_tipo,
  da_luogo text,
  a_luogo text,
  data_ora_partenza timestamptz,
  data_ora_arrivo timestamptz,
  compagnia text,
  codice_prenotazione text,
  hotel_nome text,
  hotel_indirizzo text,
  check_in date,
  check_out date,
  n_notti integer,
  prenotazione_confermata boolean DEFAULT false,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sub_activities_event ON event_sub_activities(event_id);
CREATE INDEX idx_logistics_event ON event_logistics(event_id);
```

- [ ] **Step 3: Write costs migration**

`supabase/migrations/006_costs.sql`:
```sql
-- ============================================
-- Mikai Eventi — Costs Table
-- Spec ref: Section 4.6
-- ============================================

CREATE TYPE cost_source AS ENUM ('sub_activity', 'logistics', 'materiale', 'sponsorizzazione', 'iscrizioni', 'desk', 'gadget', 'altro');
CREATE TYPE payment_stato AS ENUM ('da_pagare', 'pagato', 'parzialmente_pagato');

CREATE TABLE event_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_tipo cost_source NOT NULL,
  source_id uuid,
  contact_id uuid REFERENCES contacts(id),
  descrizione text,
  importo_previsto decimal,
  importo_effettivo decimal,
  fornitore text,
  n_fattura text,
  stato_pagamento payment_stato NOT NULL DEFAULT 'da_pagare',
  approvato_da uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_costs_event ON event_costs(event_id);
CREATE INDEX idx_costs_contact ON event_costs(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_costs_pagamento ON event_costs(stato_pagamento);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_people.sql supabase/migrations/005_logistics.sql supabase/migrations/006_costs.sql
git commit -m "feat: add people, logistics, costs DB migrations"
```

### Task 1.7: Database migrations — Workflow, Documents, Notifications

**Files:**
- Create: `supabase/migrations/007_workflow.sql`, `supabase/migrations/008_documents.sql`, `supabase/migrations/009_notifications.sql`

- [ ] **Step 1: Write workflow migration**

`supabase/migrations/007_workflow.sql`:
```sql
-- ============================================
-- Mikai Eventi — Workflow Tables
-- Spec ref: Section 4.7
-- ============================================

CREATE TYPE task_tipo AS ENUM ('checklist', 'approvazione', 'verifica', 'marketing', 'generico');
CREATE TYPE task_priorita AS ENUM ('bassa', 'normale', 'alta');
CREATE TYPE audit_entita AS ENUM ('event', 'material', 'material_request', 'document', 'cost', 'user', 'participant', 'task', 'staff');
CREATE TYPE audit_azione AS ENUM ('creato', 'modificato', 'approvato', 'rifiutato', 'cancellato', 'stato_cambiato');

CREATE TABLE event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tipo task_tipo NOT NULL DEFAULT 'checklist',
  descrizione text NOT NULL,
  assegnato_a uuid REFERENCES users(id),
  data_scadenza date,
  priorita task_priorita NOT NULL DEFAULT 'normale',
  obbligatorio boolean DEFAULT true,
  pre_approvazione boolean DEFAULT false,
  completato boolean DEFAULT false,
  completato_il timestamptz,
  completato_da uuid REFERENCES users(id),
  feedback_post text,
  generato_da_template boolean DEFAULT false,
  template_item_id uuid REFERENCES template_items(id),
  ordine integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entita_tipo audit_entita NOT NULL,
  entita_id uuid NOT NULL,
  azione audit_azione NOT NULL,
  campo_modificato text,
  valore_precedente text,
  valore_nuovo text,
  eseguito_da uuid NOT NULL REFERENCES users(id),
  commento text,
  created_at timestamptz DEFAULT now()
);

-- activity_log is append-only: no UPDATE or DELETE allowed via RLS

CREATE INDEX idx_tasks_event ON event_tasks(event_id);
CREATE INDEX idx_tasks_assegnato ON event_tasks(assegnato_a) WHERE completato = false;
CREATE INDEX idx_tasks_scadenza ON event_tasks(data_scadenza) WHERE completato = false;
CREATE INDEX idx_activity_entita ON activity_log(entita_tipo, entita_id);
CREATE INDEX idx_activity_user ON activity_log(eseguito_da);
```

- [ ] **Step 2: Write documents migration**

`supabase/migrations/008_documents.sql`:
```sql
-- ============================================
-- Mikai Eventi — Documents Table
-- Spec ref: Section 4.8
-- ============================================

CREATE TYPE document_tipo AS ENUM ('contratto', 'programma', 'locandina', 'depliant', 'bolla', 'fattura', 'presentazione', 'foto', 'altro');
CREATE TYPE document_stato AS ENUM ('bozza', 'in_revisione', 'approvato', 'definitivo');

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id),
  tipo document_tipo NOT NULL,
  nome_file text NOT NULL,
  file_url text NOT NULL,
  stato document_stato NOT NULL DEFAULT 'bozza',
  versione integer DEFAULT 1,
  caricato_da uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_event ON documents(event_id);
```

- [ ] **Step 3: Write notifications migration**

`supabase/migrations/009_notifications.sql`:
```sql
-- ============================================
-- Mikai Eventi — Notifications Tables
-- Spec ref: Section 4.8
-- ============================================

CREATE TYPE notifica_categoria AS ENUM ('nuovo_evento', 'approvazione', 'materiale', 'conflitto', 'scadenza', 'scadenza_altrui', 'rientro_scaduto');
CREATE TYPE notifica_canale AS ENUM ('in_app', 'email', 'digest', 'off');

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categoria notifica_categoria NOT NULL,
  titolo text NOT NULL,
  messaggio text,
  link text,
  letta boolean DEFAULT false,
  canale_inviato notifica_canale NOT NULL DEFAULT 'in_app',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  canale notifica_canale NOT NULL DEFAULT 'in_app',
  UNIQUE(user_id, categoria)
);

CREATE TYPE suggestion_tipo AS ENUM ('anticipa_scadenza', 'posticipa_scadenza', 'aggiungi_task', 'rimuovi_task');

CREATE TABLE template_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_item_id uuid NOT NULL REFERENCES template_items(id),
  event_id uuid NOT NULL REFERENCES events(id),
  tipo suggestion_tipo NOT NULL,
  dettaglio text,
  applicata boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, letta);
CREATE INDEX idx_notifications_recent ON notifications(created_at DESC);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_workflow.sql supabase/migrations/008_documents.sql supabase/migrations/009_notifications.sql
git commit -m "feat: add workflow, documents, notifications DB migrations"
```

### Task 1.8: Database migrations — RLS policies + triggers

**Files:**
- Create: `supabase/migrations/010_rls.sql`, `supabase/migrations/011_triggers.sql`

- [ ] **Step 1: Write RLS policies**

`supabase/migrations/010_rls.sql`:
```sql
-- ============================================
-- Mikai Eventi — Row Level Security
-- Spec ref: Section 3 (visibility), Section 12 (RLS note)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sub_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_suggestions ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT ruolo FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(p permission_type)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid() AND permission = p
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS: everyone can read active users, only admin can write
CREATE POLICY "users_read" ON users FOR SELECT USING (true);
CREATE POLICY "users_write" ON users FOR ALL USING (get_user_role() = 'admin');

-- USER_PERMISSIONS: same as users
CREATE POLICY "perms_read" ON user_permissions FOR SELECT USING (true);
CREATE POLICY "perms_write" ON user_permissions FOR ALL USING (get_user_role() = 'admin');

-- CONTACTS: ufficio+ can read/write, commerciale can read
CREATE POLICY "contacts_read" ON contacts FOR SELECT USING (true);
CREATE POLICY "contacts_write" ON contacts FOR INSERT USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

-- EVENTS: visibility based on role (spec section 3)
-- Uses denormalized manager_user_id for area_manager (avoids recursive CTE)
CREATE POLICY "events_read" ON events FOR SELECT USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'direzione' THEN true
    WHEN 'ufficio' THEN true
    WHEN 'area_manager' THEN (
      manager_user_id = auth.uid()
      OR promotore_id = auth.uid()
    )
    WHEN 'commerciale' THEN (
      promotore_id = auth.uid()
      OR EXISTS (SELECT 1 FROM event_staff WHERE event_id = events.id AND user_id = auth.uid())
    )
    ELSE false
  END
);

CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON events FOR UPDATE USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio', 'area_manager')
);

-- EVENT child tables: inherit visibility from parent event
-- This pattern is repeated for all event_* tables
CREATE POLICY "event_materials_read" ON event_materials FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_materials.event_id)
);
CREATE POLICY "event_materials_write" ON event_materials FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);

-- Repeat similar policies for other event child tables
CREATE POLICY "event_staff_read" ON event_staff FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_staff.event_id)
);
CREATE POLICY "event_staff_write" ON event_staff FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);

CREATE POLICY "event_participants_read" ON event_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_participants.event_id)
);
CREATE POLICY "event_participants_write" ON event_participants FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR EXISTS (SELECT 1 FROM event_staff WHERE event_id = event_participants.event_id AND user_id = auth.uid())
);

CREATE POLICY "sub_activities_read" ON event_sub_activities FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_sub_activities.event_id)
);
CREATE POLICY "sub_activities_write" ON event_sub_activities FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);

CREATE POLICY "logistics_read" ON event_logistics FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_logistics.event_id)
);
CREATE POLICY "logistics_write" ON event_logistics FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);

CREATE POLICY "costs_read" ON event_costs FOR SELECT USING (
  has_permission('gestione_costi') AND EXISTS (SELECT 1 FROM events WHERE id = event_costs.event_id)
);
CREATE POLICY "costs_write" ON event_costs FOR ALL USING (
  has_permission('gestione_costi')
);

CREATE POLICY "tasks_read" ON event_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_tasks.event_id)
);
CREATE POLICY "tasks_write" ON event_tasks FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR assegnato_a = auth.uid()
);

CREATE POLICY "activity_read" ON activity_log FOR SELECT USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (true);

CREATE POLICY "documents_read" ON documents FOR SELECT USING (
  event_id IS NULL OR EXISTS (SELECT 1 FROM events WHERE id = documents.event_id)
);
CREATE POLICY "documents_write" ON documents FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);

CREATE POLICY "notifications_read" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notif_prefs_read" ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs_write" ON notification_preferences FOR ALL USING (user_id = auth.uid());

CREATE POLICY "materials_read" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_write" ON materials FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "movements_read" ON material_movements FOR SELECT USING (true);
CREATE POLICY "movements_write" ON material_movements FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "gadgets_read" ON gadgets FOR SELECT USING (true);
CREATE POLICY "gadgets_write" ON gadgets FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "event_gadgets_read" ON event_gadgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_gadgets.event_id)
);
CREATE POLICY "event_gadgets_write" ON event_gadgets FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);

CREATE POLICY "templates_read" ON event_templates FOR SELECT USING (true);
CREATE POLICY "templates_write" ON event_templates FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "template_items_read" ON template_items FOR SELECT USING (true);
CREATE POLICY "template_items_write" ON template_items FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "thresholds_read" ON approval_thresholds FOR SELECT USING (true);
CREATE POLICY "thresholds_write" ON approval_thresholds FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "suggestions_read" ON template_suggestions FOR SELECT USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);
CREATE POLICY "suggestions_write" ON template_suggestions FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);
```

- [ ] **Step 2: Write triggers**

`supabase/migrations/011_triggers.sql`:
```sql
-- ============================================
-- Mikai Eventi — Triggers
-- Spec ref: Section 8 (Automations #11), O4
-- ============================================

-- Auto-update updated_at on all tables that have it
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'contacts', 'events', 'event_templates',
      'materials', 'gadgets', 'event_sub_activities',
      'event_logistics', 'event_costs', 'event_tasks', 'documents'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

-- Automation #11: Sync materials.posizione_attuale from latest movement
-- Maps a_posizione text to material_posizione enum
CREATE OR REPLACE FUNCTION sync_material_position()
RETURNS TRIGGER AS $$
DECLARE
  new_pos material_posizione;
BEGIN
  -- Map a_posizione text to enum value
  new_pos := CASE lower(trim(NEW.a_posizione))
    WHEN 'magazzino' THEN 'magazzino'::material_posizione
    WHEN 'evento' THEN 'evento'::material_posizione
    WHEN 'agente' THEN 'agente'::material_posizione
    WHEN 'spedito' THEN 'spedito'::material_posizione
    WHEN 'manutenzione' THEN 'manutenzione'::material_posizione
    ELSE
      CASE NEW.tipo
        WHEN 'uscita' THEN 'spedito'::material_posizione
        WHEN 'rientro' THEN 'magazzino'::material_posizione
        ELSE 'magazzino'::material_posizione
      END
  END;

  UPDATE materials SET posizione_attuale = new_pos WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_material_position
  AFTER INSERT ON material_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_material_position();

-- Set manager_user_id on events based on promotore hierarchy
CREATE OR REPLACE FUNCTION set_event_manager()
RETURNS TRIGGER AS $$
DECLARE
  manager_id uuid;
BEGIN
  -- Find the area_manager in the promotore's hierarchy
  SELECT u.responsabile_id INTO manager_id
  FROM users u
  WHERE u.id = NEW.promotore_id AND u.ruolo = 'commerciale';

  -- If promotore is a commerciale, their responsabile is the area_manager
  IF manager_id IS NOT NULL THEN
    NEW.manager_user_id := manager_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_event_manager
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_event_manager();
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_rls.sql supabase/migrations/011_triggers.sql
git commit -m "feat: add RLS policies and DB triggers"
```

### Task 1.9: Seed data

**Files:**
- Create: `supabase/migrations/012_seed.sql`

- [ ] **Step 1: Write seed data for testing**

`supabase/migrations/012_seed.sql`:
```sql
-- ============================================
-- Mikai Eventi — Seed Data (development only)
-- ============================================

-- NOTE: Users must be created via Supabase Auth first.
-- This seed assumes auth users already exist and inserts their profiles.
-- In production, user creation is done through the app.

-- Templates for common event types
INSERT INTO event_templates (id, tipo_evento, modalita, nome_template) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'workshop', 'interno', 'Workshop interno standard'),
  ('t1000000-0000-0000-0000-000000000002', 'congresso', 'esterno', 'Congresso esterno standard'),
  ('t1000000-0000-0000-0000-000000000003', 'corso', 'interno', 'Corso chirurgico interno');

-- Template items for "Workshop interno standard"
INSERT INTO template_items (template_id, tipo, descrizione, assegnazione_ruolo_operativo, giorni_prima_evento, obbligatorio, pre_approvazione, ordine) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'checklist', 'Preparare locandina', 'marketing', -21, true, true, 1),
  ('t1000000-0000-0000-0000-000000000001', 'checklist', 'Ordinare materiale mancante', 'logistica_ordini', -14, true, false, 2),
  ('t1000000-0000-0000-0000-000000000001', 'checklist', 'Preparare e spedire kit demo', 'logistica_spedizioni', -7, true, false, 3),
  ('t1000000-0000-0000-0000-000000000001', 'checklist', 'Confermare iscrizioni e inviare promemoria', 'segreteria_org', -3, true, false, 4),
  ('t1000000-0000-0000-0000-000000000001', 'checklist', 'Verifica finale', 'segreteria_org', -1, true, false, 5),
  ('t1000000-0000-0000-0000-000000000001', 'checklist', 'Verificare rientro materiale demo', 'logistica_spedizioni', 3, true, false, 6),
  ('t1000000-0000-0000-0000-000000000001', 'checklist', 'Compilare report e chiudere consuntivo', 'segreteria_org', 7, false, false, 7);

-- Template items for "Congresso esterno standard"
INSERT INTO template_items (template_id, tipo, descrizione, assegnazione_ruolo_operativo, giorni_prima_evento, obbligatorio, pre_approvazione, ordine) VALUES
  ('t1000000-0000-0000-0000-000000000002', 'checklist', 'Preparare materiale marketing', 'marketing', -21, true, true, 1),
  ('t1000000-0000-0000-0000-000000000002', 'checklist', 'Preparare e spedire kit demo + gadget', 'logistica_spedizioni', -10, true, false, 2),
  ('t1000000-0000-0000-0000-000000000002', 'checklist', 'Prenotare hotel e trasporti staff', 'segreteria_org', -14, true, false, 3),
  ('t1000000-0000-0000-0000-000000000002', 'checklist', 'Verificare rientro materiale', 'logistica_spedizioni', 3, true, false, 4);

-- Approval thresholds
INSERT INTO approval_thresholds (tipo_evento, soglia_importo, area_manager_can_approve) VALUES
  (NULL, 5000, true),
  ('congresso', 10000, true);

-- Sample materials
INSERT INTO materials (id, nome, tipo, codice_inventario, quantita_totale, posizione_attuale) VALUES
  (gen_random_uuid(), 'Kit Stylo #1', 'demo_kit', 'KIT-STYLO-001', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit Stylo #2', 'demo_kit', 'KIT-STYLO-002', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit Stylo #3', 'demo_kit', 'KIT-STYLO-003', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit MiniStylo #1', 'demo_kit', 'KIT-MINI-001', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit MiniStylo #2', 'demo_kit', 'KIT-MINI-002', 1, 'magazzino'),
  (gen_random_uuid(), 'Vela espositiva grande', 'montaggio', 'VEL-001', 2, 'magazzino'),
  (gen_random_uuid(), 'Kit strumentario MMC', 'strumentario', 'STR-MMC-001', 1, 'magazzino');

-- Sample gadgets
INSERT INTO gadgets (nome, quantita_disponibile, soglia_minima, fornitore_abituale) VALUES
  ('Penne Mikai', 500, 100, 'Tipografia Rossi'),
  ('Borse congresso', 200, 50, 'Tipografia Rossi'),
  ('Block notes A5', 300, 80, 'Tipografia Rossi'),
  ('USB 16GB brandizzate', 100, 30, 'PromoGadget Srl');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/012_seed.sql
git commit -m "feat: add seed data (templates, materials, gadgets)"
```

### Task 1.10: Auth hook + useAuth

**Files:**
- Create: `src/hooks/useAuth.js`

- [ ] **Step 1: Create useAuth hook**

`src/hooks/useAuth.js`:
```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  permissions: [],
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await get().loadProfile(session.user.id)
    }
    set({ session, user: session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session) {
        await get().loadProfile(session.user.id)
      } else {
        set({ profile: null, permissions: [] })
      }
    })
  },

  loadProfile: async (userId) => {
    const [profileRes, permsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('user_permissions').select('permission').eq('user_id', userId),
    ])
    set({
      profile: profileRes.data,
      permissions: (permsRes.data || []).map(p => p.permission),
    })
  },

  hasPermission: (perm) => get().permissions.includes(perm),

  hasRole: (...roles) => roles.includes(get().profile?.ruolo),

  hasOperativeRole: (role) => (get().profile?.ruoli_operativi || []).includes(role),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, permissions: [] })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAuth.js
git commit -m "feat: add useAuth hook with Zustand store"
```

### Task 1.11: Base UI components

**Files:**
- Create: `src/components/ui/Button.jsx`, `src/components/ui/StatusBadge.jsx`, `src/components/ui/LoadingSkeleton.jsx`, `src/components/ui/EmptyState.jsx`, `src/components/ui/Toast.jsx`, `src/components/ui/ConfirmDialog.jsx`

- [ ] **Step 1: Create Button component**

`src/components/ui/Button.jsx`:
```jsx
const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
}

export function Button({ children, variant = 'primary', size = 'md', disabled, loading, className = '', ...props }) {
  const sizeClasses = size === 'lg' ? 'px-6 py-3 text-lg' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-base'

  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-lg min-h-[48px] min-w-[48px] focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizeClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create StatusBadge component**

`src/components/ui/StatusBadge.jsx`:
```jsx
import { STATO_EVENTO, STATO_EVENTO_COLORE } from '../../lib/constants'

const colorMap = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  gray: 'bg-gray-100 text-gray-600',
}

const iconMap = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  blue: '🔵',
  indigo: '🟣',
  emerald: '🟢',
  gray: '⚪',
}

export function StatusBadge({ stato, labels = STATO_EVENTO, colors = STATO_EVENTO_COLORE }) {
  const color = colors[stato] || 'gray'
  const label = labels[stato] || stato

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colorMap[color]}`}>
      <span aria-hidden="true">{iconMap[color]}</span>
      {label}
    </span>
  )
}
```

- [ ] **Step 3: Create LoadingSkeleton, EmptyState, Toast, ConfirmDialog**

`src/components/ui/LoadingSkeleton.jsx`:
```jsx
export function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-4 p-4" role="status" aria-label="Caricamento...">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${80 - i * 15}%` }} />
      ))}
      <span className="sr-only">Caricamento...</span>
    </div>
  )
}
```

`src/components/ui/EmptyState.jsx`:
```jsx
export function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-lg font-medium text-gray-900">{title}</p>
      {description && <p className="mt-2 text-base text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
```

`src/components/ui/Toast.jsx`:
```jsx
import { create } from 'zustand'

export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'success') => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  },
}))

const typeStyles = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
}

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg border text-base font-medium shadow-lg ${typeStyles[t.type]}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
```

`src/components/ui/ConfirmDialog.jsx`:
```jsx
export function ConfirmDialog({ open, title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', onConfirm, onCancel, danger = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-3 text-base text-gray-600">{message}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[48px] text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2.5 min-h-[48px] text-base font-medium text-white rounded-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add base UI components (Button, StatusBadge, Toast, etc.)"
```

### Task 1.12: Layout components (AppShell, Sidebar, Breadcrumb, MobileHeader)

**Files:**
- Create: `src/components/layout/AppShell.jsx`, `src/components/layout/Sidebar.jsx`, `src/components/layout/BottomBar.jsx`, `src/components/layout/Breadcrumb.jsx`, `src/components/layout/MobileHeader.jsx`

- [ ] **Step 1: Create Sidebar**

`src/components/layout/Sidebar.jsx`:
```jsx
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Riepilogo', icon: '📊', roles: ['admin', 'direzione', 'ufficio'] },
  { to: '/eventi', label: 'Eventi', icon: '📅', roles: null },
  { to: '/materiale', label: 'Materiale & Gadget', icon: '📦', roles: ['admin', 'direzione', 'ufficio'] },
  { to: '/contatti', label: 'Contatti', icon: '📇', roles: ['admin', 'direzione', 'ufficio'] },
  { to: '/documenti', label: 'Documenti', icon: '📎', roles: ['admin', 'direzione', 'ufficio'] },
  { to: '/notifiche', label: 'Notifiche', icon: '🔔', roles: null },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️', roles: ['admin'] },
]

export function Sidebar() {
  const profile = useAuthStore(s => s.profile)
  const signOut = useAuthStore(s => s.signOut)

  const visibleItems = navItems.filter(item =>
    !item.roles || item.roles.includes(profile?.ruolo)
  )

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-indigo-600">Mikai Eventi</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium min-h-[48px] transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <span className="text-xl" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-2">
          {profile?.nome} {profile?.cognome}
        </p>
        <button
          onClick={signOut}
          className="text-sm text-red-600 hover:text-red-800 min-h-[48px] px-2"
        >
          Esci
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create BottomBar**

`src/components/layout/BottomBar.jsx`:
```jsx
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/eventi', label: 'Eventi', icon: '📅' },
  { to: '/eventi/nuovo', label: 'Proponi', icon: '➕' },
  { to: '/notifiche', label: 'Notifiche', icon: '🔔' },
  { to: '/profilo', label: 'Io', icon: '👤' },
]

export function BottomBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 min-w-[64px] min-h-[56px] text-xs font-medium ${
                isActive ? 'text-indigo-600' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl mb-0.5" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Create Breadcrumb**

`src/components/layout/Breadcrumb.jsx`:
```jsx
import { Link } from 'react-router-dom'

export function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null

  return (
    <nav aria-label="Percorso" className="hidden md:block text-sm text-gray-500 mb-4">
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {item.to ? (
              <Link to={item.to} className="hover:text-indigo-600 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

- [ ] **Step 4: Create MobileHeader**

`src/components/layout/MobileHeader.jsx`:
```jsx
import { useNavigate } from 'react-router-dom'

export function MobileHeader({ title, subtitle, showBack = true }) {
  const navigate = useNavigate()

  return (
    <header className="md:hidden sticky top-0 bg-white border-b border-gray-200 z-30 px-4 py-3">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-600 hover:text-gray-900 -ml-2"
            aria-label="Torna indietro"
          >
            <span className="text-2xl">←</span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Create AppShell**

`src/components/layout/AppShell.jsx`:
```jsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { ToastContainer } from '../ui/Toast'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomBar />
      <ToastContainer />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/
git commit -m "feat: add layout components (AppShell, Sidebar, BottomBar, Breadcrumb, MobileHeader)"
```

### Task 1.13: Login page + wire up App.jsx

**Files:**
- Create: `src/pages/auth/Login.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create Login page**

`src/pages/auth/Login.jsx`:
```jsx
import { useState } from 'react'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore(s => s.signIn)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o password non corretti. Riprova.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-2">Mikai Eventi</h1>
        <p className="text-center text-gray-500 mb-8">Accedi al sistema</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="nome@mikai.it"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <p className="text-red-600 text-base" role="alert">{error}</p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Accedi
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire up App.jsx with routing and auth guard**

`src/App.jsx`:
```jsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/auth/Login'
import { LoadingSkeleton } from './components/ui/LoadingSkeleton'

function ProtectedRoute({ children }) {
  const session = useAuthStore(s => s.session)
  const loading = useAuthStore(s => s.loading)

  if (loading) return <LoadingSkeleton lines={5} />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => { initialize() }, [initialize])

  return (
    <BrowserRouter basename="/Eventi">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<div className="p-8 text-lg">Riepilogo — In costruzione</div>} />
          <Route path="/eventi" element={<div className="p-8 text-lg">Eventi — In costruzione</div>} />
          <Route path="/notifiche" element={<div className="p-8 text-lg">Notifiche — In costruzione</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 3: Verify login flow works (dev server)**

```bash
npm run dev
```
Expected: App shows login page. After configuring .env with Supabase credentials and creating a test user, login redirects to home with sidebar/bottom bar.

- [ ] **Step 4: Commit**

```bash
git add src/pages/auth/Login.jsx src/App.jsx
git commit -m "feat: add login page and auth-protected routing"
```

---

## Phase 2-6: Separate plans

Phases 2 through 6 will be written as separate plan documents after Phase 1 is implemented and validated. Each phase builds on the previous:

- **Phase 2:** `2026-XX-XX-eventi-core-ui.md` — Event list, detail, wizard, calendar
- **Phase 3:** `2026-XX-XX-eventi-materials.md` — Material inventory, requests, movements, conflicts
- **Phase 4:** `2026-XX-XX-eventi-people-logistics.md` — Contacts, staff, participants, sub-activities, logistics, costs
- **Phase 5:** `2026-XX-XX-eventi-workflow.md` — Tasks, auto-pilot, notifications, documents
- **Phase 6:** `2026-XX-XX-eventi-polish.md` — Dashboards, packing list, compliance, PWA, cron

This approach allows validation at each phase boundary and prevents planning waste if requirements change.
