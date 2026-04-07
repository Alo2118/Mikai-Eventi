-- ============================================
-- RPC: reset_user_password
-- Resets a user's password (admin only)
-- SECURITY DEFINER: runs with elevated privileges
-- Only callable by users with gestione_utenti permission
-- ============================================

CREATE OR REPLACE FUNCTION reset_user_password(
  target_user_id uuid,
  new_password text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  has_perm boolean;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  -- Permission check: caller must have gestione_utenti
  SELECT EXISTS(
    SELECT 1 FROM user_permissions
    WHERE user_id = caller_id AND permission = 'gestione_utenti'
  ) INTO has_perm;

  IF NOT has_perm THEN
    RAISE EXCEPTION 'Non hai i permessi per reimpostare le password';
  END IF;

  -- Validate password
  IF new_password IS NULL OR length(new_password) < 6 THEN
    RAISE EXCEPTION 'La password deve essere almeno 6 caratteri';
  END IF;

  -- Verify target user exists
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Utente non trovato';
  END IF;

  -- Update password
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;
