import { Icon } from './Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Icon icon={icon || FEEDBACK_ICONS.empty} size={24} className="text-gray-400" />
      </div>
      <p className="text-base font-medium text-gray-600">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
