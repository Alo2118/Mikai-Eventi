import { Link } from 'react-router-dom'
import { CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { EmptyState } from '../ui/EmptyState'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { formatDateRange, todayISO } from '../../lib/date-utils'

const SEMAPHORE = {
  red:    { bg: 'bg-red-500',    ring: 'ring-red-200',    label: 'Ritardi',     text: 'text-red-600',    barColor: 'bg-red-400' },
  yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-200', label: 'In corso',    text: 'text-yellow-600', barColor: 'bg-yellow-400' },
  green:  { bg: 'bg-green-500',  ring: 'ring-green-200',  label: 'In ordine',   text: 'text-green-600',  barColor: 'bg-green-500' },
  gray:   { bg: 'bg-gray-300',   ring: 'ring-gray-100',   label: 'Nessun dato', text: 'text-gray-400',   barColor: 'bg-gray-300' },
}

function daysUntilEvent(dataInizio) {
  if (!dataInizio) return null
  const today = todayISO()
  const start = dataInizio.slice(0, 10)
  if (start <= today) return 0
  return Math.ceil((new Date(start) - new Date(today)) / 86400000)
}

function daysLabel(days) {
  if (days === null) return null
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Domani'
  return `Tra ${days} giorni`
}

export function MyWorkEventsSection({ events, activityStatus, semaphores }) {
  if (!events || events.length === 0) {
    return (
      <div className={CARD_STYLE}>
        <h3 className="font-semibold text-lg mb-3">Eventi in lavorazione</h3>
        <EmptyState title="Nessun evento in lavorazione" description="Non ci sono eventi attivi con attività assegnate" />
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold text-lg mb-3">Eventi in lavorazione</h3>
      <div className="space-y-3">
        {events.map(e => {
          const sem = SEMAPHORE[semaphores[e.id] || 'gray']
          const status = activityStatus[e.id] || { total: 0, completate: 0, inRitardo: 0 }
          const days = daysUntilEvent(e.data_inizio)
          const pct = status.total > 0 ? Math.round((status.completate / status.total) * 100) : 0

          return (
            <Link key={e.id} to={`/eventi/${e.id}`} className={'block ' + CARD_HOVER_STYLE}>
              {/* Header: semaphore + title + countdown */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 flex flex-col items-center gap-0.5 w-12 pt-0.5">
                  <span className={`w-3.5 h-3.5 rounded-full ${sem.bg} ring-2 ${sem.ring}`} aria-hidden="true" />
                  <span className={`text-[10px] font-semibold leading-tight ${sem.text}`}>{sem.label}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base text-gray-900 truncate">{e.titolo}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{formatDateRange(e.data_inizio, e.data_fine)}</p>
                </div>
                {days !== null && (
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    days === 0 ? 'bg-emerald-100 text-emerald-700'
                    : days <= 3 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                    {daysLabel(days)}
                  </span>
                )}
              </div>

              {/* Progress bar + stats */}
              <div className="mt-3 pl-15">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${sem.barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 shrink-0 tabular-nums">
                    {status.completate}/{status.total}
                  </span>
                </div>
                {status.inRitardo > 0 && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    {status.inRitardo} {status.inRitardo === 1 ? 'attività in ritardo' : 'attività in ritardo'}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
