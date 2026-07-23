-- Fix two RLS policy gaps found during security audit:
-- A1) event_documents_update was USING(true)/WITH CHECK(true) — any authenticated
--     user could approve documents and impersonate approvato_da.
-- A2) contacts_read was USING(true) — no zone-scoping, any authenticated user
--     could read the entire national rubrica.
--
-- Verified column/enum facts before writing this migration:
--   - event_documents.uploaded_by            -> 20260324200001_event_documents_table.sql:9
--                                                (NOT NULL, FK to auth.users, later repointed to
--                                                public.users by 20260401240000_fix_event_documents_fk.sql)
--                                                also used in 20260330130000_tighten_rls_docs_packing.sql
--   - contacts.proprietario_id uuid          -> 20260320100001_phase4_schema.sql:15
--   - contacts.zone_id uuid                  -> 20260320100001_phase4_schema.sql:16
--   - users.zone_id uuid                     -> 20260320100001_phase4_schema.sql:25
--   - permission_type enum has 'approva_preventivi' and 'gestione_contatti'
--                                                -> 20260320100000_phase4_enums.sql:10,7
--   - user_role enum = ('admin','direzione','ufficio','area_manager','commerciale')
--                                                -> 20260315000001_core.sql:2
--   - get_user_role() / has_permission(permission_type) -> 20260315000010_rls.sql:27-38
--
-- No later migration redefines event_documents_update or contacts_read, so these
-- are safe drop-and-replace fixes.

-- ============================================================
-- A1. event_documents_update: restrict to approvers or the uploader
-- The role bypass get_user_role() IN ('admin','direzione') mirrors the UI
-- (EventDocumentiTab/EventPreparazioneTab: canApprove = hasPermission('approva_preventivi')
--  || isAdminOrDirezione), so admin/direzione users without an explicit
-- approva_preventivi row in user_permissions are not locked out of approving.
-- ============================================================

DROP POLICY IF EXISTS "event_documents_update" ON event_documents;
CREATE POLICY "event_documents_update" ON event_documents
  FOR UPDATE TO authenticated
  USING (
    has_permission('approva_preventivi')
    OR get_user_role() IN ('admin', 'direzione')
    OR uploaded_by = auth.uid()
  )
  WITH CHECK (
    has_permission('approva_preventivi')
    OR get_user_role() IN ('admin', 'direzione')
    OR uploaded_by = auth.uid()
  );

-- ============================================================
-- A2. contacts_read: zone-scoped visibility
-- Back-office (admin/direzione/ufficio) and anyone with gestione_contatti
-- see everything. Everyone else (commerciale/area_manager) sees contacts
-- they own plus contacts in their own zone. Users without a zone still see
-- their own contacts (proprietario_id branch is independent of zone_id).
-- ============================================================

DROP POLICY IF EXISTS "contacts_read" ON contacts;
CREATE POLICY "contacts_read" ON contacts
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('admin', 'direzione', 'ufficio')
    OR has_permission('gestione_contatti')
    OR proprietario_id = auth.uid()
    OR (zone_id IS NOT NULL AND zone_id = (SELECT u.zone_id FROM users u WHERE u.id = auth.uid()))
  );
