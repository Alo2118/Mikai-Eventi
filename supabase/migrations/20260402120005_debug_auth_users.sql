-- Temporary diagnostic function to inspect auth.users records
CREATE OR REPLACE FUNCTION debug_auth_user(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'aud', u.aud,
    'role', u.role,
    'pw_len', length(u.encrypted_password),
    'email_confirmed_at', u.email_confirmed_at,
    'confirmation_token_len', length(u.confirmation_token),
    'recovery_token_len', length(u.recovery_token),
    'is_sso_user', u.is_sso_user,
    'app_meta', u.raw_app_meta_data,
    'user_meta', u.raw_user_meta_data,
    'identities_count', (SELECT count(*) FROM auth.identities i WHERE i.user_id = u.id),
    'identity_data', (SELECT jsonb_agg(jsonb_build_object('provider', i.provider, 'provider_id', i.provider_id, 'data', i.identity_data)) FROM auth.identities i WHERE i.user_id = u.id)
  ) INTO result
  FROM auth.users u
  WHERE u.email = target_email;
  RETURN result;
END;
$$;
