-- Cleanup orphaned records — one-time data remediation
-- These orphans exist because FK constraints pointed to users/contacts
-- but not to event_staff/event_participants, so removing a person
-- from an event left hotel/transport records dangling.

-- 1. Hotel records for people no longer assigned to the event
DELETE FROM event_hotel eh
WHERE
  (eh.user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM event_staff es
    WHERE es.event_id = eh.event_id AND es.user_id = eh.user_id
  ))
  OR
  (eh.contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = eh.event_id AND ep.contact_id = eh.contact_id
  ));

-- 2. Transport records for people no longer assigned to the event
DELETE FROM event_trasporti et
WHERE
  (et.user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM event_staff es
    WHERE es.event_id = et.event_id AND es.user_id = et.user_id
  ))
  OR
  (et.contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM event_participants ep
    WHERE ep.event_id = et.event_id AND ep.contact_id = et.contact_id
  ));

-- 3. Preventivi with dangling sub_activity_id (now CASCADE, but clean existing)
DELETE FROM event_preventivi ep
WHERE ep.sub_activity_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_sub_activities esa WHERE esa.id = ep.sub_activity_id
  );

-- 4. Dangling dipende_da references (now SET NULL, but clean existing)
UPDATE event_activities
SET dipende_da = NULL
WHERE dipende_da IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_activities ea2 WHERE ea2.id = event_activities.dipende_da
  );

UPDATE template_items
SET dipende_da = NULL
WHERE dipende_da IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM template_items ti2 WHERE ti2.id = template_items.dipende_da
  );

-- 5. Dangling fornitore_id references (now SET NULL, but clean existing)
UPDATE event_sub_activities
SET fornitore_id = NULL
WHERE fornitore_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c WHERE c.id = event_sub_activities.fornitore_id
  );

UPDATE event_preventivi
SET fornitore_id = NULL
WHERE fornitore_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c WHERE c.id = event_preventivi.fornitore_id
  );
