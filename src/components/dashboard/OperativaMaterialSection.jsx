import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS, ACTION_ICONS } from '../../lib/icons'
import { CARD_HOVER_STYLE } from '../../lib/constants'

export function OperativaMaterialSection({ upcomingBookings, overdueReturns }) {
  const bookingsCount = upcomingBookings?.length || 0
  const overdueCount = overdueReturns?.length || 0

  return (
    <div>
      <h3 className="font-semibold text-lg mb-3">Materiale</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/materiale" className={'block ' + CARD_HOVER_STYLE}>
          <div className="flex items-center gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${bookingsCount > 0 ? 'bg-mikai-50 text-mikai-500' : 'bg-gray-100 text-gray-400'}`}>
              <Icon icon={MATERIALE_ICONS.package} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Prenotazioni in arrivo</p>
              <p className={`text-xl font-bold ${bookingsCount > 0 ? 'text-mikai-600' : 'text-gray-400'}`}>{bookingsCount}</p>
            </div>
            <Icon icon={ACTION_ICONS.forward} size={16} className="text-gray-300 shrink-0" />
          </div>
        </Link>
        <Link to="/materiale" className={'block ' + CARD_HOVER_STYLE}>
          <div className="flex items-center gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              <Icon icon={MATERIALE_ICONS.rientro} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Rientri in ritardo</p>
              <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p>
            </div>
            <Icon icon={ACTION_ICONS.forward} size={16} className="text-gray-300 shrink-0" />
          </div>
        </Link>
      </div>
    </div>
  )
}
