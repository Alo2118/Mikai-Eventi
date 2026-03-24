-- Add structured hotel detail fields to event_hotel
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS nome_hotel text;
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS check_in date;
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS check_out date;
