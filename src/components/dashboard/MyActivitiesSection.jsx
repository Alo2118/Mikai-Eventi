import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { CATEGORIA_ICONS, FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { formatDate, todayISO } from '../../lib/date-utils'
import { CARD_STYLE } from '../../lib/constants'

// Returns days until deadline: negative = overdue, 0 = today, positive = future
function daysUntil(deadlineStr) {
  if (!deadlineStr) return null
  const today = new Date(todayISO())
  const d = new Date(deadlineStr.slice(0, 10))
  return Math.round((d - today) / (1000 * 60 * 60 * 24))
}

function urgencyClasses(days) {
  if (days === null) return { text: 'text-gray-500', icon: 'text-gray-400', badge: 'bg-gray-100 text-gray-600' }
  if (days < 0)  return { text: 'text-red-600',   icon: 'text-red-500',   badge: 'bg-red-100 text-red-700' }
  if (days < 3)  return { text: 'text-red-600',   icon: 'text-red-500',   badge: 'bg-red-100 text-red-700' }
  if (days <= 7) return { text: 'text-yellow-600', icon: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-700' }
  return           { text: 'text-green-600',  icon: 'text-green-500',  badge: 'bg-green-100 text-green-700' }
}

function deadlineLabel(days) {
  if (days === null) return 'Nessuna scadenza'
  if (days < 0)  return `${Math.abs(days)}g in ritardo`
  if (days === 0) return 'Scade oggi'
  if (days === 1) return 'Scade domani'
  return `Tra ${days} giorni`
}

function ActivityRow({ act }) {
  const days = daysUntil(act.deadline)
  const cls = urgencyClasses(days)

  return (
    <Link
      to={`/eventi/${act.evento?.id}`}
      className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Icon
          icon={CATEGORIA_ICONS[act.categoria] || FEEDBACK_ICONS.info}
          size={18}
          className={`mt-0.5 shrink-0 ${cls.icon}`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-base truncate">{act.descrizione}</p>
          <p className="text-sm text-gray-500 truncate">{act.evento?.titolo}</p>
        </div>
        {act.deadline && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${cls.badge}`}>
            {deadlineLabel(days)}
          </span>
        )}
      </div>
    </Link>
  )
}

export function MyActivitiesSection({ activities }) {
  // Sort: overdue first, then by deadline ascending, then those without deadline
  const sorted = [...activities].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return a.deadline.localeCompare(b.deadline)
  }).slice(0, 5)

  return (
    <div className={CARD_STYLE}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Prossime scadenze</h3>
        <Link
          to="/mie-attivita"
          className="text-sm text-mikai-400 hover:underline min-h-[48px] flex items-center"
        >
          Vedi tutte
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="Nessuna attività assegnata" description="Non hai attività in scadenza" />
      ) : (
        <div className="space-y-2">
          {sorted.map(act => (
            <ActivityRow key={act.id} act={act} />
          ))}
        </div>
      )}
    </div>
  )
}
