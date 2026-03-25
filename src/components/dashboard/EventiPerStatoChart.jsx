import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { STATO_EVENTO_CHART_COLOR } from '../../lib/constants'
import { STATO_EVENTO } from '../../lib/constants'
import { KpiCard } from './KpiCard'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium">{STATO_EVENTO[d.stato] || d.stato}</p>
      <p className="text-gray-600">{d.count} eventi</p>
    </div>
  )
}

export function EventiPerStatoChart({ data }) {
  const chartData = Object.entries(data || {}).map(([stato, count]) => ({ stato, count }))
  const total = chartData.reduce((s, d) => s + d.count, 0)

  if (!chartData.length) {
    return (
      <KpiCard title="Eventi per stato" subtitle="Nessun dato nel periodo selezionato" />
    )
  }

  return (
    <KpiCard title="Eventi per stato" subtitle={`${total} eventi totali`}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="stato"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
            >
              {chartData.map(entry => (
                <Cell
                  key={entry.stato}
                  fill={STATO_EVENTO_CHART_COLOR[entry.stato] || '#9ca3af'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => STATO_EVENTO[value] || value}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Eventi per stato</caption>
        <thead>
          <tr><th>Stato</th><th>Conteggio</th></tr>
        </thead>
        <tbody>
          {chartData.map(d => (
            <tr key={d.stato}>
              <td>{STATO_EVENTO[d.stato] || d.stato}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </KpiCard>
  )
}
