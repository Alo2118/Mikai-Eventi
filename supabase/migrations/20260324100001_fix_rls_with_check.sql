-- Fix missing WITH CHECK clauses on write policies across all tables.
-- Without WITH CHECK, FOR ALL policies block INSERT operations.
-- UPDATE-only policies also get WITH CHECK for correctness.
-- Pattern: DROP + recreate with same USING + matching WITH CHECK.

BEGIN;

-- ============================================================
-- FOR ALL (*) policies — these block INSERT without WITH CHECK
-- ============================================================

-- approval_thresholds
DROP POLICY IF EXISTS thresholds_write ON approval_thresholds;
CREATE POLICY thresholds_write ON approval_thresholds
  FOR ALL
  USING (get_user_role() = 'admin'::user_role)
  WITH CHECK (get_user_role() = 'admin'::user_role);

-- body_sections
DROP POLICY IF EXISTS body_sections_write_perm ON body_sections;
CREATE POLICY body_sections_write_perm ON body_sections
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- brands
DROP POLICY IF EXISTS brands_write_perm ON brands;
CREATE POLICY brands_write_perm ON brands
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- couriers
DROP POLICY IF EXISTS couriers_write ON couriers;
CREATE POLICY couriers_write ON couriers
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- documents
DROP POLICY IF EXISTS documents_write ON documents;
CREATE POLICY documents_write ON documents
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]));

-- event_costs
DROP POLICY IF EXISTS costs_write ON event_costs;
CREATE POLICY costs_write ON event_costs
  FOR ALL
  USING (has_permission('gestione_costi'::permission_type))
  WITH CHECK (has_permission('gestione_costi'::permission_type));

-- event_hotel
DROP POLICY IF EXISTS hotel_write ON event_hotel;
CREATE POLICY hotel_write ON event_hotel
  FOR ALL
  USING (has_permission('gestione_logistica'::permission_type) OR get_user_role() = 'admin'::user_role)
  WITH CHECK (has_permission('gestione_logistica'::permission_type) OR get_user_role() = 'admin'::user_role);

-- event_participants
DROP POLICY IF EXISTS event_participants_write ON event_participants;
CREATE POLICY event_participants_write ON event_participants
  FOR ALL
  USING (
    (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
    OR (EXISTS (
      SELECT 1 FROM event_staff
      WHERE event_staff.event_id = event_participants.event_id
        AND event_staff.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
    OR (EXISTS (
      SELECT 1 FROM event_staff
      WHERE event_staff.event_id = event_participants.event_id
        AND event_staff.user_id = auth.uid()
    ))
  );

-- event_staff
DROP POLICY IF EXISTS event_staff_write ON event_staff;
CREATE POLICY event_staff_write ON event_staff
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]));

-- event_tavoli
DROP POLICY IF EXISTS event_tavoli_write ON event_tavoli;
CREATE POLICY event_tavoli_write ON event_tavoli
  FOR ALL
  USING (has_permission('gestione_staff_evento'::permission_type))
  WITH CHECK (has_permission('gestione_staff_evento'::permission_type));

-- event_tavoli_discenti
DROP POLICY IF EXISTS event_tavoli_discenti_write ON event_tavoli_discenti;
CREATE POLICY event_tavoli_discenti_write ON event_tavoli_discenti
  FOR ALL
  USING (has_permission('gestione_staff_evento'::permission_type))
  WITH CHECK (has_permission('gestione_staff_evento'::permission_type));

-- event_tavoli_formatori
DROP POLICY IF EXISTS event_tavoli_formatori_write ON event_tavoli_formatori;
CREATE POLICY event_tavoli_formatori_write ON event_tavoli_formatori
  FOR ALL
  USING (has_permission('gestione_staff_evento'::permission_type))
  WITH CHECK (has_permission('gestione_staff_evento'::permission_type));

-- event_tavoli_materiale
DROP POLICY IF EXISTS event_tavoli_materiale_write ON event_tavoli_materiale;
CREATE POLICY event_tavoli_materiale_write ON event_tavoli_materiale
  FOR ALL
  USING (has_permission('gestione_staff_evento'::permission_type))
  WITH CHECK (has_permission('gestione_staff_evento'::permission_type));

-- event_templates
DROP POLICY IF EXISTS templates_write ON event_templates;
CREATE POLICY templates_write ON event_templates
  FOR ALL
  USING (get_user_role() = 'admin'::user_role)
  WITH CHECK (get_user_role() = 'admin'::user_role);

-- event_trasporti
DROP POLICY IF EXISTS trasporti_write ON event_trasporti;
CREATE POLICY trasporti_write ON event_trasporti
  FOR ALL
  USING (has_permission('gestione_logistica'::permission_type) OR get_user_role() = 'admin'::user_role)
  WITH CHECK (has_permission('gestione_logistica'::permission_type) OR get_user_role() = 'admin'::user_role);

-- kit_contents
DROP POLICY IF EXISTS kit_contents_write ON kit_contents;
CREATE POLICY kit_contents_write ON kit_contents
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- magazzini
DROP POLICY IF EXISTS magazzini_write ON magazzini;
CREATE POLICY magazzini_write ON magazzini
  FOR ALL
  USING (has_permission('gestione_magazzino'::permission_type))
  WITH CHECK (has_permission('gestione_magazzino'::permission_type));

-- material_movements
DROP POLICY IF EXISTS movements_write ON material_movements;
CREATE POLICY movements_write ON material_movements
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]));

-- materials
DROP POLICY IF EXISTS materials_write ON materials;
CREATE POLICY materials_write ON materials
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]));

-- notification_preferences
DROP POLICY IF EXISTS notif_prefs_write ON notification_preferences;
CREATE POLICY notif_prefs_write ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- product_body_sections
DROP POLICY IF EXISTS product_body_sections_write_perm ON product_body_sections;
CREATE POLICY product_body_sections_write_perm ON product_body_sections
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- products
DROP POLICY IF EXISTS products_write_perm ON products;
CREATE POLICY products_write_perm ON products
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- sub_activity_types
DROP POLICY IF EXISTS sub_activity_types_write ON sub_activity_types;
CREATE POLICY sub_activity_types_write ON sub_activity_types
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]));

-- template_items
DROP POLICY IF EXISTS template_items_write ON template_items;
CREATE POLICY template_items_write ON template_items
  FOR ALL
  USING (get_user_role() = 'admin'::user_role)
  WITH CHECK (get_user_role() = 'admin'::user_role);

-- template_suggestions
DROP POLICY IF EXISTS suggestions_write ON template_suggestions;
CREATE POLICY suggestions_write ON template_suggestions
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]));

-- user_permissions
DROP POLICY IF EXISTS perms_write_perm ON user_permissions;
CREATE POLICY perms_write_perm ON user_permissions
  FOR ALL
  USING (has_permission('gestione_utenti'::permission_type))
  WITH CHECK (has_permission('gestione_utenti'::permission_type));

-- users
DROP POLICY IF EXISTS users_write_perm ON users;
CREATE POLICY users_write_perm ON users
  FOR ALL
  USING (has_permission('gestione_utenti'::permission_type))
  WITH CHECK (has_permission('gestione_utenti'::permission_type));

-- venues
DROP POLICY IF EXISTS venues_write ON venues;
CREATE POLICY venues_write ON venues
  FOR ALL
  USING (has_permission('gestione_sedi'::permission_type) OR has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_sedi'::permission_type) OR has_permission('gestione_catalogo'::permission_type));

-- zone_couriers
DROP POLICY IF EXISTS zone_couriers_write ON zone_couriers;
CREATE POLICY zone_couriers_write ON zone_couriers
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- zone_provinces
DROP POLICY IF EXISTS zone_provinces_write ON zone_provinces;
CREATE POLICY zone_provinces_write ON zone_provinces
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- zones
DROP POLICY IF EXISTS zones_write ON zones;
CREATE POLICY zones_write ON zones
  FOR ALL
  USING (has_permission('gestione_catalogo'::permission_type))
  WITH CHECK (has_permission('gestione_catalogo'::permission_type));

-- ============================================================
-- FOR UPDATE (w) policies — WITH CHECK for completeness
-- (PostgreSQL falls back to USING for updates, but explicit is better)
-- ============================================================

-- contacts (update)
DROP POLICY IF EXISTS contacts_update ON contacts;
CREATE POLICY contacts_update ON contacts
  FOR UPDATE
  USING (
    (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
    OR ((get_user_role() = 'area_manager'::user_role) AND has_permission('gestione_contatti'::permission_type))
    OR ((get_user_role() = 'commerciale'::user_role) AND (proprietario_id = auth.uid()))
  )
  WITH CHECK (
    (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role]))
    OR ((get_user_role() = 'area_manager'::user_role) AND has_permission('gestione_contatti'::permission_type))
    OR ((get_user_role() = 'commerciale'::user_role) AND (proprietario_id = auth.uid()))
  );

-- event_activities (update)
DROP POLICY IF EXISTS activities_update ON event_activities;
CREATE POLICY activities_update ON event_activities
  FOR UPDATE
  USING (
    (assegnato_a = auth.uid())
    OR ((permesso_responsabile IS NOT NULL) AND has_permission(permesso_responsabile))
    OR has_permission('gestione_utenti'::permission_type)
  )
  WITH CHECK (
    (assegnato_a = auth.uid())
    OR ((permesso_responsabile IS NOT NULL) AND has_permission(permesso_responsabile))
    OR has_permission('gestione_utenti'::permission_type)
  );

-- event_materials (update approva)
DROP POLICY IF EXISTS event_materials_update_approva ON event_materials;
CREATE POLICY event_materials_update_approva ON event_materials
  FOR UPDATE
  USING (has_permission('approva_materiale'::permission_type))
  WITH CHECK (has_permission('approva_materiale'::permission_type));

-- event_materials (update richiedi)
DROP POLICY IF EXISTS event_materials_update_richiedi ON event_materials;
CREATE POLICY event_materials_update_richiedi ON event_materials
  FOR UPDATE
  USING (
    has_permission('richiedi_materiale'::permission_type)
    AND (richiesto_da = auth.uid())
    AND ((stato)::text = 'richiesto'::text)
  )
  WITH CHECK (
    has_permission('richiedi_materiale'::permission_type)
    AND (richiesto_da = auth.uid())
    AND ((stato)::text = 'richiesto'::text)
  );

-- event_preventivi (update)
DROP POLICY IF EXISTS preventivi_update ON event_preventivi;
CREATE POLICY preventivi_update ON event_preventivi
  FOR UPDATE
  USING (
    has_permission('gestione_costi'::permission_type)
    OR has_permission('approva_preventivi'::permission_type)
    OR (get_user_role() = 'admin'::user_role)
  )
  WITH CHECK (
    has_permission('gestione_costi'::permission_type)
    OR has_permission('approva_preventivi'::permission_type)
    OR (get_user_role() = 'admin'::user_role)
  );

-- events (update)
DROP POLICY IF EXISTS events_update ON events;
CREATE POLICY events_update ON events
  FOR UPDATE
  USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role, 'area_manager'::user_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role, 'area_manager'::user_role]));

-- notifications (update)
DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
