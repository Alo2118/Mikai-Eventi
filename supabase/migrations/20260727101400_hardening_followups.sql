-- Follow-up dalla verifica avversariale delle migrazioni di hardening.

-- === ALTO #1 — Anti zero-admin lockout ===
-- Dopo l'enforcement di `attivo` (20260727101200), disattivare (o declassare)
-- l'ultimo admin attivo lo lascerebbe senza ruolo, e tutte le funzioni di recovery
-- (set_user_permissions, reset_user_password, confirm_user_email, bypass admin dei
-- trigger) dipendono da get_user_role()='admin' → nessuna via di rientro se non via
-- accesso diretto al DB. Blocchiamo l'operazione se rimuoverebbe l'ultimo admin attivo.
CREATE OR REPLACE FUNCTION prevent_last_admin_lockout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_active_admins int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.ruolo = 'admin' AND OLD.attivo THEN
      SELECT count(*) INTO v_other_active_admins
      FROM users WHERE ruolo = 'admin' AND attivo AND id <> OLD.id;
      IF v_other_active_admins = 0 THEN
        RAISE EXCEPTION 'Operazione bloccata: deve restare almeno un amministratore attivo';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: l'utente era un admin attivo e sta per smettere di esserlo.
  IF OLD.ruolo = 'admin' AND OLD.attivo
     AND (NEW.ruolo IS DISTINCT FROM 'admin' OR NEW.attivo = false) THEN
    SELECT count(*) INTO v_other_active_admins
    FROM users WHERE ruolo = 'admin' AND attivo AND id <> OLD.id;
    IF v_other_active_admins = 0 THEN
      RAISE EXCEPTION 'Operazione bloccata: deve restare almeno un amministratore attivo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_lockout_upd ON users;
CREATE TRIGGER trg_prevent_last_admin_lockout_upd
  BEFORE UPDATE OF attivo, ruolo ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_lockout();

DROP TRIGGER IF EXISTS trg_prevent_last_admin_lockout_del ON users;
CREATE TRIGGER trg_prevent_last_admin_lockout_del
  BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_lockout();

-- === MEDIO #3 — adjust_product_stock_location: no-op silenzioso nel retry ===
-- Se la transazione concorrente che ha causato la unique_violation fa poi ROLLBACK,
-- al retry la riga non esiste più: la vecchia versione faceva SELECT (0 righe) →
-- quantita_attuale NULL → UPDATE su 0 righe → delta perso senza errore. Ora se al
-- retry la riga non c'è, la reinseriamo (il delta è già garantito >= 0 nel ramo ELSE).
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
      -- Riga creata da una transazione concorrente: rileggila con lock.
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
        -- La transazione concorrente ha fatto rollback: la riga non esiste, reinserisci.
        INSERT INTO product_stock_locations (product_id, magazzino_id, user_id, quantita)
        VALUES (p_product_id, p_magazzino_id, p_user_id, p_delta);
      END IF;
    END;
  END IF;

  SELECT COALESCE(SUM(quantita), 0) INTO new_total
  FROM product_stock_locations WHERE product_id = p_product_id;

  UPDATE products SET quantita_disponibile = new_total WHERE id = p_product_id;
  RETURN new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_product_stock_location TO authenticated;
