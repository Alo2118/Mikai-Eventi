-- Migration: Notification triggers
-- Phase 5B: Automatic notification triggers for state changes

-- ============================================================
-- Trigger 0: notify_event_created
-- Fires on INSERT when a new event is created with stato = 'proposto'
-- Notifies users with 'approva_eventi' permission
-- ============================================================
CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _approver RECORD;
  _titolo TEXT;
  _link TEXT;
  _gruppo TEXT;
BEGIN
  _titolo := NEW.titolo;
  _link := '/eventi/' || NEW.id;
  _gruppo := 'event_approval_' || NEW.id;

  FOR _approver IN
    SELECT DISTINCT u.id FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    WHERE up.permission = 'approva_eventi'
    AND u.id != NEW.promotore_id
    AND u.attivo = true
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour')
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _approver.id,
      'approvazione_richiesta',
      'Nuovo evento da approvare: ' || _titolo,
      'Proposto da ' || (SELECT nome || ' ' || cognome FROM users WHERE id = NEW.promotore_id),
      _link,
      'Rivedi evento',
      'event',
      NEW.id,
      _gruppo
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  WHEN (NEW.stato = 'proposto')
  EXECUTE FUNCTION notify_event_created();

-- ============================================================
-- Trigger 1: notify_event_state_change
-- Fires on UPDATE OF stato ON events
-- Notifies promotore + event staff + approvers (when proposto)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_event_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _staff RECORD;
  _approver RECORD;
  _titolo TEXT;
  _link TEXT;
BEGIN
  -- Only fire when stato actually changes
  IF OLD.stato = NEW.stato THEN RETURN NEW; END IF;

  _titolo := NEW.titolo;
  _link := '/eventi/' || NEW.id;

  -- Notify promotore (only if active, with dedup)
  IF NEW.promotore_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM users WHERE id = NEW.promotore_id AND attivo = true)
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'event_state_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
  THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      NEW.promotore_id,
      CASE
        WHEN NEW.stato = 'confermato' THEN 'approvazione_completata'
        WHEN NEW.stato = 'rifiutato' THEN 'approvazione_completata'
        ELSE 'evento_stato_cambiato'
      END,
      CASE
        WHEN NEW.stato = 'confermato' THEN 'Evento approvato: ' || _titolo
        WHEN NEW.stato = 'rifiutato' THEN 'Evento rifiutato: ' || _titolo
        ELSE 'Evento ' || _titolo || ' → ' || NEW.stato
      END,
      NULL,
      _link,
      'Vai all''evento',
      'event',
      NEW.id,
      'event_state_' || NEW.id
    );
  END IF;

  -- Notify event staff (from event_staff table)
  FOR _staff IN
    SELECT DISTINCT es.user_id FROM event_staff es
    JOIN users u ON u.id = es.user_id
    WHERE es.event_id = NEW.id AND es.user_id != NEW.promotore_id
    AND u.attivo = true
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'event_state_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _staff.user_id,
      'evento_stato_cambiato',
      'Evento ' || _titolo || ' → ' || NEW.stato,
      NULL,
      _link,
      'Vai all''evento',
      'event',
      NEW.id,
      'event_state_' || NEW.id
    );
  END LOOP;

  -- If event proposed → notify approvers
  IF NEW.stato = 'proposto' AND OLD.stato IS DISTINCT FROM 'proposto' THEN
    FOR _approver IN
      SELECT DISTINCT u.id FROM users u
      JOIN user_permissions up ON up.user_id = u.id
      WHERE up.permission = 'approva_eventi'
      AND u.id != NEW.promotore_id
      AND u.attivo = true
      AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'event_approval_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
    LOOP
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        _approver.id,
        'approvazione_richiesta',
        'Nuovo evento da approvare: ' || _titolo,
        'Proposto da ' || (SELECT nome || ' ' || cognome FROM users WHERE id = NEW.promotore_id),
        _link,
        'Rivedi evento',
        'event',
        NEW.id,
        'event_approval_' || NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_state_change
  AFTER UPDATE OF stato ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_state_change();

-- ============================================================
-- Trigger 2: notify_activity_assigned
-- Fires on UPDATE OF assegnato_a ON event_activities
-- Notifies the newly assigned user
-- ============================================================
CREATE OR REPLACE FUNCTION notify_activity_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
BEGIN
  -- Only fire when assegnato_a changes from NULL or to a different user
  IF NEW.assegnato_a IS NULL THEN RETURN NEW; END IF;
  IF OLD.assegnato_a IS NOT DISTINCT FROM NEW.assegnato_a THEN RETURN NEW; END IF;

  -- Check that the assigned user is active
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.assegnato_a AND attivo = true) THEN
    RETURN NEW;
  END IF;

  SELECT titolo INTO _evento FROM events WHERE id = NEW.event_id;

  -- Dedup: skip if same notification sent within the last hour
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'activity_assign_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour') THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      NEW.assegnato_a,
      'attivita_assegnata',
      'Nuova attivita'' assegnata: ' || NEW.descrizione,
      'Per l''evento: ' || _evento.titolo,
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

CREATE TRIGGER trg_activity_assigned
  AFTER UPDATE OF assegnato_a ON event_activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_assigned();

-- ============================================================
-- Trigger 3: notify_preventivo_state_change
-- Fires on UPDATE OF stato ON event_preventivi
-- Also fires on INSERT when stato = 'in_attesa'
-- Notifies promotore + approvers
-- ============================================================
CREATE OR REPLACE FUNCTION notify_preventivo_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _fornitore TEXT;
  _promotore_id UUID;
  _approver RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stato = NEW.stato THEN RETURN NEW; END IF;

  SELECT id, titolo, promotore_id INTO _evento FROM events WHERE id = NEW.event_id;
  _promotore_id := _evento.promotore_id;

  -- Handle NULL fornitore_id (manual fornitore_nome instead of contact reference)
  _fornitore := COALESCE(
    (SELECT COALESCE(nome, '') || ' ' || COALESCE(cognome, '') FROM contacts WHERE id = NEW.fornitore_id),
    NEW.fornitore_nome,
    'fornitore sconosciuto'
  );

  -- Notify promotore when preventivo is approved/rejected/in_revisione (only if promotore is active)
  IF NEW.stato IN ('approvato', 'rifiutato', 'in_revisione') AND _promotore_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM users WHERE id = _promotore_id AND attivo = true)
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'preventivo_state_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
  THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _promotore_id,
      'preventivo_stato',
      'Preventivo ' || NEW.stato || ': ' || TRIM(_fornitore),
      'Per l''evento: ' || _evento.titolo,
      '/eventi/' || NEW.event_id,
      'Vai ai costi',
      'preventivo',
      NEW.id,
      'preventivo_state_' || NEW.id
    );
  END IF;

  -- Notify approvers when new preventivo is pending
  IF NEW.stato = 'in_attesa' AND (TG_OP = 'INSERT' OR OLD.stato IS DISTINCT FROM 'in_attesa') THEN
    FOR _approver IN
      SELECT DISTINCT u.id FROM users u
      JOIN user_permissions up ON up.user_id = u.id
      WHERE up.permission = 'approva_preventivi'
      AND u.attivo = true
      AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'preventivo_approval_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
    LOOP
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        _approver.id,
        'approvazione_richiesta',
        'Preventivo da approvare: ' || TRIM(_fornitore),
        _evento.titolo || ' — ' || COALESCE(NEW.importo::TEXT, '?') || ' EUR',
        '/eventi/' || NEW.event_id,
        'Rivedi preventivo',
        'preventivo',
        NEW.id,
        'preventivo_approval_' || NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_preventivo_state_change
  AFTER UPDATE OF stato ON event_preventivi
  FOR EACH ROW
  EXECUTE FUNCTION notify_preventivo_state_change();

CREATE TRIGGER trg_preventivo_created
  AFTER INSERT ON event_preventivi
  FOR EACH ROW
  WHEN (NEW.stato = 'in_attesa')
  EXECUTE FUNCTION notify_preventivo_state_change();
