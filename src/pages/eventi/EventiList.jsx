import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useCostsStore } from '../../hooks/useCosts'
import { useExportHandler } from '../../hooks/useExportHandler'
import { EventCard } from '../../components/eventi/EventCard'
import { EventFilters } from '../../components/eventi/EventFilters'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { NAV_ICONS, ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { TIPO_EVENTO, STATO_EVENTO } from '../../lib/constants'
import { useEventTypes } from '../../hooks/useEventTypes'
import { formatDate, todayISO, monthFloorISO } from '../../lib/date-utils'
import { getPromotoreName } from '../../lib/format-utils'

const EXPORT_COLUMNS_EVENTI = [
  { key: 'titolo', label: 'Titolo', width: 30 },
  { key: 'tipo_evento', label: 'Tipo', format: v => TIPO_EVENTO[v] || v },
  { key: 'stato', label: 'Stato', format: v => STATO_EVENTO[v] || v },
  { key: 'data_inizio', label: 'Data inizio', format: v => v ? formatDate(v) : '' },
  { key: 'data_fine', label: 'Data fine', format: v => v ? formatDate(v) : '' },
  { key: 'luogo', label: 'Luogo', width: 25 },
  { key: 'promotore', label: 'Promotore', format: (v, row) => getPromotoreName(row) || '' },
  { key: 'budget_previsto', label: 'Budget previsto' },
]

const MONTH_NAMES = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

function groupByMonth(events) {
  const groups = {}
  for (const e of events) {
    if (!e.data_inizio) continue
    const d = new Date(e.data_inizio)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
    if (!groups[key]) groups[key] = { key, label, events: [] }
    groups[key].events.push(e)
  }
  return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key))
}

const MAX_ATTENTION_VISIBLE = 5

export function EventiList() {
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const loadingMore = useEventsStore(s => s.loadingMore)
  const hasMore = useEventsStore(s => s.hasMore)
  const totalCount = useEventsStore(s => s.totalCount)
  const error = useEventsStore(s => s.error)
  const fetchEvents = useEventsStore(s => s.fetchEvents)
  const loadMore = useEventsStore(s => s.loadMore)
  const setRoleFilter = useEventsStore(s => s.setRoleFilter)
  const filters = useEventsStore(s => s.filters)
  const setFilter = useEventsStore(s => s.setFilter)
  const profile = useAuthStore(s => s.profile)
  const user = useAuthStore(s => s.user)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const ruolo = useAuthStore(s => s.profile?.ruolo)
  const fetchEventSemaphores = useActivitiesStore(s => s.fetchEventSemaphores)
  const fetchBatchActivityStatus = useActivitiesStore(s => s.fetchBatchActivityStatus)
  const fetchBatchMaterialStatus = useMaterialsStore(s => s.fetchBatchMaterialStatus)
  const fetchBatchLogisticsStatus = useLogisticsStore(s => s.fetchBatchLogisticsStatus)
  const fetchBatchCostsStatus = useCostsStore(s => s.fetchBatchCostsStatus)
  const { exporting, handleExport } = useExportHandler()
  const { labels: tipoLabels, icons: tipoIcons, eventTypes } = useEventTypes()
  const eventTypeByCode = useMemo(() => Object.fromEntries(eventTypes.map(t => [t.codice, t])), [eventTypes])
  const [searchParams] = useSearchParams()

  const fetchMyInvolvement = useEventsStore(s => s.fetchMyInvolvement)

  // Semaphore + readiness state for "richiede attenzione" section
  const [semaphores, setSemaphores] = useState({})
  const [readinessMap, setReadinessMap] = useState({})
  const [involvementMap, setInvolvementMap] = useState({})
  const [attentionExpanded, setAttentionExpanded] = useState(false)

  useEffect(() => {
    if (!user || !profile) return
    const searchFromUrl = searchParams.get('search') || ''
    useEventsStore.setState({ filters: { search: searchFromUrl, stato: '', tipo: '', mese: null, periodo: '3months', promotore: '', onlyMine: false }, myInvolvedIds: [], page: 0, events: [], hasMore: true })
    setRoleFilter(user.id, ruolo)
  }, [user?.id, profile?.id])

  // Scroll to top when filters change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters.search, filters.stato, filters.tipo, filters.periodo, filters.promotore, filters.onlyMine])

  // Fetch semaphores + readiness data for events in preparation states
  useEffect(() => {
    if (!events.length) return
    const prepEvents = events
      .filter(e => ['confermato', 'in_preparazione', 'pronto', 'in_corso'].includes(e.stato))
      .map(e => e.id)
    if (!prepEvents.length) return
    // Semaphores (for attention section)
    fetchEventSemaphores(prepEvents).then(result => {
      if (result && typeof result === 'object') setSemaphores(result)
    }).catch(() => null)
    // Readiness data (for readiness strip on cards)
    Promise.all([
      fetchBatchActivityStatus(prepEvents),
      fetchBatchMaterialStatus(prepEvents),
      fetchBatchLogisticsStatus(prepEvents),
      fetchBatchCostsStatus(prepEvents),
    ]).then(([activityData, materialData, logisticsData, costsData]) => {
      const map = {}
      for (const eid of prepEvents) {
        map[eid] = {
          attivita: activityData[eid] || null,
          materiale: materialData[eid] || null,
          logistica: logisticsData[eid] || null,
          costi: costsData[eid] || null,
        }
      }
      setReadinessMap(map)
    })
  }, [events])

  useEffect(() => {
    if (!user?.id || !events.length) {
      setInvolvementMap({})
      return
    }
    // Set sync data immediately (promotore/manager)
    const syncMap = {}
    for (const e of events) {
      const roles = {
        promotore: e.promotore_id === user.id || e.promotore?.id === user.id,
        manager: e.manager_user_id === user.id || e.manager?.id === user.id,
        staff: false,
        attivita: false,
      }
      if (roles.promotore || roles.manager) syncMap[e.id] = roles
    }
    setInvolvementMap(syncMap)
    // Then fetch async data (staff/attività) and merge
    const eids = events.map(e => e.id)
    fetchMyInvolvement(user.id, eids).then(asyncMap => {
      setInvolvementMap(prev => {
        const merged = { ...prev }
        for (const [eid, roles] of Object.entries(asyncMap)) {
          merged[eid] = { ...(merged[eid] || {}), ...roles }
        }
        return merged
      })
    }).catch(() => null)
  }, [events, user?.id])

  // Stats
  const today = todayISO()
  const stats = useMemo(() => {
    const upcoming = events.filter(e => e.data_inizio >= today && !['concluso', 'cancellato', 'rifiutato'].includes(e.stato))
    const proposti = events.filter(e => e.stato === 'proposto')
    const inPrep = events.filter(e => ['in_preparazione', 'pronto'].includes(e.stato))
    const past = events.filter(e => e.data_inizio < today || ['concluso', 'cancellato'].includes(e.stato))
    return { upcoming: upcoming.length, proposti: proposti.length, inPrep: inPrep.length, past: past.length, total: events.length }
  }, [events, today])

  // Promotori for the dropdown — built from the currently loaded events (users + agent contacts)
  const promotori = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      if (e.promotore) map.set(`user:${e.promotore.id}`, { ...e.promotore, _key: `user:${e.promotore.id}` })
      if (e.promotore_agente) map.set(`contact:${e.promotore_agente.id}`, { ...e.promotore_agente, _key: `contact:${e.promotore_agente.id}` })
    }
    return [...map.values()].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''))
  }, [events])

  // Stato/tipo/promotore/periodo/"I miei" are server-side; here we only do an instant
  // titolo+luogo narrowing for the brief window before the debounced re-fetch lands.
  const filteredEvents = useMemo(() => {
    if (!filters.search) return events
    const s = filters.search.toLowerCase()
    return events.filter(e => e.titolo?.toLowerCase().includes(s) || e.luogo?.toLowerCase().includes(s))
  }, [events, filters.search])

  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const CLOSED_STATES = ['concluso', 'cancellato', 'rifiutato']

  const monthGroups = useMemo(() => {
    // On "3 mesi", far-future events that loaded only because they're still in approval
    // belong in "Richiede attenzione", not in the by-month list.
    let list = filteredEvents
    if (filters.periodo === '3months') {
      const m3 = monthFloorISO(3)
      list = filteredEvents.filter(e => !e.data_inizio || e.data_inizio < m3)
    }
    const groups = groupByMonth(list)
    return filters.periodo === 'past' ? [...groups].reverse() : groups
  }, [filteredEvents, filters.periodo])

  // "Richiede attenzione" events
  const attentionEvents = useMemo(() => {
    const result = []
    const seen = new Set()
    // Events needing approval
    for (const e of filteredEvents) {
      if (e.stato === 'proposto') {
        result.push({ ...e, _attentionReason: 'approval' })
        seen.add(e.id)
      }
    }
    // Events with red semaphore (overdue activities)
    for (const e of filteredEvents) {
      if (semaphores[e.id] === 'red' && !seen.has(e.id)) {
        result.push({ ...e, _attentionReason: 'overdue' })
        seen.add(e.id)
      }
    }
    // Past events still open (not concluso/cancellato/rifiutato)
    for (const e of filteredEvents) {
      if (e.data_inizio < today && !CLOSED_STATES.includes(e.stato) && !seen.has(e.id)) {
        result.push({ ...e, _attentionReason: 'past_open' })
        seen.add(e.id)
      }
    }
    return result
  }, [filteredEvents, semaphores, today])

  const visibleAttentionEvents = useMemo(() => {
    if (attentionExpanded) return attentionEvents
    return attentionEvents.slice(0, MAX_ATTENTION_VISIBLE)
  }, [attentionEvents, attentionExpanded])


  // Overflow menu
  const [showOverflow, setShowOverflow] = useState(false)

  return (
    <div>
      {/* Row 1: Title + primary actions */}
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[{ label: 'Eventi' }]} />
      </div>
      <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Eventi</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} eventi · {stats.upcoming} in programma</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/eventi/nuovo">
            <Button>
              <Icon icon={ACTION_ICONS.add} size={18} className="mr-1" />
              <span className="hidden sm:inline">Nuovo</span>
            </Button>
          </Link>
          {/* Overflow menu: Export + Calendar */}
          <div className="relative">
            <Button variant="secondary" onClick={() => setShowOverflow(!showOverflow)} aria-label="Altre azioni">
              <Icon icon={ACTION_ICONS.more} size={18} />
            </Button>
            {showOverflow && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOverflow(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[200px]">
                  <button
                    onClick={() => { handleExport({ columns: EXPORT_COLUMNS_EVENTI, rows: filteredEvents, filename: 'eventi', sheetName: 'Eventi' }); setShowOverflow(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 min-h-[48px]"
                  >
                    <Icon icon={ACTION_ICONS.upload} size={16} />
                    Esporta Excel
                  </button>
                  <Link
                    to="/eventi/calendario"
                    onClick={() => setShowOverflow(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 min-h-[48px]"
                  >
                    <Icon icon={NAV_ICONS.calendario} size={16} />
                    Calendario
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: All filters in one row */}
      <EventFilters
        promotori={promotori}
        filterPromotore={filters.promotore}
        onFilterPromotore={(v) => setFilter('promotore', v)}
        viewMode={filters.periodo}
        onViewMode={(v) => setFilter('periodo', v)}
        onlyMine={filters.onlyMine}
        onToggleMine={() => setFilter('onlyMine', !filters.onlyMine)}
      />

      {/* Row 3: Active filter chips + count + alert summary */}
      {!loading && (
        <div className="px-4 md:px-6 pb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredEvents.length === 0
              ? 'Nessun evento trovato'
              : totalCount > events.length
                ? `Mostrati ${filteredEvents.length} di ${totalCount} eventi`
                : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'evento' : 'eventi'}`
            }
          </span>
          {/* Attention summary inline */}
          {attentionEvents.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              <Icon icon={FEEDBACK_ICONS.warning} size={12} />
              {stats.proposti > 0 && `${stats.proposti} da approvare`}
              {stats.proposti > 0 && attentionEvents.length > stats.proposti && ' · '}
              {attentionEvents.length > stats.proposti && `${attentionEvents.length - stats.proposti} con problemi`}
            </span>
          )}
          {/* Active filter chips */}
          {filters.stato && (
            <button
              onClick={() => setFilter('stato', '')}
              className="inline-flex items-center gap-1.5 px-3 min-h-[48px] bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium transition-colors"
              aria-label={`Rimuovi filtro stato: ${STATO_EVENTO[filters.stato]}`}
            >
              {STATO_EVENTO[filters.stato]}
              <Icon name="close" size={14} />
            </button>
          )}
          {filters.tipo && (
            <button
              onClick={() => setFilter('tipo', '')}
              className="inline-flex items-center gap-1.5 px-3 min-h-[48px] bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium transition-colors"
              aria-label={`Rimuovi filtro tipo: ${tipoLabels[filters.tipo] || filters.tipo}`}
            >
              {tipoLabels[filters.tipo] || filters.tipo}
              <Icon name="close" size={14} />
            </button>
          )}
          {filters.promotore && (
            <button
              onClick={() => setFilter('promotore', '')}
              className="inline-flex items-center gap-1.5 px-3 min-h-[48px] bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium transition-colors"
              aria-label="Rimuovi filtro promotore"
            >
              {(() => { const p = promotori.find(p => p._key === filters.promotore); return p ? `${p.cognome} ${p.nome}` : 'Promotore' })()}
              <Icon name="close" size={14} />
            </button>
          )}
          {filters.onlyMine && (
            <button
              onClick={() => setFilter('onlyMine', false)}
              className="inline-flex items-center gap-1.5 px-3 min-h-[48px] bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium transition-colors"
              aria-label="Rimuovi filtro: solo i miei eventi"
            >
              Solo i miei
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      )}

      <div className="px-4 md:px-6 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : error ? (
          <div role="alert">
            <EmptyState title="Errore nel caricamento" description={error} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="Nessun evento trovato"
            description="Prova a cambiare i filtri o proponi un nuovo evento."
            action={
              <Link to="/eventi/nuovo">
                <Button>
                  <Icon icon={ACTION_ICONS.add} size={18} className="mr-2" />
                  Nuovo evento
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Richiede attenzione section */}
            {attentionEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600">
                    <Icon icon={FEEDBACK_ICONS.warning} size={16} />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Richiede attenzione</h2>
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                    {attentionEvents.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {visibleAttentionEvents.map(event => (
                    <div
                      key={`attention-${event.id}-${event._attentionReason}`}
                      className={`relative rounded-xl overflow-hidden ring-2 ${
                        event._attentionReason === 'overdue' ? 'ring-red-300'
                        : event._attentionReason === 'past_open' ? 'ring-orange-300'
                        : 'ring-yellow-300'
                      }`}
                    >
                      <EventCard event={event} semaphore={semaphores[event.id]} readiness={readinessMap[event.id] || null} involvement={involvementMap[event.id] || null} currentUserId={user?.id} tipoLabels={tipoLabels} tipoIcons={tipoIcons} eventType={eventTypeByCode[event.tipo_evento]} />
                    </div>
                  ))}
                </div>
                {attentionEvents.length > MAX_ATTENTION_VISIBLE && (
                  <button
                    onClick={() => setAttentionExpanded(!attentionExpanded)}
                    className="mt-2 text-sm text-mikai-500 hover:text-mikai-700 font-medium min-h-[48px] flex items-center gap-1"
                  >
                    {attentionExpanded
                      ? 'Mostra meno'
                      : `Mostra tutti (${attentionEvents.length})`
                    }
                    <Icon icon={attentionExpanded ? ACTION_ICONS.chevronUp : ACTION_ICONS.chevronDown} size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Month-grouped events */}
            {monthGroups.map(group => {
              const isCurrentMonth = group.key === currentMonthKey
              return (
                <div key={group.key}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrentMonth ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon icon={NAV_ICONS.eventi} size={16} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{group.label}</h2>
                      <p className="text-xs text-gray-400">{group.events.length} eventi</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {group.events.map(event => (
                      <EventCard key={event.id} event={event} semaphore={semaphores[event.id]} readiness={readinessMap[event.id] || null} involvement={involvementMap[event.id] || null} currentUserId={user?.id} tipoLabels={tipoLabels} tipoIcons={tipoIcons} eventType={eventTypeByCode[event.tipo_evento]} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Carica altri */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                  Carica altri
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
