-- ============================================
-- RPC: create_app_user
-- Creates an auth user + public user in one call
-- SECURITY DEFINER: runs with elevated privileges
-- Only callable by admin/direzione/ufficio (checked inside)
-- ============================================

CREATE OR REPLACE FUNCTION create_app_user(
  p_email text,
  p_password text,
  p_nome text,
  p_cognome text,
  p_ruolo user_role DEFAULT 'commerciale'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  caller_role text;
BEGIN
  -- Permission check: only admin/direzione/ufficio can create users
  SELECT ruolo INTO caller_role FROM users WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'direzione', 'ufficio') THEN
    RAISE EXCEPTION 'Non hai i permessi per creare utenti';
  END IF;

  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email obbligatoria';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password deve essere almeno 6 caratteri';
  END IF;
  IF p_nome IS NULL OR p_nome = '' OR p_cognome IS NULL OR p_cognome = '' THEN
    RAISE EXCEPTION 'Nome e cognome obbligatori';
  END IF;

  new_user_id := gen_random_uuid();

  -- Create auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    lower(trim(p_email)),
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome, 'cognome', p_cognome),
    'authenticated',
    'authenticated'
  );

  -- Create auth identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', lower(trim(p_email))),
    'email',
    new_user_id::text,
    now(), now()
  );

  -- Create public user row
  INSERT INTO users (id, email, nome, cognome, ruolo)
  VALUES (new_user_id, lower(trim(p_email)), trim(p_nome), trim(p_cognome), p_ruolo)
  ON CONFLICT (id) DO UPDATE SET
    nome = trim(p_nome), cognome = trim(p_cognome), ruolo = p_ruolo;

  RETURN new_user_id;
END;
$$;
