-- 1. Add agente_id field on contacts (references another contact who is the agent)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS agente_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_agente ON contacts(agente_id);

-- 2. Assign zone_id to contacts based on città matching zone_provinces
-- Maps: contact.citta → zone_provinces.provincia → zones.id
UPDATE contacts c
SET zone_id = zp_match.zone_id
FROM (
  SELECT DISTINCT ON (provincia) zona_match.provincia, zona_match.zone_id
  FROM zone_provinces zona_match
) zp_match
WHERE c.citta IS NOT NULL
  AND c.citta != ''
  AND c.zone_id IS NULL
  AND c.tipo_contatto != 'agente'
  AND lower(trim(c.citta)) = lower(trim(zp_match.provincia));

-- 3. For each zone, find the "main" agent (first agent contact in that zone)
-- and assign as agente_id to all non-agent contacts in the same zone
-- Skip if the zone has multiple agents (requires manual assignment)
ALTER TABLE contacts DISABLE TRIGGER USER;

DO $$
DECLARE
  z RECORD;
  agent_id uuid;
  agent_count int;
  updated int;
BEGIN
  FOR z IN SELECT id, nome FROM zones LOOP
    -- Count agents in this zone
    SELECT count(*) INTO agent_count
    FROM contacts
    WHERE tipo_contatto = 'agente' AND zone_id = z.id AND attivo = true;

    IF agent_count = 1 THEN
      -- Single agent: assign to all contacts in this zone
      SELECT id INTO agent_id
      FROM contacts
      WHERE tipo_contatto = 'agente' AND zone_id = z.id AND attivo = true
      LIMIT 1;

      UPDATE contacts
      SET agente_id = agent_id
      WHERE zone_id = z.id
        AND tipo_contatto != 'agente'
        AND agente_id IS NULL;

      GET DIAGNOSTICS updated = ROW_COUNT;
      IF updated > 0 THEN
        RAISE NOTICE 'Zona %: assegnato agente a % contatti', z.nome, updated;
      END IF;
    ELSIF agent_count > 1 THEN
      RAISE NOTICE 'Zona %: % agenti — assegnazione manuale richiesta', z.nome, agent_count;
    END IF;
  END LOOP;
END $$;

ALTER TABLE contacts ENABLE TRIGGER USER;
