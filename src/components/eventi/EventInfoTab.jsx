import { TIPO_EVENTO, MODALITA_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'
import { StatusBadge } from '../ui/StatusBadge'
import { EventStatusFlow } from './EventStatusFlow'
import { EventApprovalBar } from './EventApprovalBar'

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="py-3 border-b border-gray-100">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-base text-gray-900">{value}</dd>
    </div>
  )
}

export function EventInfoTab({ event, onUpdate }) {
  return (
    <div className="space-y-6">
      <EventApprovalBar event={event} onUpdate={onUpdate} />
      <EventStatusFlow stato={event.stato} />

      <dl className="divide-y divide-gray-100">
        <InfoRow label="Tipo evento" value={TIPO_EVENTO[event.tipo_evento]} />
        <InfoRow label="Modalita'" value={MODALITA_EVENTO[event.modalita]} />
        <InfoRow label="Date" value={formatDateRange(event.data_inizio, event.data_fine)} />
        <InfoRow label="Luogo" value={event.luogo} />
        <InfoRow label="Dettaglio sede" value={event.sede_dettaglio} />
        <InfoRow
          label="Promotore"
          value={event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : null}
        />
        <InfoRow
          label="Area Manager"
          value={event.manager ? `${event.manager.nome} ${event.manager.cognome}` : null}
        />
        <InfoRow label="Desk richiesto" value={event.desk_richiesto ? 'Si' : 'No'} />
        {event.desk_richiesto && (
          <InfoRow label="N. postazioni" value={event.n_postazioni} />
        )}
        <InfoRow
          label="Budget previsto"
          value={event.budget_previsto ? `\u20AC ${Number(event.budget_previsto).toLocaleString('it-IT')}` : null}
        />
        <InfoRow label="Ricorrenza" value={event.ricorrenza} />
        <InfoRow label="Note" value={event.note} />
        {event.motivo_cancellazione && (
          <InfoRow label="Motivo annullamento" value={event.motivo_cancellazione} />
        )}
      </dl>
    </div>
  )
}
