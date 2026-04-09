-- Fix: audit trigger should only log actual field changes, not every UPDATE
-- Also: log which fields changed with old→new values

CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entita audit_entita;
  v_azione audit_azione;
  v_entita_id UUID;
  v_old_json JSONB;
  v_new_json JSONB;
  v_key TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
  v_changes TEXT[];
  v_first_field TEXT;
  v_first_old TEXT;
  v_first_new TEXT;
BEGIN
  v_entita := TG_ARGV[0]::audit_entita;

  IF TG_OP = 'INSERT' THEN
    v_entita_id := NEW.id;
    INSERT INTO activity_log (entita_tipo, entita_id, azione, eseguito_da)
    VALUES (v_entita, v_entita_id, 'creato', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_entita_id := NEW.id;
    v_old_json := row_to_json(OLD)::jsonb;
    v_new_json := row_to_json(NEW)::jsonb;

    -- Check for stato change first (specific tracking)
    IF TG_ARGV[1] IS NOT NULL AND TG_ARGV[1] = 'stato' THEN
      v_old_val := v_old_json ->> 'stato';
      v_new_val := v_new_json ->> 'stato';
      IF v_old_val IS DISTINCT FROM v_new_val THEN
        IF v_new_val IN ('verificato') THEN v_azione := 'verificato';
        ELSIF v_new_val IN ('segnalato') THEN v_azione := 'segnalato';
        ELSIF v_new_val IN ('approvato') THEN v_azione := 'approvato';
        ELSIF v_new_val IN ('rifiutato') THEN v_azione := 'rifiutato';
        ELSE v_azione := 'stato_cambiato';
        END IF;
        INSERT INTO activity_log (entita_tipo, entita_id, azione, campo_modificato, valore_precedente, valore_nuovo, eseguito_da)
        VALUES (v_entita, v_entita_id, v_azione, 'stato', v_old_val, v_new_val, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
        RETURN NEW;
      END IF;
    END IF;

    -- Generic: find changed fields (skip metadata columns)
    v_changes := ARRAY[]::TEXT[];
    FOR v_key IN SELECT jsonb_object_keys(v_new_json)
    LOOP
      -- Skip auto-managed columns
      IF v_key IN ('updated_at', 'created_at', 'id') THEN CONTINUE; END IF;

      v_old_val := v_old_json ->> v_key;
      v_new_val := v_new_json ->> v_key;

      IF v_old_val IS DISTINCT FROM v_new_val THEN
        v_changes := v_changes || v_key;
        -- Store first changed field for the log entry
        IF v_first_field IS NULL THEN
          v_first_field := v_key;
          v_first_old := v_old_val;
          v_first_new := v_new_val;
        END IF;
      END IF;
    END LOOP;

    -- Only log if something actually changed
    IF array_length(v_changes, 1) IS NULL OR array_length(v_changes, 1) = 0 THEN
      RETURN NEW;
    END IF;

    INSERT INTO activity_log (entita_tipo, entita_id, azione, campo_modificato, valore_precedente, valore_nuovo, eseguito_da)
    VALUES (
      v_entita,
      v_entita_id,
      'modificato',
      array_to_string(v_changes, ', '),
      v_first_old,
      v_first_new,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_entita_id := OLD.id;
    INSERT INTO activity_log (entita_tipo, entita_id, azione, eseguito_da)
    VALUES (v_entita, v_entita_id, 'eliminato', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;
