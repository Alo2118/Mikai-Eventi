-- Add program-specific fields to template_items
-- Reuses the existing 'sub_activity' value in template_item_tipo enum

-- tipo_sotto_attivita_id: references sub_activity_types (pranzo, sessione_pratica, etc.)
ALTER TABLE template_items
  ADD COLUMN IF NOT EXISTS tipo_sotto_attivita_id uuid REFERENCES sub_activity_types(id) ON DELETE SET NULL;

-- orario_offset_minuti: minutes from event start (e.g. 0=start, 60=+1h, 480=+8h)
ALTER TABLE template_items
  ADD COLUMN IF NOT EXISTS orario_offset_minuti integer;

-- durata_minuti: expected duration
ALTER TABLE template_items
  ADD COLUMN IF NOT EXISTS durata_minuti integer;

-- luogo: default location
ALTER TABLE template_items
  ADD COLUMN IF NOT EXISTS luogo text;

-- fornitore: default supplier name
ALTER TABLE template_items
  ADD COLUMN IF NOT EXISTS fornitore text;

-- note: default notes
ALTER TABLE template_items
  ADD COLUMN IF NOT EXISTS note text;
