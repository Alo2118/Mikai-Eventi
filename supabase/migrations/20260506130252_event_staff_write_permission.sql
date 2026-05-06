-- Align event_staff_write RLS with UI permission check.
-- Previous policy allowed only admin/direzione/ufficio by role; UI gates on
-- has_permission('gestione_staff_evento'), so users with the permission but a
-- different role (e.g. area_manager) saw edit controls then got silent RLS
-- failures. Match the pattern already used by event_tavoli_write.

DROP POLICY IF EXISTS event_staff_write ON event_staff;
CREATE POLICY event_staff_write ON event_staff
  FOR ALL
  USING (has_permission('gestione_staff_evento'::permission_type))
  WITH CHECK (has_permission('gestione_staff_evento'::permission_type));
