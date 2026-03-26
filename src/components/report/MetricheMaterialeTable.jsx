import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { CARD_STYLE } from '../../lib/constants'

function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-sm font-medium text-gray-700 min-h-[48px] whitespace-nowrap"
      aria-label={`Ordina per ${label}`}
    >
      {label}
      {active && (
        <Icon
          icon={sortDir === 'asc' ? ACTION_ICONS.sortAsc : ACTION_ICONS.sortDesc}
          size={14}
        />
      )}
    </button>
  )
}

function rateColor(rate) {
  if (rate == null) return 'text-gray-400'
  if (rate >= 90) return 'text-green-600'
  if (rate >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export function MetricheMaterialeTable({ analytics, productNames }) {
  const [sortBy, setSortBy] = useState('count')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(field) {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  if (!analytics) {
    return (
      <div className={CARD_STYLE}>
        <p className="text-sm font-medium text-gray-500">Metriche materiale</p>
        <p className="text-gray-400 text-sm mt-2">Nessun dato disponibile</p>
      </div>
    )
  }

  // Build rows from analytics
  const rows = Object.entries(analytics.frequency || {}).map(([id, count]) => ({
    id,
    name: productNames?.[id] || `#${id?.slice(0, 8) || '?'}`,
    count,
    avgDays: analytics.avgDaysOut?.[id] ?? null,
    onTime: analytics.onTimeRateByMat?.[id] ?? null,
  }))

  const sorted = [...rows].sort((a, b) => {
    const aVal = a[sortBy] ?? -1
    const bVal = b[sortBy] ?? -1
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  return (
    <div className={CARD_STYLE}>
      <p className="text-sm font-medium text-gray-500 mb-4">Metriche materiale</p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4">Materiale</th>
              <th className="text-right px-2">
                <SortHeader label="Uso/anno" field="count" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right px-2">
                <SortHeader label="Gg medi" field="avgDays" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </th>
              <th className="text-right px-2">Rientro puntuale</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.id} className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium text-gray-900 truncate max-w-[200px]">{row.name}</td>
                <td className="py-3 px-2 text-right text-gray-700">{row.count}</td>
                <td className="py-3 px-2 text-right text-gray-700">
                  {row.avgDays != null ? `${row.avgDays}gg` : '\u2014'}
                </td>
                <td className={`py-3 px-2 text-right font-medium ${rateColor(row.onTime)}`}>
                  {row.onTime != null ? `${row.onTime}%` : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map(row => (
          <div key={row.id} className="border border-gray-200 rounded-lg p-3">
            <p className="font-medium text-gray-900 truncate">{row.name}</p>
            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
              <div>
                <p className="text-gray-400 text-sm">Uso/anno</p>
                <p className="font-medium">{row.count}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Gg medi</p>
                <p className="font-medium">{row.avgDays != null ? row.avgDays : '\u2014'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Puntuale</p>
                <p className={`font-medium ${rateColor(row.onTime)}`}>
                  {row.onTime != null ? `${row.onTime}%` : '\u2014'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">Nessun materiale utilizzato nel periodo</p>
      )}
    </div>
  )
}
