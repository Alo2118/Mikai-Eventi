import { useEffect } from 'react'
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
import { NAV_ICONS, ACTION_ICONS } from '../../lib/icons'
import { Breadcrumb } from '../../components/layout/Breadcrumb'

export function EventiList() {
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const error = useEventsStore(s => s.error)
  const fetchEvents = useEventsStore(s => s.fetchEvents)
  const profile = useAuthStore(s => s.profile)

  useEffect(() => { fetchEvents() }, [])

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Eventi' }]} />
      </div>
      <PageHeader
        title="Eventi"
        subtitle={profile?.ruolo === 'commerciale' ? 'I tuoi eventi' : 'Tutti gli eventi'}
        actions={
          <div className="flex gap-3">
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
