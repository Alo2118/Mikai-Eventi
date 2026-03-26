-- Packing list items can be assigned to a specific box (collo)
-- NULL = not yet assigned to a box
ALTER TABLE packing_list_items ADD COLUMN IF NOT EXISTS collo_numero integer;

-- Index for grouping by collo
CREATE INDEX IF NOT EXISTS idx_packing_list_collo ON packing_list_items(event_id, collo_numero);
