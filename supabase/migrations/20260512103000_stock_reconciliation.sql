-- Stock reconciliation: link adjustments to events + log helper that bypasses RLS
-- so automatic stock changes (event approval / rejection / consumption) also land
-- in stock_adjustments — making the product history complete.

-- 1. Link an adjustment to the event that caused it (optional)
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;

-- 2. SECURITY DEFINER logger: callers (e.g. an agent confirming a gadget) may not
--    have gestione_magazzino, so a direct INSERT would fail RLS. This function lets
--    the trusted stock-adjustment paths record the movement regardless.
CREATE OR REPLACE FUNCTION log_stock_adjustment(
  p_product_id uuid,
  p_user_id uuid,
  p_delta integer,
  p_quantita_prima integer,
  p_quantita_dopo integer,
  p_motivo text DEFAULT NULL,
  p_magazzino_id uuid DEFAULT NULL,
  p_agent_user_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_delta = 0 THEN
    RETURN NULL;
  END IF;
  INSERT INTO stock_adjustments (
    product_id, user_id, delta, quantita_prima, quantita_dopo,
    motivo, magazzino_id, agent_user_id, event_id
  )
  VALUES (
    p_product_id, p_user_id, p_delta, p_quantita_prima, p_quantita_dopo,
    p_motivo, p_magazzino_id, p_agent_user_id, p_event_id
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION log_stock_adjustment FROM public;
GRANT EXECUTE ON FUNCTION log_stock_adjustment TO authenticated;
