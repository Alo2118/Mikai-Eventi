-- HARDENING SICUREZZA (#1 CRITICO) — Privilege escalation via self-signup
--
-- Il trigger handle_new_auth_user leggeva `ruolo` da raw_user_meta_data, campo
-- interamente controllato dal client in fase di auth.signUp({data:{ruolo:'admin'}}).
-- Con signup attivo e conferma email disattivata, chiunque possieda la anon key
-- (pubblica, nel bundle frontend) poteva registrarsi come admin e ottenere accesso
-- totale (inclusa compliance HCP/ToV).
--
-- Fix: il ruolo alla creazione è SEMPRE 'commerciale'. Un ruolo diverso può essere
-- assegnato solo dopo, tramite gestione utenti (create_app_user/RLS), che imposta
-- esplicitamente public.users.ruolo con le proprie guardie di autorizzazione.
-- NB: create_app_user continua a funzionare perché fa INSERT ... ON CONFLICT DO
-- UPDATE SET ruolo = p_ruolo sulla riga public.users dopo l'INSERT su auth.users.

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, nome, cognome, ruolo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '.', 1)),
    COALESCE(NEW.raw_user_meta_data->>'cognome', split_part(split_part(NEW.email, '.', 2), '@', 1)),
    -- SEMPRE commerciale: il ruolo dai metadata client è ignorato di proposito.
    'commerciale'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
