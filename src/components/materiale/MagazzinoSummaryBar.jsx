import { Icon } from '../ui/Icon'
import { CARD_HOVER_STYLE } from '../../lib/constants'

const SEVERITY_STYLES = {
  green: { bg: 'bg-green-50', border: 'border-green-200', count: 'text-green-700', label: 'text-green-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', count: 'text-yellow-700', label: 'text-yellow-800' },
  red: { bg: 'bg-red-50', border: 'border-red-200', count: 'text-red-700', label: 'text-red-800' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', count: 'text-gray-700', label: 'text-gray-700' },
}

function KpiCard({ label, count, hint, severity, icon, onClick }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.gray
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${style.bg} ${style.border} border rounded-xl p-4 text-left min-h-[96px] transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-mikai-400`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-3xl font-bold ${style.count}`}>{count}</div>
          <div className={`text-sm font-semibold mt-1 ${style.label}`}>{label}</div>
          {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
        </div>
        {icon && (
          <Icon icon={icon} size={24} className={style.count} />
        )}
      </div>
    </button>
  )
}

export function MagazzinoSummaryBar({ kpis }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <KpiCard key={k.id} {...k} />
      ))}
    </div>
  )
}
