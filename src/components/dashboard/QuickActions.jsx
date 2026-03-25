import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { DASHBOARD_ICONS } from '../../lib/icons'

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        to="/eventi/nuovo"
        className="flex items-center justify-center gap-2 min-h-[56px] px-4 rounded-xl bg-mikai-400 text-white font-semibold text-base hover:bg-mikai-500 transition-colors"
      >
        <Icon icon={DASHBOARD_ICONS.newEvent} size={20} />
        Proponi evento
      </Link>
      <Link
        to="/contatti"
        className="flex items-center justify-center gap-2 min-h-[56px] px-4 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold text-base hover:bg-gray-50 transition-colors"
      >
        <Icon icon={DASHBOARD_ICONS.newContact} size={20} />
        Aggiungi contatto
      </Link>
    </div>
  )
}
