-- 1. Add 'spedito' to material_request_stato enum
ALTER TYPE material_request_stato ADD VALUE IF NOT EXISTS 'spedito';

-- 2. Add event deadline columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS deadline_preparazione date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deadline_partecipanti date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS data_consegna_prevista date;
