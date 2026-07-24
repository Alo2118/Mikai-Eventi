import { KpiCard } from './KpiCard'
import { Icon } from '../ui/Icon'
import { DASHBOARD_ICONS } from '../../lib/icons'
import { formatCurrency } from '../../lib/format-utils'

function DeltaBadge({ delta, pct, format }) {
  const up = delta > 0
  const neutral = delta === 0
  const color = neutral ? 'text-gray-400' : (up ? 'text-green-600' : 'text-red-500')
  const icon = neutral ? null : (up ? DASHBOARD_ICONS.trendUp : DASHBOARD_ICONS.trendDown)
  const sign = up ? '+' : ''
  const shown = format ? format(delta) : `${delta}`
  const label = neutral ? 'Stabile' : `${sign}${shown} (${sign}${pct}%)`
  return (
    <div className={`flex items-center gap-1.5 text-sm font-medium ${color}`}>
      {icon && <Icon icon={icon} size={16} className={color} />}
      <span>{label}</span>
    </div>
  )
}

export function BusinessMetricsSection({ costMetrics, confrontoYoY }) {
  const baseLabel = costMetrics?.baseCosto === 'consuntivo' ? 'su consuntivo' : 'su budget previsto'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KpiCard
        title="Costo medio per evento"
        value={formatCurrency(costMetrics?.costoMedioEvento || 0)}
        subtitle={`${costMetrics?.eventiCount || 0} eventi · ${baseLabel}`}
        icon={DASHBOARD_ICONS.report}
      />
      <KpiCard
        title="Costo per partecipante"
        value={formatCurrency(costMetrics?.costoPerPartecipante || 0)}
        subtitle={`${costMetrics?.partecipantiTotale || 0} partecipanti · ${baseLabel}`}
        icon={DASHBOARD_ICONS.report}
      />
      {confrontoYoY && (
        <KpiCard
          title="Eventi vs anno scorso"
          value={confrontoYoY.eventiCorrente}
          subtitle={`Anno precedente: ${confrontoYoY.eventiPrecedente}`}
        >
          <DeltaBadge delta={confrontoYoY.deltaEventi} pct={confrontoYoY.deltaEventiPct} />
        </KpiCard>
      )}
      {confrontoYoY && (
        <KpiCard
          title="Budget vs anno scorso"
          value={formatCurrency(confrontoYoY.budgetCorrente)}
          subtitle={`Anno precedente: ${formatCurrency(confrontoYoY.budgetPrecedente)}`}
        >
          <DeltaBadge delta={confrontoYoY.deltaBudget} pct={confrontoYoY.deltaBudgetPct} format={formatCurrency} />
        </KpiCard>
      )}
    </div>
  )
}
