-- Track per-event-material return without requiring a tracked specimen.
--
-- Why:
--   The legacy return flow (BulkReturnModal + material_movements 'rientro') only
--   works for serialized assets that have an event_materials.material_id assigned.
--   In practice the event flow only sets product_id (catalog), never material_id
--   (specimen), so registerEventShipping skips creating 'uscita' movements and
--   the return modal finds nothing to return.
--
-- This migration adds quantity-based return fields directly on event_materials,
-- so the BulkReturnModal can offer a return entry for every shipped item that
-- requires one — independent of whether a physical specimen was ever picked.
--
--   data_rientro     -- when the item was returned (NULL = still out)
--   stato_rientro    -- integro / parziale / danneggiato (reuses existing enum)
--   quantita_rientrata
--   note_rientro
--   foto_rientro_url
--
-- The legacy material_movements path keeps working unchanged for serialized assets.

ALTER TABLE event_materials
  ADD COLUMN IF NOT EXISTS data_rientro       timestamptz,
  ADD COLUMN IF NOT EXISTS stato_rientro      rientro_stato,
  ADD COLUMN IF NOT EXISTS quantita_rientrata integer,
  ADD COLUMN IF NOT EXISTS note_rientro       text,
  ADD COLUMN IF NOT EXISTS foto_rientro_url   text;

COMMENT ON COLUMN event_materials.data_rientro IS
  'Quando l''item è rientrato a fine evento. NULL = ancora fuori. Usato per item senza material_id (specimen) tracciato.';
