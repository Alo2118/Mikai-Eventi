import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function ChipFilter({ options, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map(opt => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={`min-h-[48px] px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 border-2 flex items-center gap-1 ${
              active
                ? 'bg-mikai-400 text-white border-mikai-500'
                : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'
            }`}
          >
            {active && <Icon icon={ACTION_ICONS.check} size={14} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
