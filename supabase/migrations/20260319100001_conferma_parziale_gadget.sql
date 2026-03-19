-- ============================================
-- Conferma parziale + Gadget unificati
-- ============================================

-- === Schema changes ===

ALTER TABLE event_materials ADD COLUMN quantita_approvata integer;
ALTER TABLE event_materials ALTER COLUMN richiesto_da DROP NOT NULL;
ALTER TABLE products ADD COLUMN quantita_disponibile integer CHECK (quantita_disponibile >= 0);
ALTER TABLE products ADD COLUMN soglia_minima integer DEFAULT 0;

-- === Atomic stock adjustment function (SECURITY DEFINER) ===

CREATE OR REPLACE FUNCTION adjust_product_stock(p_product_id uuid, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_qty integer;
BEGIN
  UPDATE products
  SET quantita_disponibile = quantita_disponibile + p_delta
  WHERE id = p_product_id AND quantita_disponibile IS NOT NULL
  RETURNING quantita_disponibile INTO new_qty;
  RETURN COALESCE(new_qty, -1);
END;
$$;

REVOKE ALL ON FUNCTION adjust_product_stock FROM public;
GRANT EXECUTE ON FUNCTION adjust_product_stock TO authenticated;

-- === Gadget data migration ===

INSERT INTO brands (id, nome, tipo)
VALUES ('b0000000-0000-0000-0000-000000000099', 'Altro fornitore', 'fornitore');

INSERT INTO brands (nome, tipo)
SELECT DISTINCT fornitore_abituale, 'fornitore'
FROM gadgets
WHERE fornitore_abituale IS NOT NULL;

INSERT INTO products (id, brand_id, nome, descrizione, foto_url, tipo, quantita_disponibile, soglia_minima, attivo)
SELECT
  g.id,
  COALESCE(b.id, 'b0000000-0000-0000-0000-000000000099'),
  g.nome,
  g.descrizione,
  g.foto_url,
  'gadget',
  g.quantita_disponibile,
  g.soglia_minima,
  g.attivo
FROM gadgets g
LEFT JOIN brands b ON b.nome = g.fornitore_abituale AND b.tipo = 'fornitore';

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

DROP TABLE event_gadgets;
DROP TABLE gadgets;
DROP TYPE gadget_request_stato;
