-- Fix: add email_verified to raw_user_meta_data for all users missing it
-- GoTrue requires this field to authenticate users

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"email_verified": true}'::jsonb,
    updated_at = now()
WHERE raw_user_meta_data IS NOT NULL
  AND (raw_user_meta_data->>'email_verified') IS NULL;

-- Drop diagnostic function
DROP FUNCTION IF EXISTS debug_auth_user(text);
