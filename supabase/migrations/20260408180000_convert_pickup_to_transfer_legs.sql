-- Convert autista/orario_pickup data into separate transfer legs
-- For each transport record that has autista or orario_pickup set,
-- create a new transfer leg and clear the pickup fields from the original

DO $$
DECLARE
  rec RECORD;
  max_ordine INT;
BEGIN
  FOR rec IN
    SELECT * FROM event_trasporti
    WHERE (autista IS NOT NULL OR orario_pickup IS NOT NULL)
      AND mezzo IS NOT NULL
      AND mezzo != 'transfer'
      AND mezzo != 'indipendente'
  LOOP
    -- Find max ordine for this person+direction to append after
    SELECT COALESCE(MAX(ordine), 0) INTO max_ordine
    FROM event_trasporti
    WHERE event_id = rec.event_id
      AND direzione = rec.direzione
      AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id);

    -- Create transfer leg BEFORE the main leg (pickup happens first)
    -- Shift all existing legs ordine up by 1
    UPDATE event_trasporti
    SET ordine = ordine + 1
    WHERE event_id = rec.event_id
      AND direzione = rec.direzione
      AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id);

    -- Insert transfer as ordine=1 (pickup is always the first leg)
    INSERT INTO event_trasporti (
      event_id, user_id, contact_id, direzione, ordine, stato, mezzo,
      codice, orario, note
    ) VALUES (
      rec.event_id, rec.user_id, rec.contact_id, rec.direzione, 1, rec.stato, 'transfer',
      rec.autista, rec.orario_pickup, NULL
    );

    -- Clear pickup fields from original record
    UPDATE event_trasporti
    SET autista = NULL, orario_pickup = NULL
    WHERE id = rec.id;

    RAISE NOTICE 'Created transfer leg for record % (autista=%, pickup=%)',
      rec.id, rec.autista, rec.orario_pickup;
  END LOOP;
END $$;
