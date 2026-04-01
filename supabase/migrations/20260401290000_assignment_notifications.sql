-- ============================================================
-- P4: Improve activity assignment notification with assigner name
-- P5: Add 'attivita_non_assegnata' notification type for escalation
-- ============================================================

-- 1. Extend CHECK constraint to include new notification type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tipo_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_tipo_check
  CHECK (tipo IN (
    'approvazione_richiesta',
    'approvazione_completata',
    'attivita_scaduta',
    'attivita_in_scadenza',
    'attivita_assegnata',
    'attivita_non_assegnata',
    'conflitto_materiale',
    'rientro_scaduto',
    'preventivo_stato',
    'evento_stato_cambiato',
    'escalation'
  ));

-- 2. Improve notify_activity_assigned() to include assigner name
CREATE OR REPLACE FUNCTION notify_activity_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _assigner RECORD;
  _messaggio TEXT;
BEGIN
  -- Only fire when assegnato_a changes to a non-null, different user
  IF NEW.assegnato_a IS NULL THEN RETURN NEW; END IF;
  IF OLD.assegnato_a IS NOT DISTINCT FROM NEW.assegnato_a THEN RETURN NEW; END IF;

  -- Don't notify if user assigned to themselves
  IF NEW.assegnato_a = auth.uid() THEN RETURN NEW; END IF;

  -- Check that the assigned user is active
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.assegnato_a AND attivo = true) THEN
    RETURN NEW;
  END IF;

  SELECT titolo INTO _evento FROM events WHERE id = NEW.event_id;

  -- Get assigner name (the person who made the change)
  SELECT nome, cognome INTO _assigner FROM users WHERE id = auth.uid();

  IF _assigner.nome IS NOT NULL THEN
    _messaggio := 'Assegnata da ' || _assigner.nome || ' ' || _assigner.cognome || ' per l''evento: ' || _evento.titolo;
  ELSE
    _messaggio := 'Per l''evento: ' || _evento.titolo;
  END IF;

  -- Dedup: skip if same notification sent within the last hour
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'activity_assign_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour') THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      NEW.assegnato_a,
      'attivita_assegnata',
      'Nuova attivita'' assegnata: ' || NEW.descrizione,
      _messaggio,
      '/eventi/' || NEW.event_id,
      'Vai all''evento',
      'activity',
      NEW.id,
      'activity_assign_' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists from previous migration, no need to recreate
