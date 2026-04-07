import { useState, useRef } from 'react'
import { useDocumentsStore } from '../../hooks/useDocuments'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'

export function usePreparazioneDocHandlers(eventId) {
  const documents = useDocumentsStore(s => s.documents)
  const fetchEventDocuments = useDocumentsStore(s => s.fetchEventDocuments)
  const uploadDocument = useDocumentsStore(s => s.uploadDocument)
  const approveDocument = useDocumentsStore(s => s.approveDocument)
  const rejectDocument = useDocumentsStore(s => s.rejectDocument)
  const requestRevisionDoc = useDocumentsStore(s => s.requestRevision)
  const getSignedUrl = useDocumentsStore(s => s.getSignedUrl)

  const completeActivity = useActivitiesStore(s => s.completeActivity)
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)

  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const [uploadForActivity, setUploadForActivity] = useState(null)
  const [pendingActivityFiles, setPendingActivityFiles] = useState(null)
  const [docActionDialog, setDocActionDialog] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const activityFileInputRef = useRef(null)

  // Build activity->document map (most recent doc per activity)
  const docByActivity = {}
  for (const doc of documents) {
    if (doc.activity_id) {
      if (!docByActivity[doc.activity_id] || new Date(doc.created_at) > new Date(docByActivity[doc.activity_id].created_at)) {
        docByActivity[doc.activity_id] = doc
      }
    }
  }

  async function handlePreviewDoc(doc) {
    const { data, error } = await getSignedUrl(doc.file_path)
    if (error || !data?.signedUrl) {
      addToast('Impossibile generare il link di anteprima', 'error')
      return
    }
    if (doc.mime_type === 'image/jpeg' || doc.mime_type === 'image/png') {
      setPreviewImage({ url: data.signedUrl, name: doc.nome })
    } else {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handleDocApprovalAction() {
    if (!docActionDialog) return
    const { type, doc, nota } = docActionDialog
    let error

    if (type === 'approve') {
      const result = await approveDocument(doc.id, user.id)
      error = result.error
      if (!error && doc.activity_id) {
        await completeActivity(doc.activity_id, user.id)
        await fetchEventActivities(eventId)
      }
    } else if (type === 'reject') {
      if (!nota?.trim()) {
        addToast('Inserisci una nota per il rifiuto', 'warning')
        return
      }
      const result = await rejectDocument(doc.id, user.id, nota)
      error = result.error
    } else if (type === 'revision') {
      if (!nota?.trim()) {
        addToast('Inserisci una nota per la revisione', 'warning')
        return
      }
      const result = await requestRevisionDoc(doc.id, nota)
      error = result.error
    }

    if (error) {
      addToast(error, 'error')
    } else {
      const messages = { approve: 'Documento approvato', reject: 'Documento rifiutato', revision: 'Revisione richiesta' }
      addToast(messages[type], 'success')
      fetchEventDocuments(eventId)
      fetchEventActivities(eventId)
    }
    setDocActionDialog(null)
  }

  function handleUploadForActivity(activity) {
    setUploadForActivity(activity)
    setTimeout(() => activityFileInputRef.current?.click(), 100)
  }

  function handleActivityFilePicked(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0 || !uploadForActivity) {
      setUploadForActivity(null)
      return
    }
    setPendingActivityFiles({ files, activity: uploadForActivity })
    setUploadForActivity(null)
  }

  async function handleActivityDocUpload(file, tipo, note, activityId) {
    const { error } = await uploadDocument(eventId, file, tipo, note, user.id, activityId)
    if (error) {
      addToast(error, 'error')
      return { error }
    }
    addToast('Documento caricato — in attesa di approvazione', 'success')
    return { error: null }
  }

  return {
    docByActivity,
    docActionDialog, setDocActionDialog,
    previewImage, setPreviewImage,
    pendingActivityFiles, setPendingActivityFiles,
    activityFileInputRef,
    handlePreviewDoc,
    handleDocApprovalAction,
    handleUploadForActivity,
    handleActivityFilePicked,
    handleActivityDocUpload,
  }
}
