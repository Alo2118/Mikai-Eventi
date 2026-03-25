-- Read: authenticated users
CREATE POLICY "event_docs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-documents');

-- Upload: authenticated users
CREATE POLICY "event_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-documents');

-- Delete: authenticated users can delete event documents
-- Ownership is enforced at the application level via the event_documents table
-- (uploaded_by check in the store). Storage policies only ensure authenticated access.
CREATE POLICY "event_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-documents');
