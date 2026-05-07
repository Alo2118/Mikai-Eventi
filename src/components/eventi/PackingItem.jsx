import { Icon } from '../ui/Icon'
import { DOCUMENTO_ICONS } from '../../lib/icons'

export function PackingItem({ item, onDelete }) {
  const inCollo = item.collo_numero != null
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors packing-item ${
        inCollo
          ? 'bg-emerald-50/60 border-emerald-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      {/* Description + quantity — main content (selectable area) */}
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium ${inCollo ? 'text-emerald-800' : 'text-gray-900'}`}>
          {item.descrizione}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
          <span>{item.quantita} {item.quantita === 1 ? 'pezzo' : 'pezzi'}</span>
          {item.note && <span className="italic text-gray-400 truncate">{item.note}</span>}
        </div>
      </div>

      {/* Print-only checkbox (visible only when printing the picking list) */}
      <span className={`hidden print:inline-flex w-5 h-5 rounded border-2 ml-2 ${inCollo ? 'bg-emerald-500 border-emerald-500' : 'border-gray-400 bg-white'}`} aria-hidden="true" />

      {/* Delete (manual items only) */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Rimuovi "${item.descrizione}"`}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 no-print"
        >
          <Icon icon={DOCUMENTO_ICONS.delete} size={18} />
        </button>
      )}
    </div>
  )
}
