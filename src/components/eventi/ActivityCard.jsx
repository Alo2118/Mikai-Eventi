import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { STATO_ATTIVITA, CATEGORIA_ATTIVITA, STATO_ATTIVITA_COLORE, CATEGORIA_ATTIVITA_COLORE, STATO_DOCUMENTO, STATO_DOCUMENTO_COLORE, PERMESSO_SHORT_LABELS, PERMESSO_BADGE_COLORE } from '../../lib/constants'
import { ATTIVITA_STATO_ICONS, CATEGORIA_ICONS, ACTION_ICONS, DOCUMENTO_ICONS, STATO_DOCUMENTO_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'
import { StatusBadge } from '../ui/StatusBadge'

const COLOR_CLASSES = {
  gray: 'text-gray-500 bg-gray-100',
  mikai: 'text-mikai-600 bg-mikai-50',
  green: 'text-green-700 bg-green-100',
  red: 'text-red-700 bg-red-100',
  blue: 'text-blue-700 bg-blue-100',
  purple: 'text-purple-700 bg-purple-100',
  emerald: 'text-emerald-700 bg-emerald-100',
  yellow: 'text-yellow-700 bg-yellow-100',
}

function CategoryBadge({ categoria }) {
  const label = CATEGORIA_ATTIVITA[categoria] || categoria
  const color = CATEGORIA_ATTIVITA_COLORE[categoria] || 'gray'
  const iconColor = COLOR_CLASSES[color] || COLOR_CLASSES.gray
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${iconColor}`}>
      <Icon icon={CATEGORIA_ICONS[categoria]} size={12} />
      {label}
    </span>
  )
}

function StatoBadge({ displayStato }) {
  const label = STATO_ATTIVITA[displayStato] || displayStato
  const colorKey = STATO_ATTIVITA_COLORE[displayStato] || 'gray'
  const classes = COLOR_CLASSES[colorKey] || COLOR_CLASSES.gray
  const iconComp = ATTIVITA_STATO_ICONS[displayStato] || ATTIVITA_STATO_ICONS.da_fare
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      <Icon icon={iconComp} size={12} />
      {label}
    </span>
  )
}

function DocumentStatusInfo({ linkedDoc, onPreview }) {
  if (!linkedDoc) return null
  return (
    <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
      <Icon icon={STATO_DOCUMENTO_ICONS[linkedDoc.stato] || DOCUMENTO_ICONS.altro} size={14} className="text-gray-500 shrink-0" />
      <span className="text-gray-700 truncate">{linkedDoc.nome}</span>
      <button
        onClick={() => onPreview?.(linkedDoc)}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-gray-400 hover:text-mikai-500 hover:bg-gray-100 transition-colors shrink-0"
        aria-label={`Anteprima ${linkedDoc.nome}`}
      >
        <Icon icon={DOCUMENTO_ICONS.preview} size={18} />
      </button>
      <StatusBadge stato={linkedDoc.stato} labels={STATO_DOCUMENTO} colors={STATO_DOCUMENTO_COLORE} />
    </div>
  )
}

function ResponsabileBadge({ permesso }) {
  if (!permesso) return null
  const label = PERMESSO_SHORT_LABELS[permesso] || permesso
  const color = PERMESSO_BADGE_COLORE[permesso] || 'gray'
  const classes = COLOR_CLASSES[color] || COLOR_CLASSES.gray
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
  onUploadDocument,
  onToggleDocumento,
  onPreviewDoc,
  onApproveDoc,
  onRejectDoc,
  onRequestRevisionDoc,
  canApproveDoc,
  currentUserId,
  linkedDoc,
  compact = false,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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
  const canAssign = !activity.assegnato_a
  // Can upload document when activity is in_corso and no approved doc yet
  const canUploadDoc = isDocumentType && activity.stato === 'in_corso' && (!linkedDoc || linkedDoc.stato === 'rifiutato' || linkedDoc.stato === 'in_revisione')

  // ── Compact kanban card ──
  if (compact) {
    const catColor = CATEGORIA_ATTIVITA_COLORE[activity.categoria] || 'gray'
    const bandColors = {
      gray: 'bg-gray-300', mikai: 'bg-mikai-400', green: 'bg-green-400', red: 'bg-red-400',
      blue: 'bg-blue-400', purple: 'bg-purple-400', emerald: 'bg-emerald-400', yellow: 'bg-yellow-400',
    }
    return (
      <div className={`bg-white rounded-lg border ${borderColor} overflow-hidden ${isOverdue ? 'ring-1 ring-red-200' : ''}`}>
        <div className="flex">
          <div className={`w-1 shrink-0 ${bandColors[catColor] || 'bg-gray-300'}`} />
          <div className="flex-1 p-3 space-y-2">
            <p className="text-sm font-medium text-gray-900 leading-snug">{activity.descrizione}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {activity.obbligatoria && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">OBB</span>
              )}
              {activity.tipo_verifica === 'automatica' && (
                <span className="text-[10px] font-bold text-mikai-600 bg-mikai-50 px-1.5 py-0.5 rounded">AUTO</span>
              )}
              {isDocumentType && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">DOC</span>
              )}
              {deadline && (
                <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                  {formatDate(activity.deadline)}
                </span>
              )}
            </div>
            {linkedDoc && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <Icon icon={STATO_DOCUMENTO_ICONS[linkedDoc.stato] || DOCUMENTO_ICONS.altro} size={10} className="text-gray-500 shrink-0" />
                  <span className="text-gray-700 truncate">{linkedDoc.nome}</span>
                  <button
                    onClick={() => onPreviewDoc?.(linkedDoc)}
                    className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded text-gray-400 hover:text-mikai-500 hover:bg-gray-100 transition-colors shrink-0"
                    aria-label={`Anteprima ${linkedDoc.nome}`}
                  >
                    <Icon icon={DOCUMENTO_ICONS.preview} size={14} />
                  </button>
                  <StatusBadge stato={linkedDoc.stato} labels={STATO_DOCUMENTO} colors={STATO_DOCUMENTO_COLORE} />
                </div>
                {canApproveDoc && linkedDoc.stato === 'da_approvare' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onApproveDoc?.(linkedDoc)}
                      className="text-[11px] text-green-600 hover:text-green-700 font-medium min-h-[28px] px-2 rounded hover:bg-green-50 transition-colors"
                    >
                      Approva
                    </button>
                    <button
                      onClick={() => onRejectDoc?.(linkedDoc)}
                      className="text-[11px] text-red-600 hover:text-red-700 font-medium min-h-[28px] px-2 rounded hover:bg-red-50 transition-colors"
                    >
                      Rifiuta
                    </button>
                    <button
                      onClick={() => onRequestRevisionDoc?.(linkedDoc)}
                      className="text-[11px] text-gray-500 hover:text-gray-700 font-medium min-h-[28px] px-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      Revisione
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Toggle richiede documento (compact) */}
            {onToggleDocumento && activity.stato !== 'completata' && activity.tipo_verifica !== 'automatica' && !linkedDoc && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                  checked={isDocumentType}
                  onChange={() => onToggleDocumento(activity.id, isDocumentType ? 'manuale' : 'documento')}
                />
                <span className="text-[11px] text-gray-500">Richiede documento</span>
              </label>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <ResponsabileBadge permesso={activity.permesso_responsabile} />
              {assigneeName ? (
                <span className="text-xs text-gray-400">{assigneeName}</span>
              ) : activity.stato !== 'completata' && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Non assegnata</span>
              )}
            </div>
            {isBlocked && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Icon icon={ATTIVITA_STATO_ICONS.bloccata} size={10} />
                {activity.dipendenza?.descrizione}
              </p>
            )}
            {/* Inline actions */}
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              {canAssign && (
                <button
                  onClick={() => onAssign?.(activity.id, currentUserId)}
                  className="text-xs text-mikai-600 hover:text-mikai-700 font-medium min-h-[32px] px-2 rounded hover:bg-mikai-50 transition-colors"
                >
                  Assegna a me
                </button>
              )}
              {canStart && !isBlocked && (
                <button
                  onClick={() => onStart?.(activity.id)}
                  className="text-xs text-mikai-600 hover:text-mikai-700 font-medium min-h-[32px] px-2 rounded hover:bg-mikai-50 transition-colors"
                >
                  Inizia
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => onComplete?.(activity.id)}
                  className="text-xs text-green-600 hover:text-green-700 font-medium min-h-[32px] px-2 rounded hover:bg-green-50 transition-colors"
                >
                  Completa
                </button>
              )}
              {canUploadDoc && (
                <button
                  onClick={() => onUploadDocument?.(activity)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium min-h-[32px] px-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <Icon icon={DOCUMENTO_ICONS.upload} size={12} className="inline mr-1" />
                  Carica documento
                </button>
              )}
              {canRevertToDaFare && onRevert && (
                <button
                  onClick={() => onRevert(activity.id, activity.stato)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium min-h-[32px] px-2 rounded hover:bg-gray-100 transition-colors"
                >
                  ← Da fare
                </button>
              )}
              {canRevertToInCorso && onRevert && (
                <button
                  onClick={() => onRevert(activity.id, activity.stato)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium min-h-[32px] px-2 rounded hover:bg-gray-100 transition-colors"
                >
                  ← In corso
                </button>
              )}
              {onDisable && activity.stato !== 'completata' && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-gray-300 hover:text-red-500 min-h-[32px] min-w-[32px] flex items-center justify-center ml-auto transition-colors"
                  aria-label="Rimuovi"
                >
                  <Icon icon={ACTION_ICONS.close} size={14} />
                </button>
              )}
            </div>
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
      </div>
    )
  }

  // ── Full card (list view) ──
  const catColor = CATEGORIA_ATTIVITA_COLORE[activity.categoria] || 'gray'
  const bandColorsF = {
    gray: 'bg-gray-300', mikai: 'bg-mikai-400', green: 'bg-green-400', red: 'bg-red-400',
    blue: 'bg-blue-400', purple: 'bg-purple-400', emerald: 'bg-emerald-400', yellow: 'bg-yellow-400',
  }
  return (
    <div className={`bg-white rounded-xl border ${borderColor} overflow-hidden flex`}>
      <div className={`w-1.5 shrink-0 ${bandColorsF[catColor] || 'bg-gray-300'}`} />
      <div className="flex-1 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900 leading-snug">
            {activity.descrizione}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {activity.obbligatoria && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                Obbligatoria
              </span>
            )}
            {isDocumentType && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                <Icon icon={DOCUMENTO_ICONS.attachment} size={12} />
                Richiede documento
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activity.tipo_verifica === 'automatica' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-mikai-600 bg-mikai-50">
              <Icon icon={ATTIVITA_STATO_ICONS.auto_verificata} size={12} />
              Auto
            </span>
          )}
          {onDisable && activity.stato !== 'completata' && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
              className="text-gray-400 hover:text-red-500 p-1.5 min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
              aria-label="Rimuovi attività"
            >
              <Icon icon={ACTION_ICONS.close} size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {activity.categoria && <CategoryBadge categoria={activity.categoria} />}
        {deadline && (
          <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            Scadenza: {formatDate(activity.deadline)}
          </span>
        )}
        {assigneeName && (
          <span className="text-xs text-gray-500">
            Assegnata a: <span className="font-medium text-gray-700">{assigneeName}</span>
          </span>
        )}
      </div>

      {/* Toggle richiede documento (editable for non-completed activities) */}
      {onToggleDocumento && activity.stato !== 'completata' && activity.tipo_verifica !== 'automatica' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
            checked={isDocumentType}
            onChange={() => onToggleDocumento(activity.id, isDocumentType ? 'manuale' : 'documento')}
          />
          <span className="text-sm text-gray-600">Richiede documento approvato</span>
        </label>
      )}

      {/* Linked document status */}
      {isDocumentType && <DocumentStatusInfo linkedDoc={linkedDoc} onPreview={onPreviewDoc} />}

      {/* Document approval actions (full card) */}
      {canApproveDoc && linkedDoc?.stato === 'da_approvare' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onApproveDoc?.(linkedDoc)}>Approva documento</Button>
          <Button variant="danger" size="sm" onClick={() => onRejectDoc?.(linkedDoc)}>Rifiuta</Button>
          <Button variant="secondary" size="sm" onClick={() => onRequestRevisionDoc?.(linkedDoc)}>Revisione</Button>
        </div>
      )}

      {/* Blocked info */}
      {isBlocked && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <Icon icon={ATTIVITA_STATO_ICONS.bloccata} size={14} className="text-gray-400 shrink-0" />
          <span>Bloccata da: {activity.dipendenza.descrizione}</span>
        </div>
      )}

      {/* Action buttons */}
      {(canAssign || canStart || canComplete || canUploadDoc || canRevertToDaFare || canRevertToInCorso) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {canAssign && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAssign && onAssign(activity.id, currentUserId)}
            >
              Assegna a me
            </Button>
          )}
          {canStart && !isBlocked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStart && onStart(activity.id)}
            >
              Inizia
            </Button>
          )}
          {canComplete && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onComplete && onComplete(activity.id)}
            >
              Segna completata
            </Button>
          )}
          {canUploadDoc && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUploadDocument && onUploadDocument(activity)}
            >
              <Icon icon={DOCUMENTO_ICONS.upload} size={16} className="mr-1.5" />
              Carica documento
            </Button>
          )}
          {canRevertToDaFare && onRevert && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRevert(activity.id, activity.stato)}
            >
              ← Riporta a "Da fare"
            </Button>
          )}
          {canRevertToInCorso && onRevert && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRevert(activity.id, activity.stato)}
            >
              ← Riporta a "In corso"
            </Button>
          )}
        </div>
      )}

      {/* Hint for document activities waiting for approval */}
      {isDocumentType && linkedDoc?.stato === 'da_approvare' && activity.stato === 'in_corso' && (
        <p className="text-xs text-yellow-600">Documento in attesa di approvazione</p>
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
    </div>
    </div>
  )
}
