-- Add colore column to event_tavoli for visual identification
-- Valid colors: yellow, green, black, blue (azzurro), red

ALTER TABLE event_tavoli ADD COLUMN IF NOT EXISTS colore TEXT;

ALTER TABLE event_tavoli ADD CONSTRAINT event_tavoli_colore_check
  CHECK (colore IS NULL OR colore IN ('yellow', 'green', 'black', 'blue', 'red'));
