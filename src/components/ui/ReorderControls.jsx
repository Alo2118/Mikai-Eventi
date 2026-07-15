import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'

// Colonna di controllo per il riordino manuale: frecce su/giù (ovunque, 48px) +
// maniglia di trascinamento (drag & drop nativo, solo desktop `md:`).
export function ReorderControls({ index, count, onMoveUp, onMoveDown, onDragStart, onDragEnd }) {
  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <button
        type="button"
        aria-label="Sposta su"
        disabled={index === 0}
        onClick={onMoveUp}
        title={index === 0 ? 'Già in cima' : 'Sposta su'}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Icon icon={ACTION_ICONS.chevronUp} size={20} />
      </button>
      <span
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-hidden="true"
        title="Trascina per riordinare"
        className="hidden md:flex items-center justify-center text-gray-300 cursor-grab active:cursor-grabbing py-0.5"
      >
        <Icon icon={ACTION_ICONS.grip} size={16} />
      </span>
      <button
        type="button"
        aria-label="Sposta giù"
        disabled={index === count - 1}
        onClick={onMoveDown}
        title={index === count - 1 ? 'Già in fondo' : 'Sposta giù'}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Icon icon={ACTION_ICONS.chevronDown} size={20} />
      </button>
    </div>
  )
}
