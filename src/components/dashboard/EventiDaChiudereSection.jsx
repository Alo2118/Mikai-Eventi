import { Link } from 'react-router-dom'
import { CARD_HOVER_STYLE, STATO_EVENTO } from '../../lib/constants'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS, ACTION_ICONS, STATO_EVENTO_ICONS } from '../../lib/icons'
import { formatDateRange, daysBetween, todayISO } from '../../lib/date-utils'

// Etichetta "quanto tempo fa è finito" — motiva la chiusura per liberare il materiale.
function conclusoLabel(dataFine) {
  if (!dataFine) return ''
  const giorni = daysBetween(todayISO(), dataFine)
  if (giorni <= 0) return 'Terminato'
  if (giorni === 1) return 'Terminato ieri'
  return `Terminato ${giorni} giorni fa`
}

export function EventiDaChiudereSection({ events }) {
  if (!events || events.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon icon={FEEDBACK_ICONS.warning} size={20} className="text-amber-500 shrink-0" />
        <h3 className="font-semibold text-lg">Eventi da chiudere</h3>
        <span className="text-sm font-bold text-amber-600">{events.length}</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Questi eventi sono già terminati ma non ancora conclusi. Chiudili per liberare il materiale ancora fuori.
      </p>
      <div className="space-y-3">
        {events.map(e => (
          <Link key={e.id} to={`/eventi/${e.id}`} className={'block ' + CARD_HOVER_STYLE}>
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-500">
                <Icon icon={STATO_EVENTO_ICONS[e.stato] || STATO_EVENTO_ICONS.in_corso} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base text-gray-900 truncate">{e.titolo}</p>
                <p className="text-sm text-gray-500 mt-0.5">{formatDateRange(e.data_inizio, e.data_fine)}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-amber-100 text-amber-700">
                  {conclusoLabel(e.data_fine)}
                </span>
                <span className="text-xs text-gray-400">{STATO_EVENTO[e.stato] || e.stato}</span>
              </div>
              <Icon icon={ACTION_ICONS.forward} size={16} className="text-gray-300 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
