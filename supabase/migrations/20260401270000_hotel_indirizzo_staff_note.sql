-- Add indirizzo to hotel
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS indirizzo_hotel text;

-- Add note to staff
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS note text;
