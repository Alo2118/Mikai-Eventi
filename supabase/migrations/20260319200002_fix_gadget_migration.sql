-- Fix: explicit enum casts for gadget data migration
-- (schema changes from 20260319200001 already applied, data migration failed due to missing casts)

-- 1. Fallback brand
INSERT INTO brands (id, nome, tipo)
VALUES ('b0000000-0000-0000-0000-000000000099', 'Altro fornitore', 'fornitore'::brand_tipo);

-- 2. Brand per fornitore_abituale
INSERT INTO brands (nome, tipo)
SELECT DISTINCT fornitore_abituale, 'fornitore'::brand_tipo
FROM gadgets
WHERE fornitore_abituale IS NOT NULL;

-- 3. Gadgets → products
INSERT INTO products (id, brand_id, nome, descrizione, foto_url, tipo, quantita_disponibile, soglia_minima, attivo)
SELECT
  g.id,
  COALESCE(b.id, 'b0000000-0000-0000-0000-000000000099'::uuid),
  g.nome,
  g.descrizione,
  g.foto_url,
  'gadget'::product_tipo,
  g.quantita_disponibile,
  g.soglia_minima,
  g.attivo
FROM gadgets g
LEFT JOIN brands b ON b.nome = g.fornitore_abituale AND b.tipo = 'fornitore'::brand_tipo;

-- 4. event_gadgets → event_materials
INSERT INTO event_materials (event_id, product_id, quantita, stato, note_commerciale)
SELECT
  eg.event_id,
  eg.gadget_id,
  eg.quantita_richiesta,
  CASE eg.stato
    WHEN 'richiesto' THEN 'richiesto'
    WHEN 'pronto' THEN 'approvato'
    WHEN 'consegnato' THEN 'approvato'
    ELSE 'richiesto'
  END::material_request_stato,
  eg.note
FROM event_gadgets eg;

-- 5. Drop old tables
DROP TABLE event_gadgets;
DROP TABLE gadgets;
DROP TYPE gadget_request_stato;
