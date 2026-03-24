-- Fix: sub_activities_write policy has USING but no WITH CHECK,
-- which blocks INSERT operations. Replace with proper policy.

DROP POLICY IF EXISTS sub_activities_write ON event_sub_activities;

CREATE POLICY sub_activities_write ON event_sub_activities
  FOR ALL
  USING (
    get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role, 'area_manager'::user_role])
  )
  WITH CHECK (
    get_user_role() = ANY (ARRAY['admin'::user_role, 'direzione'::user_role, 'ufficio'::user_role, 'area_manager'::user_role])
  );
