import { TIPO_DOCUMENTO, TIPO_DOCUMENTO_COLORE, CARD_HOVER_STYLE } from '../../lib/constants'
import { DOCUMENTO_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'
import { formatFileSize } from '../../lib/format-utils'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'

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

export function DocumentCard({ doc, canDelete, onPreview, onDownload, onDelete }) {
  const DocIcon = DOCUMENTO_ICONS[doc.tipo_documento] || DOCUMENTO_ICONS.altro
  const uploaderName = doc.uploader
    ? `${doc.uploader.nome} ${doc.uploader.cognome}`
    : 'Sconosciuto'

  return (
    <div className={CARD_HOVER_STYLE}>
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
            <span className="text-sm text-gray-500">{formatFileSize(doc.file_size)}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Caricato da {uploaderName} &middot; {formatDate(doc.created_at)}
          </p>
          {doc.note && (
            <p className="text-sm text-gray-400 mt-1 italic">{doc.note}</p>
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
