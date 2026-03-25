import { KpiCard } from './KpiCard'
import { Icon } from '../ui/Icon'
import { DASHBOARD_ICONS } from '../../lib/icons'

export function AttivitaInRitardoKpi({ count, trend }) {
  const color = count > 0 ? 'text-red-600' : 'text-green-600'
  const trendIcon = trend > 0
    ? DASHBOARD_ICONS.trendUp
    : trend < 0
      ? DASHBOARD_ICONS.trendDown
      : null
  const trendColor = trend > 0 ? 'text-red-500' : 'text-green-500'
  const trendLabel = trend > 0
    ? `+${trend} rispetto al periodo precedente`
    : trend < 0
      ? `${trend} rispetto al periodo precedente`
      : 'Stabile'

  return (
    <KpiCard
      title="Attività in ritardo"
      value={count}
      valueColor={color}
      subtitle={count === 0 ? 'Tutto in regola' : `${count} obbligatorie scadute`}
    >
      <div className="flex items-center gap-2 text-sm" aria-label={trendLabel}>
        {trendIcon && (
          <Icon icon={trendIcon} size={16} className={trendColor} />
        )}
        <span className={`${trendColor} font-medium`}>{trendLabel}</span>
      </div>
    </KpiCard>
  )
}
