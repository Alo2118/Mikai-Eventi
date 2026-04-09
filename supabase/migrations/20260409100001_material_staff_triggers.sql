-- ============================================================
-- Strategy C: Hybrid DB triggers for material lifecycle + staff
-- Notifications + auto-creation of preparation activities
-- ============================================================

-- ============================================================
-- 1. MATERIAL STATE CHANGE → NOTIFY
-- Fires on UPDATE OF stato on event_materials
-- Covers: approvato, rifiutato, in_preparazione
-- ============================================================
CREATE OR REPLACE FUNCTION notify_material_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _product_name TEXT;
  _richiedente RECORD;
  _recipient RECORD;
  _link TEXT;
  _gruppo TEXT;
BEGIN
  -- Only fire when stato actually changes
  IF OLD.stato::text = NEW.stato::text THEN RETURN NEW; END IF;

  -- Get event info
  SELECT id, titolo, promotore_id, data_inizio INTO _evento
  FROM events WHERE id = NEW.event_id;

  _link := '/eventi/' || NEW.event_id;

  -- Get product name
  SELECT COALESCE(p.nome, 'Prodotto') INTO _product_name
  FROM products p WHERE p.id = NEW.product_id;

  -- Get requester info
  SELECT id, nome, cognome INTO _richiedente
  FROM users WHERE id = NEW.richiesto_da;

  -- ── APPROVATO ──────────────────────────────────────────────
  IF NEW.stato::text = 'approvato' THEN
    _gruppo := 'mat_approved_' || NEW.id;

    -- Notify requester (if not the one who approved)
    IF NEW.richiesto_da IS DISTINCT FROM NEW.approvato_da
       AND EXISTS (SELECT 1 FROM users WHERE id = NEW.richiesto_da AND attivo = true)
       AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = NEW.richiesto_da)
    THEN
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        NEW.richiesto_da,
        'materiale_approvato',
        'Materiale approvato: ' || _product_name,
        'Per l''evento: ' || _evento.titolo,
        _link, 'Vai all''evento', 'material_request', NEW.id, _gruppo
      );
    END IF;

    -- Notify users with gestione_spedizioni (warehouse/shipping team)
    FOR _recipient IN
      SELECT DISTINCT u.id FROM users u
      JOIN user_permissions up ON up.user_id = u.id
      WHERE up.permission = 'gestione_spedizioni'
      AND u.attivo = true
      AND u.id != COALESCE(NEW.approvato_da, '00000000-0000-0000-0000-000000000000')
      AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = u.id)
    LOOP
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        _recipient.id,
        'materiale_approvato',
        'Materiale da preparare: ' || _product_name,
        _evento.titolo || ' — richiesto da ' || _richiedente.nome || ' ' || _richiedente.cognome,
        _link, 'Vai all''evento', 'material_request', NEW.id, _gruppo
      );
    END LOOP;

  -- ── RIFIUTATO ──────────────────────────────────────────────
  ELSIF NEW.stato::text = 'rifiutato' THEN
    _gruppo := 'mat_rejected_' || NEW.id;

    -- Notify requester
    IF EXISTS (SELECT 1 FROM users WHERE id = NEW.richiesto_da AND attivo = true)
       AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = NEW.richiesto_da)
    THEN
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        NEW.richiesto_da,
        'materiale_rifiutato',
        'Materiale rifiutato: ' || _product_name,
        'Motivo: ' || COALESCE(NEW.motivo_rifiuto, 'non specificato') || ' — ' || _evento.titolo,
        _link, 'Vai all''evento', 'material_request', NEW.id, _gruppo
      );
    END IF;

  -- ── IN PREPARAZIONE ────────────────────────────────────────
  ELSIF NEW.stato::text = 'in_preparazione' THEN
    _gruppo := 'mat_prep_' || NEW.id;

    -- Notify promotore (event owner knows prep started)
    IF _evento.promotore_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM users WHERE id = _evento.promotore_id AND attivo = true)
       AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = _evento.promotore_id)
    THEN
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        _evento.promotore_id,
        'materiale_in_preparazione',
        'Preparazione avviata: ' || _product_name,
        'Per l''evento: ' || _evento.titolo,
        _link, 'Vai all''evento', 'material_request', NEW.id, _gruppo
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_material_state_change
  AFTER UPDATE OF stato ON event_materials
  FOR EACH ROW
  EXECUTE FUNCTION notify_material_state_change();


-- ============================================================
-- 2. MATERIAL SHIPPED → NOTIFY (movement uscita created)
-- Fires on INSERT on material_movements when tipo = 'uscita'
-- ============================================================
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

  -- Get material name
  SELECT COALESCE(m.nome, 'Materiale') INTO _material_name
  FROM materials m WHERE m.id = NEW.material_id;

  _link := '/eventi/' || NEW.event_id;
  _gruppo := 'mat_shipped_' || NEW.material_id || '_' || NEW.event_id;

  -- Notify promotore
  IF _evento.promotore_id IS NOT NULL
     AND _evento.promotore_id != NEW.responsabile_id
     AND EXISTS (SELECT 1 FROM users WHERE id = _evento.promotore_id AND attivo = true)
     AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = _evento.promotore_id)
  THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _evento.promotore_id,
      'materiale_spedito',
      'Materiale spedito: ' || _material_name,
      COALESCE('Tracking: ' || NEW.tracking_spedizione, 'Nessun tracking') || ' — ' || _evento.titolo,
      _link, 'Vai all''evento', 'movement', NEW.id, _gruppo
    );
  END IF;

  -- Notify event staff
  FOR _recipient IN
    SELECT DISTINCT es.user_id FROM event_staff es
    JOIN users u ON u.id = es.user_id
    WHERE es.event_id = NEW.event_id
    AND u.attivo = true
    AND es.user_id != NEW.responsabile_id
    AND es.user_id != COALESCE(_evento.promotore_id, '00000000-0000-0000-0000-000000000000')
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = es.user_id)
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _recipient.user_id,
      'materiale_spedito',
      'Materiale spedito: ' || _material_name,
      COALESCE('Tracking: ' || NEW.tracking_spedizione, '') || ' — ' || _evento.titolo,
      _link, 'Vai all''evento', 'movement', NEW.id, _gruppo
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_material_shipped
  AFTER INSERT ON material_movements
  FOR EACH ROW
  WHEN (NEW.tipo = 'uscita')
  EXECUTE FUNCTION notify_material_shipped();


-- ============================================================
-- 3. MATERIAL RETURNED → NOTIFY (movement rientro created)
-- Fires on INSERT on material_movements when tipo = 'rientro'
-- ============================================================
CREATE OR REPLACE FUNCTION notify_material_returned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _material_name TEXT;
  _evento_titolo TEXT;
  _recipient RECORD;
  _gruppo TEXT;
BEGIN
  IF NEW.tipo != 'rientro' THEN RETURN NEW; END IF;

  SELECT COALESCE(m.nome, 'Materiale') INTO _material_name
  FROM materials m WHERE m.id = NEW.material_id;

  IF NEW.event_id IS NOT NULL THEN
    SELECT titolo INTO _evento_titolo FROM events WHERE id = NEW.event_id;
  END IF;

  _gruppo := 'mat_returned_' || NEW.material_id || '_' || COALESCE(NEW.event_id::text, 'no_event');

  -- Notify warehouse managers
  FOR _recipient IN
    SELECT DISTINCT u.id FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    WHERE up.permission = 'gestione_magazzino'
    AND u.attivo = true
    AND u.id != NEW.responsabile_id
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND user_id = u.id)
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _recipient.id,
      'materiale_rientrato',
      'Materiale rientrato: ' || _material_name,
      CASE
        WHEN NEW.stato_rientro = 'danneggiato' THEN 'ATTENZIONE: rientro con danni — ' || COALESCE(NEW.note_danni, '')
        WHEN NEW.stato_rientro = 'parziale' THEN 'Rientro parziale (' || COALESCE(NEW.quantita_rientrata::text, '?') || ' pz)'
        ELSE 'Rientro integro'
      END || COALESCE(' — ' || _evento_titolo, ''),
      CASE WHEN NEW.event_id IS NOT NULL THEN '/eventi/' || NEW.event_id ELSE '/materiale' END,
      'Vai al dettaglio',
      'movement', NEW.id, _gruppo
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_material_returned
  AFTER INSERT ON material_movements
  FOR EACH ROW
  WHEN (NEW.tipo = 'rientro')
  EXECUTE FUNCTION notify_material_returned();


-- ============================================================
-- 4. AUTO-CREATE PREPARATION ACTIVITY when material approved
-- Strategy C: DB trigger creates activity, leveraging existing
-- notify_activity_assigned trigger for downstream notifications
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_preparation_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _product_name TEXT;
  _deadline DATE;
  _existing_activity_id UUID;
BEGIN
  -- Only when transitioning TO approvato
  IF OLD.stato::text = NEW.stato::text THEN RETURN NEW; END IF;
  IF NEW.stato::text != 'approvato' THEN RETURN NEW; END IF;

  -- Get event info
  SELECT id, titolo, data_inizio, deadline_preparazione INTO _evento
  FROM events WHERE id = NEW.event_id;

  -- Get product name
  SELECT COALESCE(p.nome, 'Prodotto') INTO _product_name
  FROM products p WHERE p.id = NEW.product_id;

  -- Idempotency: check if a preparation activity already exists for this material request
  SELECT id INTO _existing_activity_id
  FROM event_activities
  WHERE event_id = NEW.event_id
    AND verifica_automatica = 'materiale_preparato_' || NEW.id
  LIMIT 1;

  IF _existing_activity_id IS NOT NULL THEN
    -- Reactivate if it was disabled
    UPDATE event_activities
    SET stato = 'da_fare', note = NULL
    WHERE id = _existing_activity_id AND stato = 'disattivata';
    RETURN NEW;
  END IF;

  -- Calculate deadline: event deadline_preparazione, or data_inizio - 5 days, or data_inizio
  _deadline := COALESCE(
    _evento.deadline_preparazione,
    _evento.data_inizio - INTERVAL '5 days',
    _evento.data_inizio
  )::date;

  -- Create the preparation activity
  INSERT INTO event_activities (
    event_id,
    descrizione,
    categoria,
    permesso_responsabile,
    stato,
    deadline,
    obbligatoria,
    tipo_verifica,
    verifica_automatica,
    note
  ) VALUES (
    NEW.event_id,
    'Preparare ' || _product_name || ' per ' || _evento.titolo,
    'materiale',
    'gestione_spedizioni',
    'da_fare',
    _deadline,
    true,
    'manuale',
    'materiale_preparato_' || NEW.id,  -- unique key for idempotency
    'Creata automaticamente dall''approvazione materiale'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_prep_activity
  AFTER UPDATE OF stato ON event_materials
  FOR EACH ROW
  WHEN (NEW.stato = 'approvato')
  EXECUTE FUNCTION auto_create_preparation_activity();


-- ============================================================
-- 5. STAFF ADDED TO EVENT → NOTIFY
-- Fires on INSERT on event_staff
-- ============================================================
CREATE OR REPLACE FUNCTION notify_staff_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _assigner RECORD;
  _gruppo TEXT;
BEGIN
  -- Don't notify if user added themselves
  IF NEW.user_id = auth.uid() THEN RETURN NEW; END IF;

  -- Check that staff member is active
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND attivo = true) THEN
    RETURN NEW;
  END IF;

  SELECT id, titolo INTO _evento FROM events WHERE id = NEW.event_id;
  SELECT nome, cognome INTO _assigner FROM users WHERE id = auth.uid();

  _gruppo := 'staff_assign_' || NEW.event_id || '_' || NEW.user_id;

  -- Dedup
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour') THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      NEW.user_id,
      'staff_assegnato',
      'Sei stato aggiunto all''evento: ' || _evento.titolo,
      CASE
        WHEN _assigner.nome IS NOT NULL
          THEN 'Aggiunto da ' || _assigner.nome || ' ' || _assigner.cognome || ' come ' || NEW.ruolo_evento::text
        ELSE 'Ruolo: ' || NEW.ruolo_evento::text
      END,
      '/eventi/' || NEW.event_id,
      'Vai all''evento',
      'event_staff',
      NEW.id,
      _gruppo
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_assigned
  AFTER INSERT ON event_staff
  FOR EACH ROW
  EXECUTE FUNCTION notify_staff_assigned();


-- ============================================================
-- 6. STAFF REMOVED FROM EVENT → NOTIFY
-- Fires on DELETE on event_staff
-- ============================================================
CREATE OR REPLACE FUNCTION notify_staff_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento_titolo TEXT;
  _gruppo TEXT;
BEGIN
  -- Don't notify if user removed themselves
  IF OLD.user_id = auth.uid() THEN RETURN OLD; END IF;

  -- Check that staff member is active
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id AND attivo = true) THEN
    RETURN OLD;
  END IF;

  SELECT titolo INTO _evento_titolo FROM events WHERE id = OLD.event_id;

  _gruppo := 'staff_removed_' || OLD.event_id || '_' || OLD.user_id;

  IF NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour') THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      OLD.user_id,
      'staff_rimosso',
      'Rimosso dall''evento: ' || _evento_titolo,
      NULL,
      '/eventi/' || OLD.event_id,
      'Vai all''evento',
      'event_staff',
      OLD.id,
      _gruppo
    );
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_staff_removed
  AFTER DELETE ON event_staff
  FOR EACH ROW
  EXECUTE FUNCTION notify_staff_removed();
