import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { CATEGORIA_ATTIVITA } from '../../lib/constants'
import { CATEGORIA_ICONS, ATTIVITA_STATO_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'

function urgencyLabel(deadline) {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  if (d < today) return { text: 'In ritardo', colorClass: 'text-red-600' }
  if (d.getTime() === today.getTime()) return { text: 'Oggi', colorClass: 'text-yellow-600' }
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
  if (diff <= 3) return { text: `Tra ${diff} giorni`, colorClass: 'text-mikai-600' }
  return null
}

function ActivityCard({ act }) {
  const urgency = urgencyLabel(act.deadline)
  const stato = act.stato

  return (
    <Link
      to={`/eventi/${act.evento?.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <Icon
          icon={CATEGORIA_ICONS[act.categoria] || FEEDBACK_ICONS.info}
          size={20}
          className="mt-0.5 shrink-0 text-gray-500"
        />
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900">{act.descrizione}</p>
          <p className="text-sm text-gray-500 truncate mt-0.5">{act.evento?.titolo}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {act.categoria && (
              <span className="text-xs text-gray-400">{CATEGORIA_ATTIVITA[act.categoria]}</span>
            )}
            {act.deadline && (
              <span className={`text-xs font-medium ${urgency?.colorClass || 'text-gray-400'}`}>
                {urgency ? urgency.text + ' · ' : ''}{formatDate(act.deadline)}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Icon icon={ATTIVITA_STATO_ICONS[stato] || ATTIVITA_STATO_ICONS.da_fare} size={13} />
              {stato === 'da_fare' ? 'Da fare' : stato === 'in_corso' ? 'In corso' : stato}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function MieAttivitaPage() {
  const myActivities = useActivitiesStore(s => s.myActivities)
  const loading = useActivitiesStore(s => s.myLoading)
  const fetchMyActivities = useActivitiesStore(s => s.fetchMyActivities)
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    if (user?.id) fetchMyActivities(user.id)
  }, [user?.id])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdue = myActivities.filter(a => a.deadline && new Date(a.deadline) < today)
  const upcoming = myActivities.filter(a => !a.deadline || new Date(a.deadline) >= today)

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Le mie attività' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Le mie attività" />
      </div>
      <PageHeader
        title="Le mie attività"
        subtitle="Attività assegnate a te, ordinate per urgenza"
      />
      <div className="px-6 md:px-8 pb-8">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : myActivities.length === 0 ? (
          <EmptyState
            title="Nessuna attività"
            description="Non hai attività in corso al momento."
          />
        ) : (
          <div className="space-y-6">
            {overdue.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-red-600 mb-2">
                  In ritardo ({overdue.length})
                </h3>
                <div className="space-y-2">
                  {overdue.map(act => <ActivityCard key={act.id} act={act} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-2">
                  Prossime ({upcoming.length})
                </h3>
                <div className="space-y-2">
                  {upcoming.map(act => <ActivityCard key={act.id} act={act} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
