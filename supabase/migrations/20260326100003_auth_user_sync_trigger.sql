-- Trigger: auto-create public.users when auth.users is created
-- This replaces the old create_app_user RPC approach

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
    COALESCE(NEW.raw_user_meta_data->>'ruolo', 'commerciale')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- RPC to confirm email (called by admin after signup)
CREATE OR REPLACE FUNCTION confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = user_id;
END;
$$;

-- Only create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
