import { STATO_EVENTO, STATO_EVENTO_COLORE, COLOR_BADGE } from '../../lib/constants'
import { STATUS_COLOR_ICONS } from '../../lib/icons'
import { Icon } from './Icon'

// Alias 'indigo' → mikai for backward compatibility
const colorMap = { ...COLOR_BADGE, indigo: COLOR_BADGE.mikai }

export function StatusBadge({ stato, labels = STATO_EVENTO, colors = STATO_EVENTO_COLORE }) {
  const color = colors[stato] || 'gray'
  const label = labels[stato] || stato
  const IconComp = STATUS_COLOR_ICONS[color]

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colorMap[color]}`}>
      {IconComp && <Icon icon={IconComp} size={14} />}
      {label}
    </span>
  )
}
