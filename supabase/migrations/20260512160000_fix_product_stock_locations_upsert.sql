-- Fix product_stock_locations upsert.
-- Root cause: UNIQUE (product_id, magazzino_id, user_id) never catches duplicates
-- because exactly one of magazzino_id / user_id is always NULL and Postgres treats
-- NULLs as distinct in unique constraints. So the ON CONFLICT in
-- adjust_product_stock_location never fires → every adjustment INSERTs a new row
-- instead of updating the existing one (and negative deltas insert quantita-0 rows
-- without actually decrementing). Result: duplicate per-location rows, broken
-- "rettifica" / "carica lotto" and broken event-consumption decrements.
--
-- Fix: collapse existing duplicates, replace the constraint with NULL-aware partial
-- unique indexes, and rewrite the RPC to upsert reliably (UPDATE … IF NOT FOUND INSERT).

-- 1. Collapse duplicate location rows: keep the lowest-id row per
--    (product, magazzino, agent), summing the quantities into it.
WITH ranked AS (
  SELECT id,
         sum(quantita) OVER (PARTITION BY product_id, magazzino_id, user_id) AS group_total,
         row_number() OVER (PARTITION BY product_id, magazzino_id, user_id ORDER BY id) AS rn
  FROM product_stock_locations
)
UPDATE product_stock_locations p
SET quantita = r.group_total, updated_at = now()
FROM ranked r
WHERE p.id = r.id AND r.rn = 1;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY product_id, magazzino_id, user_id ORDER BY id) AS rn
  FROM product_stock_locations
)
DELETE FROM product_stock_locations p USING ranked r WHERE p.id = r.id AND r.rn > 1;

-- Drop empty rows left over from broken negative deltas.
DELETE FROM product_stock_locations WHERE quantita = 0;

-- 2. Replace the all-columns UNIQUE constraint with NULL-aware partial unique indexes.
ALTER TABLE product_stock_locations DROP CONSTRAINT IF EXISTS unique_product_location;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_psl_magazzino ON product_stock_locations (product_id, magazzino_id) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_psl_agent ON product_stock_locations (product_id, user_id) WHERE magazzino_id IS NULL;

-- 3. Rewrite the adjust RPC: upsert without ON CONFLICT, matching NULLs correctly.
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
  new_total integer;
BEGIN
  UPDATE product_stock_locations
  SET quantita = GREATEST(0, quantita + p_delta), updated_at = now()
  WHERE product_id = p_product_id
    AND magazzino_id IS NOT DISTINCT FROM p_magazzino_id
    AND user_id IS NOT DISTINCT FROM p_user_id;

  IF NOT FOUND THEN
    INSERT INTO product_stock_locations (product_id, magazzino_id, user_id, quantita)
    VALUES (p_product_id, p_magazzino_id, p_user_id, GREATEST(0, p_delta));
  END IF;

  SELECT COALESCE(SUM(quantita), 0) INTO new_total
  FROM product_stock_locations WHERE product_id = p_product_id;

  UPDATE products SET quantita_disponibile = new_total WHERE id = p_product_id;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_product_stock_location TO authenticated;
