import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Icon } from '../../components/ui/Icon'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { STATO_EVENTO, STATO_EVENTO_COLORE } from '../../lib/constants'
import { FEEDBACK_ICONS } from '../../lib/icons'
import { formatDate, formatDateRange } from '../../lib/date-utils'
import { supabase } from '../../lib/supabase'

function budgetFormatted(val) {
  if (!val) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

function currentQuarterBudget(events) {
  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0)

  return events
    .filter(e => {
      if (!['confermato', 'in_preparazione', 'pronto', 'in_corso'].includes(e.stato)) return false
      const d = new Date(e.data_inizio)
      return d >= qStart && d <= qEnd
    })
    .reduce((sum, e) => sum + (e.budget_previsto || 0), 0)
}

function SemaphoreIcon({ status }) {
  if (status === 'red') {
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
        <Icon icon={FEEDBACK_ICONS.error} size={16} />
        Attività scadute
      </span>
    )
  }
  if (status === 'green') {
    return (
      <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
        <Icon icon={FEEDBACK_ICONS.success} size={16} />
        Tutto in ordine
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
      <Icon icon={FEEDBACK_ICONS.warning} size={16} />
      In corso
    </span>
  )
}

export function DashboardStrategica() {
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const fetchEvents = useEventsStore(s => s.fetchEvents)
  const [semaphores, setSemaphores] = useState({})

  useEffect(() => { fetchEvents() }, [])

  useEffect(() => {
    if (!events.length) return
    const today = new Date()
    const upcoming = events
      .filter(e => new Date(e.data_inizio) >= today)
      .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio))
      .slice(0, 10)

    if (!upcoming.length) return
    const ids = upcoming.map(e => e.id)

    supabase
      .from('event_activities')
      .select('event_id, stato, obbligatoria, deadline')
      .in('event_id', ids)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        const today2 = new Date()
        for (const act of data) {
          if (!map[act.event_id]) map[act.event_id] = { hasOverdue: false, allDone: true }
          if (act.stato === 'completata') continue
          map[act.event_id].allDone = false
          if (act.obbligatoria && act.deadline && new Date(act.deadline) < today2) {
            map[act.event_id].hasOverdue = true
          }
        }
        const result = {}
        for (const id of ids) {
          const s = map[id]
          if (!s) { result[id] = 'green'; continue }
          if (s.hasOverdue) result[id] = 'red'
          else if (s.allDone) result[id] = 'green'
          else result[id] = 'yellow'
        }
        setSemaphores(result)
      })
  }, [events])

  const proposti = events.filter(e => e.stato === 'proposto')

  const today = new Date()
  const upcomingEvents = events
    .filter(e => new Date(e.data_inizio) >= today)
    .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio))
    .slice(0, 10)

  const quarterBudget = currentQuarterBudget(events)

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Dashboard Direzione' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Dashboard Direzione" />
      </div>
      <PageHeader title="Dashboard Direzione" subtitle="Panoramica strategica degli eventi" />

      <div className="px-6 md:px-8 space-y-8 pb-8">
        {loading ? (
          <LoadingSkeleton lines={6} />
        ) : (
          <>
            {/* Budget trimestre */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-700 mb-1">Budget trimestre corrente</h2>
              <p className="text-3xl font-bold text-mikai-400">{budgetFormatted(quarterBudget)}</p>
              <p className="text-sm text-gray-500 mt-1">Somma eventi approvati e in corso nel trimestre</p>
            </div>

            {/* Coda approvazioni */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Coda approvazioni
                {proposti.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-yellow-100 text-yellow-700 text-sm font-bold rounded-full w-6 h-6">
                    {proposti.length}
                  </span>
                )}
              </h2>
              {proposti.length === 0 ? (
                <p className="text-gray-500 text-base">Nessun evento in attesa di approvazione.</p>
              ) : (
                <div className="space-y-3">
                  {proposti.map(event => (
                    <Link
                      key={event.id}
                      to={`/eventi/${event.id}`}
                      className="block bg-white rounded-xl border-l-4 border-l-yellow-400 border border-gray-200 p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">{event.titolo}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : '—'}
                            {event.data_inizio && ` · ${formatDate(event.data_inizio)}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {event.budget_previsto && (
                            <p className="text-sm font-semibold text-gray-700">{budgetFormatted(event.budget_previsto)}</p>
                          )}
                          <StatusBadge
                            stato={event.stato}
                            labels={STATO_EVENTO}
                            colors={STATO_EVENTO_COLORE}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Semafori prossimi eventi */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Prossimi eventi</h2>
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-base">Nessun evento in programma.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <Link
                      key={event.id}
                      to={`/eventi/${event.id}`}
                      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">{event.titolo}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {formatDateRange(event.data_inizio, event.data_fine)}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <StatusBadge
                            stato={event.stato}
                            labels={STATO_EVENTO}
                            colors={STATO_EVENTO_COLORE}
                          />
                          {semaphores[event.id] && (
                            <SemaphoreIcon status={semaphores[event.id]} />
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
