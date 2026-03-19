-- Mikai Eventi — Row Level Security (Spec ref: Section 3, 12)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sub_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_suggestions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT ruolo FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_permission(p permission_type)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid() AND permission = p
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "users_read" ON users FOR SELECT USING (true);
CREATE POLICY "users_write" ON users FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "perms_read" ON user_permissions FOR SELECT USING (true);
CREATE POLICY "perms_write" ON user_permissions FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "contacts_read" ON contacts FOR SELECT USING (true);
CREATE POLICY "contacts_write" ON contacts FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'direzione', 'ufficio'));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "events_read" ON events FOR SELECT USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'direzione' THEN true
    WHEN 'ufficio' THEN true
    WHEN 'area_manager' THEN (
      manager_user_id = auth.uid()
      OR promotore_id = auth.uid()
    )
    WHEN 'commerciale' THEN (
      promotore_id = auth.uid()
      OR EXISTS (SELECT 1 FROM event_staff WHERE event_id = events.id AND user_id = auth.uid())
    )
    ELSE false
  END
);

CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (
  CASE get_user_role()
    WHEN 'commerciale' THEN promotore_id = auth.uid()
    WHEN 'area_manager' THEN promotore_id = auth.uid()
    ELSE get_user_role() IN ('admin', 'direzione', 'ufficio')
  END
);
CREATE POLICY "events_update" ON events FOR UPDATE USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio', 'area_manager')
);

CREATE OR REPLACE FUNCTION can_see_event(eid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e WHERE e.id = eid
    AND (
      CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'direzione' THEN true
        WHEN 'ufficio' THEN true
        WHEN 'area_manager' THEN (e.manager_user_id = auth.uid() OR e.promotore_id = auth.uid())
        WHEN 'commerciale' THEN (
          e.promotore_id = auth.uid()
          OR EXISTS (SELECT 1 FROM event_staff es WHERE es.event_id = e.id AND es.user_id = auth.uid())
        )
        ELSE false
      END
    )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "event_materials_read" ON event_materials FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "event_materials_write" ON event_materials FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "event_staff_read" ON event_staff FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "event_staff_write" ON event_staff FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "event_participants_read" ON event_participants FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "event_participants_write" ON event_participants FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR EXISTS (SELECT 1 FROM event_staff WHERE event_id = event_participants.event_id AND user_id = auth.uid())
);

CREATE POLICY "sub_activities_read" ON event_sub_activities FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "sub_activities_write" ON event_sub_activities FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "logistics_read" ON event_logistics FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "logistics_write" ON event_logistics FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "costs_read" ON event_costs FOR SELECT USING (has_permission('gestione_costi') AND can_see_event(event_id));
CREATE POLICY "costs_write" ON event_costs FOR ALL USING (has_permission('gestione_costi'));

CREATE POLICY "tasks_read" ON event_tasks FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "tasks_write" ON event_tasks FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR assegnato_a = auth.uid()
);

CREATE POLICY "activity_read" ON activity_log FOR SELECT USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (eseguito_da = auth.uid());

CREATE POLICY "documents_read" ON documents FOR SELECT USING (
  event_id IS NULL OR EXISTS (SELECT 1 FROM events WHERE id = documents.event_id)
);
CREATE POLICY "documents_write" ON documents FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "notifications_read" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notif_prefs_read" ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs_write" ON notification_preferences FOR ALL USING (user_id = auth.uid());

CREATE POLICY "materials_read" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_write" ON materials FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "movements_read" ON material_movements FOR SELECT USING (true);
CREATE POLICY "movements_write" ON material_movements FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "gadgets_read" ON gadgets FOR SELECT USING (true);
CREATE POLICY "gadgets_write" ON gadgets FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "event_gadgets_read" ON event_gadgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_gadgets.event_id)
);
CREATE POLICY "event_gadgets_write" ON event_gadgets FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "templates_read" ON event_templates FOR SELECT USING (true);
CREATE POLICY "templates_write" ON event_templates FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "template_items_read" ON template_items FOR SELECT USING (true);
CREATE POLICY "template_items_write" ON template_items FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "thresholds_read" ON approval_thresholds FOR SELECT USING (true);
CREATE POLICY "thresholds_write" ON approval_thresholds FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "suggestions_read" ON template_suggestions FOR SELECT USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
CREATE POLICY "suggestions_write" ON template_suggestions FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
