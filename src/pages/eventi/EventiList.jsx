import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { EventCard } from '../../components/eventi/EventCard'
import { EventFilters } from '../../components/eventi/EventFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ExportButton } from '../../components/ui/ExportButton'
import { NAV_ICONS, ACTION_ICONS } from '../../lib/icons'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { AlertBanner } from '../../components/dashboard/AlertBanner'
import { exportToExcel } from '../../lib/export-utils'
import { TIPO_EVENTO, STATO_EVENTO } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { useToastStore } from '../../components/ui/Toast'

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
  const addToast = useToastStore(s => s.add)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (user && ruolo) {
      setRoleFilter(user.id, ruolo)
    } else {
      fetchEvents()
    }
  }, [user?.id, ruolo])

  const handleExport = async () => {
    if (events.length === 0) { addToast('Nessun dato da esportare', 'warning'); return }
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await exportToExcel({
        columns: EXPORT_COLUMNS_EVENTI,
        rows: events,
        filename: `eventi_${today}.xlsx`,
        sheetName: 'Eventi',
      })
      addToast('File esportato', 'success')
    } catch { addToast('Errore durante l\'esportazione', 'error') }
    setExporting(false)
  }

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Eventi' }]} />
      </div>
      <PageHeader
        title="Eventi"
        subtitle={
          showAll
            ? 'Tutti gli eventi'
            : ruolo === 'commerciale'
              ? 'I tuoi eventi'
              : ruolo === 'area_manager'
                ? 'I tuoi eventi'
                : 'Tutti gli eventi'
        }
        actions={
          <div className="flex gap-3 flex-wrap">
            {hasPermission('approva_eventi') && (ruolo === 'commerciale' || ruolo === 'area_manager') && (
              <Button
                variant="secondary"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'I miei eventi' : 'Mostra tutti gli eventi'}
              </Button>
            )}
            <ExportButton onClick={handleExport} loading={exporting} />
            <Link to="/eventi/calendario">
              <Button variant="secondary">
                <Icon icon={NAV_ICONS.calendario} size={18} className="mr-2" />
                Calendario
              </Button>
            </Link>
            <Link to="/eventi/nuovo">
              <Button size="lg">
                <Icon icon={ACTION_ICONS.add} size={18} className="mr-2" />
                Nuovo evento
              </Button>
            </Link>
          </div>
        }
      />
      {(ruolo === 'commerciale' || ruolo === 'area_manager') && <AlertBanner />}
      <EventFilters />
      <div className="px-6 md:px-8 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : error ? (
          <EmptyState
            title="Errore nel caricamento"
            description={error}
          />
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
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
