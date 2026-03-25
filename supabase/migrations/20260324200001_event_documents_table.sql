CREATE TABLE IF NOT EXISTS event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_documento tipo_documento NOT NULL DEFAULT 'altro',
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_documents_event_id ON event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_documents_uploaded_by ON event_documents(uploaded_by);

ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_documents_select" ON event_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_documents_insert" ON event_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "event_documents_delete" ON event_documents
  FOR DELETE TO authenticated USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.ruolo IN ('admin', 'direzione')
    )
  );
