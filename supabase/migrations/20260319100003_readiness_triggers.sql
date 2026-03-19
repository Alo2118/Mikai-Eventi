-- Readiness Engine: trigger updates

-- 1. Rename material_posizione enum values
ALTER TYPE material_posizione RENAME VALUE 'magazzino' TO 'in_magazzino';
ALTER TYPE material_posizione RENAME VALUE 'spedito' TO 'in_transito';
ALTER TYPE material_posizione RENAME VALUE 'evento' TO 'presso_evento';
ALTER TYPE material_posizione RENAME VALUE 'agente' TO 'magazzino_agente';

-- 2. Add new columns to material_movements for magazzino/utente tracking
ALTER TABLE material_movements ADD COLUMN IF NOT EXISTS a_magazzino_id uuid REFERENCES magazzini(id);
ALTER TABLE material_movements ADD COLUMN IF NOT EXISTS a_utente_id uuid REFERENCES users(id);

-- 3. Rewrite sync_material_position with new enum values + new fields
CREATE OR REPLACE FUNCTION sync_material_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Try to cast a_posizione to the enum directly
  BEGIN
    UPDATE materials SET
      posizione_attuale = NEW.a_posizione::material_posizione,
      magazzino_id = NEW.a_magazzino_id,
      presso_utente_id = NEW.a_utente_id
    WHERE id = NEW.material_id;
    RETURN NEW;
  EXCEPTION WHEN invalid_text_representation THEN
    -- Fallback: derive position from movement type
    CASE NEW.tipo
      WHEN 'uscita' THEN
        UPDATE materials SET
          posizione_attuale = 'in_transito',
          magazzino_id = NULL,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'rientro' THEN
        UPDATE materials SET
          posizione_attuale = 'in_magazzino',
          magazzino_id = NEW.a_magazzino_id,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'trasferimento' THEN
        UPDATE materials SET
          posizione_attuale = 'in_magazzino',
          magazzino_id = NEW.a_magazzino_id,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'preparazione' THEN
        UPDATE materials SET
          posizione_attuale = 'in_magazzino',
          magazzino_id = NEW.a_magazzino_id,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      WHEN 'consegna' THEN
        UPDATE materials SET
          posizione_attuale = 'presso_evento',
          magazzino_id = NULL,
          presso_utente_id = NULL
        WHERE id = NEW.material_id;
      ELSE
        NULL;
    END CASE;
  END;
  RETURN NEW;
END;
$$;

-- 4. Auto-transition trigger: confermato → in_preparazione
CREATE OR REPLACE FUNCTION auto_transition_in_preparazione()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.stato = 'in_corso' AND (OLD.stato IS NULL OR OLD.stato != 'in_corso') THEN
    UPDATE events SET stato = 'in_preparazione'
    WHERE id = NEW.event_id AND stato = 'confermato';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_transition_preparazione
  AFTER UPDATE OF stato ON event_activities
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_in_preparazione();
