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

-- Data migration moved to 20260319200002_fix_gadget_migration.sql
-- (this migration was partially applied - schema changes succeeded, data migration failed due to missing enum casts)
