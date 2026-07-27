-- #10 (MEDIO) Race sull'inserimento di una nuova riga di stock.
--
-- Nel ramo ELSE (posizione non ancora esistente) il SELECT ... FOR UPDATE non blocca
-- nulla (nessuna riga), quindi due transazioni concorrenti che creano per la prima
-- volta la stessa posizione (product_id, magazzino_id, user_id) falliscono con
-- unique_violation sugli indici unique parziali. Non è data-loss silenzioso (l'errore
-- emerge), ma è un errore inatteso e non gestito. Gestiamo la unique_violation
-- ritentando come UPDATE (la riga ora esiste), preservando il controllo di stock < 0.

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

    BEGIN
      INSERT INTO product_stock_locations (product_id, magazzino_id, user_id, quantita)
      VALUES (p_product_id, p_magazzino_id, p_user_id, p_delta);
    EXCEPTION WHEN unique_violation THEN
      -- Una transazione concorrente ha creato la riga nel frattempo: ritenta come
      -- UPDATE atomico bloccando la riga ora esistente.
      SELECT quantita INTO quantita_attuale
      FROM product_stock_locations
      WHERE product_id = p_product_id
        AND magazzino_id IS NOT DISTINCT FROM p_magazzino_id
        AND user_id IS NOT DISTINCT FROM p_user_id
      FOR UPDATE;

      IF quantita_attuale + p_delta < 0 THEN
        RAISE EXCEPTION 'Stock insufficiente per il prodotto % (disponibile %, richiesto %)', p_product_id, quantita_attuale, p_delta
          USING ERRCODE = 'check_violation';
      END IF;

      UPDATE product_stock_locations
      SET quantita = quantita_attuale + p_delta, updated_at = now()
      WHERE product_id = p_product_id
        AND magazzino_id IS NOT DISTINCT FROM p_magazzino_id
        AND user_id IS NOT DISTINCT FROM p_user_id;
    END;
  END IF;

  SELECT COALESCE(SUM(quantita), 0) INTO new_total
  FROM product_stock_locations WHERE product_id = p_product_id;

  UPDATE products SET quantita_disponibile = new_total WHERE id = p_product_id;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_product_stock_location TO authenticated;
