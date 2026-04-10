import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { AssigneePickerModal } from './AssigneePickerModal'
import { CATEGORIA_ATTIVITA_COLORE, STATO_DOCUMENTO, STATO_DOCUMENTO_COLORE, PERMESSO_SHORT_LABELS, PERMESSO_BADGE_COLORE, COLOR_BADGE, COLOR_BAND } from '../../lib/constants'
import { ATTIVITA_STATO_ICONS, ACTION_ICONS, DOCUMENTO_ICONS, STATO_DOCUMENTO_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { formatDate, daysFromToday, todayISO, daysBetween } from '../../lib/date-utils'
import { StatusBadge } from '../ui/StatusBadge'


// Deadline badge — prominent overdue/warning indicators
function DeadlineBadge({ deadline, stato }) {
  if (!deadline) return null
  // Only show urgency badges for active activities
  if (!['da_fare', 'in_corso'].includes(stato)) {
    return <span className="text-xs text-gray-500">Scadenza: {formatDate(deadline)}</span>
  }
  const today = todayISO()
  const overdueDays = daysFromToday(deadline)
  // daysFromToday returns 0 for today or future, positive for overdue
  // We need to also detect "within 3 days" using daysBetween
  const daysRemaining = daysBetween(deadline, today) // positive = deadline in future

  if (overdueDays > 0) {
    // Overdue
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-red-700 bg-red-100 animate-pulse">
        <Icon icon={FEEDBACK_ICONS.warning} size={12} />
        Scaduta da {overdueDays} {overdueDays === 1 ? 'giorno' : 'giorni'}
      </span>
    )
  }
  if (daysRemaining >= 0 && daysRemaining <= 3) {
    // Within 3 days (including today)
    const label = daysRemaining === 0
      ? 'Scade oggi'
      : `Scade tra ${daysRemaining} ${daysRemaining === 1 ? 'giorno' : 'giorni'}`
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-yellow-700 bg-yellow-100">
        <Icon icon={FEEDBACK_ICONS.warning} size={12} />
        {label}
      </span>
    )
  }
  // Normal future deadline
  return <span className="text-xs text-gray-500">Scadenza: {formatDate(deadline)}</span>
}

function ResponsabileBadge({ permesso }) {
  if (!permesso) return null
  const label = PERMESSO_SHORT_LABELS[permesso] || permesso
  const color = PERMESSO_BADGE_COLORE[permesso] || 'gray'
  const classes = COLOR_BADGE[color] || COLOR_BADGE.gray
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

export function ActivityCard({
  activity,
  onStart,
  onComplete,
  onRevert,
  onAssign,
  onDisable,
  onEdit,
  onUploadDocument,
  onToggleDocumento,
  onPreviewDoc,
  onApproveDoc,
  onRejectDoc,
  onRequestRevisionDoc,
  canApproveDoc,
  currentUserId,
  linkedDoc,
  eventStaff,
  compact = false,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAssignPicker, setShowAssignPicker] = useState(false)
  const now = new Date()
  const deadline = activity.deadline ? new Date(activity.deadline) : null
  const isOverdue = ['da_fare', 'in_corso'].includes(activity.stato) && deadline && deadline < now
  const isBlocked = activity.dipendenza && activity.dipendenza.stato !== 'completata'
  const isDocumentType = activity.tipo_verifica === 'documento'

  let displayStato = activity.stato
  if (isBlocked) displayStato = 'bloccata'
  else if (isOverdue) displayStato = 'in_ritardo'

  const borderColor = isOverdue
    ? 'border-red-300'
    : isBlocked
    ? 'border-gray-200'
    : 'border-gray-200'

  const assigneeName = activity.assegnato
    ? `${activity.assegnato.nome} ${activity.assegnato.cognome}`
    : null

  const canStart = activity.stato === 'da_fare' && !isBlocked
  // Document-type activities cannot be manually completed
  const canComplete = activity.stato === 'in_corso' && !isDocumentType
  const canRevertToInCorso = activity.stato === 'completata'
  const canRevertToDaFare = activity.stato === 'in_corso'
  const canEditActivity = onEdit && activity.stato !== 'completata' && activity.stato !== 'disattivata'
  const canAssign = !activity.assegnato_a
  const canReassign = !!activity.assegnato_a && activity.stato !== 'completata'
  // Can upload document when activity is in_corso and no approved doc yet
  const canUploadDoc = isDocumentType && activity.stato === 'in_corso' && (!linkedDoc || linkedDoc.stato === 'rifiutato' || linkedDoc.stato === 'in_revisione')

  // ── Compact kanban card ──
  if (compact) {
    const catColor = CATEGORIA_ATTIVITA_COLORE[activity.categoria] || 'gray'
    // Assignee: badge colorato se sono io, neutro se è qualcun altro
    const isMyTask = currentUserId && activity.assegnato_a === currentUserId
    const roleColor = PERMESSO_BADGE_COLORE[activity.permesso_responsabile] || 'gray'
    const nameClasses = isMyTask
      ? `${COLOR_BADGE[roleColor] || COLOR_BADGE.gray} px-1.5 py-0.5 rounded-lg`
      : 'text-gray-400'
    // Document indicator color
    const docColor = linkedDoc
      ? linkedDoc.stato === 'approvato' ? 'text-green-500' : linkedDoc.stato === 'rifiutato' ? 'text-red-500' : 'text-yellow-500'
      : 'text-gray-400'
    const docTitle = linkedDoc
      ? `${linkedDoc.nome} — ${STATO_DOCUMENTO[linkedDoc.stato]}`
      : 'Documento da allegare'
    // Primary action: the most important next step
    const primaryAction = canComplete ? { label: 'Completa', color: 'text-green-700 bg-green-100 hover:bg-green-200', onClick: () => onComplete?.(activity.id) }
      : canStart && !isBlocked ? { label: 'Inizia', color: 'text-mikai-700 bg-mikai-100 hover:bg-mikai-200', onClick: () => onStart?.(activity.id) }
      : canUploadDoc ? { label: 'Carica doc', color: 'text-blue-700 bg-blue-100 hover:bg-blue-200', onClick: () => onUploadDocument?.(activity) }
      : canAssign ? { label: 'Assegna', color: 'text-mikai-700 bg-mikai-100 hover:bg-mikai-200', onClick: () => setShowAssignPicker(true) }
      : null

    return (
      <div className={`bg-white rounded-lg border ${borderColor} overflow-hidden ${isOverdue ? 'ring-1 ring-red-200' : ''}`}>
        <div className="flex">
          <div className={`w-1 shrink-0 ${COLOR_BAND[catColor] || 'bg-gray-300'}`} />
          <div className="flex-1 px-2.5 py-2 space-y-1">
            {/* Row 1: description + indicator icons */}
            <div className="flex items-start gap-1">
              <p className="text-sm font-medium text-gray-900 leading-snug flex-1 min-w-0">{activity.descrizione}</p>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                {activity.obbligatoria && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" title="Obbligatoria" />
                )}
                {activity.tipo_verifica === 'automatica' && (
                  <Icon icon={ATTIVITA_STATO_ICONS.auto_verificata} size={14} className="text-mikai-500 shrink-0" title="Verifica automatica" />
                )}
                {isDocumentType && (
                  <Icon icon={DOCUMENTO_ICONS.attachment} size={14} className={`shrink-0 ${docColor}`} title={docTitle} />
                )}
              </div>
            </div>
            {/* Row 2: deadline + assignee (colored by role) + actions — unified */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {deadline && <DeadlineBadge deadline={activity.deadline} stato={activity.stato} />}
              {assigneeName ? (
                <button
                  onClick={() => canReassign && setShowAssignPicker(true)}
                  className={`font-medium truncate max-w-[120px] ${nameClasses} ${canReassign ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
                  title={`${assigneeName}${activity.permesso_responsabile ? ` — ${PERMESSO_SHORT_LABELS[activity.permesso_responsabile] || ''}` : ''}${canReassign ? ' (clicca per riassegnare)' : ''}`}
                  aria-label={canReassign ? `Riassegna attività (attualmente: ${assigneeName})` : undefined}
                >
                  {assigneeName}
                </button>
              ) : activity.stato !== 'completata' && (
                <button
                  onClick={() => setShowAssignPicker(true)}
                  className="text-red-500 font-medium hover:text-mikai-600 hover:bg-mikai-50 px-1.5 py-0.5 rounded-lg transition-colors min-h-[48px] md:min-h-0"
                  title="Clicca per assegnare"
                  aria-label="Assegna attività"
                >
                  Non assegnata
                </button>
              )}
              <span className="flex-1" />
              {canRevertToDaFare && onRevert && (
                <button onClick={() => onRevert(activity.id, activity.stato)} className="text-gray-400 hover:text-gray-700 font-medium px-1 min-h-[48px] md:min-h-0 rounded-lg hover:bg-gray-100 transition-colors">
                  ← Da fare
                </button>
              )}
              {canRevertToInCorso && onRevert && (
                <button onClick={() => onRevert(activity.id, activity.stato)} className="text-gray-400 hover:text-gray-700 font-medium px-1 min-h-[48px] md:min-h-0 rounded-lg hover:bg-gray-100 transition-colors">
                  ← In corso
                </button>
              )}
              {primaryAction && (
                <button onClick={primaryAction.onClick} className={`font-semibold px-2 py-0.5 min-h-[48px] md:min-h-0 rounded-lg ${primaryAction.color} transition-colors`}>
                  {primaryAction.label}
                </button>
              )}
              {canEditActivity && (
                <button onClick={() => onEdit(activity)} className="text-gray-300 hover:text-mikai-500 min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 md:w-6 md:h-6 flex items-center justify-center rounded-lg transition-colors" aria-label="Modifica attività">
                  <Icon icon={ACTION_ICONS.edit} size={14} />
                </button>
              )}
              {onDisable && activity.stato !== 'completata' && (
                <button onClick={() => setShowDeleteConfirm(true)} className="text-gray-300 hover:text-red-500 min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 md:w-6 md:h-6 flex items-center justify-center rounded-lg transition-colors" aria-label="Rimuovi">
                  <Icon icon={ACTION_ICONS.close} size={14} />
                </button>
              )}
            </div>
            {/* Optional: linked doc with approval (only when doc exists) */}
            {linkedDoc && (
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <button onClick={() => onPreviewDoc?.(linkedDoc)} className="text-gray-600 hover:text-mikai-500 truncate max-w-[140px] min-h-[48px] md:min-h-0 transition-colors underline decoration-gray-300" title={linkedDoc.nome} aria-label={`Anteprima ${linkedDoc.nome}`}>
                  {linkedDoc.nome}
                </button>
                {canApproveDoc && linkedDoc.stato === 'da_approvare' && (
                  <>
                    <button onClick={() => onApproveDoc?.(linkedDoc)} className="text-green-600 hover:text-green-700 font-medium px-1.5 min-h-[48px] md:min-h-0 rounded-lg hover:bg-green-50 transition-colors" aria-label={`Approva ${linkedDoc.nome}`}>Approva</button>
                    <button onClick={() => onRejectDoc?.(linkedDoc)} className="text-red-600 hover:text-red-700 font-medium px-1.5 min-h-[48px] md:min-h-0 rounded-lg hover:bg-red-50 transition-colors" aria-label={`Rifiuta ${linkedDoc.nome}`}>Rifiuta</button>
                  </>
                )}
              </div>
            )}
            {isBlocked && (
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                <Icon icon={ATTIVITA_STATO_ICONS.bloccata} size={12} className="shrink-0" />
                <span className="truncate">{activity.dipendenza?.descrizione}</span>
              </p>
            )}
          </div>
        </div>
        <ConfirmDialog
          open={showDeleteConfirm}
          title="Rimuovi attività"
          message={`Vuoi rimuovere "${activity.descrizione}" dalla preparazione?`}
          confirmLabel="Rimuovi"
          onConfirm={() => { setShowDeleteConfirm(false); onDisable(activity.id) }}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
        <AssigneePickerModal
          open={showAssignPicker}
          onClose={() => setShowAssignPicker(false)}
          onAssign={(userId) => onAssign?.(activity.id, userId)}
          currentUserId={currentUserId}
          permessoResponsabile={activity.permesso_responsabile}
          eventStaff={eventStaff}
          activityDescription={activity.descrizione}
        />
      </div>
    )
  }

  // ── Full card (list view) ──
  const catColor = CATEGORIA_ATTIVITA_COLORE[activity.categoria] || 'gray'
  return (
    <div className={`bg-white rounded-xl border ${borderColor} overflow-hidden flex`}>
      <div className={`w-1.5 shrink-0 ${COLOR_BAND[catColor] || 'bg-gray-300'}`} />
      <div className="flex-1 p-3 space-y-2">
      {/* Row 1: title + flags + edit/delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 leading-snug">{activity.descrizione}</p>
            {activity.obbligatoria && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-lg shrink-0">OBB</span>
            )}
            {activity.tipo_verifica === 'automatica' && (
              <span className="text-xs font-bold text-mikai-600 bg-mikai-50 px-1.5 py-0.5 rounded-lg shrink-0">AUTO</span>
            )}
          </div>
        </div>
        <div className="flex items-center shrink-0">
          {canEditActivity && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(activity) }}
              className="text-gray-400 hover:text-mikai-500 p-1.5 min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
              aria-label="Modifica attività">
              <Icon icon={ACTION_ICONS.edit} size={16} />
            </button>
          )}
          {onDisable && activity.stato !== 'completata' && (
            <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
              className="text-gray-400 hover:text-red-500 p-1.5 min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
              aria-label="Rimuovi attività">
              <Icon icon={ACTION_ICONS.close} size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: meta — role + deadline + assignee */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ResponsabileBadge permesso={activity.permesso_responsabile} />
        {deadline && <DeadlineBadge deadline={activity.deadline} stato={activity.stato} />}
        {assigneeName ? (
          <button
            onClick={() => canReassign && setShowAssignPicker(true)}
            className={`text-xs font-medium text-gray-700 ${canReassign ? 'cursor-pointer hover:text-mikai-600 hover:underline' : 'cursor-default'}`}
            title={canReassign ? `${assigneeName} (clicca per riassegnare)` : assigneeName}
            aria-label={canReassign ? `Riassegna (attualmente: ${assigneeName})` : undefined}
          >
            {assigneeName}
          </button>
        ) : activity.stato !== 'completata' && (
          <button
            onClick={() => setShowAssignPicker(true)}
            className="text-xs font-semibold text-red-500 hover:text-mikai-600 hover:bg-mikai-50 px-1.5 py-0.5 rounded-lg transition-colors min-h-[48px]"
            title="Clicca per assegnare"
            aria-label="Assegna attività"
          >
            Non assegnata
          </button>
        )}
        {/* Doc toggle inline in meta row */}
        {onToggleDocumento && activity.stato !== 'completata' && activity.tipo_verifica !== 'automatica' && (
          <label className="flex items-center gap-1.5 cursor-pointer min-h-[48px]">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
              checked={isDocumentType}
              onChange={() => onToggleDocumento(activity.id, isDocumentType ? 'manuale' : 'documento')} />
            <span className="text-xs text-gray-500">Richiede doc.</span>
          </label>
        )}
      </div>

      {/* Row 3 (conditional): context — blocked OR doc status with approval */}
      {isBlocked && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
          <Icon icon={ATTIVITA_STATO_ICONS.bloccata} size={14} className="text-gray-400 shrink-0" />
          <span>Bloccata da: {activity.dipendenza.descrizione}</span>
        </div>
      )}
      {isDocumentType && linkedDoc && (
        <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-1.5 flex-wrap">
          <Icon icon={STATO_DOCUMENTO_ICONS[linkedDoc.stato] || DOCUMENTO_ICONS.altro} size={14} className="text-gray-500 shrink-0" />
          <span className="text-gray-700 truncate">{linkedDoc.nome}</span>
          <button onClick={() => onPreviewDoc?.(linkedDoc)}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-gray-400 hover:text-mikai-500 hover:bg-gray-100 transition-colors shrink-0"
            aria-label={`Anteprima ${linkedDoc.nome}`}>
            <Icon icon={DOCUMENTO_ICONS.preview} size={16} />
          </button>
          <StatusBadge stato={linkedDoc.stato} labels={STATO_DOCUMENTO} colors={STATO_DOCUMENTO_COLORE} />
          {canApproveDoc && linkedDoc.stato === 'da_approvare' && (
            <>
              <Button size="sm" onClick={() => onApproveDoc?.(linkedDoc)}>Approva</Button>
              <Button variant="danger" size="sm" onClick={() => onRejectDoc?.(linkedDoc)}>Rifiuta</Button>
              <Button variant="secondary" size="sm" onClick={() => onRequestRevisionDoc?.(linkedDoc)}>Revisione</Button>
            </>
          )}
        </div>
      )}
      {isDocumentType && !linkedDoc && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
          <Icon icon={DOCUMENTO_ICONS.attachment} size={14} className="text-gray-400 shrink-0" />
          <span>Documento richiesto</span>
        </div>
      )}

      {/* Row 4: actions */}
      {(canAssign || canReassign || canStart || canComplete || canUploadDoc || canRevertToDaFare || canRevertToInCorso) && (
        <div className="flex flex-wrap gap-2">
          {canStart && !isBlocked && <Button variant="secondary" size="sm" onClick={() => onStart?.(activity.id)}>Inizia</Button>}
          {canComplete && <Button variant="primary" size="sm" onClick={() => onComplete?.(activity.id)}>Completa</Button>}
          {canUploadDoc && (
            <Button variant="primary" size="sm" onClick={() => onUploadDocument?.(activity)}>
              <Icon icon={DOCUMENTO_ICONS.upload} size={16} className="mr-1" />Carica documento
            </Button>
          )}
          {canRevertToDaFare && onRevert && <Button variant="ghost" size="sm" onClick={() => onRevert(activity.id, activity.stato)}>← Da fare</Button>}
          {canRevertToInCorso && onRevert && <Button variant="ghost" size="sm" onClick={() => onRevert(activity.id, activity.stato)}>← In corso</Button>}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Rimuovi attività"
        message={`Vuoi rimuovere "${activity.descrizione}" dalla preparazione?`}
        confirmLabel="Rimuovi"
        onConfirm={() => { setShowDeleteConfirm(false); onDisable(activity.id) }}
        onCancel={() => setShowDeleteConfirm(false)}
        danger
      />
      <AssigneePickerModal
        open={showAssignPicker}
        onClose={() => setShowAssignPicker(false)}
        onAssign={(userId) => onAssign?.(activity.id, userId)}
        currentUserId={currentUserId}
        permessoResponsabile={activity.permesso_responsabile}
        eventStaff={eventStaff}
        activityDescription={activity.descrizione}
      />
    </div>
    </div>
  )
}
