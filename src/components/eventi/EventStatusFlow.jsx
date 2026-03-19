import { STATO_EVENTO } from '../../lib/constants'
import { STATO_EVENTO_ICONS } from '../../lib/icons'
import { Icon } from '../ui/Icon'

const steps = ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']

export function EventStatusFlow({ stato }) {
  if (stato === 'cancellato') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-lg">
        <Icon icon={STATO_EVENTO_ICONS.cancellato} size={24} className="text-red-600" />
        <span className="text-base font-medium text-red-800">Evento annullato</span>
      </div>
    )
  }

  const currentIndex = steps.indexOf(stato)

  return (
    <div className="space-y-3 py-2">
      {/* Mobile: layout verticale */}
      <div className="flex md:hidden flex-col gap-1">
        {steps.map((step, i) => {
          const isDone = i < currentIndex
          const isCurrent = i === currentIndex
          const StepIcon = STATO_EVENTO_ICONS[step]

          return (
            <div key={step} className="flex items-center gap-3">
              {/* Icona step */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDone
                    ? 'bg-mikai-400 text-white'
                    : isCurrent
                      ? 'bg-mikai-100 text-mikai-700 ring-2 ring-mikai-400'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? (
                  <Icon name="check" size={18} />
                ) : (
                  <Icon icon={StepIcon} size={18} />
                )}
              </div>
              {/* Label */}
              <span className={`text-sm ${
                isCurrent ? 'font-semibold text-mikai-700' :
                isDone ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {STATO_EVENTO[step]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Desktop: layout orizzontale */}
      <div className="hidden md:flex items-center gap-1">
        {steps.map((step, i) => {
          const isDone = i < currentIndex
          const isCurrent = i === currentIndex
          const StepIcon = STATO_EVENTO_ICONS[step]

          return (
            <div key={step} className="flex items-center gap-1">
              {i > 0 && (
                <div className={`w-8 h-0.5 ${isDone ? 'bg-mikai-400' : 'bg-gray-200'}`} />
              )}
              <div className="flex flex-col items-center min-w-[72px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDone
                      ? 'bg-mikai-400 text-white'
                      : isCurrent
                        ? 'bg-mikai-100 text-mikai-700 ring-2 ring-mikai-400'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone ? (
                    <Icon name="check" size={18} />
                  ) : (
                    <Icon icon={StepIcon} size={18} />
                  )}
                </div>
                <span className={`text-sm mt-1 text-center ${isCurrent ? 'font-semibold text-mikai-700' : 'text-gray-400'}`}>
                  {STATO_EVENTO[step]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
