-- Bulk import support: new contact fields + duplicate detection RPC

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS citta text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS note_salute text;

CREATE INDEX IF NOT EXISTS idx_contacts_citta ON contacts(citta);

-- RPC: batch duplicate detection (case-insensitive, trimmed)
-- Accepts JSON array: [{"nome":"Omar","cognome":"El Ezzo"}, ...]
-- Returns matched contacts with pair_index to correlate with input rows
CREATE OR REPLACE FUNCTION find_contact_duplicates(pairs jsonb)
RETURNS TABLE(pair_index int, id uuid, nome text, cognome text, azienda text, tipo_contatto contact_tipo, attivo boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.idx::int, c.id, c.nome, c.cognome, c.azienda, c.tipo_contatto, c.attivo
  FROM jsonb_array_elements(pairs) WITH ORDINALITY AS p(val, idx)
  JOIN contacts c
    ON LOWER(TRIM(c.cognome)) = LOWER(TRIM(p.val->>'cognome'))
   AND LOWER(TRIM(c.nome)) = LOWER(TRIM(p.val->>'nome'))
$$;
