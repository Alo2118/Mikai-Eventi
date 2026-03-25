-- Phase 5D: Add consuntivo (actual cost) fields to event_preventivi
ALTER TABLE event_preventivi
  ADD COLUMN IF NOT EXISTS importo_effettivo decimal,
  ADD COLUMN IF NOT EXISTS n_fattura text,
  ADD COLUMN IF NOT EXISTS data_fattura date,
  ADD COLUMN IF NOT EXISTS note_consuntivo text;

CREATE INDEX IF NOT EXISTS idx_preventivi_consuntivo
  ON event_preventivi(importo_effettivo)
  WHERE importo_effettivo IS NOT NULL;
