import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { useToastStore } from '../../components/ui/Toast'
import { CATEGORIA_ATTIVITA, CARD_HOVER_STYLE, PERMESSO_SHORT_LABELS, PERMESSO_BADGE_COLORE } from '../../lib/constants'
import { CATEGORIA_ICONS, ATTIVITA_STATO_ICONS, FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'

const COLOR_CLASSES = {
  gray: 'text-gray-500 bg-gray-100',
  mikai: 'text-mikai-600 bg-mikai-50',
  green: 'text-green-700 bg-green-100',
  red: 'text-red-700 bg-red-100',
  blue: 'text-blue-700 bg-blue-100',
  purple: 'text-purple-700 bg-purple-100',
  emerald: 'text-emerald-700 bg-emerald-100',
  yellow: 'text-yellow-700 bg-yellow-100',
}

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

function MyActivityCard({ act }) {
  const urgency = urgencyLabel(act.deadline)
  const stato = act.stato

  return (
    <Link
      to={`/eventi/${act.evento?.id}`}
      className={'block ' + CARD_HOVER_STYLE}
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
              <span className="text-sm text-gray-500">{CATEGORIA_ATTIVITA[act.categoria]}</span>
            )}
            {act.deadline && (
              <span className={`text-sm font-medium ${urgency?.colorClass || 'text-gray-500'}`}>
                {urgency ? urgency.text + ' · ' : ''}{formatDate(act.deadline)}
              </span>
            )}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Icon icon={ATTIVITA_STATO_ICONS[stato] || ATTIVITA_STATO_ICONS.da_fare} size={13} />
              {stato === 'da_fare' ? 'Da fare' : stato === 'in_corso' ? 'In corso' : stato}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function UnclaimedActivityCard({ act, onClaim, claiming }) {
  const urgency = urgencyLabel(act.deadline)
  const badgeColor = PERMESSO_BADGE_COLORE[act.permesso_responsabile] || 'gray'
  const badgeClasses = COLOR_CLASSES[badgeColor] || COLOR_CLASSES.gray

  return (
    <div className={CARD_HOVER_STYLE + ' space-y-2'}>
      <Link to={`/eventi/${act.evento?.id}`} className="block">
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
              {act.permesso_responsabile && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClasses}`}>
                  {PERMESSO_SHORT_LABELS[act.permesso_responsabile] || act.permesso_responsabile}
                </span>
              )}
              {act.deadline && (
                <span className={`text-sm font-medium ${urgency?.colorClass || 'text-gray-500'}`}>
                  {urgency ? urgency.text + ' · ' : ''}{formatDate(act.deadline)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="pl-8">
        <button
          onClick={() => onClaim(act.id)}
          disabled={claiming === act.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-mikai-700 bg-mikai-50 hover:bg-mikai-100 rounded-lg transition-colors min-h-[48px]"
          aria-label={`Prendi in carico: ${act.descrizione}`}
        >
          <Icon icon={ACTION_ICONS.check} size={14} />
          Prendi in carico
        </button>
      </div>
    </div>
  )
}

export function MieAttivitaPage() {
  const myActivities = useActivitiesStore(s => s.myActivities)
  const loading = useActivitiesStore(s => s.myLoading)
  const fetchMyActivities = useActivitiesStore(s => s.fetchMyActivities)
  const unclaimedActivities = useActivitiesStore(s => s.unclaimedActivities)
  const unclaimedLoading = useActivitiesStore(s => s.unclaimedLoading)
  const fetchUnclaimedActivities = useActivitiesStore(s => s.fetchUnclaimedActivities)
  const assignActivity = useActivitiesStore(s => s.assignActivity)
  const user = useAuthStore(s => s.user)
  const permissions = useAuthStore(s => s.permissions)
  const addToast = useToastStore(s => s.add)

  const [claiming, setClaiming] = useState(null)

  useEffect(() => {
    if (user?.id) fetchMyActivities(user.id)
  }, [user?.id])

  useEffect(() => {
    if (permissions?.length > 0) fetchUnclaimedActivities(permissions)
  }, [permissions])

  async function handleClaim(activityId) {
    setClaiming(activityId)
    const { error } = await assignActivity(activityId, user.id)
    setClaiming(null)
    if (error) {
      addToast('Impossibile prendere in carico l\'attività.', 'error')
    } else {
      addToast('Attività presa in carico!', 'success')
      fetchMyActivities(user.id)
      fetchUnclaimedActivities(permissions)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdue = myActivities.filter(a => a.deadline && new Date(a.deadline) < today)
  const upcoming = myActivities.filter(a => !a.deadline || new Date(a.deadline) >= today)

  const unclaimedOverdue = unclaimedActivities.filter(a => a.deadline && new Date(a.deadline) < today)
  const unclaimedUpcoming = unclaimedActivities.filter(a => !a.deadline || new Date(a.deadline) >= today)

  const totalUnclaimed = unclaimedActivities.length

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Le mie attività' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Le mie attività" />
      </div>
      <PageHeader
        title="Le mie attività"
        subtitle={`${myActivities.length} assegnate a te${totalUnclaimed > 0 ? ` · ${totalUnclaimed} da prendere in carico` : ''}`}
      />
      <div className="px-4 md:px-8 pb-8 space-y-8">
        {/* Sezione: Le mie attività */}
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : myActivities.length === 0 ? (
          <EmptyState
            title="Nessuna attività assegnata"
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
                  {overdue.map(act => <MyActivityCard key={act.id} act={act} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-2">
                  Prossime ({upcoming.length})
                </h3>
                <div className="space-y-2">
                  {upcoming.map(act => <MyActivityCard key={act.id} act={act} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sezione: Da prendere in carico */}
        {permissions?.length > 0 && (
          <div>
            <h2 className="font-semibold text-lg text-gray-900 mb-1">Da prendere in carico</h2>
            <p className="text-sm text-gray-500 mb-4">
              Attività non ancora assegnate nel tuo ambito di responsabilità
            </p>
            {unclaimedLoading ? (
              <LoadingSkeleton lines={3} />
            ) : unclaimedActivities.length === 0 ? (
              <EmptyState
                title="Tutto assegnato"
                description="Non ci sono attività in attesa di presa in carico nella tua area."
              />
            ) : (
              <div className="space-y-6">
                {unclaimedOverdue.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-red-600 mb-2">
                      In ritardo ({unclaimedOverdue.length})
                    </h3>
                    <div className="space-y-2">
                      {unclaimedOverdue.map(act => (
                        <UnclaimedActivityCard key={act.id} act={act} onClaim={handleClaim} claiming={claiming} />
                      ))}
                    </div>
                  </div>
                )}
                {unclaimedUpcoming.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-2">
                      Da assegnare ({unclaimedUpcoming.length})
                    </h3>
                    <div className="space-y-2">
                      {unclaimedUpcoming.map(act => (
                        <UnclaimedActivityCard key={act.id} act={act} onClaim={handleClaim} claiming={claiming} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
