import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MAX_UPLOAD_SIZE, ALLOWED_MIME_TYPES } from '../lib/constants'
import { nowISO } from '../lib/date-utils'

const DOC_SELECT = '*, uploader:users!event_documents_uploaded_by_fkey(id, nome, cognome), approvatore:users!event_documents_approvato_da_fkey(id, nome, cognome), activity:event_activities!event_documents_activity_id_fkey(id, descrizione, stato)'

export const useDocumentsStore = create((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchEventDocuments: async (eventId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_documents')
      .select(DOC_SELECT)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    set({ documents: data || [], loading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  uploadDocument: async (eventId, file, tipoDocumento, note, userId, activityId = null) => {
    if (file.size > MAX_UPLOAD_SIZE) {
      return { data: null, error: 'Il file supera il limite di 10 MB' }
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { data: null, error: 'Tipo di file non supportato. Formati ammessi: PDF, DOCX, XLSX, JPG, PNG' }
    }

    const path = `${eventId}/${crypto.randomUUID()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('event-documents')
      .upload(path, file)

    if (uploadError) return { data: null, error: uploadError.message }

    const { data, error } = await supabase
      .from('event_documents')
      .insert({
        event_id: eventId,
        nome: file.name,
        tipo_documento: tipoDocumento,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
        note: note || null,
        activity_id: activityId || null,
        stato: activityId ? 'da_approvare' : 'caricato',
      })
      .select(DOC_SELECT)
      .single()

    if (!error) {
      set(s => ({ documents: [data, ...s.documents] }))
    }
    return { data, error: error?.message || null }
  },

  approveDocument: async (id, userId) => {
    const { data, error } = await supabase
      .from('event_documents')
      .update({
        stato: 'approvato',
        approvato_da: userId,
        data_approvazione: nowISO(),
        nota_revisione: null,
        updated_at: nowISO(),
      })
      .eq('id', id)
      .select(DOC_SELECT)
      .single()

    if (!error && data) {
      set(s => ({ documents: s.documents.map(d => d.id === id ? data : d) }))
    }
    return { data, error: error?.message || null }
  },

  rejectDocument: async (id, userId, nota) => {
    const { data, error } = await supabase
      .from('event_documents')
      .update({
        stato: 'rifiutato',
        approvato_da: userId,
        data_approvazione: nowISO(),
        nota_revisione: nota || null,
        updated_at: nowISO(),
      })
      .eq('id', id)
      .select(DOC_SELECT)
      .single()

    if (!error && data) {
      set(s => ({ documents: s.documents.map(d => d.id === id ? data : d) }))
    }
    return { data, error: error?.message || null }
  },

  requestRevision: async (id, nota) => {
    const { data, error } = await supabase
      .from('event_documents')
      .update({
        stato: 'in_revisione',
        nota_revisione: nota || null,
        updated_at: nowISO(),
      })
      .eq('id', id)
      .select(DOC_SELECT)
      .single()

    if (!error && data) {
      set(s => ({ documents: s.documents.map(d => d.id === id ? data : d) }))
    }
    return { data, error: error?.message || null }
  },

  replaceDocumentFile: async (id, file, userId) => {
    if (file.size > MAX_UPLOAD_SIZE) {
      return { error: 'Il file supera il limite di 10 MB' }
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { error: 'Tipo di file non supportato. Formati ammessi: PDF, DOCX, XLSX, JPG, PNG' }
    }

    // Get current doc to find old file path and event_id
    const doc = get().documents.find(d => d.id === id)
    if (!doc) return { error: 'Documento non trovato' }

    // Upload new file
    const newPath = `${doc.event_id}/${crypto.randomUUID()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('event-documents')
      .upload(newPath, file)
    if (uploadError) return { error: uploadError.message }

    // Remove old file (best-effort)
    await supabase.storage.from('event-documents').remove([doc.file_path])

    // Update record: new file, reset to da_approvare
    const { data, error } = await supabase
      .from('event_documents')
      .update({
        nome: file.name,
        file_path: newPath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
        stato: 'da_approvare',
        approvato_da: null,
        data_approvazione: null,
        nota_revisione: null,
        updated_at: nowISO(),
      })
      .eq('id', id)
      .select(DOC_SELECT)
      .single()

    if (!error && data) {
      set(s => ({ documents: s.documents.map(d => d.id === id ? data : d) }))
    }
    return { data, error: error?.message || null }
  },

  deleteDocument: async (id, filePath) => {
    const { error: storageError } = await supabase.storage.from('event-documents').remove([filePath])
    if (storageError) return { error: storageError.message }
    const { error } = await supabase
      .from('event_documents')
      .delete()
      .eq('id', id)

    if (!error) {
      set(s => ({ documents: s.documents.filter(d => d.id !== id) }))
    }
    return { error: error?.message || null }
  },

  getSignedUrl: async (filePath) => {
    const { data, error } = await supabase.storage
      .from('event-documents')
      .createSignedUrl(filePath, 3600)
    return { data, error: error?.message || null }
  },
}))
