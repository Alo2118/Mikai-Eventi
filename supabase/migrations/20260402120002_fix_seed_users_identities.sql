-- Fix auth.identities for users created by 20260401150000_seed_agenti_users.sql
-- The seed migration used email as provider_id, but Supabase Auth expects user UUID.
-- Also ensure identity_data has all required fields.

UPDATE auth.identities
SET
  provider_id = user_id::text,
  identity_data = jsonb_build_object(
    'sub', user_id::text,
    'email', (SELECT email FROM auth.users WHERE auth.users.id = auth.identities.user_id),
    'email_verified', true,
    'phone_verified', false
  ),
  updated_at = now()
WHERE provider = 'email'
  AND provider_id NOT IN (SELECT id::text FROM auth.users)
  AND provider_id LIKE '%@mikai.it';
