-- HARDENING RLS (#2 CRITICO, #4 ALTO, #9 MEDIO)
--
-- #2 events_update: la policy consentiva a QUALSIASI area_manager di modificare/
--    approvare qualsiasi evento (anche di altre zone/manager), incluso budget e
--    promotore. Allineiamo lo scoping a events_read: l'area_manager può fare UPDATE
--    solo su eventi di cui è manager o promotore. Direzione/admin/ufficio invariati.
--
-- #4 preventivi/hotel/trasporti: erano leggibili da QUALUNQUE autenticato
--    (USING auth.uid() IS NOT NULL), scavalcando la visibilità per-zona degli eventi.
--    Passiamo a can_see_event(event_id), coerente con event_costs/event_staff.
--
-- #9 hotel_templates: CRUD aperto a chiunque (WITH CHECK true). Le tabelle di
--    configurazione condivise vanno riservate al back-office.

-- ---- #2 events_update ----
DROP POLICY IF EXISTS events_update ON events;
CREATE POLICY events_update ON events
  FOR UPDATE
  USING (
    CASE get_user_role()
      WHEN 'admin' THEN true
      WHEN 'direzione' THEN true
      WHEN 'ufficio' THEN true
      WHEN 'area_manager' THEN (manager_user_id = auth.uid() OR promotore_id = auth.uid())
      ELSE false
    END
  )
  WITH CHECK (
    CASE get_user_role()
      WHEN 'admin' THEN true
      WHEN 'direzione' THEN true
      WHEN 'ufficio' THEN true
      WHEN 'area_manager' THEN (manager_user_id = auth.uid() OR promotore_id = auth.uid())
      ELSE false
    END
  );

-- ---- #4 letture logistica/preventivi per-zona ----
DROP POLICY IF EXISTS "hotel_read" ON event_hotel;
CREATE POLICY "hotel_read" ON event_hotel FOR SELECT USING (can_see_event(event_id));

DROP POLICY IF EXISTS "trasporti_read" ON event_trasporti;
CREATE POLICY "trasporti_read" ON event_trasporti FOR SELECT USING (can_see_event(event_id));

DROP POLICY IF EXISTS "preventivi_read" ON event_preventivi;
CREATE POLICY "preventivi_read" ON event_preventivi FOR SELECT USING (can_see_event(event_id));

-- ---- #9 hotel_templates: scrittura solo back-office ----
DROP POLICY IF EXISTS "hotel_templates_insert" ON hotel_templates;
CREATE POLICY "hotel_templates_insert" ON hotel_templates
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'direzione', 'ufficio'));

DROP POLICY IF EXISTS "hotel_templates_update" ON hotel_templates;
CREATE POLICY "hotel_templates_update" ON hotel_templates
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'direzione', 'ufficio'))
  WITH CHECK (get_user_role() IN ('admin', 'direzione', 'ufficio'));

DROP POLICY IF EXISTS "hotel_templates_delete" ON hotel_templates;
CREATE POLICY "hotel_templates_delete" ON hotel_templates
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
