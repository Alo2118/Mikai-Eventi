-- One-time fix: reset preparation activities stuck in 'completata' or 'disattivata'
-- for events currently in preparation phase where materials still need prep

UPDATE event_activities a
SET stato = 'da_fare',
    completata_il = NULL,
    completata_da = NULL,
    note = 'Riattivata dopo consolidamento attività'
FROM events e
WHERE a.event_id = e.id
  AND a.verifica_automatica = 'materiale_tutto_preparato'
  AND a.stato IN ('completata', 'disattivata')
  AND e.stato IN ('confermato', 'in_preparazione')
  AND EXISTS (
    SELECT 1 FROM event_materials m
    WHERE m.event_id = e.id
      AND m.stato = 'approvato'
  );
