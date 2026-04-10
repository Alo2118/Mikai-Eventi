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
import { formatDate, todayISO } from '../../lib/date-utils'
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
  const setShowAll = useEventsStore(s => s.setShowAll)
  const showAll = useEventsStore(s => s.roleFilter.showAll)
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
  const { labels: tipoLabels, icons: tipoIcons } = useEventTypes()
  const [searchParams] = useSearchParams()

  const fetchMyInvolvement = useEventsStore(s => s.fetchMyInvolvement)

  // Semaphore + readiness state for "richiede attenzione" section
  const [semaphores, setSemaphores] = useState({})
  const [readinessMap, setReadinessMap] = useState({})
  const [involvementMap, setInvolvementMap] = useState({})
  const [onlyMine, setOnlyMine] = useState(false)
  const [attentionExpanded, setAttentionExpanded] = useState(false)
  const [filterPromotore, setFilterPromotore] = useState('')

  useEffect(() => {
    if (!user || !profile) return
    const searchFromUrl = searchParams.get('search') || ''
    useEventsStore.setState({ filters: { search: searchFromUrl, stato: '', tipo: '', mese: null }, page: 0, events: [], hasMore: true })
    setRoleFilter(user.id, ruolo)
  }, [user?.id, profile?.id])

  // Scroll to top when filters change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters.search, filters.stato, filters.tipo, filters.mese])

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

  // Extended client-side search (titolo + luogo + promotore)
  const searchFiltered = useMemo(() => {
    if (!filters.search) return events
    const s = filters.search.toLowerCase()
    return events.filter(e =>
      e.titolo?.toLowerCase().includes(s) ||
      e.luogo?.toLowerCase().includes(s) ||
      (getPromotoreName(e) || '').toLowerCase().includes(s)
    )
  }, [events, filters.search])

  // Promotore filter (client-side) — includes both users and agent contacts
  const promotori = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      if (e.promotore) map.set(`user:${e.promotore.id}`, { ...e.promotore, _key: `user:${e.promotore.id}` })
      if (e.promotore_agente) map.set(`contact:${e.promotore_agente.id}`, { ...e.promotore_agente, _key: `contact:${e.promotore_agente.id}` })
    }
    return [...map.values()].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''))
  }, [events])

  const filteredEvents = useMemo(() => {
    let result = searchFiltered
    if (filterPromotore) {
      const [type, id] = filterPromotore.split(':')
      result = type === 'contact'
        ? result.filter(e => e.promotore_agente?.id === id)
        : result.filter(e => e.promotore?.id === id)
    }
    if (onlyMine) {
      result = result.filter(e => involvementMap[e.id])
    }
    return result
  }, [searchFiltered, filterPromotore, onlyMine, involvementMap])

  // View mode: '3months' (default), 'all', 'past'
  const [viewMode, setViewMode] = useState('3months')
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const threeMonthsLater = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const futureEvents = useMemo(() => filteredEvents.filter(e => e.data_inizio >= today), [filteredEvents, today])

  // Period counts for labels
  const threeMonthCount = useMemo(() => {
    return futureEvents.filter(e => {
      const d = new Date(e.data_inizio)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k >= currentMonthKey && k <= threeMonthsLater
    }).length
  }, [futureEvents, currentMonthKey, threeMonthsLater])

  const monthGroups = useMemo(() => {
    if (viewMode === 'past') return groupByMonth(filteredEvents)
    if (viewMode === 'all') return groupByMonth(futureEvents)
    // Default: future events within 3 months
    const threeMonthEvents = futureEvents.filter(e => {
      const d = new Date(e.data_inizio)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k <= threeMonthsLater
    })
    return groupByMonth(threeMonthEvents)
  }, [filteredEvents, futureEvents, viewMode, threeMonthsLater])

  // "Richiede attenzione" events
  const attentionEvents = useMemo(() => {
    const result = []
    // Events needing approval
    for (const e of filteredEvents) {
      if (e.stato === 'proposto') {
        result.push({ ...e, _attentionReason: 'approval' })
      }
    }
    // Events with red semaphore (overdue activities)
    for (const e of filteredEvents) {
      if (semaphores[e.id] === 'red' && e.stato !== 'proposto') {
        result.push({ ...e, _attentionReason: 'overdue' })
      }
    }
    return result
  }, [filteredEvents, semaphores])

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
                    <Icon icon={NAV_ICONS.materiale} size={16} />
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
        filterPromotore={filterPromotore}
        onFilterPromotore={setFilterPromotore}
        viewMode={!loading && events.length > 0 ? viewMode : undefined}
        onViewMode={!loading && events.length > 0 ? setViewMode : undefined}
        onlyMine={onlyMine}
        onToggleMine={() => setOnlyMine(!onlyMine)}
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
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium transition-colors"
              aria-label={`Rimuovi filtro stato: ${STATO_EVENTO[filters.stato]}`}
            >
              {STATO_EVENTO[filters.stato]}
              <Icon name="close" size={14} />
            </button>
          )}
          {filters.tipo && (
            <button
              onClick={() => setFilter('tipo', '')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium transition-colors"
              aria-label={`Rimuovi filtro tipo: ${tipoLabels[filters.tipo] || filters.tipo}`}
            >
              {tipoLabels[filters.tipo] || filters.tipo}
              <Icon name="close" size={14} />
            </button>
          )}
          {filterPromotore && (
            <button
              onClick={() => setFilterPromotore('')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium transition-colors"
              aria-label="Rimuovi filtro promotore"
            >
              {(() => { const p = promotori.find(p => p._key === filterPromotore); return p ? `${p.cognome} ${p.nome}` : 'Promotore' })()}
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      )}

      <div className="px-4 md:px-6 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : error ? (
          <EmptyState title="Errore nel caricamento" description={error} />
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
                        event._attentionReason === 'overdue' ? 'ring-red-300' : 'ring-yellow-300'
                      }`}
                    >
                      <EventCard event={event} semaphore={semaphores[event.id]} readiness={readinessMap[event.id] || null} involvement={involvementMap[event.id] || null} currentUserId={user?.id} tipoLabels={tipoLabels} tipoIcons={tipoIcons} />
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
                      <EventCard key={event.id} event={event} semaphore={semaphores[event.id]} readiness={readinessMap[event.id] || null} involvement={involvementMap[event.id] || null} currentUserId={user?.id} tipoLabels={tipoLabels} tipoIcons={tipoIcons} />
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
