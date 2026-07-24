-- ============================================================
-- staff_conflicts — rileva la doppia prenotazione di una persona su eventi
-- sovrapposti, superando la RLS can_see_event.
--
-- Problema: fetchStaffConflicts leggeva event_staff filtrato dalla RLS, quindi un
-- area_manager NON vedeva i conflitti su eventi di altri manager → falsi negativi
-- nell'avviso di doppia prenotazione. La rilevazione conflitti deve essere
-- cross-manager per essere affidabile.
--
-- Soluzione: funzione SECURITY DEFINER (bypassa la RLS) che ritorna SOLO i campi
-- non sensibili (id/titolo/date/stato) necessari all'avviso — nessun dato riservato.
-- Replica la stessa logica di sovrapposizione date e di esclusione stati del client.
--
-- stato viene castato a text: l'enum evento_stato non contiene il valore 'rifiutato'
-- usato dal client, quindi il confronto diretto enum→'rifiutato' fallirebbe. Il cast
-- rende il NOT IN sicuro e allineato alla logica JS (confronto tra stringhe).
-- ============================================================

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
    e.titolo,
    e.data_inizio,
    e.data_fine,
    e.stato::text AS stato
  FROM event_staff es
  JOIN events e ON e.id = es.event_id
  WHERE es.user_id = ANY (p_user_ids)
    AND (p_exclude_event IS NULL OR e.id <> p_exclude_event)
    AND e.stato::text NOT IN ('concluso', 'cancellato', 'rifiutato')
    -- Sovrapposizione date: se manca un estremo (finestra o data evento) è
    -- conservativo e considera comunque il conflitto (come il client).
    -- rEnd = COALESCE(data_fine, data_inizio); rStart = data_inizio.
    AND (
      p_win_start IS NULL
      OR p_win_end IS NULL
      OR e.data_inizio IS NULL
      OR (p_win_start <= COALESCE(e.data_fine, e.data_inizio) AND e.data_inizio <= p_win_end)
    );
$$;

GRANT EXECUTE ON FUNCTION staff_conflicts(uuid[], date, date, uuid) TO authenticated;
