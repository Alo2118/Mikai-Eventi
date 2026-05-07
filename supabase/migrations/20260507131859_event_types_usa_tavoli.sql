-- Make "tab Tavoli" decision data-driven instead of hardcoded.
-- Today src/lib/constants.js TIPI_EVENTO_CON_TAVOLI = ['corso', 'cadaver_lab'].
-- Custom event types (es. "corso interno") created via admin do not show the
-- Tavoli tab. Move the decision to a per-event-type flag.

ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS usa_tavoli boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN event_types.usa_tavoli IS
  'true = mostra il tab Tavoli e l''assegnazione discenti per gli eventi di questo tipo';

-- Backfill: enable for the legacy seed values that previously had tavoli.
UPDATE event_types SET usa_tavoli = true WHERE codice IN ('corso', 'cadaver_lab');
