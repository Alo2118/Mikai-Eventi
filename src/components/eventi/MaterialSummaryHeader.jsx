import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS, NAV_ICONS, FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { SUMMARY_BAR_STYLE } from '../../lib/constants'
import { formatDateRange, formatDate } from '../../lib/date-utils'
import { ProgressIndicator } from '../ui/ProgressIndicator'

export function MaterialSummaryHeader({ event, rows, pendingCount, confirmedCount, inPrepCount }) {
  return (
    <>
      <div className={SUMMARY_BAR_STYLE + ' space-y-1'}>
        {event.indirizzo_spedizione && (
          <div className="flex items-center gap-2 text-sm text-mikai-700">
            <Icon icon={MATERIALE_ICONS.truck} size={16} className="flex-shrink-0" />
            <span className="font-medium">Spedizione:</span>
            <span>{event.indirizzo_spedizione}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mikai-600">
          <span className="flex items-center gap-1">
            <Icon icon={NAV_ICONS.eventi} size={14} />
            Evento: {formatDateRange(event.data_inizio, event.data_fine)}
          </span>
          {event.deadline_preparazione && (
            <span className="flex items-center gap-1">
              <Icon icon={FEEDBACK_ICONS.warning} size={14} />
              Prep. entro: {formatDate(event.deadline_preparazione)}
            </span>
          )}
          {event.data_spedizione_prevista && (
            <span className="flex items-center gap-1">
              <Icon icon={MATERIALE_ICONS.truck} size={14} />
              Sped. entro: {formatDate(event.data_spedizione_prevista)}
            </span>
          )}
          {event.data_consegna_prevista && (
            <span className="flex items-center gap-1">
              <Icon icon={ACTION_ICONS.check} size={14} />
              Consegna: {formatDate(event.data_consegna_prevista)}
            </span>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ProgressIndicator label="Confermati" current={confirmedCount + inPrepCount} total={rows.length} color="green" />
          <ProgressIndicator label="In preparazione" current={inPrepCount} total={confirmedCount + inPrepCount || 1} color="mikai" />
          <ProgressIndicator label="Da confermare" current={rows.length - pendingCount} total={rows.length} color={pendingCount > 0 ? 'yellow' : 'green'} />
        </div>
      )}
    </>
  )
}
