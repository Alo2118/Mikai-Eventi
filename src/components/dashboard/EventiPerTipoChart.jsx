import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { TIPO_EVENTO_CHART_COLOR, TIPO_EVENTO } from '../../lib/constants'
import { KpiCard } from './KpiCard'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium">{d.label}</p>
      <p className="text-gray-600">{d.count} eventi</p>
    </div>
  )
}

export function EventiPerTipoChart({ data }) {
  const chartData = Object.entries(data || {}).map(([tipo, count]) => ({
    tipo,
    label: TIPO_EVENTO[tipo] || tipo,
    count,
  }))

  if (!chartData.length) {
    return (
      <KpiCard title="Eventi per tipo" subtitle="Nessun dato nel periodo selezionato" />
    )
  }

  return (
    <KpiCard title="Eventi per tipo">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fontSize: 13 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map(entry => (
                <Cell
                  key={entry.tipo}
                  fill={TIPO_EVENTO_CHART_COLOR[entry.tipo] || '#9ca3af'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Eventi per tipo</caption>
        <thead>
          <tr><th>Tipo</th><th>Conteggio</th></tr>
        </thead>
        <tbody>
          {chartData.map(d => (
            <tr key={d.tipo}>
              <td>{d.label}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </KpiCard>
  )
}
