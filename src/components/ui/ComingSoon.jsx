import { Icon } from './Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'

export function ComingSoon({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-mikai-50 rounded-full flex items-center justify-center mb-4">
        <Icon icon={FEEDBACK_ICONS.info} size={28} className="text-mikai-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-base text-gray-500 max-w-sm">
        {description || 'Questa funzionalità sarà disponibile nelle prossime versioni.'}
      </p>
    </div>
  )
}
