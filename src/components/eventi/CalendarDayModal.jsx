import { Modal } from '../ui/Modal'
import { CalendarEventPill } from './CalendarEventPill'
import { EmptyState } from '../ui/EmptyState'
import { formatDate, todayISO } from '../../lib/date-utils'

const CLOSED_STATES = ['concluso', 'cancellato', 'rifiutato']

function getAttentionReason(event, semaphores) {
  if (event.stato === 'proposto') return 'approval'
  if (semaphores[event.id] === 'red') return 'overdue'
  if (event.data_inizio < todayISO() && !CLOSED_STATES.includes(event.stato)) return 'past_open'
  return null
}

export function CalendarDayModal({ open, onClose, date, events, semaphores = {}, indicators = {} }) {
  const label = date ? formatDate(date) : ''

  return (
    <Modal open={open} onClose={onClose} title={label} subtitle={`${events.length} eventi`} size="md">
      {events.length === 0 ? (
        <EmptyState title="Nessun evento" description="Non ci sono eventi in questa giornata." />
      ) : (
        <div className="space-y-2">
          {events.map(e => (
            <CalendarEventPill
              key={e.id}
              event={e}
              showStatus
              attention={getAttentionReason(e, semaphores)}
              indicators={indicators[e.id]}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}
