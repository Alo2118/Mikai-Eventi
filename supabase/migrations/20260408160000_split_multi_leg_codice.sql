-- Split transport records that have multiple legs encoded in codice field
-- Pattern: "Reg 3908+Frecciarossa 9490+9728" → 3 separate leg records
-- Runs as superuser so bypasses RLS

DO $$
DECLARE
  rec RECORD;
  parts TEXT[];
  part TEXT;
  i INT;
  new_codice TEXT;
  new_mezzo trasporto_mezzo;
BEGIN
  -- Find all records with '+' in codice (multi-leg encoded as single record)
  FOR rec IN 
    SELECT * FROM event_trasporti 
    WHERE codice IS NOT NULL AND codice LIKE '%+%'
  LOOP
    -- Split by '+'
    parts := string_to_array(rec.codice, '+');
    
    -- Update first record to only contain the first part
    UPDATE event_trasporti 
    SET codice = trim(parts[1]),
        ordine = 1
    WHERE id = rec.id;
    
    -- Create additional records for parts 2, 3, etc.
    FOR i IN 2..array_length(parts, 1) LOOP
      part := trim(parts[i]);
      
      -- Try to detect mezzo from the part text
      new_mezzo := rec.mezzo; -- default: same as original
      new_codice := part;
      
      -- If part starts with a known mezzo name, extract it
      IF part ~* '^frecciarossa\s' OR part ~* '^frecciargento\s' OR part ~* '^frecciabianca\s' OR part ~* '^italo\s' OR part ~* '^reg\s' OR part ~* '^regionale\s' OR part ~* '^ic\s' OR part ~* '^intercity\s' THEN
        new_mezzo := 'treno';
      END IF;
      
      INSERT INTO event_trasporti (
        event_id, user_id, contact_id, direzione, ordine, stato, mezzo, codice, note
      ) VALUES (
        rec.event_id, rec.user_id, rec.contact_id, rec.direzione, i, rec.stato, new_mezzo, new_codice, NULL
      );
    END LOOP;
    
    RAISE NOTICE 'Split record % (%) into % legs', rec.id, rec.codice, array_length(parts, 1);
  END LOOP;
END $$;
