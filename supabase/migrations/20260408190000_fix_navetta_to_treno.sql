-- Fix records with train codes that are incorrectly registered as navetta
-- If codice contains Frecciarossa/Frecciargento/Reg/IC/Italo, mezzo should be 'treno'

UPDATE event_trasporti
SET mezzo = 'treno'
WHERE mezzo != 'treno'
  AND codice IS NOT NULL
  AND (
    codice ~* '^frecciarossa'
    OR codice ~* '^frecciargento'
    OR codice ~* '^frecciabianca'
    OR codice ~* '^italo'
    OR codice ~* '^reg\s'
    OR codice ~* '^regionale'
    OR codice ~* '^ic\s'
    OR codice ~* '^intercity'
  );
