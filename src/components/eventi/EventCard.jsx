import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { TIPO_EVENTO, STATO_EVENTO_COLORE } from '../../lib/constants'
import { TIPO_EVENTO_ICONS } from '../../lib/icons'
import { formatDateRange } from '../../lib/date-utils'

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

  return (
    <Link
      to={`/eventi/${event.id}`}
      className="group block bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-mikai-300 transition-all overflow-hidden"
    >
      <div className="flex">
        {/* Banda colorata laterale per stato */}
        <div className={`w-1.5 flex-shrink-0 ${bandaColore[color]}`} />

        <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
          {/* Icona tipo evento */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-mikai-50 flex items-center justify-center text-mikai-500">
            {TipoIcon ? <Icon icon={TipoIcon} size={24} /> : <Icon name="eventi" size={24} />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {event.titolo}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDateRange(event.data_inizio, event.data_fine)}
              {event.luogo && ` · ${event.luogo}`}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusBadge stato={event.stato} />
              <span className="text-sm text-gray-400">
                {TIPO_EVENTO[event.tipo_evento]}
              </span>
            </div>
          </div>

          {/* Freccia navigazione */}
          <Icon name="chevron_right" size={20} className="flex-shrink-0 text-gray-300 group-hover:text-mikai-400 transition-colors" />
        </div>
      </div>
    </Link>
  )
}
