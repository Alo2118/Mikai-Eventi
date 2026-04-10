-- Remove requirement flags — replaced by simpler gate logic
-- Gate now checks if content exists (materials/activities/people) and asks confirmation if empty

ALTER TABLE events DROP COLUMN IF EXISTS richiede_materiale;
ALTER TABLE events DROP COLUMN IF EXISTS richiede_logistica;
ALTER TABLE events DROP COLUMN IF EXISTS richiede_attivita;
