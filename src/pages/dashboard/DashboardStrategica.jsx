import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAnalyticsStore } from '../../hooks/useAnalytics'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { TimeRangeFilter } from '../../components/dashboard/TimeRangeFilter'
import { EventiPerStatoChart } from '../../components/dashboard/EventiPerStatoChart'
import { EventiPerTipoChart } from '../../components/dashboard/EventiPerTipoChart'
import { BudgetBreakdownChart } from '../../components/dashboard/BudgetBreakdownChart'
import { ConfermaPartecipantiKpi } from '../../components/dashboard/ConfermaPartecipantiKpi'
import { AttivitaInRitardoKpi } from '../../components/dashboard/AttivitaInRitardoKpi'
import { MaterialeFuoriKpi } from '../../components/dashboard/MaterialeFuoriKpi'
import { STATO_EVENTO, STATO_EVENTO_COLORE, TEXTAREA_STYLE, CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { ACTION_ICONS } from '../../lib/icons'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { QuickActions, QUICK_ACTIONS_STRATEGICA } from '../../components/dashboard/QuickActions'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../../components/ui/Toast'
import { formatDate, formatDateRange, todayISO, getQuarterRange } from '../../lib/date-utils'
import { formatCurrency, formatPercentage, getPromotoreName } from '../../lib/format-utils'

function defaultTimeRange() {
  const range = getQuarterRange()
  return { type: 'trimestre', start: range.start, end: range.end }
}

function SemaphoreIcon({ status }) {
  const config = {
    red: { bg: 'bg-red-500', ring: 'ring-red-200', label: 'Ritardi', text: 'text-red-600' },
    yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-200', label: 'In corso', text: 'text-yellow-600' },
    green: { bg: 'bg-green-500', ring: 'ring-green-200', label: 'In ordine', text: 'text-green-600' },
    gray: { bg: 'bg-gray-300', ring: 'ring-gray-100', label: 'Nessun dato', text: 'text-gray-400' },
  }
  const c = config[status] || config.gray
  return (
    <span className="inline-flex items-center gap-1.5" title={c.label} aria-label={c.label}>
      <span className={`inline-block w-3 h-3 rounded-full ${c.bg} ring-2 ${c.ring}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </span>
  )
}

function KpiCharts({ timeRange }) {
  const eventiPerStato = useAnalyticsStore(s => s.eventiPerStato)
  const eventiPerTipo = useAnalyticsStore(s => s.eventiPerTipo)
  const budgetBreakdown = useAnalyticsStore(s => s.budgetBreakdown)
  const confermaRate = useAnalyticsStore(s => s.confermaRate)
  const attivitaInRitardo = useAnalyticsStore(s => s.attivitaInRitardo)
  const materialeFuori = useAnalyticsStore(s => s.materialeFuori)
  const analyticsLoading = useAnalyticsStore(s => s.loading)
  const analyticsError = useAnalyticsStore(s => s.error)
  const fetchKpiData = useAnalyticsStore(s => s.fetchKpiData)

  useEffect(() => {
    if (timeRange?.start && timeRange?.end) {
      fetchKpiData(timeRange.start, timeRange.end)
    }
  }, [timeRange?.start, timeRange?.end])

  if (analyticsLoading) return <LoadingSkeleton lines={4} />
  if (analyticsError) return <EmptyState title="Errore nel caricamento" description={analyticsError} />

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EventiPerStatoChart data={eventiPerStato} />
        <EventiPerTipoChart data={eventiPerTipo} />
      </div>
      <BudgetBreakdownChart data={budgetBreakdown} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ConfermaPartecipantiKpi {...confermaRate} />
        <AttivitaInRitardoKpi {...attivitaInRitardo} />
        <MaterialeFuoriKpi {...materialeFuori} />
      </div>
    </>
  )
}

export function DashboardStrategica() {
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const fetchEvents = useEventsStore(s => s.fetchEvents)
  const fetchEventSemaphores = useActivitiesStore(s => s.fetchEventSemaphores)
  const [semaphores, setSemaphores] = useState({})
  const approveEvent = useEventsStore(s => s.approveEvent)
  const rejectEvent = useEventsStore(s => s.rejectEvent)
  const permissions = useAuthStore(s => s.permissions)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)

  const navigate = useNavigate()
  const [approvingId, setApprovingId] = useState(null)
  const [approving, setApproving] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectMotivo, setRejectMotivo] = useState('')
  const [timeRange, setTimeRange] = useState(defaultTimeRange)
  const [searchApproval, setSearchApproval] = useState('')

  const canApprove = permissions?.includes('approva_eventi')

  const loadData = useCallback(() => { fetchEvents() }, [])

  // Initial fetch + auto-refresh 60s
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  const today = todayISO()

  // Memoized computed values
  const { attivi, proposti, quarterBudget, cancelledRate } = useMemo(() => {
    const activeStates = ['confermato', 'in_preparazione', 'pronto', 'in_corso']
    const attiviCount = events.filter(e => activeStates.includes(e.stato)).length
    const propostiList = events.filter(e => e.stato === 'proposto')

    const qRange = getQuarterRange()
    const qBudget = events
      .filter(e => activeStates.includes(e.stato) && e.data_inizio)
      .filter(e => e.data_inizio >= qRange.start && e.data_inizio <= qRange.end)
      .reduce((sum, e) => sum + (e.budget_previsto || 0), 0)

    const total = events.length
    const cancelled = events.filter(e => ['cancellato', 'rifiutato'].includes(e.stato)).length
    const rate = total > 0 ? (cancelled / total) * 100 : 0

    return { attivi: attiviCount, proposti: propostiList, quarterBudget: qBudget, cancelledRate: rate }
  }, [events])

  const upcomingEvents = useMemo(() =>
    events
      .filter(e => e.data_inizio >= today)
      .sort((a, b) => a.data_inizio.localeCompare(b.data_inizio))
      .slice(0, 10)
  , [events, today])

  // Semaphores for upcoming events
  useEffect(() => {
    if (!upcomingEvents.length) return
    fetchEventSemaphores(upcomingEvents.map(e => e.id)).then(setSemaphores)
  }, [upcomingEvents])

  const semaphoreOverdue = useMemo(() =>
    Object.values(semaphores).filter(s => s === 'red').length
  , [semaphores])

  // Search in approval queue
  const filteredProposti = useMemo(() => {
    if (!searchApproval) return proposti
    const s = searchApproval.toLowerCase()
    return proposti.filter(e =>
      e.titolo?.toLowerCase().includes(s) ||
      (getPromotoreName(e) || '').toLowerCase().includes(s)
    )
  }, [proposti, searchApproval])

  // Actions
  const handleApprove = async () => {
    setApproving(true)
    const { error } = await approveEvent(approvingId)
    setApproving(false)
    setApprovingId(null)
    if (error) addToast('Errore nell\'approvazione. Riprova.', 'error')
    else addToast('Evento approvato!', 'success')
  }

  const handleReject = async () => {
    if (!rejectMotivo.trim()) return
    const { error } = await rejectEvent(rejectingId, rejectMotivo.trim())
    setRejectingId(null)
    setRejectMotivo('')
    if (error) addToast('Errore nel rifiuto. Riprova.', 'error')
    else addToast('Evento rifiutato.', 'success')
  }

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Dashboard Direzione' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Dashboard Direzione" />
      </div>
      <PageHeader
        title={`Ciao, ${profile?.nome || ''}`}
        subtitle="Panoramica strategica degli eventi"
        actions={
          <Button variant="secondary" onClick={loadData} disabled={loading} size="sm">
            <Icon icon={ACTION_ICONS.refresh} size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden md:inline ml-1">Aggiorna</span>
          </Button>
        }
      />

      <div className="px-4 md:px-8 space-y-6 pb-8">
        {loading && !events.length ? (
          <LoadingSkeleton lines={6} />
        ) : (
          <>
            <QuickActions items={QUICK_ACTIONS_STRATEGICA} />

            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Eventi attivi</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{attivi}</p>
              </div>
              <button
                onClick={() => navigate('/eventi?stato=proposto')}
                className={CARD_STYLE + ' cursor-pointer hover:shadow-md transition-shadow text-left w-full'}
              >
                <p className="text-sm text-gray-500">In attesa</p>
                <p className={`text-2xl md:text-3xl font-bold ${proposti.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{proposti.length}</p>
                {proposti.length > 0
                  ? <p className="text-xs text-yellow-500 mt-1">Da approvare</p>
                  : <p className="text-xs text-gray-400 mt-1">Nessuna</p>
                }
                <p className="text-xs text-mikai-500 mt-1">Vedi tutti →</p>
              </button>
              <button
                onClick={() => navigate('/eventi?stato=in_preparazione')}
                className={CARD_STYLE + ' cursor-pointer hover:shadow-md transition-shadow text-left w-full'}
              >
                <p className="text-sm text-gray-500">Con ritardi</p>
                <p className={`text-2xl md:text-3xl font-bold ${semaphoreOverdue > 0 ? 'text-red-600' : 'text-green-600'}`}>{semaphoreOverdue}</p>
                {semaphoreOverdue > 0
                  ? <p className="text-xs text-red-500 mt-1">Richiede attenzione</p>
                  : <p className="text-xs text-green-500 mt-1">Tutto in ordine</p>
                }
                <p className="text-xs text-mikai-500 mt-1">Vedi tutti →</p>
              </button>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Budget trimestre</p>
                <p className="text-2xl md:text-3xl font-bold text-mikai-500">{formatCurrency(quarterBudget)}</p>
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Cancellazione</p>
                <p className={`text-2xl md:text-3xl font-bold ${cancelledRate > 20 ? 'text-red-600' : cancelledRate > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {formatPercentage(cancelledRate, 0)}
                </p>
                {cancelledRate > 20 && <p className="text-xs text-red-500 mt-1">Sopra soglia</p>}
              </div>
            </div>

            {/* Analytics charts */}
            <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
            <KpiCharts timeRange={timeRange} />

            {/* Coda approvazioni */}
            <div>
              <h3 className="font-semibold text-lg mb-3">
                Coda approvazioni
                {proposti.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center bg-yellow-100 text-yellow-700 text-sm font-bold rounded-full w-6 h-6">
                    {proposti.length}
                  </span>
                )}
              </h3>
              {proposti.length > 3 && (
                <div className="mb-3">
                  <SearchInput value={searchApproval} onChange={setSearchApproval} placeholder="Cerca per titolo o promotore..." />
                </div>
              )}
              {filteredProposti.length === 0 ? (
                <EmptyState
                  title={searchApproval ? 'Nessun risultato' : 'Nessun evento in attesa'}
                  description={searchApproval ? 'Prova a modificare la ricerca.' : 'Non ci sono eventi da approvare.'}
                />
              ) : (
                <div className="space-y-3">
                  {filteredProposti.map(event => (
                    <div key={event.id} className={CARD_STYLE + ' border-l-4 border-l-yellow-400'}>
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/eventi/${event.id}`} className="flex-1 min-w-0 hover:underline">
                          <p className="text-base font-semibold text-gray-900 truncate">{event.titolo}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {getPromotoreName(event) || '\u2014'}
                            {event.data_inizio && ` \u00B7 ${formatDate(event.data_inizio)}`}
                          </p>
                        </Link>
                        {event.budget_previsto != null && (
                          <p className="text-sm font-semibold text-gray-700 shrink-0">{formatCurrency(event.budget_previsto)}</p>
                        )}
                      </div>
                      {canApprove && (
                        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                          <Button variant="primary" size="sm" onClick={() => setApprovingId(event.id)}>
                            <Icon icon={ACTION_ICONS.approve} size={16} className="mr-1" />
                            Approva
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => { setRejectingId(event.id); setRejectMotivo('') }}>
                            <Icon icon={ACTION_ICONS.reject} size={16} className="mr-1" />
                            Rifiuta
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prossimi eventi con semafori */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Prossimi eventi</h3>
              {upcomingEvents.length === 0 ? (
                <EmptyState title="Nessun evento in programma" description="Non ci sono eventi futuri." />
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <Link key={event.id} to={`/eventi/${event.id}`} className={'block ' + CARD_HOVER_STYLE}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">{event.titolo}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{formatDateRange(event.data_inizio, event.data_fine)}</p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <StatusBadge stato={event.stato} labels={STATO_EVENTO} colors={STATO_EVENTO_COLORE} />
                          <SemaphoreIcon status={semaphores[event.id] || 'gray'} />
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

      <ConfirmDialog
        open={!!approvingId}
        title="Approva evento"
        message="Confermi l'approvazione di questo evento?"
        confirmLabel="Approva"
        onConfirm={handleApprove}
        onCancel={() => setApprovingId(null)}
      />

      <Modal
        open={!!rejectingId}
        onClose={() => setRejectingId(null)}
        title="Rifiuta evento"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setRejectingId(null)}>Annulla</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectMotivo.trim()}>Rifiuta evento</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Indica il motivo del rifiuto:</p>
          <textarea
            className={TEXTAREA_STYLE}
            value={rejectMotivo}
            onChange={e => setRejectMotivo(e.target.value)}
            placeholder="Motivo del rifiuto..."
          />
        </div>
      </Modal>
    </div>
  )
}
