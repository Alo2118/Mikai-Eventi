-- Eliminazione definitiva evento + dipendenze
-- 1. Sistema le FK verso events che NON sono già ON DELETE CASCADE, così un
--    DELETE FROM events pulisce l'intero albero (le altre FK sono già CASCADE).
-- 2. Funzione delete_event_cascade(): guardia permessi/stato, raccoglie i path
--    Storage e cancella l'evento in un'unica transazione.

-- material_movements: preserva lo storico di magazzino scollegando l'evento
ALTER TABLE material_movements DROP CONSTRAINT IF EXISTS material_movements_event_id_fkey;
ALTER TABLE material_movements ADD CONSTRAINT material_movements_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

-- Self-reference: eliminare un evento NON deve trascinare figli/cloni
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_parent_event_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_parent_event_id_fkey
  FOREIGN KEY (parent_event_id) REFERENCES events(id) ON DELETE SET NULL;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_clonato_da_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_clonato_da_id_fkey
  FOREIGN KEY (clonato_da_id) REFERENCES events(id) ON DELETE SET NULL;

-- Funzione di eliminazione: ritorna i file_path Storage da purgare lato client.
CREATE OR REPLACE FUNCTION delete_event_cascade(p_event_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  user_role;
  v_stato evento_stato;
  v_paths text[];
BEGIN
  v_role := get_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'direzione') THEN
    RAISE EXCEPTION 'Permesso negato: solo admin o direzione possono eliminare un evento';
  END IF;

  SELECT stato INTO v_stato FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento non trovato';
  END IF;
  IF v_stato = 'concluso' THEN
    RAISE EXCEPTION 'Non è possibile eliminare un evento concluso';
  END IF;

  SELECT array_agg(file_path) INTO v_paths
  FROM event_documents
  WHERE event_id = p_event_id;

  DELETE FROM events WHERE id = p_event_id;

  RETURN COALESCE(v_paths, ARRAY[]::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_event_cascade(uuid) TO authenticated;
