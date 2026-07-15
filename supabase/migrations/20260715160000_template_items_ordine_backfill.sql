-- Rianima la colonna template_items.ordine per le checklist: fin qui era sempre 0
-- (mai valorizzata) e l'ordine era di fatto casuale. Backfill con un default sensato
-- (prima le attività più lontane dall'evento), poi il riordino manuale prende il via.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY template_id
           ORDER BY giorni_prima_evento ASC NULLS LAST, descrizione ASC
         ) - 1 AS rn
  FROM template_items
  WHERE tipo = 'checklist'
)
UPDATE template_items t
SET ordine = r.rn
FROM ranked r
WHERE t.id = r.id;
