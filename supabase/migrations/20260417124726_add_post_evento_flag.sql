-- Add post_evento flag to template_items and event_activities
-- Activities marked as post_evento are excluded from the "pronto" readiness gate
-- but verified when advancing to "concluso"

ALTER TABLE template_items ADD COLUMN IF NOT EXISTS post_evento boolean DEFAULT false;
ALTER TABLE event_activities ADD COLUMN IF NOT EXISTS post_evento boolean DEFAULT false;

-- Backfill: template items with giorni_prima_evento > 0 are post-evento
UPDATE template_items SET post_evento = true
WHERE tipo = 'checklist' AND giorni_prima_evento > 0;

-- Backfill: event_activities linked to post-evento template items
UPDATE event_activities ea SET post_evento = true
FROM template_items ti
WHERE ea.template_item_id = ti.id AND ti.post_evento = true;
