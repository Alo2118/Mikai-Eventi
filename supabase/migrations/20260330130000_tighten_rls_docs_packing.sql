-- Tighten RLS on event_documents and packing_list_items
-- Both tables previously allowed all authenticated users full access.
-- Now: access is scoped to events the user can see (via events table RLS),
-- and write operations are restricted by role/permission.

-- ============================================================
-- 1. event_documents
-- ============================================================

-- SELECT: only docs for events the user can access
DROP POLICY IF EXISTS "event_documents_select" ON event_documents;
CREATE POLICY "event_documents_select" ON event_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_documents.event_id)
  );

-- INSERT: user must be able to see the event (delegates to events RLS)
-- and must be the uploader (unchanged from original)
DROP POLICY IF EXISTS "event_documents_insert" ON event_documents;
CREATE POLICY "event_documents_insert" ON event_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (SELECT 1 FROM events WHERE events.id = event_documents.event_id)
  );

-- DELETE: only the uploader, or admin/direzione/ufficio roles
DROP POLICY IF EXISTS "event_documents_delete" ON event_documents;
CREATE POLICY "event_documents_delete" ON event_documents
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR get_user_role() IN ('admin', 'direzione', 'ufficio')
  );

-- ============================================================
-- 2. packing_list_items
-- ============================================================

-- SELECT: only items for events the user can access
DROP POLICY IF EXISTS "packing_list_select" ON packing_list_items;
CREATE POLICY "packing_list_select" ON packing_list_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = packing_list_items.event_id)
  );

-- INSERT: warehouse or shipping permissions required
DROP POLICY IF EXISTS "packing_list_insert" ON packing_list_items;
CREATE POLICY "packing_list_insert" ON packing_list_items
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission('gestione_magazzino') OR has_permission('gestione_spedizioni')
  );

-- UPDATE: warehouse or shipping permissions required
DROP POLICY IF EXISTS "packing_list_update" ON packing_list_items;
CREATE POLICY "packing_list_update" ON packing_list_items
  FOR UPDATE TO authenticated
  USING (
    has_permission('gestione_magazzino') OR has_permission('gestione_spedizioni')
  )
  WITH CHECK (
    has_permission('gestione_magazzino') OR has_permission('gestione_spedizioni')
  );

-- DELETE: warehouse or shipping permissions required
DROP POLICY IF EXISTS "packing_list_delete" ON packing_list_items;
CREATE POLICY "packing_list_delete" ON packing_list_items
  FOR DELETE TO authenticated
  USING (
    has_permission('gestione_magazzino') OR has_permission('gestione_spedizioni')
  );
