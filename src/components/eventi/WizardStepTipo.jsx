import { useEventTypes } from '../../hooks/useEventTypes'
import { Icon } from '../ui/Icon'

const COLOR_BG_SELECTED = {
  gray: 'bg-gray-400', blue: 'bg-blue-400', emerald: 'bg-emerald-400', purple: 'bg-purple-400',
  yellow: 'bg-yellow-400', orange: 'bg-orange-400', amber: 'bg-amber-400', red: 'bg-red-400',
  green: 'bg-green-400', mikai: 'bg-mikai-400', pink: 'bg-pink-400', sky: 'bg-sky-400',
}
const COLOR_BG_LIGHT = {
  gray: 'bg-gray-50', blue: 'bg-blue-50', emerald: 'bg-emerald-50', purple: 'bg-purple-50',
  yellow: 'bg-yellow-50', orange: 'bg-orange-50', amber: 'bg-amber-50', red: 'bg-red-50',
  green: 'bg-green-50', mikai: 'bg-mikai-50', pink: 'bg-pink-50', sky: 'bg-sky-50',
}
const COLOR_BORDER = {
  gray: 'border-gray-400', blue: 'border-blue-400', emerald: 'border-emerald-400', purple: 'border-purple-400',
  yellow: 'border-yellow-400', orange: 'border-orange-400', amber: 'border-amber-400', red: 'border-red-400',
  green: 'border-green-400', mikai: 'border-mikai-400', pink: 'border-pink-400', sky: 'border-sky-400',
}
const COLOR_TEXT = {
  gray: 'text-gray-700', blue: 'text-blue-700', emerald: 'text-emerald-700', purple: 'text-purple-700',
  yellow: 'text-yellow-700', orange: 'text-orange-700', amber: 'text-amber-700', red: 'text-red-700',
  green: 'text-green-700', mikai: 'text-mikai-700', pink: 'text-pink-700', sky: 'text-sky-700',
}

export function WizardStepTipo({ value, onChange }) {
  const { eventTypes, icons } = useEventTypes()

  const activeTypes = eventTypes.filter(t => t.attivo)

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Che tipo di evento?</h2>
      <p className="text-base text-gray-500 mb-6">Scegli il tipo di evento che vuoi proporre.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeTypes.map((et) => {
          const isSelected = value === et.codice
          const color = et.colore || 'mikai'
          const tipoIcon = icons[et.codice]
          return (
            <button
              key={et.codice}
              type="button"
              onClick={() => onChange(et.codice)}
              className={`relative flex items-center gap-4 p-5 rounded-xl border-2 text-left min-h-[72px] transition-all ${
                isSelected
                  ? `${COLOR_BORDER[color] || 'border-mikai-400'} ${COLOR_BG_LIGHT[color] || 'bg-mikai-50'} ${COLOR_TEXT[color] || 'text-mikai-700'} shadow-sm`
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isSelected ? `${COLOR_BG_SELECTED[color] || 'bg-mikai-400'} text-white` : 'bg-gray-100 text-gray-500'
              }`}>
                {tipoIcon
                  ? <Icon icon={tipoIcon} size={24} />
                  : <Icon name={et.icona || 'calendar'} size={24} />
                }
              </div>
              <span className="text-lg font-medium">{et.nome}</span>

              {isSelected && (
                <div className={`absolute top-3 right-3 w-7 h-7 rounded-full ${COLOR_BG_SELECTED[color] || 'bg-mikai-400'} text-white flex items-center justify-center`}>
                  <Icon name="check" size={16} strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
