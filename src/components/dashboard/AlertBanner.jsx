import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'
import { todayISO, subtractDays } from '../../lib/date-utils'

export function AlertBanner() {
  const myActivities = useActivitiesStore(s => s.myActivities)
  const fetchMyActivities = useActivitiesStore(s => s.fetchMyActivities)
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) fetchMyActivities(user.id)
  }, [user?.id])

  const today = todayISO()
  const in3 = subtractDays(today, -3)

  let overdue = 0, todayCount = 0, soon = 0

  for (const act of myActivities) {
    if (!act.deadline) continue
    const dl = act.deadline.slice(0, 10)
    if (dl < today) overdue++
    else if (dl === today) todayCount++
    else if (dl <= in3) soon++
  }

  if (overdue === 0 && todayCount === 0 && soon === 0) return null

  return (
    <button
      onClick={() => navigate('/mie-attivita')}
      className="w-full flex items-center gap-3 px-6 md:px-8 py-3 bg-yellow-50 border-y border-yellow-200 hover:bg-yellow-100 transition-colors text-left min-h-[48px]"
      aria-label="Vai alle mie attività"
    >
      <Icon icon={FEEDBACK_ICONS.warning} size={20} className="text-yellow-600 shrink-0" />
      <div className="flex items-center gap-4 flex-wrap text-sm font-medium">
        {overdue > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <Icon icon={FEEDBACK_ICONS.error} size={16} />
            {overdue} {overdue === 1 ? 'attività in ritardo' : 'attività in ritardo'}
          </span>
        )}
        {todayCount > 0 && (
          <span className="text-yellow-700">
            {todayCount} {todayCount === 1 ? 'attività in scadenza oggi' : 'attività in scadenza oggi'}
          </span>
        )}
        {soon > 0 && (
          <span className="text-gray-600">
            {soon} {soon === 1 ? 'attività nei prossimi 3 giorni' : 'attività nei prossimi 3 giorni'}
          </span>
        )}
      </div>
      <Icon icon={FEEDBACK_ICONS.info} size={16} className="text-gray-400 ml-auto shrink-0" />
    </button>
  )
}
