-- Fix: shipping notification should always reach promotore + gestione_magazzino
-- Previous version skipped notification when promotore = responsabile (self-ship)
-- Also: use event-level gruppo to avoid per-material dedup blocking batch shipments

CREATE OR REPLACE FUNCTION notify_material_shipped()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _material_name TEXT;
  _recipient RECORD;
  _link TEXT;
  _gruppo TEXT;
BEGIN
  -- Only for outbound shipments linked to an event
  IF NEW.tipo != 'uscita' OR NEW.event_id IS NULL THEN RETURN NEW; END IF;

  SELECT id, titolo, promotore_id INTO _evento
  FROM events WHERE id = NEW.event_id;

  IF _evento IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(m.nome, 'Materiale') INTO _material_name
  FROM materials m WHERE m.id = NEW.material_id;

  _link := '/eventi/' || NEW.event_id;
  -- Event-level dedup (not per-material) so batch shipments don't spam
  _gruppo := 'mat_shipped_' || NEW.event_id;

  -- Notify promotore (ALWAYS, even if they are the shipper — it's a confirmation)
  IF _evento.promotore_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM users WHERE id = _evento.promotore_id AND attivo = true)
     AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = _evento.promotore_id)
  THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _evento.promotore_id,
      'materiale_spedito',
      'Materiale spedito per ' || _evento.titolo,
      COALESCE('Tracking: ' || NEW.tracking_spedizione, 'Senza tracking'),
      _link, 'Vai all''evento', 'movement', NEW.id, _gruppo
    );
  END IF;

  -- Notify event staff (excluding promotore who already got notified)
  FOR _recipient IN
    SELECT DISTINCT es.user_id FROM event_staff es
    JOIN users u ON u.id = es.user_id
    WHERE es.event_id = NEW.event_id
    AND u.attivo = true
    AND es.user_id != COALESCE(_evento.promotore_id, '00000000-0000-0000-0000-000000000000')
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = es.user_id)
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _recipient.user_id,
      'materiale_spedito',
      'Materiale spedito per ' || _evento.titolo,
      COALESCE('Tracking: ' || NEW.tracking_spedizione, ''),
      _link, 'Vai all''evento', 'movement', NEW.id, _gruppo
    );
  END LOOP;

  -- Notify warehouse managers (gestione_magazzino) for tracking
  FOR _recipient IN
    SELECT DISTINCT u.id FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    WHERE up.permission = 'gestione_magazzino'
    AND u.attivo = true
    AND u.id != COALESCE(_evento.promotore_id, '00000000-0000-0000-0000-000000000000')
    AND NOT EXISTS (SELECT 1 FROM event_staff WHERE event_id = NEW.event_id AND user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = u.id)
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _recipient.id,
      'materiale_spedito',
      'Materiale spedito per ' || _evento.titolo,
      COALESCE('Tracking: ' || NEW.tracking_spedizione, ''),
      _link, 'Vai all''evento', 'movement', NEW.id, _gruppo
    );
  END LOOP;

  RETURN NEW;
END;
$$;
