-- Fix remaining unmatched contacts by azienda (city name in azienda field)
ALTER TABLE contacts DISABLE TRIGGER USER;

-- Alghero → Sardegna
UPDATE contacts SET zone_id = (SELECT id FROM zones WHERE nome = 'Sardegna')
WHERE zone_id IS NULL AND attivo = true AND lower(azienda) = 'alghero';

-- Sciacca → Sicilia Ovest
UPDATE contacts SET zone_id = (SELECT id FROM zones WHERE nome = 'Sicilia Ovest')
WHERE zone_id IS NULL AND attivo = true AND lower(azienda) = 'sciacca';

-- Vigevano → Lombardia
UPDATE contacts SET zone_id = (SELECT id FROM zones WHERE nome = 'Lombardia')
WHERE zone_id IS NULL AND attivo = true AND lower(azienda) = 'vigevano';

-- Also set citta from azienda where citta is missing and azienda looks like a city name
UPDATE contacts SET citta = initcap(azienda), azienda = NULL
WHERE zone_id IS NOT NULL AND attivo = true
  AND (citta IS NULL OR citta = '')
  AND azienda IS NOT NULL
  AND lower(azienda) IN ('alghero', 'sciacca', 'vigevano');

DO $$
DECLARE without_zone int;
BEGIN
  SELECT count(*) INTO without_zone FROM contacts WHERE attivo = true AND tipo_contatto != 'agente' AND zone_id IS NULL;
  RAISE NOTICE 'Contatti ancora senza zona: %', without_zone;
END $$;

ALTER TABLE contacts ENABLE TRIGGER USER;
