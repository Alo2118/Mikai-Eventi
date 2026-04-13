-- Fix: preparation activity should reset when going back to previous phase
-- Handle two scenarios:
-- 1. Material state changes back to 'approvato' from 'in_preparazione'/'spedito' → reset completed activity
-- 2. Event state reverts from 'pronto' back to 'in_preparazione' → reset completed activity

-- ============================================================
-- Scenario 1: Reset activity when material goes back to 'approvato'
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_preparation_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _deadline DATE;
  _existing_activity_id UUID;
  _existing_stato TEXT;
  _verifica_key TEXT;
BEGIN
  IF OLD.stato::text = NEW.stato::text THEN RETURN NEW; END IF;
  IF NEW.stato::text != 'approvato' THEN RETURN NEW; END IF;

  SELECT id, titolo, data_inizio, deadline_preparazione INTO _evento
  FROM events WHERE id = NEW.event_id;

  _verifica_key := 'materiale_tutto_preparato';

  SELECT id, stato INTO _existing_activity_id, _existing_stato
  FROM event_activities
  WHERE event_id = NEW.event_id
    AND verifica_automatica = _verifica_key
  LIMIT 1;

  -- If exists: reset to 'da_fare' regardless of current state (disattivata/completata)
  -- This handles revert scenarios
  IF _existing_activity_id IS NOT NULL THEN
    IF _existing_stato IN ('disattivata', 'completata') THEN
      UPDATE event_activities
      SET stato = 'da_fare',
          completata_il = NULL,
          completata_da = NULL,
          note = 'Riattivata: materiale torna da preparare'
      WHERE id = _existing_activity_id;
    END IF;
    RETURN NEW;
  END IF;

  _deadline := COALESCE(
    _evento.deadline_preparazione,
    _evento.data_inizio - INTERVAL '5 days',
    _evento.data_inizio
  )::date;

  INSERT INTO event_activities (
    event_id, descrizione, categoria, permesso_responsabile,
    stato, deadline, obbligatoria, tipo_verifica, verifica_automatica, note
  ) VALUES (
    NEW.event_id,
    'Preparare materiale per ' || _evento.titolo,
    'materiale',
    'gestione_spedizioni',
    'da_fare',
    _deadline,
    true,
    'automatica',
    _verifica_key,
    'Creata automaticamente. Si completa quando tutto il materiale è in preparazione o spedito.'
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- Scenario 2: Reset activity when event reverts from 'pronto' back to 'in_preparazione'
-- ============================================================
CREATE OR REPLACE FUNCTION reset_prep_activity_on_event_revert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when event goes BACK to 'in_preparazione' or 'confermato' from a later state
  IF OLD.stato = NEW.stato THEN RETURN NEW; END IF;

  IF NEW.stato IN ('in_preparazione', 'confermato')
     AND OLD.stato IN ('pronto', 'in_corso')
  THEN
    -- Check if there are materials that need preparation
    IF EXISTS (SELECT 1 FROM event_materials WHERE event_id = NEW.id AND stato != 'rifiutato') THEN
      UPDATE event_activities
      SET stato = 'da_fare',
          completata_il = NULL,
          completata_da = NULL,
          note = 'Riattivata: evento tornato alla fase ' || NEW.stato
      WHERE event_id = NEW.id
        AND verifica_automatica = 'materiale_tutto_preparato'
        AND stato IN ('completata', 'disattivata');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reset_prep_activity_on_revert
  AFTER UPDATE OF stato ON events
  FOR EACH ROW
  EXECUTE FUNCTION reset_prep_activity_on_event_revert();
