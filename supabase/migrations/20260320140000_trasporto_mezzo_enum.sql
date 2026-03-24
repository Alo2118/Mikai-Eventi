-- New enum for transport mode
-- Separate migration: new enum values not visible in same transaction as references
-- Note: legacy mezzo_tipo enum exists from migration 20260315000005 (event_logistics_legacy). Do not reuse.
CREATE TYPE trasporto_mezzo AS ENUM ('treno', 'volo', 'auto', 'navetta', 'indipendente');
