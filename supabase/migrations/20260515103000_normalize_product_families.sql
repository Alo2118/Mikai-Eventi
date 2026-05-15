-- Normalize famiglia names from verbose descriptions to project-standard short names
-- (allinea i prodotti appena importati allo stile esistente: Stylo, FEP, BSS, ClickIt CF/ER, …)

-- 1. Rename verbose families to short canonical names
UPDATE products SET famiglia = 'BSS'             WHERE famiglia = 'Viti compressione headless';
UPDATE products SET famiglia = 'BTR'             WHERE famiglia = 'Viti compressione con testa';
UPDATE products SET famiglia = 'Elementi presa'  WHERE famiglia IN ('Viti corticali autoperforanti', 'Viti');
UPDATE products SET famiglia = 'Stylo'           WHERE famiglia = 'Stylo - Fissatore';
UPDATE products SET famiglia = 'MiniStylo'       WHERE famiglia = 'MiniStylo - Fissatore';
UPDATE products SET famiglia = 'FEP'             WHERE famiglia = 'FEP - Fissatore';
UPDATE products SET famiglia = 'MikaFix'         WHERE famiglia = 'MikaFix - Fissatore';
UPDATE products SET famiglia = 'MiniFix'         WHERE famiglia = 'MiniFix - Fissatore';
UPDATE products SET famiglia = 'Hola'            WHERE famiglia IN ('HOLA - Viti talari', 'HOLA - Strumentario');
UPDATE products SET famiglia = 'Sawbone'         WHERE famiglia = 'Sawbones - Ossa sintetiche';
UPDATE products SET famiglia = 'CoreAction'      WHERE famiglia IN ('CoreAction - Trial', 'CoreAction - Cunei');
UPDATE products SET famiglia = 'Strumentario'    WHERE famiglia IN ('Strumentario generico', 'Cassette sterilizzazione');
UPDATE products SET famiglia = 'Medartis Placche' WHERE famiglia = 'Medartis - Placche';
UPDATE products SET famiglia = 'Medartis Viti'    WHERE famiglia = 'Medartis - Viti';
UPDATE products SET famiglia = 'VCA'             WHERE famiglia = 'VCA - Viti piede piatto';

-- 2. Split Fissatori - Barre / Componenti / Fissatore circolare by code prefix
-- 5002* = Stylo system; 5006* with "ER" = ClickIt ER; everything else = ClickIt CF
UPDATE products SET famiglia = 'Stylo'
  WHERE famiglia IN ('Fissatori - Barre', 'Fissatori - Componenti', 'Morsetti', 'Fissatore circolare')
    AND codice LIKE '5002%';

UPDATE products SET famiglia = 'ClickIt ER'
  WHERE famiglia IN ('Fissatori - Barre', 'Fissatori - Componenti', 'Morsetti', 'Fissatore circolare')
    AND (descrizione ILIKE '% ER %' OR descrizione ILIKE '%SISTEMA IBRIDO ER%' OR codice LIKE '5006504%' OR codice LIKE '5006505%' OR codice LIKE '5006506%' OR codice LIKE '5006507%');

UPDATE products SET famiglia = 'ClickIt CF'
  WHERE famiglia IN ('Fissatori - Barre', 'Fissatori - Componenti', 'Morsetti', 'Fissatore circolare');

-- 3. Move loose "Fili" rows that are clearly grip elements into Elementi presa,
--    keep pure wire products under 'Fili' if any remain.
--    For consistency with existing 'Elementi presa' which already contains 5002431 FILO FILETTATO etc.,
--    move filo FILETTATO into Elementi presa; keep liscio in 'Fili'.
UPDATE products SET famiglia = 'Elementi presa'
  WHERE famiglia = 'Fili' AND descrizione ILIKE '%FILETTATO%';
