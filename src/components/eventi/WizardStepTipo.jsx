import { TIPO_EVENTO } from '../../lib/constants'
import { TIPO_EVENTO_ICONS } from '../../lib/icons'
import { Icon } from '../ui/Icon'

export function WizardStepTipo({ value, onChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Che tipo di evento?</h2>
      <p className="text-base text-gray-500 mb-6">Scegli il tipo di evento che vuoi proporre.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(TIPO_EVENTO).map(([key, label]) => {
          const isSelected = value === key
          const TipoIcon = TIPO_EVENTO_ICONS[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`relative flex items-center gap-4 p-5 rounded-xl border-2 text-left min-h-[72px] transition-all ${
                isSelected
                  ? 'border-mikai-400 bg-mikai-50 text-mikai-700 shadow-sm'
                  : 'border-gray-200 hover:border-mikai-300 text-gray-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <Icon icon={TipoIcon} size={24} />
              </div>
              <span className="text-lg font-medium">{label}</span>

              {/* Check di conferma selezione */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-mikai-400 text-white flex items-center justify-center">
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
