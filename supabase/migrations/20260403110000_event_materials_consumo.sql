-- Add consumption tracking to event_materials
-- After an event, agents/office report how many items were actually used
-- Remaining items return to the agent's stock

ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS quantita_consumata integer;
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS consumo_registrato_da uuid REFERENCES users(id);
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS consumo_registrato_at timestamptz;
