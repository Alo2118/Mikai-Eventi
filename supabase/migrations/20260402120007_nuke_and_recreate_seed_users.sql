-- Deep diagnostic: dump ALL auth.users columns for broken vs working user
CREATE OR REPLACE FUNCTION debug_auth_full(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(u.*) INTO result
  FROM auth.users u
  WHERE u.email = target_email;
  -- Remove encrypted_password for safety
  result := result - 'encrypted_password';
  RETURN result;
END;
$$;
