-- Fix: for ritorno, transfer IS the first leg (company → station)
-- Previous migration wrongly moved it to last
-- Ritorno flow: Transfer (azienda→stazione) → Treno 1 → Treno 2 → casa

DO $$
DECLARE
  rec RECORD;
  min_ord INT;
  leg_count INT;
BEGIN
  FOR rec IN
    SELECT * FROM event_trasporti
    WHERE direzione = 'ritorno'
      AND mezzo = 'transfer'
  LOOP
    SELECT COUNT(*), MIN(ordine) INTO leg_count, min_ord
    FROM event_trasporti
    WHERE event_id = rec.event_id
      AND direzione = 'ritorno'
      AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id);

    -- Only fix if transfer is NOT already first and there are multiple legs
    IF leg_count > 1 AND rec.ordine != min_ord THEN
      -- Shift all legs up by 1 to make room at position 1
      UPDATE event_trasporti
      SET ordine = ordine + 1
      WHERE event_id = rec.event_id
        AND direzione = 'ritorno'
        AND COALESCE(user_id, contact_id) = COALESCE(rec.user_id, rec.contact_id)
        AND id != rec.id;
      -- Place transfer first
      UPDATE event_trasporti SET ordine = 1 WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
