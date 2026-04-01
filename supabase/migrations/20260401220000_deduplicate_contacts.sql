-- Deduplicate contacts: keep the most complete record, deactivate duplicates
-- A duplicate = same nome + cognome (case insensitive), both active

ALTER TABLE contacts DISABLE TRIGGER USER;

-- Mark duplicates as inactive (keep the one with most data)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(nome)), lower(trim(cognome))
      ORDER BY
        -- Prefer records with more data filled in
        (CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END +
         CASE WHEN telefono IS NOT NULL AND telefono != '' THEN 1 ELSE 0 END +
         CASE WHEN azienda IS NOT NULL AND azienda != '' THEN 1 ELSE 0 END +
         CASE WHEN citta IS NOT NULL AND citta != '' THEN 1 ELSE 0 END +
         CASE WHEN zone_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN tipo_contatto IS NOT NULL THEN 1 ELSE 0 END) DESC,
        created_at ASC -- older record as tiebreaker
    ) AS rn
  FROM contacts
  WHERE attivo = true
)
UPDATE contacts SET attivo = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

DO $$
DECLARE deduped int;
BEGIN
  GET DIAGNOSTICS deduped = ROW_COUNT;
  RAISE NOTICE 'Contatti duplicati disattivati: %', deduped;
END $$;

ALTER TABLE contacts ENABLE TRIGGER USER;
