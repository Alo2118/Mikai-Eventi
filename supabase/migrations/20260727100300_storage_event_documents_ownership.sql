-- HARDENING STORAGE (#3 ALTO)
--
-- Le policy sul bucket privato `event-documents` consentivano a QUALSIASI utente
-- autenticato di leggere/scaricare e cancellare ogni file, anche di eventi di altre
-- zone/non suoi (ownership demandata solo all'app). Il bucket è condiviso tra:
--   - documenti evento:  path "{event_id}/..."           (tracciati in event_documents)
--   - foto danni:        path "damage/{event_id}/..."
--   - foto materiale:    path "agent-material/{material_id}/..."
--   - immagini prodotto: path "products/..."
-- Solo i documenti evento sono dati potenzialmente riservati e sono tracciati in
-- event_documents(file_path). Leghiamo lettura/cancellazione alla visibilità
-- dell'evento; gli altri file (non tracciati in event_documents) restano accessibili
-- agli autenticati per non rompere le foto operative.
--
-- Helper SECURITY DEFINER: bypassa la RLS di event_documents (altrimenti una riga
-- nascosta dalla RLS renderebbe "NOT EXISTS" vero → falso permesso), ma can_see_event
-- valuta comunque l'identità del chiamante (auth.uid()).

CREATE OR REPLACE FUNCTION public.can_access_event_document(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Non è un documento evento tracciato (foto materiale/prodotto/danni): consentito.
    WHEN NOT EXISTS (SELECT 1 FROM event_documents d WHERE d.file_path = p_name) THEN true
    -- È un documento evento: consentito solo se l'evento è visibile al chiamante.
    ELSE EXISTS (
      SELECT 1 FROM event_documents d
      WHERE d.file_path = p_name AND can_see_event(d.event_id)
    )
  END;
$$;
GRANT EXECUTE ON FUNCTION public.can_access_event_document(text) TO authenticated;

-- Rimuove le policy aperte (entrambe le versioni storiche) e ricrea quelle scoped.
DROP POLICY IF EXISTS "event_docs_read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "event_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

CREATE POLICY "event_docs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-documents' AND public.can_access_event_document(name));

CREATE POLICY "event_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-documents' AND public.can_access_event_document(name));

-- L'upload (INSERT) resta consentito agli autenticati: la riga event_documents viene
-- creata DOPO il caricamento del file, quindi un controllo per-evento qui bloccherebbe
-- ogni upload. Le policy di upload esistenti ("event_docs_upload" /
-- "Authenticated users can upload documents") restano invariate.
