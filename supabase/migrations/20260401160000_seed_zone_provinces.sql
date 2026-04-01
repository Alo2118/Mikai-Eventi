-- Seed zone_provinces: associate Italian provinces to Mikai sales zones

INSERT INTO zone_provinces (zone_id, provincia)
SELECT z.id, v.provincia
FROM (VALUES
  -- Toscana
  ('Toscana', 'Firenze'), ('Toscana', 'Prato'), ('Toscana', 'Pistoia'),
  ('Toscana', 'Lucca'), ('Toscana', 'Massa-Carrara'), ('Toscana', 'Pisa'),
  ('Toscana', 'Livorno'), ('Toscana', 'Grosseto'), ('Toscana', 'Siena'),
  ('Toscana', 'Arezzo'),

  -- Piacenza
  ('Piacenza', 'Piacenza'),

  -- Liguria - Basso Piemonte
  ('Liguria - Basso Piemonte', 'Genova'), ('Liguria - Basso Piemonte', 'La Spezia'),
  ('Liguria - Basso Piemonte', 'Savona'), ('Liguria - Basso Piemonte', 'Imperia'),
  ('Liguria - Basso Piemonte', 'Cuneo'), ('Liguria - Basso Piemonte', 'Asti'),
  ('Liguria - Basso Piemonte', 'Alessandria'),

  -- Sardegna
  ('Sardegna', 'Cagliari'), ('Sardegna', 'Sassari'), ('Sardegna', 'Nuoro'),
  ('Sardegna', 'Oristano'), ('Sardegna', 'Sud Sardegna'),

  -- Abruzzo
  ('Abruzzo', 'L''Aquila'), ('Abruzzo', 'Teramo'), ('Abruzzo', 'Pescara'),
  ('Abruzzo', 'Chieti'),

  -- Romagna
  ('Romagna', 'Ravenna'), ('Romagna', 'Forlì-Cesena'), ('Romagna', 'Rimini'),

  -- Friuli
  ('Friuli', 'Udine'), ('Friuli', 'Pordenone'), ('Friuli', 'Trieste'),
  ('Friuli', 'Gorizia'),

  -- Veneto
  ('Veneto', 'Vicenza'), ('Veneto', 'Verona'), ('Veneto', 'Padova'),
  ('Veneto', 'Venezia'), ('Veneto', 'Treviso'), ('Veneto', 'Belluno'),
  ('Veneto', 'Rovigo'),

  -- Trentino
  ('Trentino', 'Trento'), ('Trentino', 'Bolzano'),

  -- Roma
  ('Roma', 'Roma'),

  -- Lombardia
  ('Lombardia', 'Milano'), ('Lombardia', 'Bergamo'), ('Lombardia', 'Brescia'),
  ('Lombardia', 'Como'), ('Lombardia', 'Lecco'), ('Lombardia', 'Lodi'),
  ('Lombardia', 'Mantova'), ('Lombardia', 'Monza e Brianza'),
  ('Lombardia', 'Pavia'), ('Lombardia', 'Sondrio'), ('Lombardia', 'Varese'),
  ('Lombardia', 'Cremona'),

  -- Campania
  ('Campania', 'Napoli'), ('Campania', 'Salerno'), ('Campania', 'Caserta'),
  ('Campania', 'Avellino'), ('Campania', 'Benevento'),

  -- Sicilia Est
  ('Sicilia Est', 'Catania'), ('Sicilia Est', 'Messina'), ('Sicilia Est', 'Siracusa'),
  ('Sicilia Est', 'Ragusa'), ('Sicilia Est', 'Enna'),

  -- Sicilia Ovest
  ('Sicilia Ovest', 'Palermo'), ('Sicilia Ovest', 'Trapani'),
  ('Sicilia Ovest', 'Agrigento'), ('Sicilia Ovest', 'Caltanissetta'),

  -- Emilia
  ('Emilia', 'Bologna'), ('Emilia', 'Modena'), ('Emilia', 'Reggio Emilia'),
  ('Emilia', 'Parma'), ('Emilia', 'Ferrara'),

  -- Puglia Bari
  ('Puglia Bari', 'Bari'), ('Puglia Bari', 'Barletta-Andria-Trani'),

  -- Puglia Brindisi Lecce
  ('Puglia Brindisi Lecce', 'Brindisi'), ('Puglia Brindisi Lecce', 'Lecce'),
  ('Puglia Brindisi Lecce', 'Taranto'),

  -- Puglia Foggia
  ('Puglia Foggia', 'Foggia'),

  -- Lazio
  ('Lazio', 'Latina'), ('Lazio', 'Frosinone'), ('Lazio', 'Viterbo'),
  ('Lazio', 'Rieti')

) AS v(zona, provincia)
JOIN zones z ON z.nome = v.zona
WHERE NOT EXISTS (
  SELECT 1 FROM zone_provinces zp
  WHERE zp.zone_id = z.id AND zp.provincia = v.provincia
);
