import { CARD_STYLE } from '../../lib/constants'

function TrafficLight({ total, completed, overdue }) {
  let status = 'yellow'
  let label = 'In corso'
  if (overdue > 0) { status = 'red'; label = `${overdue} in ritardo` }
  else if (total > 0 && completed === total) { status = 'green'; label = 'Tutto completato' }

  const colors = {
    red: { bg: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-600' },
    yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-200', text: 'text-yellow-600' },
    green: { bg: 'bg-green-500', ring: 'ring-green-200', text: 'text-green-600' },
  }
  const c = colors[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full ${c.bg} ring-2 ${c.ring}`} />
      <span className={`text-sm font-medium ${c.text}`}>{label}</span>
    </span>
  )
}

export function ActivityProgressSection({ total, completed, overdue }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Avanzamento</p>
          <p className="text-lg font-bold text-gray-900">{completed} di {total} completate</p>
        </div>
        <TrafficLight total={total} completed={completed} overdue={overdue} />
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all ${overdue > 0 ? 'bg-red-500' : completed === total ? 'bg-green-500' : 'bg-mikai-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 text-right">{pct}%</p>
    </div>
  )
}
