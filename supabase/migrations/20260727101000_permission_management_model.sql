-- Modello di gestione permessi coerente (chiude l'escalation residua su set_user_permissions).
--
-- Regole:
--  • Il chiamante deve avere gestione_utenti (o essere admin).
--  • I permessi SENSIBILI (gestione_utenti, compliance) li gestisce SOLO l'admin.
--    Per un chiamante non-admin questi permessi del target vengono PRESERVATI come
--    sono (né concessi né revocati), a prescindere dalla lista inviata → niente
--    auto-concessione di compliance/gestione_utenti.
--  • Un non-admin NON può modificare i PROPRI permessi (anti self-escalation).
--  • Un non-admin NON può modificare i permessi di utenti admin/direzione.

CREATE OR REPLACE FUNCTION set_user_permissions(
  target_user_id uuid,
  new_permissions permission_type[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role user_role;
  v_target_role user_role;
  v_is_admin boolean;
  v_final permission_type[];
  v_sensitive constant permission_type[] := ARRAY['gestione_utenti','compliance']::permission_type[];
BEGIN
  v_caller_role := get_user_role();
  v_is_admin := (v_caller_role = 'admin');

  IF NOT v_is_admin AND NOT has_permission('gestione_utenti'::permission_type) THEN
    RAISE EXCEPTION 'Permesso negato: gestione_utenti richiesto';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Utente non trovato';
  END IF;

  IF NOT v_is_admin THEN
    -- Anti self-escalation: non puoi toccare i tuoi permessi.
    IF target_user_id = auth.uid() THEN
      RAISE EXCEPTION 'Non puoi modificare i tuoi permessi';
    END IF;
    -- Non puoi gestire i permessi di utenti apicali.
    SELECT ruolo INTO v_target_role FROM users WHERE id = target_user_id;
    IF v_target_role IN ('admin', 'direzione') THEN
      RAISE EXCEPTION 'Solo un amministratore può gestire i permessi di utenti direzione/admin';
    END IF;
    -- I permessi sensibili non sono gestibili da non-admin: si preservano quelli
    -- attuali del target e si ignora qualunque sensibile presente nella lista.
    SELECT array(
      SELECT unnest(new_permissions)
      EXCEPT SELECT unnest(v_sensitive)
      UNION
      SELECT permission FROM user_permissions
      WHERE user_id = target_user_id AND permission = ANY (v_sensitive)
    ) INTO v_final;
  ELSE
    v_final := new_permissions;
  END IF;

  DELETE FROM user_permissions WHERE user_id = target_user_id;

  IF v_final IS NOT NULL AND array_length(v_final, 1) > 0 THEN
    INSERT INTO user_permissions (user_id, permission)
    SELECT target_user_id, unnest(v_final)
    ON CONFLICT (user_id, permission) DO NOTHING;
  END IF;
END;
$$;

-- perms_read: ognuno vede solo i PROPRI permessi; chi gestisce utenti (o admin) tutti.
-- Prima era USING(true): qualsiasi autenticato leggeva la mappa permessi di tutti.
DROP POLICY IF EXISTS "perms_read" ON user_permissions;
CREATE POLICY "perms_read" ON user_permissions FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR get_user_role() = 'admin'
    OR has_permission('gestione_utenti'::permission_type)
  );
