-- Fix: uploaded_by should reference public.users (not auth.users) for PostgREST joins
ALTER TABLE event_documents
  DROP CONSTRAINT IF EXISTS event_documents_uploaded_by_fkey;

ALTER TABLE event_documents
  ADD CONSTRAINT event_documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;
