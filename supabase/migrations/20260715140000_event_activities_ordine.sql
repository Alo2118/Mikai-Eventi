-- Ordine manuale delle attività dell'evento, per categoria.
ALTER TABLE event_activities ADD COLUMN IF NOT EXISTS ordine integer;

-- Backfill: per ogni (event_id, categoria) numera 0..n secondo l'ordine attuale
-- (deadline NULLS LAST, poi created_at) così nulla si sposta al primo caricamento.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY event_id, categoria
           ORDER BY deadline ASC NULLS LAST, created_at ASC
         ) - 1 AS rn
  FROM event_activities
)
UPDATE event_activities e
SET ordine = r.rn
FROM ranked r
WHERE e.id = r.id AND e.ordine IS NULL;

CREATE INDEX IF NOT EXISTS idx_activities_ordine
  ON event_activities(event_id, categoria, ordine);
