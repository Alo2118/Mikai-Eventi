-- Explicit requirement flags for events
-- null = not yet decided, true = required, false = not needed
-- Default based on modalita: contributo defaults to false, others to null

ALTER TABLE events ADD COLUMN IF NOT EXISTS richiede_materiale BOOLEAN;
ALTER TABLE events ADD COLUMN IF NOT EXISTS richiede_logistica BOOLEAN;
ALTER TABLE events ADD COLUMN IF NOT EXISTS richiede_attivita BOOLEAN;

-- Set defaults for existing 'contributo' events (contributo = financial only, no logistics needed)
UPDATE events SET
  richiede_materiale = false,
  richiede_logistica = false,
  richiede_attivita = false
WHERE modalita = 'contributo'
  AND richiede_materiale IS NULL;
