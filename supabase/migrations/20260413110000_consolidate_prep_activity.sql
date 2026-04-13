-- Consolidate: 1 preparation activity per event (not per material)
-- Replaces the per-material activity creation with a single auto-verified activity

-- 1. Rewrite trigger function — creates ONE activity per event, not per material
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
  _verifica_key TEXT;
BEGIN
  IF OLD.stato::text = NEW.stato::text THEN RETURN NEW; END IF;
  IF NEW.stato::text != 'approvato' THEN RETURN NEW; END IF;

  SELECT id, titolo, data_inizio, deadline_preparazione INTO _evento
  FROM events WHERE id = NEW.event_id;

  -- Idempotency key: one per EVENT, not per material
  _verifica_key := 'materiale_tutto_preparato';

  SELECT id INTO _existing_activity_id
  FROM event_activities
  WHERE event_id = NEW.event_id
    AND verifica_automatica = _verifica_key
  LIMIT 1;

  -- If already exists, reactivate if disabled, otherwise do nothing
  IF _existing_activity_id IS NOT NULL THEN
    UPDATE event_activities
    SET stato = 'da_fare', note = NULL
    WHERE id = _existing_activity_id AND stato = 'disattivata';
    RETURN NEW;
  END IF;

  _deadline := COALESCE(
    _evento.deadline_preparazione,
    _evento.data_inizio - INTERVAL '5 days',
    _evento.data_inizio
  )::date;

  -- Create single consolidated activity for the event
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

-- 2. Cleanup existing per-material activities: disable duplicates
-- Keep one per event, disable the others (so they don't count in the gate)
WITH per_material_activities AS (
  SELECT
    id,
    event_id,
    ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at) AS rn
  FROM event_activities
  WHERE verifica_automatica LIKE 'materiale_preparato_%'
    AND stato != 'disattivata'
)
UPDATE event_activities
SET stato = 'disattivata',
    note = 'Consolidata in attività unica per evento'
WHERE id IN (SELECT id FROM per_material_activities WHERE rn > 1);

-- 3. Rename the first per-material activity to be the consolidated one
UPDATE event_activities
SET
  descrizione = 'Preparare materiale per ' || (SELECT titolo FROM events WHERE id = event_activities.event_id),
  tipo_verifica = 'automatica',
  verifica_automatica = 'materiale_tutto_preparato',
  note = 'Consolidata automaticamente — si completa quando tutto il materiale è in preparazione o spedito.'
WHERE verifica_automatica LIKE 'materiale_preparato_%'
  AND stato != 'disattivata';
