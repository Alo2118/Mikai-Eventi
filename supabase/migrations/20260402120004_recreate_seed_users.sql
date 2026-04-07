-- Fix seed users in-place (no delete, preserves FKs)
-- Re-encrypt password and rebuild identities to match create_app_user pattern

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT au.id, au.email
    FROM auth.users au
    JOIN public.users pu ON pu.id = au.id
    WHERE au.email LIKE '%@mikai.it'
      AND au.email != 'nicola@mikai.it'
  ) LOOP
    -- Re-set password (forces re-encryption)
    UPDATE auth.users SET
      encrypted_password = crypt('Mikai2026!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_token = '',
      recovery_token = '',
      aud = 'authenticated',
      role = 'authenticated',
      is_sso_user = false,
      updated_at = now()
    WHERE id = rec.id;

    -- Rebuild identity: delete and recreate matching create_app_user pattern
    DELETE FROM auth.identities WHERE user_id = rec.id;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      rec.id,
      jsonb_build_object('sub', rec.id::text, 'email', rec.email),
      'email',
      rec.id::text,
      now(), now()
    );

    RAISE NOTICE 'Fixed: % (%)', rec.email, rec.id;
  END LOOP;
END $$;
