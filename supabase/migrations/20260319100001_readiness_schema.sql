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
