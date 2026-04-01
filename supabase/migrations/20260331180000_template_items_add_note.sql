-- Add missing note column to template_items
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS note text;
