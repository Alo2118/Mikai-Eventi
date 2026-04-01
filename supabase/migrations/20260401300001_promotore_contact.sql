-- ============================================================
-- Feature: Allow contacts (agenti) as event promotore
-- Adds promotore_contact_id to events table
-- ============================================================

-- 1. Add new column
ALTER TABLE events ADD COLUMN IF NOT EXISTS promotore_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;

-- 2. Make promotore_id nullable (was NOT NULL)
ALTER TABLE events ALTER COLUMN promotore_id DROP NOT NULL;

-- 3. CHECK: at least one promotore must be set, not both
ALTER TABLE events ADD CONSTRAINT events_promotore_xor
  CHECK (
    (promotore_id IS NOT NULL AND promotore_contact_id IS NULL)
    OR (promotore_id IS NULL AND promotore_contact_id IS NOT NULL)
  );

-- 4. Index for new FK
CREATE INDEX IF NOT EXISTS idx_events_promotore_contact ON events(promotore_contact_id) WHERE promotore_contact_id IS NOT NULL;

-- 5. Update RLS: events_read — commerciale can also see events where promotore is a contact (open visibility)
DROP POLICY IF EXISTS "events_read" ON events;
CREATE POLICY "events_read" ON events FOR SELECT USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'direzione' THEN true
    WHEN 'ufficio' THEN true
    WHEN 'area_manager' THEN (
      manager_user_id = auth.uid()
      OR promotore_id = auth.uid()
      OR promotore_contact_id IS NOT NULL
    )
    WHEN 'commerciale' THEN (
      promotore_id = auth.uid()
      OR promotore_contact_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM event_staff WHERE event_id = events.id AND user_id = auth.uid())
    )
    ELSE false
  END
);

-- 6. Update events_insert: allow insert when promotore is a contact
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (
  CASE get_user_role()
    WHEN 'commerciale' THEN (promotore_id = auth.uid() OR promotore_contact_id IS NOT NULL)
    WHEN 'area_manager' THEN (promotore_id = auth.uid() OR promotore_contact_id IS NOT NULL)
    ELSE get_user_role() IN ('admin', 'direzione', 'ufficio')
  END
);

-- 7. Update can_see_event() — used by child table RLS policies
CREATE OR REPLACE FUNCTION can_see_event(eid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e WHERE e.id = eid
    AND (
      CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'direzione' THEN true
        WHEN 'ufficio' THEN true
        WHEN 'area_manager' THEN (
          e.manager_user_id = auth.uid()
          OR e.promotore_id = auth.uid()
          OR e.promotore_contact_id IS NOT NULL
        )
        WHEN 'commerciale' THEN (
          e.promotore_id = auth.uid()
          OR e.promotore_contact_id IS NOT NULL
          OR EXISTS (SELECT 1 FROM event_staff es WHERE es.event_id = e.id AND es.user_id = auth.uid())
        )
        ELSE false
      END
    )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 8. Update set_event_manager trigger: skip if promotore is a contact (no hierarchy)
CREATE OR REPLACE FUNCTION set_event_manager()
RETURNS TRIGGER AS $$
DECLARE
  manager_id uuid;
BEGIN
  -- If promotore is a contact (agente), no auto-manager
  IF NEW.promotore_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.responsabile_id INTO manager_id
  FROM users u
  WHERE u.id = NEW.promotore_id AND u.ruolo = 'commerciale';

  IF manager_id IS NULL THEN
    WITH RECURSIVE hier AS (
      SELECT id, responsabile_id, ruolo FROM users WHERE id = NEW.promotore_id
      UNION ALL
      SELECT u.id, u.responsabile_id, u.ruolo FROM users u JOIN hier h ON u.id = h.responsabile_id
      WHERE h.ruolo != 'area_manager'
    )
    SELECT id INTO manager_id FROM hier WHERE ruolo = 'area_manager' LIMIT 1;
  END IF;

  IF manager_id IS NOT NULL THEN
    NEW.manager_user_id := manager_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 9. Helper function to get promotore name from either source
CREATE OR REPLACE FUNCTION get_promotore_name(ev events)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN ev.promotore_id IS NOT NULL THEN
      (SELECT nome || ' ' || cognome FROM users WHERE id = ev.promotore_id)
    WHEN ev.promotore_contact_id IS NOT NULL THEN
      (SELECT nome || ' ' || cognome FROM contacts WHERE id = ev.promotore_contact_id)
    ELSE NULL
  END
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 10. Update notify_event_created to handle contact promotore
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
  _promotore_name TEXT;
BEGIN
  _titolo := NEW.titolo;
  _link := '/eventi/' || NEW.id;
  _gruppo := 'event_approval_' || NEW.id;

  -- Get promotore name from either source
  IF NEW.promotore_id IS NOT NULL THEN
    SELECT nome || ' ' || cognome INTO _promotore_name FROM users WHERE id = NEW.promotore_id;
  ELSIF NEW.promotore_contact_id IS NOT NULL THEN
    SELECT nome || ' ' || cognome INTO _promotore_name FROM contacts WHERE id = NEW.promotore_contact_id;
  END IF;

  FOR _approver IN
    SELECT DISTINCT u.id FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    WHERE up.permission = 'approva_eventi'
    AND (NEW.promotore_id IS NULL OR u.id != NEW.promotore_id)
    AND u.attivo = true
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour')
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _approver.id,
      'approvazione_richiesta',
      'Nuovo evento da approvare: ' || _titolo,
      'Proposto da ' || COALESCE(_promotore_name, 'N/D'),
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

-- 11. Update notify_event_state_change to handle contact promotore
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
  _promotore_name TEXT;
BEGIN
  IF OLD.stato = NEW.stato THEN RETURN NEW; END IF;

  _titolo := NEW.titolo;
  _link := '/eventi/' || NEW.id;

  -- Notify promotore user (only if internal user)
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

  -- Notify event staff
  FOR _staff IN
    SELECT DISTINCT es.user_id FROM event_staff es
    JOIN users u ON u.id = es.user_id
    WHERE es.event_id = NEW.id
    AND (NEW.promotore_id IS NULL OR es.user_id != NEW.promotore_id)
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
    IF NEW.promotore_id IS NOT NULL THEN
      SELECT nome || ' ' || cognome INTO _promotore_name FROM users WHERE id = NEW.promotore_id;
    ELSIF NEW.promotore_contact_id IS NOT NULL THEN
      SELECT nome || ' ' || cognome INTO _promotore_name FROM contacts WHERE id = NEW.promotore_contact_id;
    END IF;

    FOR _approver IN
      SELECT DISTINCT u.id FROM users u
      JOIN user_permissions up ON up.user_id = u.id
      WHERE up.permission = 'approva_eventi'
      AND (NEW.promotore_id IS NULL OR u.id != NEW.promotore_id)
      AND u.attivo = true
      AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'event_approval_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
    LOOP
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        _approver.id,
        'approvazione_richiesta',
        'Nuovo evento da approvare: ' || _titolo,
        'Proposto da ' || COALESCE(_promotore_name, 'N/D'),
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
