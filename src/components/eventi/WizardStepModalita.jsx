import { MODALITA_EVENTO } from '../../lib/constants'
import { MODALITA_ICONS } from '../../lib/icons'
import { Icon } from '../ui/Icon'

const descriptions = {
  interno: 'Mikai organizza e gestisce tutto',
  esterno: 'Mikai partecipa come ospite o espositore',
  contributo: 'Mikai finanzia senza partecipare direttamente',
}

export function WizardStepModalita({ value, onChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Tipo di partecipazione?</h2>
      <p className="text-base text-gray-500 mb-6">Come partecipa Mikai a questo evento?</p>
      <div className="space-y-3">
        {Object.entries(MODALITA_EVENTO).map(([key, label]) => {
          const isSelected = value === key
          const ModalitaIcon = MODALITA_ICONS[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`relative w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left min-h-[72px] transition-all ${
                isSelected
                  ? 'border-mikai-400 bg-mikai-50 text-mikai-700 shadow-sm'
                  : 'border-gray-200 hover:border-mikai-300 text-gray-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <Icon icon={ModalitaIcon} size={24} />
              </div>
              <div>
                <span className="text-lg font-medium block">{label}</span>
                <span className="text-sm text-gray-500">{descriptions[key]}</span>
              </div>

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
