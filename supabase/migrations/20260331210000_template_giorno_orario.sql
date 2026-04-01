-- Replace orario_offset_minuti with giorno + orario for multi-day event support
-- giorno: 1 = first day, 2 = second day, etc.
-- orario: time of day (HH:MM)
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS giorno integer DEFAULT 1;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS orario time;
