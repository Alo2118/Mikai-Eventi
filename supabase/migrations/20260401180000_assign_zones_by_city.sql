-- Assign zone_id to contacts based on città → province → zone mapping
-- Matches both province names AND common city names

-- Temporary mapping table: city name → zone name
CREATE TEMP TABLE city_zone_map (citta text, zona text);

INSERT INTO city_zone_map (citta, zona) VALUES
-- ═══ VENETO ═══
('Vicenza', 'Veneto'), ('Verona', 'Veneto'), ('Padova', 'Veneto'), ('Venezia', 'Veneto'),
('Treviso', 'Veneto'), ('Belluno', 'Veneto'), ('Rovigo', 'Veneto'),
('Monteviale', 'Veneto'), ('Schio', 'Veneto'), ('Thiene', 'Veneto'), ('Bassano Del Grappa', 'Veneto'),
('Arzignano', 'Veneto'), ('Valdagno', 'Veneto'), ('Lonigo', 'Veneto'), ('Montecchio Maggiore', 'Veneto'),
('Chiampo', 'Veneto'), ('Malo', 'Veneto'), ('Dueville', 'Veneto'), ('Montebello Vicentino', 'Veneto'),
('Sandrigo', 'Veneto'), ('Marostica', 'Veneto'), ('Isola Vicentina', 'Veneto'), ('Altavilla Vicentina', 'Veneto'),
('Villafranca Di Verona', 'Veneto'), ('San Bonifacio', 'Veneto'), ('Legnago', 'Veneto'),
('Bussolengo', 'Veneto'), ('Negrar', 'Veneto'), ('Bardolino', 'Veneto'),
('Abano Terme', 'Veneto'), ('Este', 'Veneto'), ('Cittadella', 'Veneto'), ('Camposampiero', 'Veneto'),
('Mestre', 'Veneto'), ('Chioggia', 'Veneto'), ('Jesolo', 'Veneto'),
('Castelfranco Veneto', 'Veneto'), ('Montebelluna', 'Veneto'), ('Conegliano', 'Veneto'),
('Feltre', 'Veneto'), ('Cortina D''Ampezzo', 'Veneto'),

-- ═══ LOMBARDIA ═══
('Milano', 'Lombardia'), ('Bergamo', 'Lombardia'), ('Brescia', 'Lombardia'), ('Como', 'Lombardia'),
('Lecco', 'Lombardia'), ('Lodi', 'Lombardia'), ('Mantova', 'Lombardia'), ('Monza', 'Lombardia'),
('Pavia', 'Lombardia'), ('Sondrio', 'Lombardia'), ('Varese', 'Lombardia'), ('Cremona', 'Lombardia'),
('Monza E Brianza', 'Lombardia'), ('Gallarate', 'Lombardia'), ('Busto Arsizio', 'Lombardia'),
('Saronno', 'Lombardia'), ('Desio', 'Lombardia'), ('Seregno', 'Lombardia'), ('Rho', 'Lombardia'),
('Sesto San Giovanni', 'Lombardia'), ('Cinisello Balsamo', 'Lombardia'),

-- ═══ EMILIA ═══
('Bologna', 'Emilia'), ('Modena', 'Emilia'), ('Reggio Emilia', 'Emilia'), ('Parma', 'Emilia'),
('Ferrara', 'Emilia'), ('Carpi', 'Emilia'), ('Sassuolo', 'Emilia'), ('Casalecchio Di Reno', 'Emilia'),
('Imola', 'Emilia'), ('Fidenza', 'Emilia'), ('Cento', 'Emilia'),

-- ═══ ROMAGNA ═══
('Ravenna', 'Romagna'), ('Forlì', 'Romagna'), ('Cesena', 'Romagna'), ('Rimini', 'Romagna'),
('Faenza', 'Romagna'), ('Lugo', 'Romagna'), ('Riccione', 'Romagna'), ('Cervia', 'Romagna'),
('Forli-Cesena', 'Romagna'), ('Forlì-Cesena', 'Romagna'),

-- ═══ PIACENZA ═══
('Piacenza', 'Piacenza'), ('Fiorenzuola D''Arda', 'Piacenza'), ('Castel San Giovanni', 'Piacenza'),

-- ═══ TOSCANA ═══
('Firenze', 'Toscana'), ('Prato', 'Toscana'), ('Pistoia', 'Toscana'), ('Lucca', 'Toscana'),
('Massa', 'Toscana'), ('Carrara', 'Toscana'), ('Pisa', 'Toscana'), ('Livorno', 'Toscana'),
('Grosseto', 'Toscana'), ('Siena', 'Toscana'), ('Arezzo', 'Toscana'),
('Empoli', 'Toscana'), ('Viareggio', 'Toscana'), ('Massa-Carrara', 'Toscana'),

-- ═══ LIGURIA - BASSO PIEMONTE ═══
('Genova', 'Liguria - Basso Piemonte'), ('La Spezia', 'Liguria - Basso Piemonte'),
('Savona', 'Liguria - Basso Piemonte'), ('Imperia', 'Liguria - Basso Piemonte'),
('Cuneo', 'Liguria - Basso Piemonte'), ('Asti', 'Liguria - Basso Piemonte'),
('Alessandria', 'Liguria - Basso Piemonte'), ('Sanremo', 'Liguria - Basso Piemonte'),
('Rapallo', 'Liguria - Basso Piemonte'), ('Chiavari', 'Liguria - Basso Piemonte'),
('Alba', 'Liguria - Basso Piemonte'), ('Tortona', 'Liguria - Basso Piemonte'),

-- ═══ TRENTINO ═══
('Trento', 'Trentino'), ('Bolzano', 'Trentino'), ('Rovereto', 'Trentino'),
('Merano', 'Trentino'), ('Bressanone', 'Trentino'), ('Riva Del Garda', 'Trentino'),

-- ═══ FRIULI ═══
('Udine', 'Friuli'), ('Pordenone', 'Friuli'), ('Trieste', 'Friuli'), ('Gorizia', 'Friuli'),
('Monfalcone', 'Friuli'), ('Sacile', 'Friuli'), ('Palmanova', 'Friuli'),

-- ═══ ROMA ═══
('Roma', 'Roma'),

-- ═══ LAZIO ═══
('Latina', 'Lazio'), ('Frosinone', 'Lazio'), ('Viterbo', 'Lazio'), ('Rieti', 'Lazio'),
('Cassino', 'Lazio'), ('Formia', 'Lazio'), ('Civitavecchia', 'Lazio'),

-- ═══ CAMPANIA ═══
('Napoli', 'Campania'), ('Salerno', 'Campania'), ('Caserta', 'Campania'),
('Avellino', 'Campania'), ('Benevento', 'Campania'), ('Torre Del Greco', 'Campania'),
('Castellammare Di Stabia', 'Campania'), ('Battipaglia', 'Campania'),

-- ═══ PUGLIA BARI ═══
('Bari', 'Puglia Bari'), ('Andria', 'Puglia Bari'), ('Barletta', 'Puglia Bari'),
('Trani', 'Puglia Bari'), ('Altamura', 'Puglia Bari'), ('Molfetta', 'Puglia Bari'),
('Corato', 'Puglia Bari'), ('Bitonto', 'Puglia Bari'), ('Barletta-Andria-Trani', 'Puglia Bari'),

-- ═══ PUGLIA BRINDISI LECCE ═══
('Brindisi', 'Puglia Brindisi Lecce'), ('Lecce', 'Puglia Brindisi Lecce'),
('Taranto', 'Puglia Brindisi Lecce'), ('Nardò', 'Puglia Brindisi Lecce'),
('Galatina', 'Puglia Brindisi Lecce'), ('Manduria', 'Puglia Brindisi Lecce'),
('Ostuni', 'Puglia Brindisi Lecce'), ('Gallipoli', 'Puglia Brindisi Lecce'),

-- ═══ PUGLIA FOGGIA ═══
('Foggia', 'Puglia Foggia'), ('San Severo', 'Puglia Foggia'),
('Cerignola', 'Puglia Foggia'), ('Manfredonia', 'Puglia Foggia'),
('Lucera', 'Puglia Foggia'),

-- ═══ ABRUZZO ═══
('L''Aquila', 'Abruzzo'), ('Teramo', 'Abruzzo'), ('Pescara', 'Abruzzo'),
('Chieti', 'Abruzzo'), ('Avezzano', 'Abruzzo'), ('Lanciano', 'Abruzzo'),
('Vasto', 'Abruzzo'), ('Sulmona', 'Abruzzo'),

-- ═══ SARDEGNA ═══
('Cagliari', 'Sardegna'), ('Sassari', 'Sardegna'), ('Nuoro', 'Sardegna'),
('Oristano', 'Sardegna'), ('Olbia', 'Sardegna'), ('Alghero', 'Sardegna'),

-- ═══ SICILIA EST ═══
('Catania', 'Sicilia Est'), ('Messina', 'Sicilia Est'), ('Siracusa', 'Sicilia Est'),
('Ragusa', 'Sicilia Est'), ('Enna', 'Sicilia Est'), ('Acireale', 'Sicilia Est'),
('Taormina', 'Sicilia Est'), ('Augusta', 'Sicilia Est'), ('Modica', 'Sicilia Est'),

-- ═══ SICILIA OVEST ═══
('Palermo', 'Sicilia Ovest'), ('Trapani', 'Sicilia Ovest'),
('Agrigento', 'Sicilia Ovest'), ('Caltanissetta', 'Sicilia Ovest'),
('Marsala', 'Sicilia Ovest'), ('Gela', 'Sicilia Ovest'), ('Sciacca', 'Sicilia Ovest');

-- Update contacts: match città (case-insensitive) to zone
UPDATE contacts c
SET zone_id = z.id
FROM city_zone_map m
JOIN zones z ON z.nome = m.zona
WHERE c.zone_id IS NULL
  AND c.citta IS NOT NULL
  AND c.citta != ''
  AND lower(trim(c.citta)) = lower(trim(m.citta));

-- Log results
DO $$
DECLARE
  total int;
  assigned int;
  unmatched int;
BEGIN
  SELECT count(*) INTO total FROM contacts WHERE attivo = true AND citta IS NOT NULL AND citta != '';
  SELECT count(*) INTO assigned FROM contacts WHERE attivo = true AND zone_id IS NOT NULL;
  SELECT count(*) INTO unmatched FROM contacts WHERE attivo = true AND citta IS NOT NULL AND citta != '' AND zone_id IS NULL;
  RAISE NOTICE 'Contatti con città: %, con zona assegnata: %, senza match: %', total, assigned, unmatched;
END $$;

-- Show unmatched cities for manual review
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT citta, count(*) as n
    FROM contacts
    WHERE attivo = true AND citta IS NOT NULL AND citta != '' AND zone_id IS NULL
    GROUP BY citta ORDER BY n DESC LIMIT 20
  ) LOOP
    RAISE NOTICE 'Senza zona: % (% contatti)', rec.citta, rec.n;
  END LOOP;
END $$;

DROP TABLE city_zone_map;
