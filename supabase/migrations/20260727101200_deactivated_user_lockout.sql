-- Un utente disattivato (users.attivo = false) manteneva TUTTI i privilegi RLS
-- perché get_user_role()/has_permission() non consideravano `attivo`. Ora un utente
-- non attivo risulta senza ruolo (NULL → tutte le CASE per-ruolo cadono in ELSE
-- false) e senza permessi → accesso di fatto revocato, senza doverlo cancellare.
--
-- Includiamo esplicitamente SET search_path = public (coerenza con la regola di
-- progetto; l'ALTER FUNCTION storico viene comunque preservato).

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ruolo FROM users WHERE id = auth.uid() AND attivo
$$;

CREATE OR REPLACE FUNCTION has_permission(p permission_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE up.user_id = auth.uid()
      AND up.permission = p
      AND u.attivo
  )
$$;
