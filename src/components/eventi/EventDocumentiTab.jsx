import { useState, useEffect, useRef } from 'react'
import { useDocumentsStore } from '../../hooks/useDocuments'
import { useAuthStore } from '../../hooks/useAuth'
import { TIPO_DOCUMENTO } from '../../lib/constants'
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

  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)

  const [filterTipo, setFilterTipo] = useState('')
  const [pendingFiles, setPendingFiles] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (event?.id) fetchEventDocuments(event.id)
  }, [event?.id])

  const isAdminOrDirezione = profile && ['admin', 'direzione'].includes(profile.ruolo)

  function canDelete(doc) {
    if (!user) return false
    if (doc.uploaded_by === user.id) return true
    return isAdminOrDirezione
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

  async function handleUpload(file, tipo, note) {
    const { error } = await uploadDocument(event.id, file, tipo, note, user.id)
    if (error) {
      addToast(error, 'error')
      return { error }
    }
    addToast('File caricato', 'success')
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
    <div className="space-y-5">
      {onShowPackingList && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onShowPackingList}>
            Lista preparazione
          </Button>
        </div>
      )}
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
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
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
            onPreview={() => handlePreview(doc)}
            onDownload={() => handleDownload(doc)}
            onDelete={() => setDeleteTarget(doc)}
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
