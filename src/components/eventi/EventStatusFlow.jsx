import { STATO_EVENTO_ICONS } from '../../lib/icons'
import { Icon } from '../ui/Icon'

const steps = ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']
const SHORT_LABELS = {
  proposto: 'Proposto',
  confermato: 'Approvato',
  in_preparazione: 'Preparazione',
  pronto: 'Pronto',
  in_corso: 'In corso',
  concluso: 'Concluso',
}

export function EventStatusFlow({ stato }) {
  if (stato === 'cancellato') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
        <Icon icon={STATO_EVENTO_ICONS.cancellato} size={16} className="text-red-600" />
        <span className="text-sm font-medium text-red-800">Evento annullato</span>
      </div>
    )
  }

  if (stato === 'rifiutato') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
        <Icon icon={STATO_EVENTO_ICONS.rifiutato} size={16} className="text-red-600" />
        <span className="text-sm font-medium text-red-800">Evento rifiutato</span>
      </div>
    )
  }

  const currentIndex = steps.indexOf(stato)

  return (
    <div className="flex items-center gap-0.5 py-1 overflow-x-auto">
      {steps.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        const StepIcon = STATO_EVENTO_ICONS[step]

        return (
          <div key={step} className="flex items-center">
            {i > 0 && (
              <div className={`w-4 md:w-6 h-0.5 shrink-0 ${isDone ? 'bg-mikai-400' : 'bg-gray-200'}`} />
            )}
            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full shrink-0 ${
              isCurrent
                ? 'bg-mikai-100 ring-1 ring-mikai-400'
                : isDone
                  ? 'bg-mikai-50'
                  : ''
            }`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isDone
                    ? 'bg-mikai-400 text-white'
                    : isCurrent
                      ? 'bg-mikai-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? (
                  <Icon name="check" size={13} />
                ) : (
                  <Icon icon={StepIcon} size={13} />
                )}
              </div>
              <span className={`text-xs whitespace-nowrap ${
                isCurrent ? 'font-semibold text-mikai-700' :
                isDone ? 'text-gray-600 hidden md:inline' : 'text-gray-400 hidden md:inline'
              }`}>
                {SHORT_LABELS[step]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
