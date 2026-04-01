import { TIPO_DOCUMENTO, TIPO_DOCUMENTO_COLORE, STATO_DOCUMENTO, STATO_DOCUMENTO_COLORE, CARD_HOVER_STYLE } from '../../lib/constants'
import { DOCUMENTO_ICONS, STATO_DOCUMENTO_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'
import { formatFileSize } from '../../lib/format-utils'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'

function truncateFilename(name, maxLen = 40) {
  if (name.length <= maxLen) return name
  const ext = name.lastIndexOf('.')
  if (ext > 0) {
    const base = name.slice(0, ext)
    const extension = name.slice(ext)
    const truncLen = maxLen - extension.length - 3
    if (truncLen > 0) return base.slice(0, truncLen) + '...' + extension
  }
  return name.slice(0, maxLen - 3) + '...'
}

export function DocumentCard({
  doc,
  canDelete,
  canApprove,
  canReplace,
  onPreview,
  onDownload,
  onDelete,
  onApprove,
  onReject,
  onRequestRevision,
  onReplace,
}) {
  const DocIcon = DOCUMENTO_ICONS[doc.tipo_documento] || DOCUMENTO_ICONS.altro
  const uploaderName = doc.uploader
    ? `${doc.uploader.nome} ${doc.uploader.cognome}`
    : 'Sconosciuto'
  const approverName = doc.approvatore
    ? `${doc.approvatore.nome} ${doc.approvatore.cognome}`
    : null
  const linkedActivity = doc.activity
  const needsApproval = doc.stato === 'da_approvare'
  const isRejectedOrRevision = doc.stato === 'rifiutato' || doc.stato === 'in_revisione'

  return (
    <div className={CARD_HOVER_STYLE + (needsApproval ? ' border-l-4 border-l-yellow-400' : isRejectedOrRevision ? ' border-l-4 border-l-red-400' : doc.stato === 'approvato' ? ' border-l-4 border-l-green-400' : '')}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon icon={DocIcon} size={20} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900 truncate">
            {truncateFilename(doc.nome)}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StatusBadge
              stato={doc.tipo_documento}
              labels={TIPO_DOCUMENTO}
              colors={TIPO_DOCUMENTO_COLORE}
            />
            {doc.stato !== 'caricato' && (
              <StatusBadge
                stato={doc.stato}
                labels={STATO_DOCUMENTO}
                colors={STATO_DOCUMENTO_COLORE}
              />
            )}
            <span className="text-sm text-gray-500">{formatFileSize(doc.file_size)}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Caricato da {uploaderName} &middot; {formatDate(doc.created_at)}
          </p>
          {linkedActivity && (
            <p className="text-sm text-mikai-600 mt-1">
              Attività: {linkedActivity.descrizione}
            </p>
          )}
          {doc.nota_revisione && (
            <p className="text-sm text-red-600 mt-1 italic">
              Nota: {doc.nota_revisione}
            </p>
          )}
          {approverName && doc.data_approvazione && (
            <p className="text-sm text-gray-400 mt-1">
              {doc.stato === 'approvato' ? 'Approvato' : 'Revisionato'} da {approverName} &middot; {formatDate(doc.data_approvazione)}
            </p>
          )}
          {doc.note && (
            <p className="text-sm text-gray-400 mt-1 italic">{doc.note}</p>
          )}

          {/* Approval actions */}
          {canApprove && needsApproval && (
            <div className="flex flex-wrap gap-3 mt-3">
              <Button size="sm" onClick={onApprove}>Approva</Button>
              <Button variant="danger" size="sm" onClick={onReject}>Rifiuta</Button>
              <Button variant="secondary" size="sm" onClick={onRequestRevision}>Revisione</Button>
            </div>
          )}

          {/* Replace action for rejected/revision documents */}
          {canReplace && isRejectedOrRevision && (
            <div className="flex gap-3 mt-3">
              <Button variant="secondary" size="sm" onClick={onReplace}>
                <Icon icon={DOCUMENTO_ICONS.replace} size={16} className="mr-1.5" />
                Carica nuova versione
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPreview}
            aria-label={`Anteprima ${doc.nome}`}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-gray-400 hover:text-mikai-500 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-mikai-400"
          >
            <Icon icon={DOCUMENTO_ICONS.preview} size={18} />
          </button>
          <button
            type="button"
            onClick={onDownload}
            aria-label={`Scarica ${doc.nome}`}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-gray-400 hover:text-mikai-500 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-mikai-400"
          >
            <Icon icon={DOCUMENTO_ICONS.download} size={18} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Elimina ${doc.nome}`}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <Icon icon={DOCUMENTO_ICONS.delete} size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
