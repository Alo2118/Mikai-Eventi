import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { CATEGORIA_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'

function urgencyGroup(activities) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in3 = new Date(today)
  in3.setDate(today.getDate() + 3)

  const groups = { overdue: [], today: [], in3days: [] }
  for (const act of activities) {
    if (!act.deadline) continue
    const d = new Date(act.deadline)
    const dStr = d.toDateString()
    if (dStr === today.toDateString()) groups.today.push(act)
    else if (d < today) groups.overdue.push(act)
    else if (d < in3) groups.in3days.push(act)
  }
  return groups
}

function ActivityItem({ act, colorClass, iconClass }) {
  return (
    <Link
      to={`/eventi/${act.evento?.id}`}
      className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <Icon icon={CATEGORIA_ICONS[act.categoria] || FEEDBACK_ICONS.info} size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-base truncate">{act.descrizione}</p>
          <p className="text-sm text-gray-500 truncate">{act.evento?.titolo}</p>
          {act.deadline && <p className={`text-xs mt-0.5 ${colorClass}`}>Scadenza: {formatDate(act.deadline)}</p>}
        </div>
      </div>
    </Link>
  )
}

export function MyActivitiesSection({ activities }) {
  const groups = urgencyGroup(activities)
  const urgent = [...groups.overdue, ...groups.today, ...groups.in3days].slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Attività urgenti</h3>
        <Link to="/mie-attivita" className="text-sm text-mikai-400 hover:underline min-h-[48px] flex items-center">
          Vedi tutte
        </Link>
      </div>

      {urgent.length === 0 ? (
        <EmptyState title="Nessuna attività urgente" description="Tutto sotto controllo" />
      ) : (
        <div className="space-y-2">
          {groups.overdue.slice(0, 5).map(act => (
            <ActivityItem key={act.id} act={act} colorClass="text-red-600" iconClass="text-red-500" />
          ))}
          {groups.today.slice(0, 5 - groups.overdue.length).map(act => (
            <ActivityItem key={act.id} act={act} colorClass="text-yellow-600" iconClass="text-yellow-500" />
          ))}
          {groups.in3days.slice(0, 5 - groups.overdue.length - groups.today.length).map(act => (
            <ActivityItem key={act.id} act={act} colorClass="text-mikai-600" iconClass="text-mikai-500" />
          ))}
        </div>
      )}
    </div>
  )
}
