-- Add start time field to events (separate from date)
ALTER TABLE events ADD COLUMN IF NOT EXISTS ora_inizio time;
