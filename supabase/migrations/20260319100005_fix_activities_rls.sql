-- Fix: activities_update policy must handle NULL permesso_responsabile
DROP POLICY IF EXISTS "activities_update" ON event_activities;
CREATE POLICY "activities_update" ON event_activities FOR UPDATE USING (
  assegnato_a = auth.uid()
  OR (permesso_responsabile IS NOT NULL AND has_permission(permesso_responsabile))
  OR has_permission('gestione_utenti')
);
