import { WIZARD_STEP_ICONS } from '../../lib/icons'
import { Icon } from '../ui/Icon'

const steps = [
  { key: 'tipo', label: 'Tipo' },
  { key: 'dove', label: 'Dove e quando' },
  { key: 'modalita', label: 'Modalità' },
  { key: 'riepilogo', label: 'Riepilogo' },
]

export function WizardStepIndicator({ current }) {
  return (
    <div className="py-4">
      {/* Progress bar continua */}
      <div className="relative mx-auto max-w-md mb-4">
        <div className="h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-1.5 bg-mikai-400 rounded-full transition-all duration-300"
            style={{ width: `${(current / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step icons */}
      <div className="flex items-start justify-between max-w-md mx-auto">
        {steps.map((step, i) => {
          const isDone = i < current
          const isCurrent = i === current
          const StepIcon = WIZARD_STEP_ICONS[step.key]

          return (
            <div key={step.key} className="flex flex-col items-center w-20">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isDone
                    ? 'bg-mikai-400 text-white'
                    : isCurrent
                      ? 'bg-mikai-100 text-mikai-700 ring-2 ring-mikai-400 shadow-sm'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? (
                  <Icon name="check" size={22} strokeWidth={2.5} />
                ) : (
                  <Icon icon={StepIcon} size={22} />
                )}
              </div>
              <span className={`text-sm mt-1.5 text-center leading-tight ${
                isCurrent ? 'font-semibold text-mikai-700' :
                isDone ? 'font-medium text-mikai-500' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
