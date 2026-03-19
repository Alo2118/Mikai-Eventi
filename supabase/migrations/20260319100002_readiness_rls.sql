-- Readiness Engine: RLS policies

-- Magazzini
ALTER TABLE magazzini ENABLE ROW LEVEL SECURITY;
CREATE POLICY "magazzini_read" ON magazzini FOR SELECT USING (true);
CREATE POLICY "magazzini_write" ON magazzini FOR ALL USING (
  has_permission('gestione_magazzino')
);

-- Event Activities
ALTER TABLE event_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_read" ON event_activities FOR SELECT USING (
  can_see_event(event_id)
);
CREATE POLICY "activities_insert" ON event_activities FOR INSERT WITH CHECK (
  can_see_event(event_id)
);
CREATE POLICY "activities_update" ON event_activities FOR UPDATE USING (
  assegnato_a = auth.uid() OR has_permission(permesso_responsabile)
);
CREATE POLICY "activities_delete" ON event_activities FOR DELETE USING (
  has_permission('gestione_utenti')
);
