-- Distributed stock: track quantity per product per location
-- Location is either a magazzino OR an agent (user), never both

CREATE TABLE IF NOT EXISTS product_stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  magazzino_id uuid REFERENCES magazzini(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  quantita integer NOT NULL DEFAULT 0 CHECK (quantita >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_location CHECK (
    (magazzino_id IS NOT NULL AND user_id IS NULL) OR
    (magazzino_id IS NULL AND user_id IS NOT NULL)
  ),
  CONSTRAINT unique_product_location UNIQUE (product_id, magazzino_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_psl_product ON product_stock_locations(product_id);

-- RLS
ALTER TABLE product_stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psl_select" ON product_stock_locations FOR SELECT USING (true);
CREATE POLICY "psl_insert" ON product_stock_locations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND permission IN ('gestione_magazzino', 'gestione_gadget'))
);
CREATE POLICY "psl_update" ON product_stock_locations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND permission IN ('gestione_magazzino', 'gestione_gadget'))
);
CREATE POLICY "psl_delete" ON product_stock_locations FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND permission IN ('gestione_magazzino', 'gestione_gadget'))
);

-- Add location columns to stock_adjustments for tracking
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS magazzino_id uuid REFERENCES magazzini(id) ON DELETE SET NULL;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS agent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- RPC: adjust stock at a specific location, and sync products.quantita_disponibile
CREATE OR REPLACE FUNCTION adjust_product_stock_location(
  p_product_id uuid,
  p_magazzino_id uuid,
  p_user_id uuid,
  p_delta integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_loc_qty integer;
  new_total integer;
BEGIN
  -- Upsert location row
  INSERT INTO product_stock_locations (product_id, magazzino_id, user_id, quantita)
  VALUES (p_product_id, p_magazzino_id, p_user_id, GREATEST(0, p_delta))
  ON CONFLICT (product_id, magazzino_id, user_id)
  DO UPDATE SET
    quantita = GREATEST(0, product_stock_locations.quantita + p_delta),
    updated_at = now()
  RETURNING quantita INTO new_loc_qty;

  -- Sync total on products table
  SELECT COALESCE(SUM(quantita), 0) INTO new_total
  FROM product_stock_locations
  WHERE product_id = p_product_id;

  UPDATE products SET quantita_disponibile = new_total WHERE id = p_product_id;

  RETURN new_total;
END;
$$;

-- Migrate existing stock: put all current stock into Monteviale warehouse
DO $$
DECLARE
  monteviale_id uuid;
  rec RECORD;
BEGIN
  SELECT id INTO monteviale_id FROM magazzini WHERE nome ILIKE '%monteviale%' LIMIT 1;
  IF monteviale_id IS NULL THEN
    RAISE NOTICE 'No Monteviale warehouse found, skipping migration';
    RETURN;
  END IF;

  FOR rec IN (
    SELECT id, quantita_disponibile
    FROM products
    WHERE quantita_disponibile IS NOT NULL AND quantita_disponibile > 0
      AND serializzato = false
  ) LOOP
    INSERT INTO product_stock_locations (product_id, magazzino_id, quantita)
    VALUES (rec.id, monteviale_id, rec.quantita_disponibile)
    ON CONFLICT (product_id, magazzino_id, user_id) DO UPDATE
    SET quantita = rec.quantita_disponibile, updated_at = now();
  END LOOP;
END $$;
