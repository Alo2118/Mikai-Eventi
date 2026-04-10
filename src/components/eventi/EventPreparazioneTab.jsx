import { useEffect, useState } from 'react'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useDocumentsStore } from '../../hooks/useDocuments'
import { useAuthStore } from '../../hooks/useAuth'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { Modal } from '../ui/Modal'
import { DocumentUploadModal } from './DocumentUploadModal'
import { ActivityEditModal } from './ActivityEditModal'
import { DocApprovalDialog } from './DocApprovalDialog'
import { CATEGORIA_ICONS, ACTION_ICONS, DOCUMENTO_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { PreparazioneAddActivityForm } from './PreparazioneAddActivityForm'
import { PreparazioneKanbanView, PreparazioneListView } from './PreparazioneActivityViews'
import { usePreparazioneDocHandlers } from './usePreparazioneDocHandlers'
import { todayISO, calculateDeadline } from '../../lib/date-utils'
import { CATEGORIA_ATTIVITA, PERMESSO_SHORT_LABELS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'


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
  const updateActivity = useActivitiesStore(s => s.updateActivity)

  const fetchEventDocuments = useDocumentsStore(s => s.fetchEventDocuments)

  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const eventStaff = useStaffStore(s => s.staff)
  const participants = useParticipantsStore(s => s.participants)
  const eventMaterials = useMaterialsStore(s => s.eventMaterials)
  const addToast = useToastStore(s => s.add)

  // A. Default to list on mobile, kanban on desktop
  const [viewMode, setViewMode] = useState(() =>
    window.innerWidth < 768 ? 'lista' : 'kanban'
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [newActivity, setNewActivity] = useState({ descrizione: '', categoria: 'organizzazione', deadline: '', obbligatoria: true, tipo_verifica: 'manuale' })
  const [adding, setAdding] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // B. Template preview
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [templatePreviewItems, setTemplatePreviewItems] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  const isAdminOrDirezione = profile && ['admin', 'direzione'].includes(profile.ruolo)
  const canApproveDoc = hasPermission('approva_preventivi') || isAdminOrDirezione

  const {
    docByActivity, docActionDialog, setDocActionDialog,
    previewImage, setPreviewImage,
    pendingActivityFiles, setPendingActivityFiles,
    activityFileInputRef,
    handlePreviewDoc, handleDocApprovalAction,
    handleUploadForActivity, handleActivityFilePicked, handleActivityDocUpload,
  } = usePreparazioneDocHandlers(event.id)

  // Activities are already fetched by EventiDetail for tab status dots.
  // Only run auto-verifications here, don't re-fetch.
  useEffect(() => {
    runAutoVerifications(event.id)
    fetchEventDocuments(event.id)
  }, [event.id])

  if (loading) return <LoadingSkeleton lines={5} />

  const visible = eventActivities.filter(a => a.stato !== 'disattivata')
  const today = todayISO()
  const total = visible.length
  const completed = visible.filter(a => a.stato === 'completata').length
  const overdue = visible.filter(
    a => ['da_fare', 'in_corso'].includes(a.stato) && a.deadline && a.deadline < today
  ).length
  // pct moved to ActivityProgressSection

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
      const msg = userId === user?.id ? 'Attività assegnata a te.' : 'Attività assegnata.'
      addToast(msg, 'success')
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

  async function handleEditActivity(activityId, updates) {
    setSavingEdit(true)
    const { error } = await updateActivity(activityId, updates)
    setSavingEdit(false)
    if (error) {
      addToast('Impossibile salvare le modifiche. Riprova.', 'error')
    } else {
      addToast('Attività aggiornata.', 'success')
      setEditingActivity(null)
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

  // B. Load template preview data
  async function handlePreviewTemplate() {
    setLoadingPreview(true)
    // Fetch template items to show preview before applying
    const { data: templates } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', event.tipo_evento)
      .eq('modalita', event.modalita)
      .limit(1)
    if (!templates?.length) {
      addToast(`Nessun template per ${event.tipo_evento} ${event.modalita}. Crealo in Amministrazione → Template.`, 'warning')
      setLoadingPreview(false)
      return
    }
    const { data: items } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templates[0].id)
      .eq('tipo', 'checklist')
      .order('ordine')
    if (!items?.length) {
      addToast('Template vuoto.', 'warning')
      setLoadingPreview(false)
      return
    }
    // Compute deadlines for preview
    const eventDate = new Date(event.data_inizio)
    const previewItems = items.map(item => ({
      descrizione: item.descrizione,
      categoria: item.categoria,
      permesso_responsabile: item.permesso_responsabile,
      obbligatorio: item.obbligatorio,
      giorni_prima_evento: item.giorni_prima_evento,
      tipo_verifica: item.tipo_verifica || 'manuale',
      deadline: calculateDeadline(eventDate, item.giorni_prima_evento),
    }))
    setTemplatePreviewItems(previewItems)
    setShowTemplatePreview(true)
    setLoadingPreview(false)
  }

  async function handleConfirmTemplate() {
    setShowTemplatePreview(false)
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
                <Button variant="primary" onClick={handlePreviewTemplate} loading={loadingPreview}>
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
          <PreparazioneAddActivityForm
            newActivity={newActivity}
            setNewActivity={setNewActivity}
            adding={adding}
            onSubmit={handleAddCustomActivity}
            onCancel={() => setShowAddForm(false)}
            showDocumentoToggle
          />
        )}
        <TemplatePreviewModal
          open={showTemplatePreview}
          items={templatePreviewItems}
          onClose={() => setShowTemplatePreview(false)}
          onConfirm={handleConfirmTemplate}
        />
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

  const cardPropsContext = {
    canEdit, onEditActivity: setEditingActivity,
    onStart: handleStart, onComplete: handleComplete, onRevert: handleRevert,
    onAssign: handleAssign, onDisable: handleDisable,
    onUploadDocument: handleUploadForActivity,
    onToggleDocumento: handleToggleDocumento,
    onPreviewDoc: handlePreviewDoc,
    onDocAction: (type, doc) => setDocActionDialog({ type, doc, nota: '' }),
    canApproveDoc, docByActivity, currentUserId: user?.id, eventStaff,
  }

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const barColor = overdue > 0 ? 'bg-red-500' : completed === total ? 'bg-green-500' : 'bg-mikai-400'
  const statusText = overdue > 0 ? `${overdue} in ritardo` : completed === total ? 'Tutto completato' : 'In corso'
  const statusColor = overdue > 0 ? 'text-red-600' : completed === total ? 'text-green-600' : 'text-yellow-600'

  return (
    <div className="space-y-4">
      {/* Header: packing list + progress + view toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {onShowPackingList && (
            <Button variant="secondary" size="sm" onClick={onShowPackingList}>
              <Icon icon={CATEGORIA_ICONS.materiale} size={16} className="mr-1" />
              Lista preparazione
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {canEdit && !showAddForm && (
              <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                Aggiungi
              </Button>
            )}
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
        {/* Inline progress bar */}
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-900 shrink-0">{completed}/{total}</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`font-medium shrink-0 ${statusColor}`}>{statusText}</span>
        </div>
      </div>

      {/* Add custom activity — form only (button moved to header) */}
      {canEdit && showAddForm && (
        <PreparazioneAddActivityForm
          newActivity={newActivity}
          setNewActivity={setNewActivity}
          adding={adding}
          onSubmit={handleAddCustomActivity}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Gate — mandatory activity blocker only (advance is in StatusFlow) */}
      {visible.filter(a => a.obbligatoria && a.stato !== 'completata' && a.stato !== 'disattivata').length > 0 && (
        <div className="bg-mikai-50 border border-mikai-200 rounded-xl px-3 py-1.5">
          <div className="flex items-center gap-2 min-h-[32px]">
            <Icon icon={FEEDBACK_ICONS.warning} size={14} className="text-yellow-500 shrink-0" />
            <span className="text-xs font-medium text-mikai-700">
              {visible.filter(a => a.obbligatoria && a.stato !== 'completata' && a.stato !== 'disattivata').length} attività obbligatorie da completare prima di avanzare
            </span>
          </div>
        </div>
      )}

      {viewMode === 'kanban' && (
        <PreparazioneKanbanView visible={visible} cardPropsContext={cardPropsContext} />
      )}

      {viewMode === 'lista' && (
        <PreparazioneListView grouped={grouped} cardPropsContext={cardPropsContext} />
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
      <DocApprovalDialog
        dialog={docActionDialog}
        onChange={setDocActionDialog}
        onAction={handleDocApprovalAction}
        onClose={() => setDocActionDialog(null)}
      />

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

      <ActivityEditModal
        open={!!editingActivity}
        activity={editingActivity}
        onSave={handleEditActivity}
        onClose={() => setEditingActivity(null)}
        saving={savingEdit}
      />

      <TemplatePreviewModal
        open={showTemplatePreview}
        items={templatePreviewItems}
        onClose={() => setShowTemplatePreview(false)}
        onConfirm={handleConfirmTemplate}
      />
    </div>
  )
}

// ── B. Template Preview Modal (local) ──
function TemplatePreviewModal({ open, items, onClose, onConfirm }) {
  if (!open) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Anteprima template"
      subtitle={`${items.length} attività verranno create`}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Applica {items.length} attività
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.descrizione}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {item.categoria && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    <Icon icon={CATEGORIA_ICONS[item.categoria]} size={12} />
                    {CATEGORIA_ATTIVITA[item.categoria] || item.categoria}
                  </span>
                )}
                {item.permesso_responsabile && (
                  <span className="text-xs text-gray-500">
                    {PERMESSO_SHORT_LABELS[item.permesso_responsabile] || item.permesso_responsabile}
                  </span>
                )}
                {item.obbligatorio && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Obbligatoria</span>
                )}
                {item.tipo_verifica === 'documento' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                    <Icon icon={DOCUMENTO_ICONS.attachment} size={12} />
                    Documento
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {item.giorni_prima_evento != null ? (
                <span className="text-xs text-gray-500">
                  {item.giorni_prima_evento === 0 ? 'Giorno evento' : `${Math.abs(item.giorni_prima_evento)}gg prima`}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Nessuna scadenza</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
