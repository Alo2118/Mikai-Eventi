import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { CHART_COLORS } from '../../lib/constants'
import { formatCurrency } from '../../lib/format-utils'
import { KpiCard } from './KpiCard'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export function BudgetBreakdownChart({ data }) {
  if (!data?.length) {
    return (
      <KpiCard title="Budget per mese" subtitle="Nessun dato nel periodo selezionato" />
    )
  }

  return (
    <KpiCard title="Budget per mese">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 10 }}>
            <XAxis dataKey="meseLabel" tick={{ fontSize: 13 }} />
            <YAxis
              tickFormatter={v => `${Math.round(v / 1000)}k`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="previsto"
              name="Previsto"
              fill={CHART_COLORS.mikai}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="approvato"
              name="Approvato"
              fill={CHART_COLORS.green}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="effettivo"
              name="Effettivo"
              fill={CHART_COLORS.blue}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Budget per mese</caption>
        <thead>
          <tr>
            <th>Mese</th><th>Previsto</th><th>Approvato</th><th>Effettivo</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.mese}>
              <td>{d.meseLabel}</td>
              <td>{formatCurrency(d.previsto)}</td>
              <td>{formatCurrency(d.approvato)}</td>
              <td>{formatCurrency(d.effettivo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </KpiCard>
  )
}
