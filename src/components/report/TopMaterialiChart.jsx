import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { CHART_COLORS, CARD_STYLE } from '../../lib/constants'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium">{d.label}</p>
      <p className="text-gray-600">{d.count} utilizzi</p>
    </div>
  )
}

export function TopMaterialiChart({ data, productNames, onBarClick }) {
  const chartData = (data || []).map(item => ({
    ...item,
    label: productNames?.[item.id] || `#${item.id?.slice(0, 8) || '?'}`,
  }))

  if (!chartData.length) {
    return (
      <div className={CARD_STYLE}>
        <p className="text-sm font-medium text-gray-500 mb-2">Materiale più utilizzato</p>
        <p className="text-gray-400 text-sm">Nessun dato disponibile</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-500 mb-4">Top 10 materiale più utilizzato</p>
      <div style={{ height: Math.max(200, chartData.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill={CHART_COLORS.mikai}
              radius={[0, 4, 4, 0]}
              cursor={onBarClick ? 'pointer' : undefined}
              onClick={onBarClick ? (entry) => onBarClick(entry.id) : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Top materiale utilizzato</caption>
        <thead>
          <tr><th>Materiale</th><th>Utilizzi</th></tr>
        </thead>
        <tbody>
          {chartData.map(d => (
            <tr key={d.id}><td>{d.label}</td><td>{d.count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
