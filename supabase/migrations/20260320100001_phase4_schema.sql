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
