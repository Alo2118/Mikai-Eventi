-- Shipping is at EVENT level, not per-material-row
-- Ivan ships boxes (colli), not individual items

ALTER TABLE events ADD COLUMN IF NOT EXISTS spedizione_corriere text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS spedizione_tracking text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS spedizione_colli integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS spedizione_data date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS spedizione_note text;
