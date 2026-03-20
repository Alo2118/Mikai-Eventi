# Phase 4: People & Logistics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add people management (contacts, staff, participants), event program (sub-activities), logistics (hotel/transport), and cost tracking (quotes with approval flow) to the Eventi app.

**Architecture:** Two SQL migrations (enum-only + DDL/data). Six new Zustand store files for each domain. Four new EventiDetail tabs (Persone, Programma, Logistica, Costi). Two new top-level pages (/contatti, /costi). One new admin page (sotto-attività types). Extensions to constants, icons, sidebar, and routing.

**Tech Stack:** React 19, Zustand, Supabase JS, TailwindCSS v4, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-20-phase4-people-logistics-design.md`

---

## File Structure

```
supabase/migrations/
  20260320100000_phase4_enums.sql              # NEW: enum extensions (separate migration)
  20260320100001_phase4_schema.sql             # NEW: tables, ALTER, indexes, triggers, RLS, seeds

src/
  lib/
    constants.js                               # MODIFY: add new enums, permissions, presets
    icons.js                                   # MODIFY: add CONTATTI_ICONS, LOGISTICA_ICONS, COSTI_ICONS
  hooks/
    useContacts.js                             # NEW: contacts CRUD + search
    useStaff.js                                # NEW: event staff CRUD
    useParticipants.js                         # NEW: event participants CRUD
    useSubActivities.js                        # NEW: event sub-activities + types CRUD
    useLogistics.js                            # NEW: event hotel + trasporti CRUD
    useCosts.js                                # NEW: event preventivi + costs CRUD
    useAdmin.js                                # MODIFY: add fetchUsers action for staff picker
  components/
    contatti/
      ContactList.jsx                          # NEW: contact list with filters
      ContactForm.jsx                          # NEW: create/edit contact form (adaptive by type)
      ContactPicker.jsx                        # NEW: autocomplete search for picking contacts
    eventi/
      EventPersoneTab.jsx                      # NEW: staff + participants tab
      EventProgrammaTab.jsx                    # NEW: sub-activities timeline tab
      EventLogisticaTab.jsx                    # NEW: hotel + transport per person
      EventCostiTab.jsx                        # NEW: preventivi + budget bar
  pages/
    contatti/
      ContattiList.jsx                         # NEW: /contatti page
      ContattiDetail.jsx                       # NEW: /contatti/:id page
    costi/
      CostiPage.jsx                            # NEW: /costi cross-event page
    admin/
      AdminSottoAttivita.jsx                   # NEW: sub-activity types admin CRUD
    eventi/
      EventiDetail.jsx                         # MODIFY: add 4 new tabs
  App.jsx                                      # MODIFY: add routes
  components/layout/
    Sidebar.jsx                                # MODIFY: add Contatti + Costi nav items
```

---

## Task 1: SQL Migration A — Enum Extensions

**Files:**
- Create: `supabase/migrations/20260320100000_phase4_enums.sql`

- [ ] **Step 1: Create enum extension migration**

```sql
-- ============================================
-- Phase 4: Enum extensions
-- Must be separate from DDL that references new values
-- ============================================

-- New permission types
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_contatti';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_staff_evento';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_logistica';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'approva_preventivi';

-- Contact type
CREATE TYPE contact_tipo AS ENUM ('medico', 'fornitore', 'tecnico', 'istituzionale', 'altro');

-- Booking status (hotel + transport)
CREATE TYPE prenotazione_stato AS ENUM ('da_prenotare', 'prenotato', 'confermato');

-- Transport direction
CREATE TYPE trasporto_direzione AS ENUM ('andata', 'ritorno');

-- Quote status
CREATE TYPE preventivo_stato AS ENUM ('in_attesa', 'approvato', 'rifiutato', 'in_revisione');
```

- [ ] **Step 2: Verify migration parses**

Run: `cd /c/Users/Nicola_MussolinAdmin/Documents/Mikai/Eventi && cat supabase/migrations/20260320100000_phase4_enums.sql | head -5`
Expected: file exists and starts with comment

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260320100000_phase4_enums.sql
git commit -m "feat: add Phase 4 enum extensions (permissions, contact_tipo, prenotazione_stato, preventivo_stato)"
```

---

## Task 2: SQL Migration B — Schema Changes

**Files:**
- Create: `supabase/migrations/20260320100001_phase4_schema.sql`

- [ ] **Step 1: Create main schema migration**

```sql
-- ============================================
-- Phase 4: People & Logistics schema
-- Spec: docs/superpowers/specs/2026-03-20-phase4-people-logistics-design.md
-- ============================================

-- === 1. Extend contacts table ===

-- Rename ente_ospedaliero → azienda (single source of truth)
ALTER TABLE contacts RENAME COLUMN ente_ospedaliero TO azienda;
ALTER INDEX idx_contacts_ente RENAME TO idx_contacts_azienda;

-- Add new columns
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_contatto contact_tipo;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_servizio text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS proprietario_id uuid REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_contacts_tipo ON contacts(tipo_contatto);
CREATE INDEX IF NOT EXISTS idx_contacts_proprietario ON contacts(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_contacts_zona ON contacts(zone_id);

-- === 2. Extend users table ===

ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id);

-- === 3. Extend events table ===

ALTER TABLE events ADD COLUMN IF NOT EXISTS certificato_previsto boolean NOT NULL DEFAULT false;

-- === 4. Extend event_staff ===

ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER trg_event_staff_updated_at
  BEFORE UPDATE ON event_staff FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- === 5. Extend event_participants ===

ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER trg_event_participants_updated_at
  BEFORE UPDATE ON event_participants FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- === 6. sub_activity_types table ===

CREATE TABLE IF NOT EXISTS sub_activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  attivo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_sub_activity_types_updated_at
  BEFORE UPDATE ON sub_activity_types FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_sub_activity_types_attivo ON sub_activity_types(attivo);

-- Seed existing enum values (mandatory for data migration)
INSERT INTO sub_activity_types (nome)
SELECT nome FROM (VALUES
  ('pranzo'), ('cena'), ('aperitivo'), ('coffee_break'), ('meeting'), ('altro'),
  ('transfer'), ('sessione_pratica'), ('sessione_teorica'), ('visita'), ('riunione')
) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM sub_activity_types sat WHERE sat.nome = v.nome);

-- RLS
ALTER TABLE sub_activity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_activity_types_read" ON sub_activity_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sub_activity_types_write" ON sub_activity_types FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
);

-- === 7. Evolve event_sub_activities.tipo ===

ALTER TABLE event_sub_activities ADD COLUMN IF NOT EXISTS tipo_id uuid REFERENCES sub_activity_types(id);
ALTER TABLE event_sub_activities ADD COLUMN IF NOT EXISTS fornitore_id uuid REFERENCES contacts(id);

-- Data migration: map enum values to tipo_id
UPDATE event_sub_activities esa
SET tipo_id = sat.id
FROM sub_activity_types sat
WHERE sat.nome = esa.tipo::text
  AND esa.tipo_id IS NULL;

-- Safety guard: verify all rows were mapped before enforcing NOT NULL
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM event_sub_activities WHERE tipo_id IS NULL) THEN
    RAISE EXCEPTION 'Data migration incomplete: unmapped tipo values exist in event_sub_activities';
  END IF;
END $$;

-- Make tipo_id NOT NULL after data migration
ALTER TABLE event_sub_activities ALTER COLUMN tipo_id SET NOT NULL;

-- Update sub_activities_write to include area_manager
DROP POLICY IF EXISTS "sub_activities_write" ON event_sub_activities;
CREATE POLICY "sub_activities_write" ON event_sub_activities FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio', 'area_manager')
);

-- === 8. Deprecate event_logistics ===

DROP POLICY IF EXISTS "logistics_read" ON event_logistics;
DROP POLICY IF EXISTS "logistics_write" ON event_logistics;
ALTER TABLE event_logistics RENAME TO event_logistics_legacy;
ALTER TABLE event_logistics_legacy DISABLE ROW LEVEL SECURITY;

-- === 9. event_hotel table ===

CREATE TABLE IF NOT EXISTS event_hotel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  contact_id uuid REFERENCES contacts(id),
  stato prenotazione_stato NOT NULL DEFAULT 'da_prenotare',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(user_id, contact_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_hotel_event ON event_hotel(event_id);

CREATE OR REPLACE TRIGGER trg_event_hotel_updated_at
  BEFORE UPDATE ON event_hotel FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE event_hotel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hotel_read" ON event_hotel FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "hotel_write" ON event_hotel FOR ALL USING (
  has_permission('gestione_logistica')
  OR get_user_role() IN ('admin')
);

-- === 10. event_trasporti table ===

CREATE TABLE IF NOT EXISTS event_trasporti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  contact_id uuid REFERENCES contacts(id),
  direzione trasporto_direzione NOT NULL,
  stato prenotazione_stato NOT NULL DEFAULT 'da_prenotare',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(user_id, contact_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_trasporti_event ON event_trasporti(event_id);

CREATE OR REPLACE TRIGGER trg_event_trasporti_updated_at
  BEFORE UPDATE ON event_trasporti FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE event_trasporti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trasporti_read" ON event_trasporti FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "trasporti_write" ON event_trasporti FOR ALL USING (
  has_permission('gestione_logistica')
  OR get_user_role() IN ('admin')
);

-- === 11. event_preventivi table ===

CREATE TABLE IF NOT EXISTS event_preventivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sub_activity_id uuid REFERENCES event_sub_activities(id),
  fornitore_id uuid REFERENCES contacts(id),
  fornitore_nome text,
  descrizione text NOT NULL,
  importo decimal,
  allegato_url text,
  stato preventivo_stato NOT NULL DEFAULT 'in_attesa',
  approvato_da uuid REFERENCES users(id),
  data_approvazione timestamptz,
  nota_approvazione text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preventivi_event ON event_preventivi(event_id);
CREATE INDEX IF NOT EXISTS idx_preventivi_stato ON event_preventivi(stato) WHERE stato = 'in_attesa';

CREATE OR REPLACE TRIGGER trg_event_preventivi_updated_at
  BEFORE UPDATE ON event_preventivi FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE event_preventivi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preventivi_read" ON event_preventivi FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "preventivi_write" ON event_preventivi FOR INSERT WITH CHECK (
  has_permission('gestione_costi') OR get_user_role() IN ('admin')
);
CREATE POLICY "preventivi_update" ON event_preventivi FOR UPDATE USING (
  has_permission('gestione_costi') OR has_permission('approva_preventivi') OR get_user_role() IN ('admin')
);
CREATE POLICY "preventivi_delete" ON event_preventivi FOR DELETE USING (
  has_permission('gestione_costi') OR get_user_role() IN ('admin')
);

-- === 12. RLS policy updates ===

-- contacts_write: allow commerciali to INSERT own contacts
DROP POLICY IF EXISTS "contacts_write" ON contacts;
CREATE POLICY "contacts_write" ON contacts FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR (get_user_role() IN ('area_manager', 'commerciale') AND has_permission('gestione_contatti'))
  OR (get_user_role() = 'commerciale' AND proprietario_id = auth.uid())
);

-- contacts_update: allow commerciali to UPDATE own contacts
DROP POLICY IF EXISTS "contacts_update" ON contacts;
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR (get_user_role() IN ('area_manager') AND has_permission('gestione_contatti'))
  OR (get_user_role() = 'commerciale' AND proprietario_id = auth.uid())
);

-- event_participants: new INSERT-only policy for commerciali
CREATE POLICY "event_participants_commerciale_insert" ON event_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE id = event_participants.event_id AND promotore_id = auth.uid())
    AND stato_iscrizione = 'invitato'
  );

-- === 13. Permission seeds ===

-- Seed gestione_costi + new permissions for ufficio users
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, p.perm
FROM users u
CROSS JOIN (VALUES
  ('gestione_costi'::permission_type),
  ('gestione_contatti'::permission_type),
  ('gestione_staff_evento'::permission_type),
  ('gestione_logistica'::permission_type),
  ('approva_preventivi'::permission_type)
) AS p(perm)
WHERE u.ruolo IN ('ufficio')
ON CONFLICT (user_id, permission) DO NOTHING;

-- Seed gestione_contatti + gestione_staff_evento for area_manager
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, p.perm
FROM users u
CROSS JOIN (VALUES
  ('gestione_contatti'::permission_type),
  ('gestione_staff_evento'::permission_type)
) AS p(perm)
WHERE u.ruolo IN ('area_manager')
ON CONFLICT (user_id, permission) DO NOTHING;

-- Seed approva_preventivi for direzione
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, p.perm
FROM users u
CROSS JOIN (VALUES
  ('gestione_contatti'::permission_type),
  ('gestione_staff_evento'::permission_type),
  ('approva_preventivi'::permission_type)
) AS p(perm)
WHERE u.ruolo IN ('direzione')
ON CONFLICT (user_id, permission) DO NOTHING;
```

- [ ] **Step 2: Verify migration parses**

Run: `wc -l supabase/migrations/20260320100001_phase4_schema.sql`
Expected: ~200+ lines

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260320100001_phase4_schema.sql
git commit -m "feat: Phase 4 schema — contacts ext, hotel, trasporti, preventivi, sub_activity_types, RLS updates"
```

---

## Task 3: Constants & Icons

**Files:**
- Modify: `src/lib/constants.js`
- Modify: `src/lib/icons.js`

- [ ] **Step 1: Add new constants to `constants.js`**

Add after existing `STATO_ATTIVITA_COLORE` block (~line 62):

```js
// Tipo contatto
export const TIPO_CONTATTO = {
  medico: 'Medico',
  fornitore: 'Fornitore',
  tecnico: 'Tecnico',
  istituzionale: 'Istituzionale',
  altro: 'Altro',
}

// Stato prenotazione (hotel + trasporti)
export const STATO_PRENOTAZIONE = {
  da_prenotare: 'Da prenotare',
  prenotato: 'Prenotato',
  confermato: 'Confermato',
}

export const STATO_PRENOTAZIONE_COLORE = {
  da_prenotare: 'yellow',
  prenotato: 'blue',
  confermato: 'green',
}

// Direzione trasporto
export const DIREZIONE_TRASPORTO = {
  andata: 'Andata',
  ritorno: 'Ritorno',
}

// Stato preventivo
export const STATO_PREVENTIVO = {
  in_attesa: 'In attesa',
  approvato: 'Approvato',
  rifiutato: 'Rifiutato',
  in_revisione: 'In revisione',
}

export const STATO_PREVENTIVO_COLORE = {
  in_attesa: 'yellow',
  approvato: 'green',
  rifiutato: 'red',
  in_revisione: 'blue',
}

// Tipo partecipante
export const TIPO_PARTECIPANTE = {
  discente: 'Discente',
  relatore_esterno: 'Relatore esterno',
  ospite: 'Ospite',
  accompagnatore: 'Accompagnatore',
}

// Stato iscrizione
export const STATO_ISCRIZIONE = {
  invitato: 'Invitato',
  confermato: 'Confermato',
  presente: 'Presente',
  assente: 'Assente',
}

export const STATO_ISCRIZIONE_COLORE = {
  invitato: 'yellow',
  confermato: 'blue',
  presente: 'green',
  assente: 'red',
}

// Ruolo evento (staff interno)
export const RUOLO_EVENTO = {
  formatore: 'Formatore',
  responsabile: 'Responsabile',
  staff: 'Staff',
  commerciale: 'Commerciale',
  relatore: 'Relatore',
  ospite: 'Ospite',
}
```

Add to `PERMESSI` object (~line 113):

```js
  gestione_contatti: 'Gestione contatti',
  gestione_staff_evento: 'Gestione staff evento',
  gestione_logistica: 'Gestione logistica',
  approva_preventivi: 'Approva preventivi',
```

Update `ROLE_PERMISSION_PRESETS` — add to `ufficio` array (~line 203):

```js
  ufficio: ['approva_materiale', 'gestione_magazzino', 'gestione_spedizioni', 'gestione_gadget', 'gestione_sedi', 'gestione_costi', 'gestione_contatti', 'gestione_staff_evento', 'gestione_logistica', 'approva_preventivi'],
```

Add to `area_manager` preset:

```js
  area_manager: ['approva_eventi', 'richiedi_materiale', 'gestione_contatti', 'gestione_staff_evento'],
```

Add to `direzione` preset:

```js
  direzione: ['approva_eventi', 'approva_materiale', 'gestione_costi', 'gestione_contatti', 'gestione_staff_evento', 'approva_preventivi'],
```

- [ ] **Step 2: Add new icons to `icons.js`**

**Merge** the following into the existing `lucide-react` import statement (do NOT add a duplicate import line — some like `Contact` may already be imported):

```js
// Add these to the existing import: Bed, Bus, Clipboard, Euro, FileText, Hotel, ListChecks, Plane, Receipt, UserCheck, UserPlus
// Already imported (verify): Contact, Users
```

Add icon maps after existing categories:

```js
// Contatti
export const CONTATTI_ICONS = {
  contatti: Contact,
  medico: UserCheck,
  fornitore: Receipt,
  aggiungi: UserPlus,
}

// Logistica persone
export const LOGISTICA_PERSONE_ICONS = {
  hotel: Hotel,
  trasporto: Plane,
  bus: Bus,
  bed: Bed,
}

// Costi
export const COSTI_ICONS = {
  preventivo: FileText,
  costo: Euro,
  clipboard: Clipboard,
}

// Sotto-attività
export const SOTTO_ATTIVITA_ICONS = {
  programma: ListChecks,
}
```

Add to `NAV_ICONS`:

```js
  contatti: Contact,
  costi: Euro,
```

Add to `ADMIN_ICONS`:

```js
  sottoattivita: ListChecks,
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.js src/lib/icons.js
git commit -m "feat: add Phase 4 constants (contact types, booking states, quote states) and icons"
```

---

## Task 4: Contacts Store

**Files:**
- Create: `src/hooks/useContacts.js`

- [ ] **Step 1: Create contacts store**

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useContactsStore = create((set, get) => ({
  contacts: [],
  contact: null,
  loading: false,
  error: null,
  filters: { search: '', tipo: '', zoneId: '' },

  setFilter: (key, value) => set(s => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { search: '', tipo: '', zoneId: '' } }),

  fetchContacts: async () => {
    set({ loading: true, error: null })
    let query = supabase
      .from('contacts')
      .select('*, proprietario:users!contacts_proprietario_id_fkey(id, nome, cognome), zona:zones!contacts_zone_id_fkey(id, nome)')
      .eq('attivo', true)
      .order('cognome')

    const { filters } = get()
    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,cognome.ilike.%${filters.search}%,azienda.ilike.%${filters.search}%`)
    }
    if (filters.tipo) query = query.eq('tipo_contatto', filters.tipo)
    if (filters.zoneId) query = query.eq('zone_id', filters.zoneId)

    const { data, error } = await query
    set({ contacts: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  fetchContact: async (id) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('contacts')
      .select('*, proprietario:users!contacts_proprietario_id_fkey(id, nome, cognome), zona:zones!contacts_zone_id_fkey(id, nome)')
      .eq('id', id)
      .single()
    set({ contact: data, loading: false, error: error?.message })
    return { data, error }
  },

  fetchContactHistory: async (contactId) => {
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, evento:events(id, titolo, data_inizio, stato)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  },

  createContact: async (payload) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(payload)
      .select()
      .single()
    if (!error) get().fetchContacts()
    return { data, error }
  },

  updateContact: async (id, updates) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) get().fetchContacts()
    return { data, error }
  },

  searchContacts: async (term) => {
    if (!term || term.length < 2) return { data: [] }
    const { data, error } = await supabase
      .from('contacts')
      .select('id, nome, cognome, tipo_contatto, azienda')
      .eq('attivo', true)
      .or(`nome.ilike.%${term}%,cognome.ilike.%${term}%`)
      .order('cognome')
      .limit(10)
    return { data: data || [], error }
  },
}))
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useContacts.js
git commit -m "feat: add useContactsStore — contacts CRUD, search, history"
```

---

## Task 5: Contacts Page & Components

**Files:**
- Create: `src/components/contatti/ContactPicker.jsx`
- Create: `src/components/contatti/ContactForm.jsx`
- Create: `src/components/contatti/ContactList.jsx`
- Create: `src/pages/contatti/ContattiList.jsx`
- Create: `src/pages/contatti/ContattiDetail.jsx`

- [ ] **Step 1: Create ContactPicker (autocomplete component)**

`src/components/contatti/ContactPicker.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react'
import { useContactsStore } from '../../hooks/useContacts'

export function ContactPicker({ value, onChange, placeholder = 'Cerca contatto...' }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const searchContacts = useContactsStore(s => s.searchContacts)

  useEffect(() => {
    if (term.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await searchContacts(term)
      setResults(data)
      setOpen(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [term, searchContacts])

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (contact) => {
    onChange(contact)
    setTerm(`${contact.cognome} ${contact.nome}`)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={term}
        onChange={(e) => { setTerm(e.target.value); if (!value) onChange(null) }}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full px-4 py-3 text-left hover:bg-mikai-50 min-h-[48px] text-base"
              >
                <span className="font-medium">{c.cognome} {c.nome}</span>
                {c.azienda && <span className="text-gray-500 ml-2">— {c.azienda}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create ContactForm**

`src/components/contatti/ContactForm.jsx`:

```jsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { TIPO_CONTATTO } from '../../lib/constants'

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
const SELECT = INPUT

export function ContactForm({ contact, users = [], zones = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    nome: contact?.nome || '',
    cognome: contact?.cognome || '',
    tipo_contatto: contact?.tipo_contatto || 'medico',
    email: contact?.email || '',
    telefono: contact?.telefono || '',
    azienda: contact?.azienda || '',
    ruolo_medico: contact?.ruolo_medico || '',
    specializzazione: contact?.specializzazione || '',
    tipo_servizio: contact?.tipo_servizio || '',
    proprietario_id: contact?.proprietario_id || '',
    zone_id: contact?.zone_id || '',
    note: contact?.note || '',
  })

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const isMedico = form.tipo_contatto === 'medico'
  const isFornitore = form.tipo_contatto === 'fornitore'

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input className={INPUT} value={form.nome} onChange={e => set('nome', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cognome <span className="text-red-500">*</span>
          </label>
          <input className={INPUT} value={form.cognome} onChange={e => set('cognome', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo contatto</label>
          <select className={SELECT} value={form.tipo_contatto} onChange={e => set('tipo_contatto', e.target.value)}>
            {Object.entries(TIPO_CONTATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
          <select className={SELECT} value={form.zone_id} onChange={e => set('zone_id', e.target.value)}>
            <option value="">— Nessuna —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className={INPUT} value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
          <input type="tel" className={INPUT} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isMedico ? 'Struttura / Ente' : 'Azienda'}
        </label>
        <input className={INPUT} value={form.azienda} onChange={e => set('azienda', e.target.value)} />
      </div>

      {isMedico && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo medico</label>
            <input className={INPUT} value={form.ruolo_medico} onChange={e => set('ruolo_medico', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specializzazione</label>
            <input className={INPUT} value={form.specializzazione} onChange={e => set('specializzazione', e.target.value)} />
          </div>
        </div>
      )}

      {isFornitore && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo servizio</label>
          <input className={INPUT} value={form.tipo_servizio} onChange={e => set('tipo_servizio', e.target.value)} placeholder="es. catering, hotel, agenzia..." />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Proprietario</label>
        <select className={SELECT} value={form.proprietario_id} onChange={e => set('proprietario_id', e.target.value)}>
          <option value="">— Nessuno —</option>
          {users.filter(u => u.ruolo === 'commerciale' || u.ruolo === 'area_manager').map(u => (
            <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea className={INPUT + ' min-h-[80px]'} value={form.note} onChange={e => set('note', e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving}>{contact ? 'Salva modifiche' : 'Crea contatto'}</Button>
        <Button variant="secondary" type="button" onClick={onCancel}>Annulla</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create ContattiList page**

`src/pages/contatti/ContattiList.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContactsStore } from '../../hooks/useContacts'
import { useAuthStore } from '../../hooks/useAuth'
import { useAdminStore } from '../../hooks/useAdmin'
import { ContactForm } from '../../components/contatti/ContactForm'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { SearchInput } from '../../components/ui/SearchInput'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_CONTATTO } from '../../lib/constants'
import { CONTATTI_ICONS } from '../../lib/icons'

export function ContattiList() {
  const navigate = useNavigate()
  const contacts = useContactsStore(s => s.contacts)
  const loading = useContactsStore(s => s.loading)
  const filters = useContactsStore(s => s.filters)
  const fetchContacts = useContactsStore(s => s.fetchContacts)
  const setFilter = useContactsStore(s => s.setFilter)
  const createContact = useContactsStore(s => s.createContact)
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch zones for filter
  const zones = useAdminStore(s => s.zones)
  const fetchZones = useAdminStore(s => s.fetchZones)

  useEffect(() => { fetchContacts(); fetchZones() }, [])

  const handleSave = async (form) => {
    setSaving(true)
    const payload = { ...form, created_by: profile.id }
    if (!payload.proprietario_id) payload.proprietario_id = profile.id
    if (!payload.zone_id) delete payload.zone_id
    const { error } = await createContact(payload)
    setSaving(false)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast('Contatto creato', 'success')
    setShowForm(false)
  }

  const canCreate = hasPermission('gestione_contatti') || profile?.ruolo === 'commerciale'

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Contatti' }]} />
      <PageHeader
        title="Rubrica contatti"
        subtitle={`${contacts.length} contatti`}
        action={canCreate && (
          <Button onClick={() => setShowForm(true)}>
            <Icon icon={CONTATTI_ICONS.aggiungi} size={18} />
            <span className="ml-2">Nuovo contatto</span>
          </Button>
        )}
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ContactForm
            users={[]}
            zones={zones || []}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={filters.search} onChange={v => setFilter('search', v)} placeholder="Cerca per nome, cognome, azienda..." />
        </div>
        <select
          value={filters.tipo}
          onChange={e => { setFilter('tipo', e.target.value); fetchContacts() }}
          className="px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px]"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_CONTATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <LoadingSkeleton lines={5} /> : contacts.length === 0 ? (
        <EmptyState title="Nessun contatto" description="Aggiungi il primo contatto dalla rubrica" />
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/contatti/${c.id}`)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base">{c.cognome} {c.nome}</p>
                  {c.azienda && <p className="text-sm text-gray-500">{c.azienda}</p>}
                </div>
                <StatusBadge stato={c.tipo_contatto} labels={TIPO_CONTATTO} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create ContattiDetail page**

`src/pages/contatti/ContattiDetail.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContactsStore } from '../../hooks/useContacts'
import { useAuthStore } from '../../hooks/useAuth'
import { useAdminStore } from '../../hooks/useAdmin'
import { ContactForm } from '../../components/contatti/ContactForm'
import { Button } from '../../components/ui/Button'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_CONTATTO } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

export function ContattiDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contact = useContactsStore(s => s.contact)
  const loading = useContactsStore(s => s.loading)
  const fetchContact = useContactsStore(s => s.fetchContact)
  const fetchContactHistory = useContactsStore(s => s.fetchContactHistory)
  const updateContact = useContactsStore(s => s.updateContact)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)
  const zones = useAdminStore(s => s.zones)
  const fetchZones = useAdminStore(s => s.fetchZones)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetchContact(id)
    fetchZones()
    fetchContactHistory(id).then(({ data }) => setHistory(data))
  }, [id])

  const canEdit = hasPermission('gestione_contatti') || (profile?.ruolo === 'commerciale' && contact?.proprietario_id === profile?.id)

  const handleSave = async (form) => {
    setSaving(true)
    const { error } = await updateContact(id, form)
    setSaving(false)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast('Contatto aggiornato', 'success')
    setEditing(false)
    fetchContact(id)
  }

  if (loading) return <LoadingSkeleton />
  if (!contact) return null

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Contatti', to: '/contatti' }, { label: `${contact.cognome} ${contact.nome}` }]} />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {editing ? (
          <ContactForm contact={contact} users={[]} zones={zones || []} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{contact.cognome} {contact.nome}</h1>
                <p className="text-gray-500">{TIPO_CONTATTO[contact.tipo_contatto] || '—'}</p>
              </div>
              {canEdit && <Button variant="secondary" onClick={() => setEditing(true)}>Modifica</Button>}
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-base">
              {contact.azienda && <><dt className="text-gray-500">Azienda</dt><dd>{contact.azienda}</dd></>}
              {contact.email && <><dt className="text-gray-500">Email</dt><dd>{contact.email}</dd></>}
              {contact.telefono && <><dt className="text-gray-500">Telefono</dt><dd>{contact.telefono}</dd></>}
              {contact.ruolo_medico && <><dt className="text-gray-500">Ruolo</dt><dd>{contact.ruolo_medico}</dd></>}
              {contact.specializzazione && <><dt className="text-gray-500">Specializzazione</dt><dd>{contact.specializzazione}</dd></>}
              {contact.proprietario && <><dt className="text-gray-500">Proprietario</dt><dd>{contact.proprietario.cognome} {contact.proprietario.nome}</dd></>}
              {contact.zona && <><dt className="text-gray-500">Zona</dt><dd>{contact.zona.nome}</dd></>}
            </dl>
            {contact.note && <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{contact.note}</p>}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-lg mb-3">Storico eventi</h2>
          <div className="space-y-2">
            {history.map(h => (
              <button key={h.id} onClick={() => navigate(`/eventi/${h.evento?.id}`)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 text-base">
                <span className="font-medium">{h.evento?.titolo}</span>
                <span className="text-gray-500 ml-2">{h.evento?.data_inizio ? formatDate(h.evento.data_inizio) : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add src/components/contatti/ src/pages/contatti/
git commit -m "feat: add contacts page — list, detail, form, picker components"
```

---

## Task 6: Staff & Participants Stores

**Files:**
- Create: `src/hooks/useStaff.js`
- Create: `src/hooks/useParticipants.js`

- [ ] **Step 1: Create staff store**

`src/hooks/useStaff.js`:

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStaffStore = create((set, get) => ({
  staff: [],
  loading: false,

  fetchEventStaff: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_staff')
      .select('*, user:users(id, nome, cognome, ruolo, email)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ staff: data || [], loading: false })
    return { data, error }
  },

  addStaff: async (eventId, userId, ruoloEvento) => {
    const { data, error } = await supabase
      .from('event_staff')
      .insert({ event_id: eventId, user_id: userId, ruolo_evento: ruoloEvento, confermato: false })
      .select('*, user:users(id, nome, cognome, ruolo, email)')
      .single()
    if (!error) set(s => ({ staff: [...s.staff, data] }))
    return { data, error }
  },

  updateStaff: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_staff')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome, ruolo, email)')
      .single()
    if (!error) set(s => ({ staff: s.staff.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeStaff: async (id) => {
    const { error } = await supabase.from('event_staff').delete().eq('id', id)
    if (!error) set(s => ({ staff: s.staff.filter(r => r.id !== id) }))
    return { error }
  },
}))
```

- [ ] **Step 2: Create participants store**

`src/hooks/useParticipants.js`:

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useParticipantsStore = create((set, get) => ({
  participants: [],
  loading: false,

  fetchEventParticipants: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ participants: data || [], loading: false })
    return { data, error }
  },

  addParticipant: async (eventId, contactId, tipo) => {
    const { data, error } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, contact_id: contactId, tipo, stato_iscrizione: 'invitato' })
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono)')
      .single()
    if (!error) set(s => ({ participants: [...s.participants, data] }))
    return { data, error }
  },

  updateParticipant: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_participants')
      .update(updates)
      .eq('id', id)
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono)')
      .single()
    if (!error) set(s => ({ participants: s.participants.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeParticipant: async (id) => {
    const { error } = await supabase.from('event_participants').delete().eq('id', id)
    if (!error) set(s => ({ participants: s.participants.filter(r => r.id !== id) }))
    return { error }
  },
}))
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useStaff.js src/hooks/useParticipants.js
git commit -m "feat: add useStaffStore and useParticipantsStore — event staff and participant CRUD"
```

---

## Task 7: EventPersoneTab Component

**Files:**
- Create: `src/components/eventi/EventPersoneTab.jsx`

- [ ] **Step 1: Create EventPersoneTab**

`src/components/eventi/EventPersoneTab.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { ContactPicker } from '../contatti/ContactPicker'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS } from '../../lib/icons'
import { RUOLO_EVENTO, TIPO_PARTECIPANTE, STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE } from '../../lib/constants'

const SELECT = 'px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'

export function EventPersoneTab({ event, users = [] }) {
  const staff = useStaffStore(s => s.staff)
  const staffLoading = useStaffStore(s => s.loading)
  const fetchEventStaff = useStaffStore(s => s.fetchEventStaff)
  const addStaff = useStaffStore(s => s.addStaff)
  const updateStaff = useStaffStore(s => s.updateStaff)
  const removeStaff = useStaffStore(s => s.removeStaff)

  const participants = useParticipantsStore(s => s.participants)
  const participantsLoading = useParticipantsStore(s => s.loading)
  const fetchEventParticipants = useParticipantsStore(s => s.fetchEventParticipants)
  const addParticipant = useParticipantsStore(s => s.addParticipant)
  const updateParticipant = useParticipantsStore(s => s.updateParticipant)
  const removeParticipant = useParticipantsStore(s => s.removeParticipant)

  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [staffForm, setStaffForm] = useState(null) // { userId, ruolo }
  const [partForm, setPartForm] = useState(null) // { contact, tipo }
  const [deleting, setDeleting] = useState(null)

  const canEditStaff = hasPermission('gestione_staff_evento')
  const canEditPart = hasPermission('gestione_contatti') || hasPermission('gestione_staff_evento')

  useEffect(() => {
    fetchEventStaff(event.id)
    fetchEventParticipants(event.id)
  }, [event.id])

  const handleAddStaff = async () => {
    if (!staffForm?.userId || !staffForm?.ruolo) return
    const { error } = await addStaff(event.id, staffForm.userId, staffForm.ruolo)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Staff aggiunto', 'success')
    setStaffForm(null)
  }

  const handleAddParticipant = async () => {
    if (!partForm?.contact || !partForm?.tipo) return
    const { error } = await addParticipant(event.id, partForm.contact.id, partForm.tipo)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Partecipante aggiunto', 'success')
    setPartForm(null)
  }

  const staffConfermati = staff.filter(s => s.confermato).length
  const partConfermati = participants.filter(p => p.stato_iscrizione === 'confermato' || p.stato_iscrizione === 'presente').length

  return (
    <div className="space-y-6">
      {/* Riepilogo */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>Staff: {staff.length} ({staffConfermati} confermati)</span>
        <span>Partecipanti: {participants.length} ({partConfermati} confermati)</span>
      </div>

      {/* === STAFF === */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Staff interno</h3>
          {canEditStaff && !staffForm && (
            <Button variant="secondary" size="sm" onClick={() => setStaffForm({ userId: '', ruolo: 'staff' })}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Aggiungi</span>
            </Button>
          )}
        </div>

        {staffForm && (
          <div className="flex flex-col md:flex-row gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <select className={SELECT + ' flex-1'} value={staffForm.userId} onChange={e => setStaffForm(f => ({ ...f, userId: e.target.value }))}>
              <option value="">Seleziona persona...</option>
              {users.filter(u => !staff.some(s => s.user_id === u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.cognome} {u.nome} ({u.ruolo})</option>
              ))}
            </select>
            <select className={SELECT} value={staffForm.ruolo} onChange={e => setStaffForm(f => ({ ...f, ruolo: e.target.value }))}>
              {Object.entries(RUOLO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddStaff}>Aggiungi</Button>
              <Button variant="ghost" size="sm" onClick={() => setStaffForm(null)}>Annulla</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {staff.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 min-h-[48px]">
              <div>
                <span className="font-medium">{s.user?.cognome} {s.user?.nome}</span>
                <span className="text-gray-500 ml-2">— {RUOLO_EVENTO[s.ruolo_evento]}</span>
              </div>
              <div className="flex items-center gap-2">
                {canEditStaff && (
                  <button
                    onClick={() => updateStaff(s.id, { confermato: !s.confermato })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] ${s.confermato ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {s.confermato ? 'Confermato' : 'Da confermare'}
                  </button>
                )}
                {canEditStaff && (
                  <button onClick={() => setDeleting({ type: 'staff', id: s.id, name: `${s.user?.cognome} ${s.user?.nome}` })} className="text-red-500 p-2 min-h-[36px]">
                    <Icon icon={ACTION_ICONS.close} size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {staff.length === 0 && !staffLoading && <p className="text-gray-400 text-center py-4">Nessuno staff assegnato</p>}
        </div>
      </div>

      {/* === PARTECIPANTI === */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Partecipanti</h3>
          {canEditPart && !partForm && (
            <Button variant="secondary" size="sm" onClick={() => setPartForm({ contact: null, tipo: 'discente' })}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Aggiungi</span>
            </Button>
          )}
        </div>

        {partForm && (
          <div className="flex flex-col md:flex-row gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <ContactPicker value={partForm.contact} onChange={c => setPartForm(f => ({ ...f, contact: c }))} />
            </div>
            <select className={SELECT} value={partForm.tipo} onChange={e => setPartForm(f => ({ ...f, tipo: e.target.value }))}>
              {Object.entries(TIPO_PARTECIPANTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddParticipant}>Aggiungi</Button>
              <Button variant="ghost" size="sm" onClick={() => setPartForm(null)}>Annulla</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {participants.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 min-h-[48px]">
              <div>
                <span className="font-medium">{p.contact?.cognome} {p.contact?.nome}</span>
                {p.contact?.azienda && <span className="text-gray-500 ml-2">— {p.contact.azienda}</span>}
                <span className="text-gray-400 ml-2 text-sm">{TIPO_PARTECIPANTE[p.tipo]}</span>
              </div>
              <div className="flex items-center gap-2">
                {canEditPart && (
                  <select
                    value={p.stato_iscrizione}
                    onChange={e => updateParticipant(p.id, { stato_iscrizione: e.target.value })}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 min-h-[36px]"
                  >
                    {Object.entries(STATO_ISCRIZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}
                {!canEditPart && <StatusBadge stato={p.stato_iscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />}
                {canEditPart && (
                  <button onClick={() => setDeleting({ type: 'participant', id: p.id, name: `${p.contact?.cognome} ${p.contact?.nome}` })} className="text-red-500 p-2 min-h-[36px]">
                    <Icon icon={ACTION_ICONS.close} size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {participants.length === 0 && !participantsLoading && <p className="text-gray-400 text-center py-4">Nessun partecipante</p>}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Rimuovi persona"
        message={`Rimuovere ${deleting?.name} dall'evento?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={async () => {
          if (deleting.type === 'staff') await removeStaff(deleting.id)
          else await removeParticipant(deleting.id)
          setDeleting(null)
          addToast('Rimosso', 'success')
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/EventPersoneTab.jsx
git commit -m "feat: add EventPersoneTab — staff assignment + participant management"
```

---

## Task 8: Sub-Activities Store, Admin Page & Tab

**Files:**
- Create: `src/hooks/useSubActivities.js`
- Create: `src/pages/admin/AdminSottoAttivita.jsx`
- Create: `src/components/eventi/EventProgrammaTab.jsx`

- [ ] **Step 1: Create sub-activities store**

`src/hooks/useSubActivities.js`:

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSubActivitiesStore = create((set, get) => ({
  subActivities: [],
  types: [],
  loading: false,

  fetchTypes: async () => {
    const { data, error } = await supabase
      .from('sub_activity_types')
      .select('*')
      .eq('attivo', true)
      .order('nome')
    set({ types: data || [] })
    return { data, error }
  },

  // Admin CRUD for types
  createType: async (nome) => {
    const { data, error } = await supabase
      .from('sub_activity_types')
      .insert({ nome })
      .select()
      .single()
    if (!error) get().fetchTypes()
    return { data, error }
  },

  updateType: async (id, updates) => {
    const { data, error } = await supabase
      .from('sub_activity_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) get().fetchTypes()
    return { data, error }
  },

  deleteType: async (id) => {
    const { error } = await supabase
      .from('sub_activity_types')
      .update({ attivo: false })
      .eq('id', id)
    if (!error) get().fetchTypes()
    return { error }
  },

  // Event sub-activities
  fetchEventSubActivities: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_sub_activities')
      .select('*, tipo_ref:sub_activity_types(id, nome), fornitore_ref:contacts!event_sub_activities_fornitore_id_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('data_ora', { ascending: true })
    set({ subActivities: data || [], loading: false })
    return { data, error }
  },

  createSubActivity: async (payload) => {
    const { data, error } = await supabase
      .from('event_sub_activities')
      .insert(payload)
      .select('*, tipo_ref:sub_activity_types(id, nome)')
      .single()
    if (!error) set(s => ({ subActivities: [...s.subActivities, data].sort((a, b) => (a.data_ora || '').localeCompare(b.data_ora || '')) }))
    return { data, error }
  },

  updateSubActivity: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_sub_activities')
      .update(updates)
      .eq('id', id)
      .select('*, tipo_ref:sub_activity_types(id, nome)')
      .single()
    if (!error) set(s => ({ subActivities: s.subActivities.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeSubActivity: async (id) => {
    const { error } = await supabase.from('event_sub_activities').delete().eq('id', id)
    if (!error) set(s => ({ subActivities: s.subActivities.filter(r => r.id !== id) }))
    return { error }
  },
}))
```

- [ ] **Step 2: Create AdminSottoAttivita page**

`src/pages/admin/AdminSottoAttivita.jsx` — follow `AdminBrand.jsx` pattern:

```jsx
import { useEffect, useState } from 'react'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { AdminTable } from '../../components/ui/AdminTable'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { useToastStore } from '../../components/ui/Toast'

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'

export function AdminSottoAttivita() {
  const types = useSubActivitiesStore(s => s.types)
  const fetchTypes = useSubActivitiesStore(s => s.fetchTypes)
  const createType = useSubActivitiesStore(s => s.createType)
  const updateType = useSubActivitiesStore(s => s.updateType)
  const deleteType = useSubActivitiesStore(s => s.deleteType)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [nome, setNome] = useState('')

  useEffect(() => { fetchTypes() }, [])

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    const { error } = editing
      ? await updateType(editing.id, { nome: nome.trim() })
      : await createType(nome.trim())
    setSaving(false)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast(editing ? 'Tipo aggiornato' : 'Tipo creato', 'success')
    setEditing(null)
    setNome('')
  }

  const handleDelete = async () => {
    const { error } = await deleteType(deleting.id)
    setDeleting(null)
    if (error) { addToast('Errore', 'error'); return }
    addToast('Tipo disattivato', 'success')
  }

  const columns = [
    { key: 'nome', label: 'Nome' },
  ]

  if (editing !== null) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Admin' }, { label: 'Tipi sotto-attività', to: '/admin/sotto-attivita' }, { label: editing ? 'Modifica' : 'Nuovo' }]} />
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h2 className="font-semibold text-lg mb-4">{editing?.id ? 'Modifica tipo' : 'Nuovo tipo sotto-attività'}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input className={INPUT} value={nome} onChange={e => setNome(e.target.value)} placeholder="es. Pranzo, Coffee break..." />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving}>{editing?.id ? 'Salva' : 'Crea'}</Button>
              <Button variant="secondary" onClick={() => { setEditing(null); setNome('') }}>Annulla</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Admin' }, { label: 'Tipi sotto-attività' }]} />
      <AdminTable
        columns={columns}
        rows={types}
        searchField="nome"
        onAdd={() => { setEditing({}); setNome('') }}
        onEdit={(row) => { setEditing(row); setNome(row.nome) }}
        onDelete={(row) => setDeleting(row)}
        addLabel="Nuovo tipo"
      />
      <ConfirmDialog
        open={!!deleting}
        title="Disattiva tipo"
        message={`Disattivare "${deleting?.nome}"? Le sotto-attività esistenti non saranno modificate.`}
        confirmLabel="Disattiva"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create EventProgrammaTab**

`src/components/eventi/EventProgrammaTab.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { ContactPicker } from '../contatti/ContactPicker'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS } from '../../lib/icons'
import { formatDateTime } from '../../lib/date-utils'

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'

export function EventProgrammaTab({ event }) {
  const subActivities = useSubActivitiesStore(s => s.subActivities)
  const types = useSubActivitiesStore(s => s.types)
  const loading = useSubActivitiesStore(s => s.loading)
  const fetchEventSubActivities = useSubActivitiesStore(s => s.fetchEventSubActivities)
  const fetchTypes = useSubActivitiesStore(s => s.fetchTypes)
  const createSubActivity = useSubActivitiesStore(s => s.createSubActivity)
  const updateSubActivity = useSubActivitiesStore(s => s.updateSubActivity)
  const removeSubActivity = useSubActivitiesStore(s => s.removeSubActivity)

  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tipo_id: '', data_ora: '', durata_minuti: '', luogo: '', fornitore: '', fornitore_id: null, note: '' })
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchEventSubActivities(event.id)
    fetchTypes()
  }, [event.id])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.tipo_id) return
    const payload = {
      event_id: event.id,
      tipo_id: form.tipo_id,
      data_ora: form.data_ora || null,
      durata_minuti: form.durata_minuti ? parseInt(form.durata_minuti) : null,
      luogo: form.luogo || null,
      fornitore: form.fornitore || null,
      fornitore_id: form.fornitore_id || null,
      note: form.note || null,
    }
    const { error } = await createSubActivity(payload)
    if (error) { addToast('Errore', 'error'); return }
    addToast('Attività aggiunta', 'success')
    setShowForm(false)
    setForm({ tipo_id: '', data_ora: '', durata_minuti: '', luogo: '', fornitore: '', fornitore_id: null, note: '' })
  }

  const toggleConfirm = async (sa) => {
    await updateSubActivity(sa.id, { confermata: !sa.confermata })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Programma</h3>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            <Icon icon={ACTION_ICONS.add} size={16} />
            <span className="ml-1">Aggiungi</span>
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
              <select className={INPUT} value={form.tipo_id} onChange={e => set('tipo_id', e.target.value)}>
                <option value="">Seleziona...</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e ora</label>
              <input type="datetime-local" className={INPUT} value={form.data_ora} onChange={e => set('data_ora', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durata (minuti)</label>
              <input type="number" className={INPUT} value={form.durata_minuti} onChange={e => set('durata_minuti', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
              <input className={INPUT} value={form.luogo} onChange={e => set('luogo', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
            <input className={INPUT} value={form.fornitore} onChange={e => set('fornitore', e.target.value)} placeholder="Nome fornitore o cerca nella rubrica" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea className={INPUT + ' min-h-[80px]'} value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button size="sm" onClick={handleSave}>Aggiungi</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annulla</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {subActivities.map(sa => (
          <div key={sa.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between min-h-[48px]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{sa.tipo_ref?.nome || '—'}</span>
                {sa.confermata && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Confermata</span>}
              </div>
              <div className="text-sm text-gray-500">
                {sa.data_ora && <span>{formatDateTime(sa.data_ora)}</span>}
                {sa.durata_minuti && <span> · {sa.durata_minuti} min</span>}
                {sa.luogo && <span> · {sa.luogo}</span>}
              </div>
              {sa.fornitore && <p className="text-sm text-gray-500">Fornitore: {sa.fornitore}</p>}
              {sa.note && <p className="text-sm text-gray-400 mt-1">{sa.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleConfirm(sa)} className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] ${sa.confermata ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {sa.confermata ? 'Confermata' : 'Da confermare'}
              </button>
              <button onClick={() => setDeleting(sa)} className="text-red-500 p-2 min-h-[36px]">
                <Icon icon={ACTION_ICONS.close} size={16} />
              </button>
            </div>
          </div>
        ))}
        {subActivities.length === 0 && !loading && <p className="text-gray-400 text-center py-6">Nessuna attività in programma</p>}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Rimuovi attività"
        message={`Rimuovere "${deleting?.tipo_ref?.nome}" dal programma?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={async () => { await removeSubActivity(deleting.id); setDeleting(null); addToast('Rimossa', 'success') }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSubActivities.js src/pages/admin/AdminSottoAttivita.jsx src/components/eventi/EventProgrammaTab.jsx
git commit -m "feat: add sub-activities — store, admin CRUD, event program tab"
```

---

## Task 9: Logistics Store & Tab

**Files:**
- Create: `src/hooks/useLogistics.js`
- Create: `src/components/eventi/EventLogisticaTab.jsx`

- [ ] **Step 1: Create logistics store**

`src/hooks/useLogistics.js`:

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useLogisticsStore = create((set, get) => ({
  hotels: [],
  trasporti: [],
  loading: false,

  fetchEventHotels: async (eventId) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ hotels: data || [] })
    return { data, error }
  },

  fetchEventTrasporti: async (eventId) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ trasporti: data || [] })
    return { data, error }
  },

  fetchEventLogistics: async (eventId) => {
    set({ loading: true })
    await Promise.all([get().fetchEventHotels(eventId), get().fetchEventTrasporti(eventId)])
    set({ loading: false })
  },

  createHotel: async (payload) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .insert(payload)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ hotels: [...s.hotels, data] }))
    return { data, error }
  },

  updateHotel: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ hotels: s.hotels.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeHotel: async (id) => {
    const { error } = await supabase.from('event_hotel').delete().eq('id', id)
    if (!error) set(s => ({ hotels: s.hotels.filter(r => r.id !== id) }))
    return { error }
  },

  createTrasporto: async (payload) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .insert(payload)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ trasporti: [...s.trasporti, data] }))
    return { data, error }
  },

  updateTrasporto: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ trasporti: s.trasporti.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeTrasporto: async (id) => {
    const { error } = await supabase.from('event_trasporti').delete().eq('id', id)
    if (!error) set(s => ({ trasporti: s.trasporti.filter(r => r.id !== id) }))
    return { error }
  },

  // Cross-event queries for /logistica page
  fetchAllPendingHotels: async () => {
    const { data, error } = await supabase
      .from('event_hotel')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome), evento:events(id, titolo, data_inizio)')
      .in('stato', ['da_prenotare', 'prenotato'])
      .order('created_at')
    return { data: data || [], error }
  },

  fetchAllPendingTrasporti: async () => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome), evento:events(id, titolo, data_inizio)')
      .in('stato', ['da_prenotare', 'prenotato'])
      .order('created_at')
    return { data: data || [], error }
  },
}))
```

- [ ] **Step 2: Create EventLogisticaTab**

`src/components/eventi/EventLogisticaTab.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { useToastStore } from '../ui/Toast'
import { STATO_PRENOTAZIONE, STATO_PRENOTAZIONE_COLORE, DIREZIONE_TRASPORTO } from '../../lib/constants'

const SELECT = 'px-3 py-1.5 rounded-lg text-sm border border-gray-200 min-h-[36px]'

export function EventLogisticaTab({ event }) {
  const hotels = useLogisticsStore(s => s.hotels)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const loading = useLogisticsStore(s => s.loading)
  const fetchEventLogistics = useLogisticsStore(s => s.fetchEventLogistics)
  const createHotel = useLogisticsStore(s => s.createHotel)
  const updateHotel = useLogisticsStore(s => s.updateHotel)
  const createTrasporto = useLogisticsStore(s => s.createTrasporto)
  const updateTrasporto = useLogisticsStore(s => s.updateTrasporto)

  const staff = useStaffStore(s => s.staff)
  const participants = useParticipantsStore(s => s.participants)
  const canEdit = useAuthStore(s => s.hasPermission)('gestione_logistica')
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchEventLogistics(event.id) }, [event.id])

  // Build unified people list
  const people = [
    ...staff.map(s => ({ type: 'staff', id: s.user_id, nome: s.user?.nome, cognome: s.user?.cognome, ruolo: s.ruolo_evento })),
    ...participants.map(p => ({ type: 'participant', id: p.contact_id, nome: p.contact?.nome, cognome: p.contact?.cognome, ruolo: p.tipo })),
  ]

  const getHotel = (person) => hotels.find(h => person.type === 'staff' ? h.user_id === person.id : h.contact_id === person.id)
  const getAndata = (person) => trasporti.find(t => t.direzione === 'andata' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))
  const getRitorno = (person) => trasporti.find(t => t.direzione === 'ritorno' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))

  const ensureHotel = async (person) => {
    const payload = { event_id: event.id, stato: 'da_prenotare' }
    if (person.type === 'staff') payload.user_id = person.id
    else payload.contact_id = person.id
    const { error } = await createHotel(payload)
    if (error) addToast('Errore', 'error')
  }

  const ensureTrasporto = async (person, direzione) => {
    const payload = { event_id: event.id, direzione, stato: 'da_prenotare' }
    if (person.type === 'staff') payload.user_id = person.id
    else payload.contact_id = person.id
    const { error } = await createTrasporto(payload)
    if (error) addToast('Errore', 'error')
  }

  if (loading) return <p className="text-gray-400 text-center py-6">Caricamento...</p>

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Logistica persone</h3>

      {people.length === 0 && <p className="text-gray-400 text-center py-6">Aggiungi staff o partecipanti nel tab Persone</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="pb-2 pr-4">Persona</th>
              <th className="pb-2 px-2">Hotel</th>
              <th className="pb-2 px-2">Andata</th>
              <th className="pb-2 px-2">Ritorno</th>
            </tr>
          </thead>
          <tbody>
            {people.map(person => {
              const hotel = getHotel(person)
              const andata = getAndata(person)
              const ritorno = getRitorno(person)
              return (
                <tr key={`${person.type}-${person.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{person.cognome} {person.nome}</span>
                    <span className="text-gray-400 text-sm ml-1">({person.type === 'staff' ? 'staff' : 'partecipante'})</span>
                  </td>
                  <td className="py-3 px-2">
                    {hotel ? (
                      canEdit ? (
                        <select className={SELECT} value={hotel.stato} onChange={e => updateHotel(hotel.id, { stato: e.target.value })}>
                          {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <StatusBadge stato={hotel.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                      )
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => ensureHotel(person)}>+ Hotel</Button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-2">
                    {andata ? (
                      canEdit ? (
                        <select className={SELECT} value={andata.stato} onChange={e => updateTrasporto(andata.id, { stato: e.target.value })}>
                          {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <StatusBadge stato={andata.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                      )
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => ensureTrasporto(person, 'andata')}>+ Andata</Button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-2">
                    {ritorno ? (
                      canEdit ? (
                        <select className={SELECT} value={ritorno.stato} onChange={e => updateTrasporto(ritorno.id, { stato: e.target.value })}>
                          {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <StatusBadge stato={ritorno.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                      )
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => ensureTrasporto(person, 'ritorno')}>+ Ritorno</Button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useLogistics.js src/components/eventi/EventLogisticaTab.jsx
git commit -m "feat: add logistics — store, event logistics tab (hotel + trasporti per persona)"
```

---

## Task 10: Costs Store & Tab

**Files:**
- Create: `src/hooks/useCosts.js`
- Create: `src/components/eventi/EventCostiTab.jsx`

- [ ] **Step 1: Create costs store**

`src/hooks/useCosts.js`:

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useCostsStore = create((set, get) => ({
  preventivi: [],
  costs: [],
  loading: false,

  fetchEventPreventivi: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_preventivi')
      .select('*, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome), approvatore:users!event_preventivi_approvato_da_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ preventivi: data || [], loading: false })
    return { data, error }
  },

  fetchEventCosts: async (eventId) => {
    const { data, error } = await supabase
      .from('event_costs')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at')
    set({ costs: data || [] })
    return { data, error }
  },

  createPreventivo: async (payload) => {
    const { data, error } = await supabase
      .from('event_preventivi')
      .insert(payload)
      .select('*, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ preventivi: [...s.preventivi, data] }))
    return { data, error }
  },

  updatePreventivo: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_preventivi')
      .update(updates)
      .eq('id', id)
      .select('*, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome), approvatore:users!event_preventivi_approvato_da_fkey(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ preventivi: s.preventivi.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  approvePreventivo: async (id, userId, nota) => {
    return get().updatePreventivo(id, {
      stato: 'approvato',
      approvato_da: userId,
      data_approvazione: new Date().toISOString(),
      nota_approvazione: nota || null,
    })
  },

  rejectPreventivo: async (id, userId, nota) => {
    return get().updatePreventivo(id, {
      stato: 'rifiutato',
      approvato_da: userId,
      data_approvazione: new Date().toISOString(),
      nota_approvazione: nota,
    })
  },

  requestRevision: async (id, nota) => {
    return get().updatePreventivo(id, { stato: 'in_revisione', nota_approvazione: nota })
  },

  removePreventivo: async (id) => {
    const { error } = await supabase.from('event_preventivi').delete().eq('id', id)
    if (!error) set(s => ({ preventivi: s.preventivi.filter(r => r.id !== id) }))
    return { error }
  },

  // Cross-event
  fetchPendingPreventivi: async () => {
    const { data, error } = await supabase
      .from('event_preventivi')
      .select('*, evento:events(id, titolo, data_inizio), fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome)')
      .eq('stato', 'in_attesa')
      .order('created_at')
    return { data: data || [], error }
  },

  createCost: async (payload) => {
    const { data, error } = await supabase
      .from('event_costs')
      .insert(payload)
      .select()
      .single()
    if (!error) set(s => ({ costs: [...s.costs, data] }))
    return { data, error }
  },
}))
```

- [ ] **Step 2: Create EventCostiTab**

`src/components/eventi/EventCostiTab.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useCostsStore } from '../../hooks/useCosts'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS, COSTI_ICONS } from '../../lib/icons'
import { STATO_PREVENTIVO, STATO_PREVENTIVO_COLORE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'

export function EventCostiTab({ event }) {
  const preventivi = useCostsStore(s => s.preventivi)
  const costs = useCostsStore(s => s.costs)
  const loading = useCostsStore(s => s.loading)
  const fetchEventPreventivi = useCostsStore(s => s.fetchEventPreventivi)
  const fetchEventCosts = useCostsStore(s => s.fetchEventCosts)
  const createPreventivo = useCostsStore(s => s.createPreventivo)
  const approvePreventivo = useCostsStore(s => s.approvePreventivo)
  const rejectPreventivo = useCostsStore(s => s.rejectPreventivo)
  const requestRevision = useCostsStore(s => s.requestRevision)

  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const canManage = hasPermission('gestione_costi')
  const canApprove = hasPermission('approva_preventivi')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ descrizione: '', importo: '', fornitore_nome: '' })
  const [actionDialog, setActionDialog] = useState(null) // { type, preventivo, nota }

  useEffect(() => {
    fetchEventPreventivi(event.id)
    fetchEventCosts(event.id)
  }, [event.id])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleCreate = async () => {
    if (!form.descrizione) return
    const { error } = await createPreventivo({
      event_id: event.id,
      descrizione: form.descrizione,
      importo: form.importo ? parseFloat(form.importo) : null,
      fornitore_nome: form.fornitore_nome || null,
      created_by: profile.id,
    })
    if (error) { addToast('Errore', 'error'); return }
    addToast('Preventivo aggiunto', 'success')
    setShowForm(false)
    setForm({ descrizione: '', importo: '', fornitore_nome: '' })
  }

  const handleAction = async () => {
    const { type, preventivo, nota } = actionDialog
    let result
    if (type === 'approve') result = await approvePreventivo(preventivo.id, profile.id, nota)
    else if (type === 'reject') result = await rejectPreventivo(preventivo.id, profile.id, nota)
    else if (type === 'revision') result = await requestRevision(preventivo.id, nota)
    if (result?.error) { addToast('Errore', 'error'); return }
    addToast(type === 'approve' ? 'Approvato' : type === 'reject' ? 'Rifiutato' : 'In revisione', 'success')
    setActionDialog(null)
  }

  // Budget summary
  const budgetPrevisto = event.budget_previsto || 0
  const costiApprovati = preventivi.filter(p => p.stato === 'approvato').reduce((sum, p) => sum + (p.importo || 0), 0)
  const costiEffettivi = costs.reduce((sum, c) => sum + (c.importo_effettivo || 0), 0)
  const maxBudget = Math.max(budgetPrevisto, costiApprovati, costiEffettivi, 1)

  return (
    <div className="space-y-6">
      {/* Budget bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-lg mb-3">Budget</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Previsto</span>
            <span className="font-medium">{budgetPrevisto.toLocaleString('it-IT')} €</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-mikai-400 rounded-full" style={{ width: `${Math.min((budgetPrevisto / maxBudget) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span>Approvato</span>
            <span className={`font-medium ${costiApprovati > budgetPrevisto ? 'text-red-600' : 'text-green-600'}`}>{costiApprovati.toLocaleString('it-IT')} €</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${costiApprovati > budgetPrevisto ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${Math.min((costiApprovati / maxBudget) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span>Effettivo</span>
            <span className="font-medium">{costiEffettivi.toLocaleString('it-IT')} €</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((costiEffettivi / maxBudget) * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Preventivi */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Preventivi</h3>
          {canManage && !showForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Aggiungi</span>
            </Button>
          )}
        </div>

        {showForm && (
          <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <input className={INPUT} value={form.descrizione} onChange={e => set('descrizione', e.target.value)} placeholder="Descrizione (es. Catering pranzo 20 pax)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="number" step="0.01" className={INPUT} value={form.importo} onChange={e => set('importo', e.target.value)} placeholder="Importo €" />
              <input className={INPUT} value={form.fornitore_nome} onChange={e => set('fornitore_nome', e.target.value)} placeholder="Fornitore" />
            </div>
            <div className="flex gap-3">
              <Button size="sm" onClick={handleCreate}>Aggiungi</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annulla</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {preventivi.map(p => (
            <div key={p.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{p.descrizione}</span>
                  {p.fornitore_nome && <span className="text-gray-500 ml-2">— {p.fornitore_nome}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {p.importo != null && <span className="font-semibold">{p.importo.toLocaleString('it-IT')} €</span>}
                  <StatusBadge stato={p.stato} labels={STATO_PREVENTIVO} colors={STATO_PREVENTIVO_COLORE} />
                </div>
              </div>
              {p.nota_approvazione && <p className="text-sm text-gray-500 mt-1">{p.nota_approvazione}</p>}
              {p.approvatore && <p className="text-xs text-gray-400 mt-1">{p.approvatore.cognome} {p.approvatore.nome} — {p.data_approvazione ? formatDate(p.data_approvazione) : ''}</p>}

              {canApprove && p.stato === 'in_attesa' && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => setActionDialog({ type: 'approve', preventivo: p, nota: '' })}>Approva</Button>
                  <Button variant="danger" size="sm" onClick={() => setActionDialog({ type: 'reject', preventivo: p, nota: '' })}>Rifiuta</Button>
                  <Button variant="secondary" size="sm" onClick={() => setActionDialog({ type: 'revision', preventivo: p, nota: '' })}>Revisione</Button>
                </div>
              )}
            </div>
          ))}
          {preventivi.length === 0 && !loading && <p className="text-gray-400 text-center py-4">Nessun preventivo</p>}
        </div>
      </div>

      {/* Action dialog */}
      {actionDialog && (
        <ConfirmDialog
          open={!!actionDialog}
          title={actionDialog.type === 'approve' ? 'Approva preventivo' : actionDialog.type === 'reject' ? 'Rifiuta preventivo' : 'Richiedi revisione'}
          message={
            <div className="space-y-2">
              <p>{actionDialog.preventivo.descrizione} — {actionDialog.preventivo.importo?.toLocaleString('it-IT')} €</p>
              <textarea
                className={INPUT + ' min-h-[80px]'}
                value={actionDialog.nota}
                onChange={e => setActionDialog(d => ({ ...d, nota: e.target.value }))}
                placeholder={actionDialog.type === 'reject' ? 'Motivo del rifiuto...' : 'Note (opzionale)...'}
              />
            </div>
          }
          confirmLabel={actionDialog.type === 'approve' ? 'Approva' : actionDialog.type === 'reject' ? 'Rifiuta' : 'Richiedi revisione'}
          danger={actionDialog.type === 'reject'}
          onConfirm={handleAction}
          onCancel={() => setActionDialog(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCosts.js src/components/eventi/EventCostiTab.jsx
git commit -m "feat: add costs — store, event costs tab with preventivi approval flow + budget bar"
```

---

## Task 11: Cross-Event Pages (Costi)

**Files:**
- Create: `src/pages/costi/CostiPage.jsx`

- [ ] **Step 1: Create CostiPage**

`src/pages/costi/CostiPage.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCostsStore } from '../../hooks/useCosts'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { STATO_PREVENTIVO, STATO_PREVENTIVO_COLORE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

export function CostiPage() {
  const navigate = useNavigate()
  const fetchPendingPreventivi = useCostsStore(s => s.fetchPendingPreventivi)
  const [preventivi, setPreventivi] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingPreventivi().then(({ data }) => {
      setPreventivi(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Costi' }]} />
      <PageHeader title="Preventivi in attesa" subtitle={`${preventivi.length} preventivi da approvare`} />

      {loading ? <LoadingSkeleton lines={5} /> : preventivi.length === 0 ? (
        <EmptyState title="Nessun preventivo in attesa" description="Tutti i preventivi sono stati gestiti" />
      ) : (
        <div className="space-y-2">
          {preventivi.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/eventi/${p.evento?.id}`)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base">{p.descrizione}</p>
                  <p className="text-sm text-gray-500">{p.evento?.titolo} — {p.evento?.data_inizio ? formatDate(p.evento.data_inizio) : ''}</p>
                  {p.fornitore_nome && <p className="text-sm text-gray-400">{p.fornitore_nome}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {p.importo != null && <span className="font-semibold">{p.importo.toLocaleString('it-IT')} €</span>}
                  <StatusBadge stato={p.stato} labels={STATO_PREVENTIVO} colors={STATO_PREVENTIVO_COLORE} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/pages/costi/CostiPage.jsx
git commit -m "feat: add cross-event costs page — pending preventivi overview"
```

---

## Task 12: Wire Everything — Routes, Sidebar, EventiDetail Tabs

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/pages/eventi/EventiDetail.jsx`

- [ ] **Step 1: Add routes to App.jsx**

Add imports at the top:

```js
import { ContattiList } from './pages/contatti/ContattiList'
import { ContattiDetail } from './pages/contatti/ContattiDetail'
import { CostiPage } from './pages/costi/CostiPage'
import { AdminSottoAttivita } from './pages/admin/AdminSottoAttivita'
```

Add routes inside `<ProtectedRoute>` (after existing routes, before admin routes):

```jsx
<Route path="/contatti" element={<ContattiList />} />
<Route path="/contatti/:id" element={<ContattiDetail />} />
<Route path="/costi" element={<CostiPage />} />
```

Add admin route:

```jsx
<Route path="/admin/sotto-attivita" element={<AdminSottoAttivita />} />
```

- [ ] **Step 2: Update sidebar nav items in Sidebar.jsx**

**IMPORTANT:** The sidebar already has a `/contatti` entry with `roles: ['admin', 'direzione', 'ufficio']`. **Replace it** (don't add a duplicate) to remove the role restriction (visibility is now handled by RLS per spec):

```js
{ to: '/contatti', label: 'Contatti', icon: NAV_ICONS.contatti },
```

**Add** the Costi entry (after Logistica):

```js
{ to: '/costi', label: 'Costi', icon: NAV_ICONS.costi, permissions: ['gestione_costi', 'approva_preventivi'] },
```

**Add** to `adminItems` array:

```js
{ to: '/admin/sotto-attivita', label: 'Sotto-attività', icon: ADMIN_ICONS.sottoattivita },
```

- [ ] **Step 3: Add fetchUsers to useAdmin.js**

Add a `fetchUsers` action to `useAdminStore` for the staff picker in EventPersoneTab:

```js
  users: [],
  usersLoading: false,

  fetchUsers: async () => {
    set({ usersLoading: true })
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, cognome, ruolo, email')
      .eq('attivo', true)
      .order('cognome')
    set({ users: data || [], usersLoading: false })
    return { data, error }
  },
```

- [ ] **Step 4: Update tabs in EventiDetail.jsx**

Add imports:

```js
import { EventPersoneTab } from '../../components/eventi/EventPersoneTab'
import { EventProgrammaTab } from '../../components/eventi/EventProgrammaTab'
import { EventLogisticaTab } from '../../components/eventi/EventLogisticaTab'
import { EventCostiTab } from '../../components/eventi/EventCostiTab'
import { useAdminStore } from '../../hooks/useAdmin'
```

**REPLACE** the existing placeholder tab entries in `getVisibleTabs()`. Remove the old `staff`, `partecipanti`, `subattivita`, `logistica`, and `costi` entries (they are `PlaceholderTab` placeholders). Replace with:

```js
tabs.push({ id: 'persone', label: 'Persone' })
tabs.push({ id: 'programma', label: 'Programma' })
tabs.push({ id: 'logistica', label: 'Logistica' })
if (permissions.includes('gestione_costi') || permissions.includes('approva_preventivi')) {
  tabs.push({ id: 'costi', label: 'Costi' })
}
```

**Also add** the `certificato_previsto` checkbox to the existing EventInfoTab display (or in the event detail header):

```jsx
{/* In EventInfoTab or event header, add: */}
<label className="flex items-center gap-2 min-h-[48px]">
  <input type="checkbox" checked={event.certificato_previsto} disabled className="w-5 h-5" />
  <span>Certificato previsto</span>
</label>
```

**Remove** all `PlaceholderTab` renderers for the old tab IDs (`staff`, `partecipanti`, `subattivita`, `logistica`, `costi`).

**Replace** with:

```jsx
{activeTab === 'persone' && <EventPersoneTab event={event} users={users} />}
{activeTab === 'programma' && <EventProgrammaTab event={event} />}
{activeTab === 'logistica' && <EventLogisticaTab event={event} />}
{activeTab === 'costi' && <EventCostiTab event={event} />}
```

**Fetch users** for the staff picker — add inside the component:

```js
const users = useAdminStore(s => s.users)
const fetchUsers = useAdminStore(s => s.fetchUsers)

useEffect(() => { fetchUsers() }, [])
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/layout/Sidebar.jsx src/pages/eventi/EventiDetail.jsx
git commit -m "feat: wire Phase 4 — routes, sidebar, event detail tabs (persone, programma, logistica, costi)"
```

---

## Task 13: Push Migrations

- [ ] **Step 1: Push migration A (enums)**

Run:

```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
```

Expected: migrations applied successfully

- [ ] **Step 2: Verify migration status**

Run:

```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase migration list -p "$SUPABASE_DB_PASSWORD"
```

Expected: both `20260320100000` and `20260320100001` show as applied

---

## Task 14: Full Build & Smoke Test

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: BUILD SUCCESS with no errors

- [ ] **Step 2: Dev server smoke test**

Run: `npm run dev`

Verify manually:
- [ ] `/contatti` page loads, shows empty state or contacts
- [ ] Can create a new contact
- [ ] `/eventi/:id` shows Persone, Programma, Logistica, Costi tabs
- [ ] Can add staff to an event
- [ ] Can add participant (search contact)
- [ ] Can add sub-activity to program
- [ ] Logistics tab shows people with hotel/transport states
- [ ] Can create and approve a preventivo
- [ ] `/costi` cross-event page shows pending preventivi
- [ ] `/admin/sotto-attivita` CRUD works
- [ ] Sidebar shows Contatti and Costi links

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: Phase 4 smoke test fixes"
```
