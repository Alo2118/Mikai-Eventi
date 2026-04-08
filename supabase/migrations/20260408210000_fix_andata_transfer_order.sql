-- Fix transfer order for andata direction too
-- Transfer is always the LAST leg (last mile to venue/company)
-- Not the first as the pickup migration assumed

DO $$
DECLARE
  rec RECORD;
  max_ord INT;
  leg_count INT;
BEGIN
  FOR rec IN
    SELECT * FROM event_trasporti
    WHERE direzione = 'andata'
      AND mezzo = 'transfer'
      AND ordine = 1
  LOOP
    SELECT COUNT(*), MAX(ordine) INTO leg_count, max_ord
    FROM event_trasporti
    WHERE event_id = rec.event_id
      AND direzione = 'andata'
      AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id);

    IF leg_count > 1 THEN
      -- Move transfer out of the way
      UPDATE event_trasporti SET ordine = max_ord + 1 WHERE id = rec.id;
      -- Shift others down
      UPDATE event_trasporti
      SET ordine = ordine - 1
      WHERE event_id = rec.event_id
        AND direzione = 'andata'
        AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id)
        AND id != rec.id;
      -- Place transfer last
      UPDATE event_trasporti SET ordine = max_ord WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
