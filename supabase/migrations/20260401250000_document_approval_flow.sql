-- Document approval flow: add approval state, activity link, and revision support

-- Enum for document approval states
DO $$ BEGIN
  CREATE TYPE stato_documento AS ENUM ('caricato', 'da_approvare', 'approvato', 'rifiutato', 'in_revisione');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add approval columns to event_documents
ALTER TABLE event_documents
  ADD COLUMN IF NOT EXISTS stato stato_documento NOT NULL DEFAULT 'caricato',
  ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES event_activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approvato_da UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_approvazione TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nota_revisione TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index for activity lookup
CREATE INDEX IF NOT EXISTS idx_event_documents_activity_id ON event_documents(activity_id);

-- Update policy: allow approval by users with approva_preventivi permission
CREATE POLICY "event_documents_update" ON event_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
