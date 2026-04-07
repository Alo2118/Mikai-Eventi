import { useState, useEffect, useRef } from 'react'
import { useDocumentsStore } from '../../hooks/useDocuments'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { TIPO_DOCUMENTO, TEXTAREA_STYLE } from '../../lib/constants'
import { DOCUMENTO_ICONS } from '../../lib/icons'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { ChipFilter } from '../ui/ChipFilter'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { useToastStore } from '../ui/Toast'
import { DocumentCard } from './DocumentCard'
import { DocumentUploadModal } from './DocumentUploadModal'

export function EventDocumentiTab({ event, onShowPackingList }) {
  const documents = useDocumentsStore(s => s.documents)
  const loading = useDocumentsStore(s => s.loading)
  const fetchEventDocuments = useDocumentsStore(s => s.fetchEventDocuments)
  const uploadDocument = useDocumentsStore(s => s.uploadDocument)
  const deleteDocument = useDocumentsStore(s => s.deleteDocument)
  const getSignedUrl = useDocumentsStore(s => s.getSignedUrl)
  const approveDocument = useDocumentsStore(s => s.approveDocument)
  const rejectDocument = useDocumentsStore(s => s.rejectDocument)
  const requestRevision = useDocumentsStore(s => s.requestRevision)
  const replaceDocumentFile = useDocumentsStore(s => s.replaceDocumentFile)

  const completeActivity = useActivitiesStore(s => s.completeActivity)
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)

  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [filterTipo, setFilterTipo] = useState('')
  const [pendingFiles, setPendingFiles] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [actionDialog, setActionDialog] = useState(null) // { type: 'approve'|'reject'|'revision', doc, nota }
  const [replaceTarget, setReplaceTarget] = useState(null) // doc to replace
  const [replacing, setReplacing] = useState(false)

  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)

  useEffect(() => {
    if (event?.id) {
      fetchEventDocuments(event.id)
      fetchEventActivities(event.id)
    }
  }, [event?.id])

  const isAdminOrDirezione = profile && ['admin', 'direzione'].includes(profile.ruolo)
  const canApprove = hasPermission('approva_preventivi') || isAdminOrDirezione

  function canDelete(doc) {
    if (!user) return false
    if (doc.uploaded_by === user.id) return true
    return isAdminOrDirezione
  }

  function canReplace(doc) {
    if (!user) return false
    return doc.uploaded_by === user.id
  }

  function handleFilesSelected(fileList) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    setPendingFiles(files)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFilesSelected(e.dataTransfer.files)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click()
  }

  function handleDropZoneKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  async function handleUpload(file, tipo, note, activityId) {
    const { error } = await uploadDocument(event.id, file, tipo, note, user.id, activityId)
    if (error) {
      addToast(error, 'error')
      return { error }
    }
    addToast(activityId ? 'Documento caricato — in attesa di approvazione' : 'File caricato', 'success')
    return { error: null }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await deleteDocument(deleteTarget.id, deleteTarget.file_path)
    if (error) {
      addToast('Errore durante l\'eliminazione del file', 'error')
    } else {
      addToast('File eliminato', 'success')
    }
    setDeleteTarget(null)
  }

  async function handleApprovalAction() {
    if (!actionDialog) return
    const { type, doc, nota } = actionDialog
    let error

    if (type === 'approve') {
      const result = await approveDocument(doc.id, user.id)
      error = result.error
      // Auto-complete linked activity
      if (!error && doc.activity_id) {
        await completeActivity(doc.activity_id, user.id)
        await fetchEventActivities(event.id)
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
      const result = await requestRevision(doc.id, nota)
      error = result.error
    }

    if (error) {
      addToast(error, 'error')
    } else {
      const messages = {
        approve: 'Documento approvato',
        reject: 'Documento rifiutato',
        revision: 'Revisione richiesta',
      }
      addToast(messages[type], 'success')
    }
    setActionDialog(null)
  }

  async function handleReplaceFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !replaceTarget) return

    setReplacing(true)
    const { error } = await replaceDocumentFile(replaceTarget.id, file, user.id)
    setReplacing(false)

    if (error) {
      addToast(error, 'error')
    } else {
      addToast('Nuova versione caricata — in attesa di approvazione', 'success')
    }
    setReplaceTarget(null)
  }

  function triggerReplace(doc) {
    setReplaceTarget(doc)
    setTimeout(() => replaceInputRef.current?.click(), 100)
  }

  async function handlePreview(doc) {
    const { data, error } = await getSignedUrl(doc.file_path)
    if (error || !data?.signedUrl) {
      addToast('Impossibile generare il link di anteprima', 'error')
      return
    }
    if (doc.mime_type === 'image/jpeg' || doc.mime_type === 'image/png') {
      setPreviewImage({ url: data.signedUrl, name: doc.nome })
    } else if (doc.mime_type === 'application/pdf') {
      window.open(data.signedUrl, '_blank')
    } else {
      addToast('Anteprima non disponibile per questo formato, scaricamento in corso...', 'warning')
      triggerDownload(data.signedUrl, doc.nome)
    }
  }

  async function handleDownload(doc) {
    const { data, error } = await getSignedUrl(doc.file_path)
    if (error || !data?.signedUrl) {
      addToast('Impossibile generare il link di download', 'error')
      return
    }
    triggerDownload(data.signedUrl, doc.nome)
  }

  function triggerDownload(url, filename) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const chipOptions = [
    { id: '', label: 'Tutti' },
    ...Object.entries(TIPO_DOCUMENTO).map(([id, label]) => ({ id, label })),
  ]

  const filteredDocs = filterTipo
    ? documents.filter(d => d.tipo_documento === filterTipo)
    : documents

  if (loading) return <LoadingSkeleton lines={5} />

  return (
    <div className="space-y-6">
      {onShowPackingList && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onShowPackingList}>
            Lista preparazione
          </Button>
        </div>
      )}
      {/* Section heading */}
      <h3 className="font-semibold text-lg">Documenti</h3>

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleDropZoneClick}
        onKeyDown={handleDropZoneKeyDown}
        className={`
          border-2 border-dashed rounded-xl p-4 md:p-8 text-center cursor-pointer transition-colors
          focus:outline-none focus:ring-2 focus:ring-mikai-400 focus:ring-offset-2
          ${dragOver
            ? 'border-mikai-400 bg-mikai-50'
            : 'border-gray-300 hover:border-mikai-300 hover:bg-gray-50'}
        `}
      >
        <Icon icon={DOCUMENTO_ICONS.upload} size={32} className="mx-auto text-gray-400 mb-2" />
        <p className="text-base text-gray-600">
          Trascina i file qui oppure <span className="text-mikai-500 font-medium">clicca per selezionare</span>
        </p>
        <p className="text-sm text-gray-400 mt-1">
          PDF, DOCX, XLSX, JPG, PNG &mdash; max 10 MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
          onChange={e => {
            handleFilesSelected(e.target.files)
            e.target.value = ''
          }}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {/* Filter Chips */}
      {documents.length > 0 && (
        <ChipFilter options={chipOptions} value={filterTipo} onChange={setFilterTipo} />
      )}

      {/* Document List */}
      {filteredDocs.length === 0 && documents.length === 0 && (
        <EmptyState
          title="Nessun documento"
          description="Carica contratti, programmi, foto e altri documenti dell'evento."
        />
      )}

      {filteredDocs.length === 0 && documents.length > 0 && (
        <p className="text-center text-gray-500 py-8">Nessun documento di questo tipo.</p>
      )}

      <div className="space-y-3">
        {filteredDocs.map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            canDelete={canDelete(doc)}
            canApprove={canApprove}
            canReplace={canReplace(doc)}
            onPreview={() => handlePreview(doc)}
            onDownload={() => handleDownload(doc)}
            onDelete={() => setDeleteTarget(doc)}
            onApprove={() => setActionDialog({ type: 'approve', doc, nota: '' })}
            onReject={() => setActionDialog({ type: 'reject', doc, nota: '' })}
            onRequestRevision={() => setActionDialog({ type: 'revision', doc, nota: '' })}
            onReplace={() => triggerReplace(doc)}
          />
        ))}
      </div>

      {/* Upload Modal */}
      {pendingFiles && (
        <DocumentUploadModal
          files={pendingFiles}
          onClose={() => setPendingFiles(null)}
          onUpload={handleUpload}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina documento"
        message={`Eliminare "${deleteTarget?.nome}"? L'azione non può essere annullata.`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />

      {/* Approval/Reject/Revision Dialog */}
      {actionDialog && (
        <Modal
          open
          onClose={() => setActionDialog(null)}
          size="sm"
          title={
            actionDialog.type === 'approve' ? 'Approva documento'
              : actionDialog.type === 'reject' ? 'Rifiuta documento'
                : 'Richiedi revisione'
          }
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setActionDialog(null)}>
                Annulla
              </Button>
              <Button
                variant={actionDialog.type === 'reject' ? 'danger' : 'primary'}
                onClick={handleApprovalAction}
              >
                {actionDialog.type === 'approve' ? 'Approva'
                  : actionDialog.type === 'reject' ? 'Rifiuta'
                    : 'Richiedi revisione'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-base text-gray-700">
              {actionDialog.type === 'approve'
                ? `Confermi l'approvazione di "${actionDialog.doc.nome}"?`
                : `Documento: "${actionDialog.doc.nome}"`}
            </p>
            {actionDialog.doc.activity && (
              <p className="text-sm text-mikai-600">
                {actionDialog.type === 'approve'
                  ? `L'attività "${actionDialog.doc.activity.descrizione}" verrà completata automaticamente.`
                  : `Attività collegata: ${actionDialog.doc.activity.descrizione}`}
              </p>
            )}
            {actionDialog.type !== 'approve' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionDialog.nota}
                  onChange={e => setActionDialog(prev => ({ ...prev, nota: e.target.value }))}
                  placeholder="Motivo del rifiuto o indicazioni per la revisione..."
                  className={TEXTAREA_STYLE}
                  rows={3}
                  autoFocus
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Hidden file input for replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        onChange={handleReplaceFile}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <Modal
          open
          onClose={() => setPreviewImage(null)}
          size="full"
          title={previewImage.name}
        >
          <div className="flex items-center justify-center">
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
