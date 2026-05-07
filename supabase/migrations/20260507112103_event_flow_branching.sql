-- Event flow branching: per-event-type fase opt-out + per-item rientro override.
--
-- Why:
--   Eventi aziendali interni (formazione, demo prodotto, riunioni commerciali)
--   non richiedono spedizione/rientro materiale né hotel/trasporti dipendenti.
--   Inoltre alcuni materiali (depliant, gadget) sono consumabili anche su
--   eventi esterni e non rientrano mai. Oggi il gate "in_corso → concluso"
--   blocca questi eventi perché si aspetta sempre rientri.
--
-- This migration introduces two indipendent axes:
--   1) event_types.richiede_{spedizione,hotel,trasporti}: spegne intere fasi
--   2) event_materials.rientro_richiesto: override per singolo item, NULL = usa
--      default da products.serializzato
--
-- Defaults are 'true' to preserve current behavior for all existing types and items.

-- 1. Per-event-type fase opt-out flags
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS richiede_spedizione boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS richiede_hotel       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS richiede_trasporti   boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN event_types.richiede_spedizione IS
  'false = eventi di questo tipo non prevedono spedizione/rientro materiale (es. eventi interni)';
COMMENT ON COLUMN event_types.richiede_hotel IS
  'false = nascondi sezione hotel e relativi alert dal tab Persone';
COMMENT ON COLUMN event_types.richiede_trasporti IS
  'false = nascondi sezione trasporti e relativi alert dal tab Persone';

-- 2. Per-item rientro override (NULL = use catalog default from products.serializzato)
ALTER TABLE event_materials
  ADD COLUMN IF NOT EXISTS rientro_richiesto boolean;

COMMENT ON COLUMN event_materials.rientro_richiesto IS
  'NULL = eredita default catalogo (products.serializzato); true/false = override esplicito per questo item nell''evento';
