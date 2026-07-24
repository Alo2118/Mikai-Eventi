-- Costi trasferta: rende hotel e trasporti voci di costo del budget effettivo.
-- Aggiunge il campo `costo` (e alcuni dettagli prenotazione hotel) così che
-- l'ospitalità e i viaggi — voci pesanti per corsi e cadaver lab — entrino
-- nella ripartizione costi dell'evento (EventCostiTab).
-- Idempotente: usa ADD COLUMN IF NOT EXISTS. Nessuna modifica RLS: le nuove
-- colonne ereditano le policy esistenti di event_hotel / event_trasporti.

-- Hotel
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS costo numeric;
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS codice_prenotazione text;
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS numero_notti smallint;
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS tipo_camera text;

-- Trasporti
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS costo numeric;
