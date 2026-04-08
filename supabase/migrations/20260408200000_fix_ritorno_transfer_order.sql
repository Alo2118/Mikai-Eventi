-- Fix transfer leg order for ritorno direction
-- For ritorno: the transfer happens AFTER the main transport (last leg)
-- The pickup migration incorrectly placed transfers as ordine=1

DO $$
DECLARE
  rec RECORD;
  max_ord INT;
  leg_count INT;
BEGIN
  FOR rec IN
    SELECT t1.* FROM event_trasporti t1
    WHERE t1.direzione = 'ritorno'
      AND t1.mezzo = 'transfer'
      AND t1.ordine = 1
  LOOP
    -- Count total legs for this person+ritorno
    SELECT COUNT(*), MAX(ordine) INTO leg_count, max_ord
    FROM event_trasporti
    WHERE event_id = rec.event_id
      AND direzione = 'ritorno'
      AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id);

    -- Only fix if there are multiple legs
    IF leg_count > 1 THEN
      -- Temporarily move transfer out of the way
      UPDATE event_trasporti SET ordine = max_ord + 1 WHERE id = rec.id;

      -- Shift all other legs down (2→1, 3→2, etc.)
      UPDATE event_trasporti
      SET ordine = ordine - 1
      WHERE event_id = rec.event_id
        AND direzione = 'ritorno'
        AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id)
        AND id != rec.id;

      -- Place transfer at the end
      UPDATE event_trasporti SET ordine = max_ord WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
