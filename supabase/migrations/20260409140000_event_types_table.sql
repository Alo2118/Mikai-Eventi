-- Dynamic event types: replace hardcoded enum with a manageable table
-- Same pattern as product_types (20260401300000)

-- 1. Create event_types table
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  colore TEXT NOT NULL DEFAULT 'gray',
  icona TEXT NOT NULL DEFAULT 'calendar',
  ordine INTEGER NOT NULL DEFAULT 0,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_types_select" ON event_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_types_write" ON event_types
  FOR ALL TO authenticated
  USING (has_permission('gestione_utenti') OR get_user_role() = 'admin'::user_role);

-- 2. Seed existing types (matching current enum values)
INSERT INTO event_types (codice, nome, colore, icona, ordine) VALUES
  ('workshop',     'Workshop',     'mikai',   'presentation',  1),
  ('corso',        'Corso',        'blue',    'graduation-cap', 2),
  ('congresso',    'Congresso',    'purple',  'building-2',    3),
  ('convegno',     'Convegno',     'yellow',  'message-square', 4),
  ('cadaver_lab',  'Cadaver Lab',  'emerald', 'bone',          5),
  ('live_surgery', 'Live Surgery', 'red',     'heart-pulse',   6)
ON CONFLICT (codice) DO NOTHING;

-- 3. Convert events.tipo_evento from enum to text
ALTER TABLE events ALTER COLUMN tipo_evento TYPE TEXT USING tipo_evento::TEXT;

-- 4. Convert event_templates.tipo_evento from enum to text
ALTER TABLE event_templates ALTER COLUMN tipo_evento TYPE TEXT USING tipo_evento::TEXT;

-- 5. Convert approval_thresholds.tipo_evento from enum to text
ALTER TABLE approval_thresholds ALTER COLUMN tipo_evento TYPE TEXT USING tipo_evento::TEXT;

-- 6. Drop the old enum (no longer needed)
DROP TYPE IF EXISTS evento_tipo;
