-- Enforce approval budget threshold at the DB level (not just in the UI).
--
-- Prima d'ora `canAreaManagerApprove` calcolava la soglia solo per decidere
-- cosa mostrare nell'interfaccia: `approveEvent` chiamava `updateEvent(stato:'confermato')`
-- e la policy RLS `events_update` verificava solo il ruolo. Un area_manager poteva
-- quindi approvare un evento sopra la propria soglia di budget bypassando la UI
-- (es. dalla console del browser, stessa sessione autenticata).
--
-- Questo trigger BEFORE UPDATE blocca la transizione verso 'confermato' quando
-- l'utente che approva ha ruolo 'area_manager' e il budget supera la soglia
-- configurata in approval_thresholds (o l'area manager non è abilitato per quel
-- tipo evento). Direzione/admin/ufficio restano non vincolati, coerentemente con
-- la regola di business ("Area Manager approva sotto soglia").

CREATE OR REPLACE FUNCTION enforce_approval_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_soglia numeric;
  v_am_can_approve boolean;
BEGIN
  -- Guardiamo solo la transizione VERSO 'confermato' (l'approvazione vera e propria).
  IF NEW.stato = 'confermato' AND OLD.stato IS DISTINCT FROM 'confermato' THEN
    v_role := get_user_role();

    IF v_role = 'area_manager' THEN
      -- Soglia specifica per tipo evento, con fallback alla soglia globale (tipo NULL).
      SELECT soglia_importo, area_manager_can_approve
        INTO v_soglia, v_am_can_approve
      FROM approval_thresholds
      WHERE tipo_evento = NEW.tipo_evento OR tipo_evento IS NULL
      ORDER BY tipo_evento DESC NULLS LAST
      LIMIT 1;

      IF v_am_can_approve IS NOT TRUE THEN
        RAISE EXCEPTION 'Un area manager non può approvare questo tipo di evento: serve la Direzione';
      END IF;

      IF NEW.budget_previsto IS NOT NULL
         AND v_soglia IS NOT NULL
         AND NEW.budget_previsto > v_soglia THEN
        RAISE EXCEPTION 'Budget oltre la soglia approvabile da un area manager: serve la Direzione';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_approval_threshold ON events;
CREATE TRIGGER trg_enforce_approval_threshold
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION enforce_approval_threshold();
