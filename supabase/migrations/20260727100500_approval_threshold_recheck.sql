-- #11 (MEDIO) enforce_approval_threshold: il trigger controllava solo la transizione
-- verso 'confermato'. Un area_manager poteva quindi confermare un evento sotto soglia
-- e poi, con un secondo UPDATE che alza `budget_previsto` sopra soglia SENZA toccare
-- lo stato, superare di fatto il limite senza controllo (amplificato da #2).
--
-- Estendiamo il controllo: si applica sia alla transizione verso 'confermato', sia a
-- un aumento di budget mentre l'evento è già 'confermato'. Direzione/admin/ufficio
-- restano non vincolati.

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
  v_check boolean;
BEGIN
  -- Casi da controllare:
  --  a) transizione verso 'confermato' (approvazione)
  --  b) evento già 'confermato' e budget che aumenta
  v_check := (NEW.stato = 'confermato' AND OLD.stato IS DISTINCT FROM 'confermato')
          OR (NEW.stato = 'confermato' AND OLD.stato = 'confermato'
              AND NEW.budget_previsto IS DISTINCT FROM OLD.budget_previsto
              AND COALESCE(NEW.budget_previsto, 0) > COALESCE(OLD.budget_previsto, 0));

  IF v_check THEN
    v_role := get_user_role();

    IF v_role = 'area_manager' THEN
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
