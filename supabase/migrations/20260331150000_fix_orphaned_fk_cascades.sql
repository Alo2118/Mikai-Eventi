-- Fix orphaned record FK constraints
-- Problem: deleting parent records leaves orphaned children with no CASCADE/SET NULL

-- 1. event_preventivi.sub_activity_id → CASCADE (delete quote when sub-activity is deleted)
ALTER TABLE event_preventivi
  DROP CONSTRAINT IF EXISTS event_preventivi_sub_activity_id_fkey;
ALTER TABLE event_preventivi
  ADD CONSTRAINT event_preventivi_sub_activity_id_fkey
  FOREIGN KEY (sub_activity_id) REFERENCES event_sub_activities(id) ON DELETE CASCADE;

-- 2. event_preventivi.fornitore_id → SET NULL (keep quote, clear supplier ref)
ALTER TABLE event_preventivi
  DROP CONSTRAINT IF EXISTS event_preventivi_fornitore_id_fkey;
ALTER TABLE event_preventivi
  ADD CONSTRAINT event_preventivi_fornitore_id_fkey
  FOREIGN KEY (fornitore_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 3. event_sub_activities.fornitore_id → SET NULL (keep sub-activity, clear supplier ref)
ALTER TABLE event_sub_activities
  DROP CONSTRAINT IF EXISTS event_sub_activities_fornitore_id_fkey;
ALTER TABLE event_sub_activities
  ADD CONSTRAINT event_sub_activities_fornitore_id_fkey
  FOREIGN KEY (fornitore_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 4. event_activities.dipende_da → SET NULL (unblock dependent activity when parent is deleted)
ALTER TABLE event_activities
  DROP CONSTRAINT IF EXISTS event_activities_dipende_da_fkey;
ALTER TABLE event_activities
  ADD CONSTRAINT event_activities_dipende_da_fkey
  FOREIGN KEY (dipende_da) REFERENCES event_activities(id) ON DELETE SET NULL;

-- 5. template_items.dipende_da → SET NULL (unblock dependent template item when parent is deleted)
ALTER TABLE template_items
  DROP CONSTRAINT IF EXISTS template_items_dipende_da_fkey;
ALTER TABLE template_items
  ADD CONSTRAINT template_items_dipende_da_fkey
  FOREIGN KEY (dipende_da) REFERENCES template_items(id) ON DELETE SET NULL;
