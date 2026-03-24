-- Add structured transport detail fields to event_trasporti
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS mezzo trasporto_mezzo;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS codice text;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS orario timestamptz;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS autista text;
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS orario_pickup timestamptz;
