-- confirm_user_email non aveva alcuna guardia interna: dipendeva solo dai GRANT.
-- La riserviamo ai ruoli che gestiscono utenti (admin/direzione/ufficio), coerente
-- con create_app_user. Impedisce a un utente qualsiasi di confermare email arbitrarie.

CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() NOT IN ('admin', 'direzione', 'ufficio') THEN
    RAISE EXCEPTION 'Non hai i permessi per confermare gli account utente';
  END IF;

  UPDATE auth.users SET email_confirmed_at = now() WHERE id = user_id;
END;
$$;
