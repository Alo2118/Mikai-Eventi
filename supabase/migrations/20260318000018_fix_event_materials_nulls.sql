-- ============================================
-- Fix: drop NOT NULL on event_materials columns
-- that are no longer required by the new lista model.
-- The redesign uses product_id (not material_id)
-- and dates come from the event (not per-row).
-- ============================================

ALTER TABLE event_materials ALTER COLUMN material_id DROP NOT NULL;
ALTER TABLE event_materials ALTER COLUMN data_inizio_utilizzo DROP NOT NULL;
ALTER TABLE event_materials ALTER COLUMN data_fine_utilizzo DROP NOT NULL;
