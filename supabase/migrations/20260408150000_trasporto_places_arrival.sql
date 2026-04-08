-- Add departure/arrival places and arrival time to transport legs
-- Remove pickup fields from being required (still exist for backward compat)

ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS luogo_partenza text;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS luogo_arrivo text;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS orario_arrivo timestamptz;
