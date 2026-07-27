-- #6 (ALTO/MEDIO) staff_conflicts leak informativo cross-zona.
--
-- La RPC (SECURITY DEFINER) bypassa can_see_event di proposito per rilevare la doppia
-- prenotazione di una persona anche su eventi di altri manager (necessario). Ma così
-- ritornava il TITOLO di eventi che il chiamante non potrebbe vedere, permettendo a
-- qualsiasi autenticato di enumerare (titolo/date) l'agenda di chiunque passando
-- tutti gli user_id.
--
-- Fix che preserva la funzione: le DATE del conflitto restano (servono all'avviso di
-- doppia prenotazione cross-manager), ma il TITOLO è mascherato (NULL) quando
-- l'evento non è visibile al chiamante. Il frontend mostra "Evento" al posto del
-- titolo (useStaff.js: `r.titolo || 'Evento'`), quindi nessuna regressione UX.

CREATE OR REPLACE FUNCTION staff_conflicts(
  p_user_ids uuid[],
  p_win_start date,
  p_win_end date,
  p_exclude_event uuid
)
RETURNS TABLE (
  user_id uuid,
  event_id uuid,
  titolo text,
  data_inizio date,
  data_fine date,
  stato text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    es.user_id,
    e.id AS event_id,
    -- Titolo solo se l'evento è visibile al chiamante; altrimenti mascherato.
    CASE WHEN can_see_event(e.id) THEN e.titolo ELSE NULL END AS titolo,
    e.data_inizio,
    e.data_fine,
    e.stato::text AS stato
  FROM event_staff es
  JOIN events e ON e.id = es.event_id
  WHERE es.user_id = ANY (p_user_ids)
    AND (p_exclude_event IS NULL OR e.id <> p_exclude_event)
    AND e.stato::text NOT IN ('concluso', 'cancellato', 'rifiutato')
    AND (
      p_win_start IS NULL
      OR p_win_end IS NULL
      OR e.data_inizio IS NULL
      OR (p_win_start <= COALESCE(e.data_fine, e.data_inizio) AND e.data_inizio <= p_win_end)
    );
$$;

GRANT EXECUTE ON FUNCTION staff_conflicts(uuid[], date, date, uuid) TO authenticated;
