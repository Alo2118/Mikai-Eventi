-- Full fix for seed users: rebuild identities and ensure auth.users fields are correct
-- Target: users created by 20260401150000_seed_agenti_users.sql

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Find all seed users (created with Mikai2026! pattern, no proper sign-in history)
  FOR rec IN (
    SELECT au.id, au.email
    FROM auth.users au
    WHERE au.email LIKE '%@mikai.it'
      AND au.email != 'nicola@mikai.it'
      AND au.last_sign_in_at IS NULL
  ) LOOP
    -- Delete existing broken identity
    DELETE FROM auth.identities WHERE user_id = rec.id;

    -- Recreate identity properly
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      rec.id,
      rec.id::text,
      jsonb_build_object(
        'sub', rec.id::text,
        'email', rec.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(), now(), now()
    );

    -- Ensure auth.users has all required fields set
    UPDATE auth.users SET
      instance_id = '00000000-0000-0000-0000-000000000000',
      aud = 'authenticated',
      role = 'authenticated',
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      is_sso_user = false,
      updated_at = now()
    WHERE id = rec.id;

    RAISE NOTICE 'Fixed user: % (%)', rec.email, rec.id;
  END LOOP;
END $$;
