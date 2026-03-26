import { CARD_STYLE } from '../../lib/constants'
import { Icon } from '../ui/Icon'

export function KpiCard({ title, value, subtitle, valueColor, icon, className = '', children }) {
  return (
    <div className={CARD_STYLE + ' space-y-2' + (className ? ' ' + className : '')}>
      <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
        {icon && <Icon icon={icon} size={14} className="text-gray-400" />}
        {title}
      </p>
      {value !== undefined && value !== null && (
        <p className={`text-3xl font-bold ${valueColor || 'text-gray-900'}`}>
          {value}
        </p>
      )}
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
