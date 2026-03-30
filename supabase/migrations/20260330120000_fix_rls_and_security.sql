-- Migration: 20260330120000_fix_rls_and_security.sql
-- Fixes:
--   1. Missing DELETE policy on event_materials
--   2. confirm_user_email RPC lacks permission check

-- =============================================================================
-- 1. Add missing DELETE policy on event_materials
-- =============================================================================
-- The table has INSERT and UPDATE policies but no DELETE policy.
-- This allows the requester or users with gestione_materiale permission to delete.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'event_materials'
      AND policyname = 'event_materials_delete'
  ) THEN
    CREATE POLICY "event_materials_delete" ON event_materials
      FOR DELETE TO authenticated
      USING (
        richiesto_da = auth.uid()
        OR has_permission('richiedi_materiale')
        OR has_permission('gestione_magazzino')
      );
  END IF;
END $$;

-- =============================================================================
-- 2. Fix confirm_user_email RPC — add permission check
-- =============================================================================
-- The previous version had no authorization check, allowing any authenticated
-- user to confirm any other user's email. Now restricted to admin/direzione/ufficio.

CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Permission check: only admin, direzione, or ufficio can confirm users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND ruolo IN ('admin', 'direzione', 'ufficio')
  ) THEN
    RAISE EXCEPTION 'Permesso negato: solo admin/direzione/ufficio possono confermare utenti';
  END IF;

  UPDATE auth.users SET
    email_confirmed_at = now(),
    confirmation_token = '',
    raw_app_meta_data = raw_app_meta_data || '{"email_verified": true}'::jsonb
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
