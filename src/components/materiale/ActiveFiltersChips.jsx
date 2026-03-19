import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function ActiveFiltersChips({ filters, onRemove, onClearAll }) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => onRemove(f.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-mikai-50 text-mikai-700 rounded-full text-sm font-medium hover:bg-mikai-100 transition-colors min-h-[36px]"
          aria-label={`Rimuovi filtro ${f.label}`}
        >
          {f.label}
          <Icon icon={ACTION_ICONS.close} size={14} />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-gray-500 hover:text-gray-700 min-h-[36px] px-2"
      >
        Cancella filtri
      </button>
    </div>
  )
}
