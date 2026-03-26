import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { TIPO_EVENTO, STATO_EVENTO_COLORE, MODALITA_EVENTO } from '../../lib/constants'
import { TIPO_EVENTO_ICONS, FEEDBACK_ICONS, NAV_ICONS, MATERIALE_ICONS, INFO_EVENTO_ICONS } from '../../lib/icons'
import { formatDateRange, todayISO } from '../../lib/date-utils'

const bandaColore = {
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-400',
  mikai: 'bg-mikai-400',
  green: 'bg-green-400',
  emerald: 'bg-emerald-400',
  gray: 'bg-gray-400',
  red: 'bg-red-400',
}

export function EventCard({ event }) {
  const TipoIcon = TIPO_EVENTO_ICONS[event.tipo_evento]
  const color = STATO_EVENTO_COLORE[event.stato] || 'gray'
  const today = todayISO()
  const daysUntil = event.data_inizio ? Math.ceil((new Date(event.data_inizio) - new Date(today)) / (1000 * 60 * 60 * 24)) : null
  const isPast = daysUntil !== null && daysUntil < 0
  const promotore = event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : null

  return (
    <Link
      to={`/eventi/${event.id}`}
      className={`group block bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-mikai-300 transition-all overflow-hidden ${isPast ? 'opacity-60' : ''}`}
    >
      <div className="flex">
        <div className={`w-1.5 flex-shrink-0 ${bandaColore[color]}`} />

        <div className="flex-1 min-w-0 p-4">
          {/* Row 1: title + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-mikai-50 flex items-center justify-center text-mikai-500">
                {TipoIcon ? <Icon icon={TipoIcon} size={20} /> : <Icon name="eventi" size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{event.titolo}</h3>
                <p className="text-sm text-gray-500">
                  {formatDateRange(event.data_inizio, event.data_fine)}
                </p>
              </div>
            </div>
            <StatusBadge stato={event.stato} />
          </div>

          {/* Row 2: meta info chips */}
          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-gray-500">
            {event.luogo && (
              <span className="flex items-center gap-1">
                <Icon icon={INFO_EVENTO_ICONS.luogo} size={14} className="text-gray-400" />
                {event.luogo}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon icon={TipoIcon || NAV_ICONS.eventi} size={14} className="text-gray-400" />
              {TIPO_EVENTO[event.tipo_evento]}
            </span>
            {event.modalita && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                event.modalita === 'interno' ? 'bg-mikai-50 text-mikai-600' :
                event.modalita === 'contributo' ? 'bg-yellow-50 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {MODALITA_EVENTO[event.modalita]}
              </span>
            )}
            {event.desk_richiesto && (
              <span className="flex items-center gap-1 text-xs text-blue-600">
                <Icon icon={INFO_EVENTO_ICONS.desk} size={12} />
                Desk
              </span>
            )}
          </div>

          {/* Row 3: promotore + urgency */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {promotore && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Icon icon={NAV_ICONS.profilo} size={12} />
                {promotore}
              </span>
            )}
            {event.stato === 'proposto' && (
              <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                <Icon icon={FEEDBACK_ICONS.warning} size={12} />
                Da approvare
              </span>
            )}
            {daysUntil !== null && daysUntil <= 7 && daysUntil >= 0 && !['concluso', 'cancellato'].includes(event.stato) && (
              <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                <Icon icon={FEEDBACK_ICONS.warning} size={12} />
                {daysUntil === 0 ? 'Oggi' : daysUntil === 1 ? 'Domani' : `Tra ${daysUntil} giorni`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
