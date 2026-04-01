-- Update check constraint to accept either the old sub_tipo enum or the new tipo_sotto_attivita_id UUID
ALTER TABLE template_items DROP CONSTRAINT IF EXISTS sub_tipo_check;
ALTER TABLE template_items ADD CONSTRAINT sub_tipo_check
  CHECK (tipo != 'sub_activity' OR sub_tipo IS NOT NULL OR tipo_sotto_attivita_id IS NOT NULL);
