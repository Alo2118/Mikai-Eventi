import { Icon } from '../ui/Icon'
import { ACTION_ICONS, DOCUMENTO_ICONS } from '../../lib/icons'

export function PackingItem({ item, onToggle, onDelete }) {
  return (
    <div
      className={`
        packing-item flex items-center gap-3 p-3 rounded-lg border transition-colors
        ${item.imballato
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'}
      `}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.imballato ? `Segna "${item.descrizione}" come non imballato` : `Segna "${item.descrizione}" come imballato`}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-mikai-400 rounded-lg"
      >
        <div className={`
          print-checkbox w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors
          ${item.imballato
            ? 'bg-green-500 border-green-500 checked'
            : 'border-gray-300 bg-white'}
        `}>
          {item.imballato && (
            <Icon icon={ACTION_ICONS.check} size={18} className="text-white" />
          )}
        </div>
      </button>

      {/* Description + info */}
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium ${item.imballato ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.descrizione}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500">Qta: {item.quantita}</span>
          {item.note && <span className="text-sm text-gray-400 italic">{item.note}</span>}
        </div>
      </div>

      {/* Delete (manual items only) */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Rimuovi "${item.descrizione}"`}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 no-print"
        >
          <Icon icon={DOCUMENTO_ICONS.delete} size={18} />
        </button>
      )}
    </div>
  )
}
