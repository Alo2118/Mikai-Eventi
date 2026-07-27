-- Supporto alla restrizione di perms_read (20260727101000): la lettura diretta di
-- user_permissions per trovare i destinatari delle notifiche (es. useTavoli cerca chi
-- ha gestione_magazzino/approva_materiale) non funziona più per utenti senza
-- gestione_utenti. Esponiamo un RPC dedicato che ritorna SOLO gli id degli utenti
-- ATTIVI con uno dei permessi richiesti — quanto basta per il fan-out delle notifiche,
-- senza esporre l'intera mappa dei permessi.

CREATE OR REPLACE FUNCTION get_users_with_permissions(perms permission_type[])
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT up.user_id
  FROM user_permissions up
  JOIN users u ON u.id = up.user_id
  WHERE up.permission = ANY (perms)
    AND u.attivo;
$$;

GRANT EXECUTE ON FUNCTION get_users_with_permissions(permission_type[]) TO authenticated;
