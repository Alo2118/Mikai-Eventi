import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MAX_UPLOAD_SIZE, ALLOWED_MIME_TYPES } from '../lib/constants'

export const useDocumentsStore = create((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchEventDocuments: async (eventId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_documents')
      .select('*, uploader:users!event_documents_uploaded_by_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    set({ documents: data || [], loading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  uploadDocument: async (eventId, file, tipoDocumento, note, userId) => {
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
      })
      .select('*, uploader:users!event_documents_uploaded_by_fkey(id, nome, cognome)')
      .single()

    if (!error) {
      set(s => ({ documents: [data, ...s.documents] }))
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
