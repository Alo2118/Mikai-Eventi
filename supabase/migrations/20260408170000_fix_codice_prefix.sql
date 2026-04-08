-- Fix split legs that lost their "Frecciarossa" prefix
-- Bare numbers like "9728", "9427", "9732" should be "Frecciarossa 9728" etc.
-- These were created by the split migration from records like "Frecciarossa 9490+9728"

UPDATE event_trasporti
SET codice = 'Frecciarossa ' || codice
WHERE mezzo = 'treno'
  AND codice ~ '^\d{4,5}$'
  AND ordine > 1;
