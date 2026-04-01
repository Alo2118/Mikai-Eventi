-- Smart zone assignment: parse city info from azienda field
-- Pattern: "Ospedale di Chiari BS" → BS = Brescia → Lombardia
-- Pattern: "Policlinico Napoli" → Napoli → Campania

ALTER TABLE contacts DISABLE TRIGGER USER;

-- Map province abbreviations to zones
CREATE TEMP TABLE prov_abbrev (abbr text, zona text);
INSERT INTO prov_abbrev VALUES
  ('VI', 'Veneto'), ('VR', 'Veneto'), ('PD', 'Veneto'), ('VE', 'Veneto'),
  ('TV', 'Veneto'), ('BL', 'Veneto'), ('RO', 'Veneto'),
  ('MI', 'Lombardia'), ('BG', 'Lombardia'), ('BS', 'Lombardia'), ('CO', 'Lombardia'),
  ('LC', 'Lombardia'), ('LO', 'Lombardia'), ('MN', 'Lombardia'), ('MB', 'Lombardia'),
  ('PV', 'Lombardia'), ('SO', 'Lombardia'), ('VA', 'Lombardia'), ('CR', 'Lombardia'),
  ('BO', 'Emilia'), ('MO', 'Emilia'), ('RE', 'Emilia'), ('PR', 'Emilia'), ('FE', 'Emilia'),
  ('RA', 'Romagna'), ('FC', 'Romagna'), ('RN', 'Romagna'),
  ('PC', 'Piacenza'),
  ('FI', 'Toscana'), ('PO', 'Toscana'), ('PT', 'Toscana'), ('LU', 'Toscana'),
  ('MS', 'Toscana'), ('PI', 'Toscana'), ('LI', 'Toscana'), ('GR', 'Toscana'),
  ('SI', 'Toscana'), ('AR', 'Toscana'),
  ('GE', 'Liguria - Basso Piemonte'), ('SP', 'Liguria - Basso Piemonte'),
  ('SV', 'Liguria - Basso Piemonte'), ('IM', 'Liguria - Basso Piemonte'),
  ('CN', 'Liguria - Basso Piemonte'), ('AT', 'Liguria - Basso Piemonte'),
  ('AL', 'Liguria - Basso Piemonte'),
  ('TN', 'Trentino'), ('BZ', 'Trentino'),
  ('UD', 'Friuli'), ('PN', 'Friuli'), ('TS', 'Friuli'), ('GO', 'Friuli'),
  ('RM', 'Roma'),
  ('LT', 'Lazio'), ('FR', 'Lazio'), ('VT', 'Lazio'), ('RI', 'Lazio'),
  ('NA', 'Campania'), ('SA', 'Campania'), ('CE', 'Campania'),
  ('AV', 'Campania'), ('BN', 'Campania'),
  ('BA', 'Puglia Bari'), ('BT', 'Puglia Bari'),
  ('BR', 'Puglia Brindisi Lecce'), ('LE', 'Puglia Brindisi Lecce'), ('TA', 'Puglia Brindisi Lecce'),
  ('FG', 'Puglia Foggia'),
  ('AQ', 'Abruzzo'), ('TE', 'Abruzzo'), ('PE', 'Abruzzo'), ('CH', 'Abruzzo'),
  ('CA', 'Sardegna'), ('SS', 'Sardegna'), ('NU', 'Sardegna'), ('OR', 'Sardegna'),
  ('CT', 'Sicilia Est'), ('ME', 'Sicilia Est'), ('SR', 'Sicilia Est'),
  ('RG', 'Sicilia Est'), ('EN', 'Sicilia Est'),
  ('PA', 'Sicilia Ovest'), ('TP', 'Sicilia Ovest'), ('AG', 'Sicilia Ovest'), ('CL', 'Sicilia Ovest'),
  -- Alto Piemonte / Torino non coperto da agenti Mikai, ma mappiamo per completezza
  ('TO', 'Liguria - Basso Piemonte'), ('NO', 'Lombardia'), ('VB', 'Lombardia'),
  ('VC', 'Lombardia'), ('BI', 'Lombardia'),
  -- Molise, Basilicata, Calabria - non coperti ma mappiamo a zone vicine
  ('CB', 'Abruzzo'), ('IS', 'Abruzzo'), ('PZ', 'Campania'), ('MT', 'Puglia Brindisi Lecce'),
  ('CS', 'Sicilia Est'), ('CZ', 'Sicilia Est'), ('KR', 'Sicilia Est'),
  ('RC', 'Sicilia Est'), ('VV', 'Sicilia Est'),
  -- Umbria / Marche
  ('PG', 'Toscana'), ('TR', 'Lazio'), ('AN', 'Romagna'), ('PU', 'Romagna'),
  ('MC', 'Abruzzo'), ('FM', 'Abruzzo'), ('AP', 'Abruzzo');

-- Large city-to-zone map (common city names found in azienda/citta fields)
CREATE TEMP TABLE city_map (city_lower text, zona text);
INSERT INTO city_map VALUES
  -- Major cities
  ('roma', 'Roma'), ('napoli', 'Campania'), ('milano', 'Lombardia'), ('torino', 'Liguria - Basso Piemonte'),
  ('palermo', 'Sicilia Ovest'), ('genova', 'Liguria - Basso Piemonte'), ('bologna', 'Emilia'),
  ('firenze', 'Toscana'), ('bari', 'Puglia Bari'), ('catania', 'Sicilia Est'),
  ('venezia', 'Veneto'), ('verona', 'Veneto'), ('messina', 'Sicilia Est'),
  ('padova', 'Veneto'), ('trieste', 'Friuli'), ('brescia', 'Lombardia'),
  ('parma', 'Emilia'), ('modena', 'Emilia'), ('reggio emilia', 'Emilia'),
  ('ravenna', 'Romagna'), ('rimini', 'Romagna'), ('ferrara', 'Emilia'),
  ('piacenza', 'Piacenza'), ('trento', 'Trentino'), ('bolzano', 'Trentino'),
  ('udine', 'Friuli'), ('vicenza', 'Veneto'), ('treviso', 'Veneto'),
  ('bergamo', 'Lombardia'), ('monza', 'Lombardia'), ('como', 'Lombardia'),
  ('pavia', 'Lombardia'), ('varese', 'Lombardia'), ('lecco', 'Lombardia'),
  ('mantova', 'Lombardia'), ('cremona', 'Lombardia'),
  ('salerno', 'Campania'), ('caserta', 'Campania'),
  ('foggia', 'Puglia Foggia'), ('lecce', 'Puglia Brindisi Lecce'),
  ('brindisi', 'Puglia Brindisi Lecce'), ('taranto', 'Puglia Brindisi Lecce'),
  ('pescara', 'Abruzzo'), ('chieti', 'Abruzzo'), ('teramo', 'Abruzzo'),
  ('cagliari', 'Sardegna'), ('sassari', 'Sardegna'),
  ('siracusa', 'Sicilia Est'), ('ragusa', 'Sicilia Est'),
  ('trapani', 'Sicilia Ovest'), ('agrigento', 'Sicilia Ovest'),
  ('latina', 'Lazio'), ('frosinone', 'Lazio'), ('viterbo', 'Lazio'),
  ('pisa', 'Toscana'), ('livorno', 'Toscana'), ('arezzo', 'Toscana'),
  ('siena', 'Toscana'), ('lucca', 'Toscana'), ('grosseto', 'Toscana'),
  ('perugia', 'Toscana'), ('terni', 'Lazio'),
  ('ancona', 'Romagna'), ('pesaro', 'Romagna'),
  -- Smaller cities commonly in orthopedic context
  ('rizzoli', 'Emilia'), ('pini', 'Lombardia'), ('gaetano pini', 'Lombardia'),
  ('galeazzi', 'Lombardia'), ('humanitas', 'Lombardia'),
  ('chiari', 'Lombardia'), ('desenzano', 'Lombardia'), ('gavardo', 'Lombardia'),
  ('montichiari', 'Lombardia'), ('manerbio', 'Lombardia'),
  ('conegliano', 'Veneto'), ('castelfranco veneto', 'Veneto'),
  ('montebelluna', 'Veneto'), ('bassano del grappa', 'Veneto'),
  ('schio', 'Veneto'), ('thiene', 'Veneto'), ('arzignano', 'Veneto'),
  ('valdagno', 'Veneto'), ('monteviale', 'Veneto'), ('santorso', 'Veneto'),
  ('noventa vicentina', 'Veneto'), ('lonigo', 'Veneto'),
  ('negrar', 'Veneto'), ('san bonifacio', 'Veneto'), ('legnago', 'Veneto'),
  ('abano terme', 'Veneto'), ('este', 'Veneto'), ('cittadella', 'Veneto'),
  ('mestre', 'Veneto'), ('chioggia', 'Veneto'),
  ('cesena', 'Romagna'), ('forlì', 'Romagna'), ('faenza', 'Romagna'),
  ('imola', 'Emilia'), ('carpi', 'Emilia'), ('sassuolo', 'Emilia'),
  ('avellino', 'Campania'), ('benevento', 'Campania'),
  ('andria', 'Puglia Bari'), ('barletta', 'Puglia Bari'), ('trani', 'Puglia Bari'),
  ('altamura', 'Puglia Bari'), ('molfetta', 'Puglia Bari'),
  ('gallipoli', 'Puglia Brindisi Lecce'), ('nardò', 'Puglia Brindisi Lecce'),
  ('castellammare di stabia', 'Campania'), ('torre del greco', 'Campania'),
  ('battipaglia', 'Campania'), ('cava de'' tirreni', 'Campania'),
  ('olbia', 'Sardegna'), ('nuoro', 'Sardegna'), ('oristano', 'Sardegna');

-- Strategy 1: Match citta field directly to city_map
UPDATE contacts c
SET zone_id = z.id
FROM city_map cm
JOIN zones z ON z.nome = cm.zona
WHERE c.zone_id IS NULL AND c.attivo = true AND c.tipo_contatto != 'agente'
  AND c.citta IS NOT NULL AND lower(trim(c.citta)) = cm.city_lower;

-- Strategy 2: Extract province abbreviation from citta (e.g. "Chiari BS", "Napoli (NA)")
UPDATE contacts c
SET zone_id = z.id
FROM prov_abbrev pa
JOIN zones z ON z.nome = pa.zona
WHERE c.zone_id IS NULL AND c.attivo = true AND c.tipo_contatto != 'agente'
  AND c.citta IS NOT NULL
  AND (
    -- Pattern "City XX" (2-letter abbreviation at end)
    upper(regexp_replace(trim(c.citta), '^.* ([A-Z]{2})$', '\1')) = pa.abbr
    OR
    -- Pattern "City (XX)"
    upper(regexp_replace(trim(c.citta), '^.*\(([A-Z]{2})\)$', '\1')) = pa.abbr
  )
  AND length(regexp_replace(trim(c.citta), '^.* ([A-Z]{2})$', '\1')) = 2;

-- Strategy 3: Search city names inside azienda field
UPDATE contacts c
SET zone_id = z.id
FROM city_map cm
JOIN zones z ON z.nome = cm.zona
WHERE c.zone_id IS NULL AND c.attivo = true AND c.tipo_contatto != 'agente'
  AND c.azienda IS NOT NULL
  AND lower(c.azienda) LIKE '%' || cm.city_lower || '%';

-- Strategy 4: Extract province abbreviation from azienda (e.g. "ASST Chiari (BS)")
UPDATE contacts c
SET zone_id = z.id
FROM prov_abbrev pa
JOIN zones z ON z.nome = pa.zona
WHERE c.zone_id IS NULL AND c.attivo = true AND c.tipo_contatto != 'agente'
  AND c.azienda IS NOT NULL
  AND c.azienda ~ ('\(' || pa.abbr || '\)');

-- Log results
DO $$
DECLARE
  total_contacts int;
  with_zone int;
  without_zone int;
BEGIN
  SELECT count(*) INTO total_contacts FROM contacts WHERE attivo = true AND tipo_contatto != 'agente';
  SELECT count(*) INTO with_zone FROM contacts WHERE attivo = true AND tipo_contatto != 'agente' AND zone_id IS NOT NULL;
  WITHOUT_zone := total_contacts - with_zone;
  RAISE NOTICE 'Totale contatti (no agenti): %, con zona: %, senza zona: %', total_contacts, with_zone, without_zone;
END $$;

-- Show remaining unmatched for review
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN (
    SELECT cognome, nome, citta, azienda
    FROM contacts
    WHERE attivo = true AND tipo_contatto != 'agente' AND zone_id IS NULL
    ORDER BY cognome LIMIT 30
  ) LOOP
    RAISE NOTICE 'Senza zona: % % | citta=% | azienda=%', rec.cognome, rec.nome, COALESCE(rec.citta, '-'), COALESCE(rec.azienda, '-');
  END LOOP;
END $$;

DROP TABLE prov_abbrev;
DROP TABLE city_map;
ALTER TABLE contacts ENABLE TRIGGER USER;
