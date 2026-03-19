import { useEffect } from 'react'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ActivityCard } from './ActivityCard'
import { ActivityGateBar } from './ActivityGateBar'
import { CATEGORIA_ATTIVITA } from '../../lib/constants'
import { FEEDBACK_ICONS, CATEGORIA_ICONS } from '../../lib/icons'

function TrafficLight({ total, completed, overdue }) {
  if (overdue > 0) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <Icon icon={FEEDBACK_ICONS.warning} size={18} />
        <span className="text-sm font-semibold">Ritardi</span>
      </div>
    )
  }
  if (total > 0 && completed === total) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Icon icon={FEEDBACK_ICONS.success} size={18} />
        <span className="text-sm font-semibold">In ordine</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-yellow-600">
      <Icon icon={FEEDBACK_ICONS.warning} size={18} />
      <span className="text-sm font-semibold">In corso</span>
    </div>
  )
}

export function EventPreparazioneTab({ event }) {
  const eventActivities = useActivitiesStore(s => s.eventActivities)
  const loading = useActivitiesStore(s => s.eventLoading)
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)
  const startActivity = useActivitiesStore(s => s.startActivity)
  const completeActivity = useActivitiesStore(s => s.completeActivity)
  const assignActivity = useActivitiesStore(s => s.assignActivity)
  const instantiateTemplate = useActivitiesStore(s => s.instantiateTemplate)

  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    fetchEventActivities(event.id)
  }, [event.id])

  if (loading) return <LoadingSkeleton lines={5} />

  const visible = eventActivities.filter(a => a.stato !== 'disattivata')
  const now = new Date()
  const total = visible.length
  const completed = visible.filter(a => a.stato === 'completata').length
  const overdue = visible.filter(
    a => ['da_fare', 'in_corso'].includes(a.stato) && a.deadline && new Date(a.deadline) < now
  ).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  async function handleStart(activityId) {
    const { error } = await startActivity(activityId)
    if (error) {
      addToast('Impossibile avviare l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività avviata.', 'success')
      fetchEventActivities(event.id)
    }
  }

  async function handleComplete(activityId) {
    const { error } = await completeActivity(activityId, user?.id)
    if (error) {
      addToast('Impossibile completare l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività completata.', 'success')
      fetchEventActivities(event.id)
    }
  }

  async function handleAssign(activityId, userId) {
    const { error } = await assignActivity(activityId, userId)
    if (error) {
      addToast('Impossibile assegnare l\'attività. Riprova.', 'error')
    } else {
      addToast('Attività assegnata a te.', 'success')
      fetchEventActivities(event.id)
    }
  }

  async function handleInstantiateTemplate() {
    const { error } = await instantiateTemplate(
      event.id,
      event.tipo_evento,
      event.modalita,
      event.data_inizio
    )
    if (error) {
      addToast(`Nessun template trovato per questo tipo di evento.`, 'warning')
    } else {
      addToast('Attività create dal template.', 'success')
    }
  }

  if (total === 0) {
    return (
      <EmptyState
        title="Nessuna attività"
        description="Non ci sono attività di preparazione per questo evento."
        action={
          event.stato === 'confermato' ? (
            <Button variant="primary" onClick={handleInstantiateTemplate}>
              Crea attività dal template
            </Button>
          ) : null
        }
      />
    )
  }

  // Group by category
  const grouped = {}
  for (const act of visible) {
    const cat = act.categoria || 'organizzazione'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(act)
  }

  return (
    <div className="space-y-6">
      {/* Progress section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
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

      {/* Gate bar */}
      <ActivityGateBar event={event} activities={visible} />

      {/* Activities grouped by category */}
      {Object.entries(grouped).map(([categoria, acts]) => (
        <div key={categoria} className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon icon={CATEGORIA_ICONS[categoria]} size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              {CATEGORIA_ATTIVITA[categoria] || categoria}
            </h3>
            <span className="text-xs text-gray-400">
              ({acts.filter(a => a.stato === 'completata').length}/{acts.length})
            </span>
          </div>
          <div className="space-y-2">
            {acts.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onStart={handleStart}
                onComplete={handleComplete}
                onAssign={handleAssign}
                currentUserId={user?.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
