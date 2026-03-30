import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { useExportHandler } from '../../hooks/useExportHandler'
import { EventCard } from '../../components/eventi/EventCard'
import { EventFilters } from '../../components/eventi/EventFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ExportButton } from '../../components/ui/ExportButton'
import { NAV_ICONS, ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { TIPO_EVENTO, STATO_EVENTO, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { formatDate, todayISO } from '../../lib/date-utils'

const EXPORT_COLUMNS_EVENTI = [
  { key: 'titolo', label: 'Titolo', width: 30 },
  { key: 'tipo_evento', label: 'Tipo', format: v => TIPO_EVENTO[v] || v },
  { key: 'stato', label: 'Stato', format: v => STATO_EVENTO[v] || v },
  { key: 'data_inizio', label: 'Data inizio', format: v => v ? formatDate(v) : '' },
  { key: 'data_fine', label: 'Data fine', format: v => v ? formatDate(v) : '' },
  { key: 'luogo', label: 'Luogo', width: 25 },
  { key: 'promotore', label: 'Promotore', format: v => v ? `${v.nome} ${v.cognome}` : '' },
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

export function EventiList() {
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const error = useEventsStore(s => s.error)
  const fetchEvents = useEventsStore(s => s.fetchEvents)
  const setRoleFilter = useEventsStore(s => s.setRoleFilter)
  const setShowAll = useEventsStore(s => s.setShowAll)
  const showAll = useEventsStore(s => s.roleFilter.showAll)
  const profile = useAuthStore(s => s.profile)
  const user = useAuthStore(s => s.user)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const ruolo = useAuthStore(s => s.profile?.ruolo)
  const { exporting, handleExport } = useExportHandler()

  useEffect(() => {
    if (!user || !profile) return
    // Clear stale filters (e.g. mese from calendar), then setRoleFilter triggers the single fetch
    useEventsStore.setState({ filters: { search: '', stato: '', tipo: '', mese: null } })
    setRoleFilter(user.id, ruolo)
  }, [user?.id, profile?.id])

  // Stats
  const today = todayISO()
  const stats = useMemo(() => {
    const upcoming = events.filter(e => e.data_inizio >= today && !['concluso', 'cancellato', 'rifiutato'].includes(e.stato))
    const proposti = events.filter(e => e.stato === 'proposto')
    const inPrep = events.filter(e => ['in_preparazione', 'pronto'].includes(e.stato))
    const past = events.filter(e => e.data_inizio < today || ['concluso', 'cancellato'].includes(e.stato))
    return { upcoming: upcoming.length, proposti: proposti.length, inPrep: inPrep.length, past: past.length, total: events.length }
  }, [events, today])

  // View mode: '3months' (default), 'all', 'past'
  const [viewMode, setViewMode] = useState('3months')
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const threeMonthsLater = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const pastEvents = useMemo(() => events.filter(e => e.data_inizio < today), [events, today])
  const futureEvents = useMemo(() => events.filter(e => e.data_inizio >= today), [events, today])

  const monthGroups = useMemo(() => {
    if (viewMode === 'past') return groupByMonth(events)
    if (viewMode === 'all') return groupByMonth(futureEvents)
    // Default: future events within 3 months
    const threeMonthEvents = futureEvents.filter(e => {
      const d = new Date(e.data_inizio)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return k <= threeMonthsLater
    })
    return groupByMonth(threeMonthEvents)
  }, [events, futureEvents, viewMode, threeMonthsLater])

  const hiddenFutureCount = useMemo(() => {
    if (viewMode !== '3months') return 0
    return futureEvents.filter(e => {
      const d = new Date(e.data_inizio)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return key > threeMonthsLater
    }).length
  }, [futureEvents, viewMode, threeMonthsLater])

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Eventi' }]} />
      </div>
      <PageHeader
        title="Eventi"
        subtitle={`${stats.total} eventi · ${stats.upcoming} in programma`}
        actions={
          <div className="flex gap-3 flex-wrap">
            {hasPermission('approva_eventi') && (ruolo === 'commerciale' || ruolo === 'area_manager') && (
              <Button variant="secondary" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'I miei eventi' : 'Tutti gli eventi'}
              </Button>
            )}
            <ExportButton onClick={() => handleExport({ columns: EXPORT_COLUMNS_EVENTI, rows: events, filename: 'eventi', sheetName: 'Eventi' })} loading={exporting} />
            <Link to="/eventi/calendario">
              <Button variant="secondary">
                <Icon icon={NAV_ICONS.calendario} size={18} className="mr-1" />
                <span className="hidden sm:inline">Calendario</span>
              </Button>
            </Link>
            <Link to="/eventi/nuovo">
              <Button>
                <Icon icon={ACTION_ICONS.add} size={18} className="mr-1" />
                Nuovo
              </Button>
            </Link>
          </div>
        }
      />

      {/* Period selector */}
      {!loading && events.length > 0 && (
        <div className="px-4 md:px-8 flex gap-2">
          {[
            { id: '3months', label: `Prossimi 3 mesi (${futureEvents.filter(e => { const d = new Date(e.data_inizio); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; return k >= currentMonthKey && k <= threeMonthsLater }).length})` },
            { id: 'all', label: `Tutti i futuri (${futureEvents.length})` },
            { id: 'past', label: `Tutto (${events.length})` },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setViewMode(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${
                viewMode === opt.id
                  ? 'bg-mikai-400 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      {!loading && events.length > 0 && (
        <div className="px-4 md:px-8">
          <div className={SUMMARY_BAR_STYLE + ' flex flex-wrap gap-x-6 gap-y-1 text-sm'}>
            {stats.proposti > 0 && (
              <span className="flex items-center gap-1.5 text-yellow-700">
                <Icon icon={FEEDBACK_ICONS.warning} size={14} />
                <strong>{stats.proposti}</strong> da approvare
              </span>
            )}
            {stats.inPrep > 0 && (
              <span className="flex items-center gap-1.5 text-mikai-700">
                <Icon icon={ACTION_ICONS.forward} size={14} />
                <strong>{stats.inPrep}</strong> in preparazione
              </span>
            )}
            <span className="text-mikai-600">
              <strong>{stats.upcoming}</strong> in programma
            </span>
            <span className="text-mikai-500">
              <strong>{stats.past}</strong> passati
            </span>
          </div>
        </div>
      )}

      <EventFilters />

      <div className="px-4 md:px-8 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : error ? (
          <EmptyState title="Errore nel caricamento" description={error} />
        ) : events.length === 0 ? (
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
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
