-- Prevent silent overselling on adjust_product_stock_location.
-- Root cause: the upsert rewritten in 20260512160000_fix_product_stock_locations_upsert.sql
-- clamps negative results to 0 with GREATEST(0, quantita + p_delta) instead of raising,
-- both in the UPDATE branch and in the INSERT branch (for a position row that doesn't
-- exist yet). Two concurrent confirmations of the same product (client does a
-- read-then-write) can both pass a stale "available" check and both decrement past
-- zero, silently clamping to 0 with no error and no log — overselling the warehouse.
--
-- Its sibling adjust_product_stock (20260319200001_conferma_parziale_gadget.sql) relies
-- on a CHECK (quantita_disponibile >= 0) constraint and surfaces a real error instead.
-- This migration replicates that behavior for adjust_product_stock_location: a delta
-- that would push a location's quantity below zero now raises instead of clamping.

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
  quantita_attuale integer;
BEGIN
  SELECT quantita INTO quantita_attuale
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND magazzino_id IS NOT DISTINCT FROM p_magazzino_id
    AND user_id IS NOT DISTINCT FROM p_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF quantita_attuale + p_delta < 0 THEN
      RAISE EXCEPTION 'Stock insufficiente per il prodotto % (disponibile %, richiesto %)', p_product_id, quantita_attuale, p_delta
        USING ERRCODE = 'check_violation';
    END IF;

    UPDATE product_stock_locations
    SET quantita = quantita_attuale + p_delta, updated_at = now()
    WHERE product_id = p_product_id
      AND magazzino_id IS NOT DISTINCT FROM p_magazzino_id
      AND user_id IS NOT DISTINCT FROM p_user_id;
  ELSE
    IF p_delta < 0 THEN
      RAISE EXCEPTION 'Stock insufficiente per il prodotto % (disponibile 0, richiesto %)', p_product_id, p_delta
        USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO product_stock_locations (product_id, magazzino_id, user_id, quantita)
    VALUES (p_product_id, p_magazzino_id, p_user_id, p_delta);
  END IF;

  SELECT COALESCE(SUM(quantita), 0) INTO new_total
  FROM product_stock_locations WHERE product_id = p_product_id;

  UPDATE products SET quantita_disponibile = new_total WHERE id = p_product_id;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_product_stock_location TO authenticated;
