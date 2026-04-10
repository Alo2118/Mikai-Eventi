import { useEventTypes } from '../../hooks/useEventTypes'
import { Icon } from '../ui/Icon'
import { COLOR_BG_400, COLOR_BG_50, COLOR_BORDER_400, COLOR_TEXT_700 } from '../../lib/constants'

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
                  ? `${COLOR_BORDER_400[color] || 'border-mikai-400'} ${COLOR_BG_50[color] || 'bg-mikai-50'} ${COLOR_TEXT_700[color] || 'text-mikai-700'} shadow-sm`
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isSelected ? `${COLOR_BG_400[color] || 'bg-mikai-400'} text-white` : 'bg-gray-100 text-gray-500'
              }`}>
                {tipoIcon
                  ? <Icon icon={tipoIcon} size={24} />
                  : <Icon name={et.icona || 'calendar'} size={24} />
                }
              </div>
              <span className="text-lg font-medium">{et.nome}</span>

              {isSelected && (
                <div className={`absolute top-3 right-3 w-7 h-7 rounded-full ${COLOR_BG_400[color] || 'bg-mikai-400'} text-white flex items-center justify-center`}>
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
