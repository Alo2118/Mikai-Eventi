import { useEffect, useState, useRef } from 'react'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useDocumentsStore } from '../../hooks/useDocuments'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ActivityCard } from './ActivityCard'
import { ActivityGateBar } from './ActivityGateBar'
import { Modal } from '../ui/Modal'
import { DocumentUploadModal } from './DocumentUploadModal'
import { CATEGORIA_ATTIVITA, CARD_STYLE, FORM_CONTAINER_STYLE, INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE } from '../../lib/constants'
import { CATEGORIA_ICONS, ACTION_ICONS } from '../../lib/icons'

function TrafficLight({ total, completed, overdue }) {
  let status = 'yellow'
  let label = 'In corso'
  if (overdue > 0) { status = 'red'; label = `${overdue} in ritardo` }
  else if (total > 0 && completed === total) { status = 'green'; label = 'Tutto completato' }

  const colors = {
    red: { bg: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-600' },
    yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-200', text: 'text-yellow-600' },
    green: { bg: 'bg-green-500', ring: 'ring-green-200', text: 'text-green-600' },
  }
  const c = colors[status]
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3.5 h-3.5 rounded-full ${c.bg} ring-2 ${c.ring}`} />
      <span className={`text-sm font-semibold ${c.text}`}>{label}</span>
    </div>
  )
}

export function EventPreparazioneTab({ event, onShowPackingList, onUpdate }) {
  const eventActivities = useActivitiesStore(s => s.eventActivities)
  const loading = useActivitiesStore(s => s.eventLoading)
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)
  const startActivity = useActivitiesStore(s => s.startActivity)
  const completeActivity = useActivitiesStore(s => s.completeActivity)
  const assignActivity = useActivitiesStore(s => s.assignActivity)
  const revertActivity = useActivitiesStore(s => s.revertActivity)
  const disableActivity = useActivitiesStore(s => s.disableActivity)
  const instantiateTemplate = useActivitiesStore(s => s.instantiateTemplate)
  const runAutoVerifications = useActivitiesStore(s => s.runAutoVerifications)
  const addCustomActivity = useActivitiesStore(s => s.addCustomActivity)

  const documents = useDocumentsStore(s => s.documents)
  const fetchEventDocuments = useDocumentsStore(s => s.fetchEventDocuments)
  const uploadDocument = useDocumentsStore(s => s.uploadDocument)
  const approveDocument = useDocumentsStore(s => s.approveDocument)
  const rejectDocument = useDocumentsStore(s => s.rejectDocument)
  const requestRevisionDoc = useDocumentsStore(s => s.requestRevision)
  const getSignedUrl = useDocumentsStore(s => s.getSignedUrl)

  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'lista'
  const [showAddForm, setShowAddForm] = useState(false)
  const [newActivity, setNewActivity] = useState({ descrizione: '', categoria: 'organizzazione', deadline: '', obbligatoria: true, tipo_verifica: 'manuale' })
  const [adding, setAdding] = useState(false)
  const [uploadForActivity, setUploadForActivity] = useState(null) // activity object to upload doc for
  const [pendingActivityFiles, setPendingActivityFiles] = useState(null) // { files, activity }
  const [docActionDialog, setDocActionDialog] = useState(null) // { type: 'approve'|'reject'|'revision', doc, nota }
  const [previewImage, setPreviewImage] = useState(null)
  const activityFileInputRef = useRef(null)

  const isAdminOrDirezione = profile && ['admin', 'direzione'].includes(profile.ruolo)
  const canApproveDoc = hasPermission('approva_preventivi') || isAdminOrDirezione

  // Activities are already fetched by EventiDetail for tab status dots.
  // Only run auto-verifications here, don't re-fetch.
  useEffect(() => {
    runAutoVerifications(event.id)
    fetchEventDocuments(event.id)
  }, [event.id])

  // Build activity→document map (most recent doc per activity)
  const docByActivity = {}
  for (const doc of documents) {
    if (doc.activity_id) {
      // Keep the most recent one per activity
      if (!docByActivity[doc.activity_id] || new Date(doc.created_at) > new Date(docByActivity[doc.activity_id].created_at)) {
        docByActivity[doc.activity_id] = doc
      }
    }
  }

  if (loading) return <LoadingSkeleton lines={5} />

  const visible = eventActivities.filter(a => a.stato !== 'disattivata')
  const now = new Date()
  const total = visible.length
  const completed = visible.filter(a => a.stato === 'completata').length
  const overdue = visible.filter(
    a => ['da_fare', 'in_corso'].includes(a.stato) && a.deadline && new Date(a.deadline) < now
  ).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  async function handleStart(activityId) {
    const { error } = await startActivity(activityId)
    if (error) {
      addToast('Impossibile avviare l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività avviata.', 'success')
      fetchEventActivities(event.id)
    }
  }

  async function handleComplete(activityId) {
    const { error } = await completeActivity(activityId, user?.id)
    if (error) {
      addToast('Impossibile completare l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività completata.', 'success')
      fetchEventActivities(event.id)
      runAutoVerifications(event.id)
    }
  }

  async function handleAssign(activityId, userId) {
    const { error } = await assignActivity(activityId, userId)
    if (error) {
      addToast('Impossibile assegnare l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività assegnata a te.', 'success')
      fetchEventActivities(event.id)
    }
  }

  async function handleRevert(activityId, currentStato) {
    const { error } = await revertActivity(activityId, currentStato)
    if (error) {
      addToast('Impossibile ripristinare lo stato. Riprova.', 'error')
    } else {
      addToast('Stato ripristinato.', 'success')
      fetchEventActivities(event.id)
    }
  }

  async function handleDisable(activityId) {
    const { error } = await disableActivity(activityId)
    if (error) {
      addToast('Impossibile rimuovere l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività rimossa.', 'success')
      fetchEventActivities(event.id)
    }
  }

  async function handleAddCustomActivity(e) {
    e.preventDefault()
    if (!newActivity.descrizione.trim()) return
    setAdding(true)
    const payload = {
      descrizione: newActivity.descrizione.trim(),
      categoria: newActivity.categoria,
      obbligatoria: newActivity.obbligatoria,
      tipo_verifica: newActivity.tipo_verifica,
      stato: 'da_fare',
    }
    if (newActivity.deadline) payload.deadline = newActivity.deadline
    const { error } = await addCustomActivity(event.id, payload)
    setAdding(false)
    if (error) {
      addToast('Impossibile aggiungere l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività aggiunta.', 'success')
      setNewActivity({ descrizione: '', categoria: 'organizzazione', deadline: '', obbligatoria: true, tipo_verifica: 'manuale' })
      setShowAddForm(false)
    }
  }

  async function handleInstantiateTemplate() {
    const { error } = await instantiateTemplate(
      event.id,
      event.tipo_evento,
      event.modalita,
      event.data_inizio
    )
    if (error) {
      addToast(error, 'warning')
    } else {
      addToast('Attività create dal template.', 'success')
    }
  }

  async function handleToggleDocumento(activityId, newTipoVerifica) {
    const updateActivity = useActivitiesStore.getState().updateActivity
    const { error } = await updateActivity(activityId, { tipo_verifica: newTipoVerifica })
    if (error) {
      addToast('Impossibile aggiornare l\'attività. Riprova.', 'error')
    } else {
      addToast(newTipoVerifica === 'documento' ? 'Attività richiede ora un documento.' : 'Requisito documento rimosso.', 'success')
      fetchEventActivities(event.id)
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
      const result = await requestRevisionDoc(doc.id, nota)
      error = result.error
    }

    if (error) {
      addToast(error, 'error')
    } else {
      const messages = { approve: 'Documento approvato', reject: 'Documento rifiutato', revision: 'Revisione richiesta' }
      addToast(messages[type], 'success')
      fetchEventDocuments(event.id)
      fetchEventActivities(event.id)
    }
    setDocActionDialog(null)
  }

  function handleUploadForActivity(activity) {
    setUploadForActivity(activity)
    // Trigger file picker
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
    const { error } = await uploadDocument(event.id, file, tipo, note, user.id, activityId)
    if (error) {
      addToast(error, 'error')
      return { error }
    }
    addToast('Documento caricato — in attesa di approvazione', 'success')
    return { error: null }
  }

  if (total === 0) {
    const canEdit = ['confermato', 'in_preparazione'].includes(event.stato)
    return (
      <div className="space-y-6">
        <EmptyState
          title="Nessuna attività"
          description="Non ci sono attività di preparazione per questo evento."
          action={
            canEdit ? (
              <div className="flex flex-col items-center gap-3">
                <Button variant="primary" onClick={handleInstantiateTemplate}>
                  Crea attività dal template
                </Button>
                <Button variant="secondary" onClick={() => setShowAddForm(true)}>
                  <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                  Aggiungi manualmente
                </Button>
              </div>
            ) : null
          }
        />
        {canEdit && showAddForm && (
          <form onSubmit={handleAddCustomActivity} className={FORM_CONTAINER_STYLE + ' space-y-4'}>
            <h3 className="font-semibold text-lg">Nuova attività</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione <span className="text-red-500">*</span>
              </label>
              <input
                className={INPUT_STYLE}
                value={newActivity.descrizione}
                onChange={e => setNewActivity(prev => ({ ...prev, descrizione: e.target.value }))}
                placeholder="Es. Prenotare sala conferenze"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  className={SELECT_STYLE}
                  value={newActivity.categoria}
                  onChange={e => setNewActivity(prev => ({ ...prev, categoria: e.target.value }))}
                >
                  {Object.entries(CATEGORIA_ATTIVITA).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
                <input
                  type="date"
                  className={INPUT_STYLE}
                  value={newActivity.deadline}
                  onChange={e => setNewActivity(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                    checked={newActivity.obbligatoria}
                    onChange={e => setNewActivity(prev => ({ ...prev, obbligatoria: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Obbligatoria</span>
                </label>
                <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                    checked={newActivity.tipo_verifica === 'documento'}
                    onChange={e => setNewActivity(prev => ({ ...prev, tipo_verifica: e.target.checked ? 'documento' : 'manuale' }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Richiede documento</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" size="sm" loading={adding} type="submit">
                Aggiungi
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} type="button">
                Annulla
              </Button>
            </div>
          </form>
        )}
      </div>
    )
  }

  const canEdit = ['confermato', 'in_preparazione'].includes(event.stato)

  // Group by category (for list view)
  const grouped = {}
  for (const act of visible) {
    const cat = act.categoria || 'organizzazione'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(act)
  }

  // Group by stato (for kanban view)
  const KANBAN_COLUMNS = [
    { id: 'da_fare', label: 'Da fare', color: 'border-gray-300', headerBg: 'bg-gray-50', headerText: 'text-gray-700' },
    { id: 'in_corso', label: 'In corso', color: 'border-mikai-300', headerBg: 'bg-mikai-50', headerText: 'text-mikai-700' },
    { id: 'completata', label: 'Completate', color: 'border-green-300', headerBg: 'bg-green-50', headerText: 'text-green-700' },
  ]
  const byStato = { da_fare: [], in_corso: [], completata: [] }
  for (const act of visible) {
    if (byStato[act.stato]) byStato[act.stato].push(act)
    else byStato.da_fare.push(act)
  }

  function renderActivityItem(activity) {
    return (
      <ActivityCard
        key={activity.id}
        activity={activity}
        onStart={handleStart}
        onComplete={handleComplete}
        onRevert={handleRevert}
        onAssign={handleAssign}
        onDisable={handleDisable}
        onUploadDocument={handleUploadForActivity}
        onToggleDocumento={canEdit ? handleToggleDocumento : null}
        onPreviewDoc={handlePreviewDoc}
        onApproveDoc={(doc) => setDocActionDialog({ type: 'approve', doc, nota: '' })}
        onRejectDoc={(doc) => setDocActionDialog({ type: 'reject', doc, nota: '' })}
        onRequestRevisionDoc={(doc) => setDocActionDialog({ type: 'revision', doc, nota: '' })}
        canApproveDoc={canApproveDoc}
        linkedDoc={docByActivity[activity.id] || null}
        currentUserId={user?.id}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {onShowPackingList && (
          <Button variant="secondary" size="sm" onClick={onShowPackingList}>
            <Icon icon={CATEGORIA_ICONS.materiale} size={16} className="mr-1" />
            Lista preparazione
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {['kanban', 'lista'].map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${
                viewMode === v ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v === 'kanban' ? 'Kanban' : 'Lista'}
            </button>
          ))}
        </div>
      </div>

      {/* Progress section */}
      <div className={CARD_STYLE + ' space-y-3'}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Avanzamento</p>
            <p className="text-lg font-bold text-gray-900">{completed} di {total} completate</p>
          </div>
          <TrafficLight total={total} completed={completed} overdue={overdue} />
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${overdue > 0 ? 'bg-red-500' : completed === total ? 'bg-green-500' : 'bg-mikai-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-right">{pct}%</p>
      </div>

      {/* Add custom activity */}
      {['confermato', 'in_preparazione'].includes(event.stato) && (
        <div>
          {!showAddForm ? (
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
              Aggiungi attività
            </Button>
          ) : (
            <form onSubmit={handleAddCustomActivity} className={FORM_CONTAINER_STYLE + ' space-y-4'}>
              <h3 className="font-semibold text-lg">Nuova attività</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione <span className="text-red-500">*</span>
                </label>
                <input
                  className={INPUT_STYLE}
                  value={newActivity.descrizione}
                  onChange={e => setNewActivity(prev => ({ ...prev, descrizione: e.target.value }))}
                  placeholder="Es. Prenotare sala conferenze"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    className={SELECT_STYLE}
                    value={newActivity.categoria}
                    onChange={e => setNewActivity(prev => ({ ...prev, categoria: e.target.value }))}
                  >
                    {Object.entries(CATEGORIA_ATTIVITA).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
                  <input
                    type="date"
                    className={INPUT_STYLE}
                    value={newActivity.deadline}
                    onChange={e => setNewActivity(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                      checked={newActivity.obbligatoria}
                      onChange={e => setNewActivity(prev => ({ ...prev, obbligatoria: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-gray-700">Obbligatoria</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="primary" size="sm" loading={adding} type="submit">
                  Aggiungi
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} type="button">
                  Annulla
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Gate bar */}
      <ActivityGateBar event={event} activities={visible} onUpdate={onUpdate} />

      {/* Select-all toggle (list view only) */}
      {/* ── KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_COLUMNS.map(col => {
            const acts = byStato[col.id] || []
            return (
              <div key={col.id} className={`rounded-xl border-2 ${col.color} overflow-hidden`}>
                <div className={`${col.headerBg} px-4 py-3 flex items-center justify-between`}>
                  <h3 className={`text-sm font-semibold ${col.headerText}`}>{col.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.headerBg} ${col.headerText}`}>
                    {acts.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 min-h-[100px]">
                  {acts.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-6">Nessuna</p>
                  ) : (
                    acts.map(activity => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        compact
                        onStart={handleStart}
                        onComplete={handleComplete}
                        onAssign={handleAssign}
                        onRevert={handleRevert}
                        onDisable={handleDisable}
                        onUploadDocument={handleUploadForActivity}
                        onToggleDocumento={canEdit ? handleToggleDocumento : null}
                        onPreviewDoc={handlePreviewDoc}
                        onApproveDoc={(doc) => setDocActionDialog({ type: 'approve', doc, nota: '' })}
                        onRejectDoc={(doc) => setDocActionDialog({ type: 'reject', doc, nota: '' })}
                        onRequestRevisionDoc={(doc) => setDocActionDialog({ type: 'revision', doc, nota: '' })}
                        canApproveDoc={canApproveDoc}
                        linkedDoc={docByActivity[activity.id] || null}
                        currentUserId={user?.id}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LIST VIEW (by category) ── */}
      {viewMode === 'lista' && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([categoria, acts]) => (
            <div key={categoria} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon icon={CATEGORIA_ICONS[categoria]} size={16} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  {CATEGORIA_ATTIVITA[categoria] || categoria}
                </h3>
                <span className="text-xs text-gray-400">
                  ({acts.filter(a => a.stato === 'completata').length}/{acts.length})
                </span>
              </div>
              <div className="space-y-2">
                {acts.map(activity => renderActivityItem(activity))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <Modal open onClose={() => setPreviewImage(null)} size="full" title={previewImage.name}>
          <div className="flex items-center justify-center">
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </Modal>
      )}

      {/* Document approval/reject/revision dialog */}
      {docActionDialog && (
        <Modal
          open
          onClose={() => setDocActionDialog(null)}
          size="sm"
          title={
            docActionDialog.type === 'approve' ? 'Approva documento'
              : docActionDialog.type === 'reject' ? 'Rifiuta documento'
                : 'Richiedi revisione'
          }
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDocActionDialog(null)}>Annulla</Button>
              <Button
                variant={docActionDialog.type === 'reject' ? 'danger' : 'primary'}
                onClick={handleDocApprovalAction}
              >
                {docActionDialog.type === 'approve' ? 'Approva'
                  : docActionDialog.type === 'reject' ? 'Rifiuta'
                    : 'Richiedi revisione'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-base text-gray-700">
              {docActionDialog.type === 'approve'
                ? `Confermi l'approvazione di "${docActionDialog.doc.nome}"?`
                : `Documento: "${docActionDialog.doc.nome}"`}
            </p>
            {docActionDialog.type !== 'approve' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={docActionDialog.nota}
                  onChange={e => setDocActionDialog(prev => ({ ...prev, nota: e.target.value }))}
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

      {/* Hidden file input for activity document upload */}
      <input
        ref={activityFileInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        onChange={handleActivityFilePicked}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Upload document for activity modal */}
      {pendingActivityFiles && (
        <DocumentUploadModal
          files={pendingActivityFiles.files}
          onClose={() => setPendingActivityFiles(null)}
          onUpload={handleActivityDocUpload}
          activityId={pendingActivityFiles.activity.id}
          activityLabel={pendingActivityFiles.activity.descrizione}
        />
      )}
    </div>
  )
}
