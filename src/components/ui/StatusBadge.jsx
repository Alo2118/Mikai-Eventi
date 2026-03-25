import { STATO_EVENTO, STATO_EVENTO_COLORE } from '../../lib/constants'
import { STATUS_COLOR_ICONS } from '../../lib/icons'
import { Icon } from './Icon'

const colorMap = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-mikai-100 text-mikai-700',
  mikai: 'bg-mikai-100 text-mikai-700',
  emerald: 'bg-emerald-100 text-emerald-800',
  purple: 'bg-purple-100 text-purple-800',
  gray: 'bg-gray-100 text-gray-600',
}

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
