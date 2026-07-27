-- #7 (MEDIO) Privilege escalation tramite gestione utenti.
--
-- Chi ha il permesso `gestione_utenti` poteva: auto-promuoversi ad admin
-- (UPDATE users SET ruolo='admin' WHERE id = self), assegnare admin/direzione a
-- chiunque, e resettare la password di qualsiasi utente (incluso admin/direzione)
-- ottenendo un takeover. Applichiamo il principio del minimo privilegio a livello DB.

-- 1) Trigger che impedisce l'assegnazione di ruoli elevati e l'auto-modifica del
--    proprio ruolo. Solo un admin può creare/elevare a 'admin' o 'direzione'.
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role user_role;
BEGIN
  -- Operazioni senza contesto utente (es. seed/migrazioni via service role): nessun
  -- auth.uid() → non applichiamo il vincolo.
  IF v_caller IS NULL THEN
    RETURN NEW;
  END IF;

  v_caller_role := get_user_role();

  -- Un admin può fare tutto.
  IF v_caller_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Nessun non-admin può creare/elevare a ruoli apicali.
  IF NEW.ruolo IN ('admin', 'direzione')
     AND (TG_OP = 'INSERT' OR NEW.ruolo IS DISTINCT FROM OLD.ruolo) THEN
    RAISE EXCEPTION 'Solo un amministratore può assegnare il ruolo %', NEW.ruolo;
  END IF;

  -- Nessuno può cambiare il proprio ruolo (self-escalation).
  IF TG_OP = 'UPDATE' AND NEW.id = v_caller AND NEW.ruolo IS DISTINCT FROM OLD.ruolo THEN
    RAISE EXCEPTION 'Non puoi modificare il tuo ruolo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON users;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE INSERT OR UPDATE OF ruolo ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- 2) reset_user_password: non può reimpostare la password di admin/direzione se il
--    chiamante non è admin (evita il takeout di account apicali).
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
  v_target_role user_role;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM user_permissions
    WHERE user_id = caller_id AND permission = 'gestione_utenti'
  ) INTO has_perm;

  IF NOT has_perm THEN
    RAISE EXCEPTION 'Non hai i permessi per reimpostare le password';
  END IF;

  IF new_password IS NULL OR length(new_password) < 6 THEN
    RAISE EXCEPTION 'La password deve essere almeno 6 caratteri';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Utente non trovato';
  END IF;

  -- Guardia anti-takeover: solo un admin può resettare la password di admin/direzione.
  SELECT ruolo INTO v_target_role FROM public.users WHERE id = target_user_id;
  IF v_target_role IN ('admin', 'direzione') AND get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Solo un amministratore può reimpostare la password di un utente direzione/admin';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;
