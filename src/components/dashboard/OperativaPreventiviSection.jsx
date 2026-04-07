import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { COSTI_ICONS, ACTION_ICONS } from '../../lib/icons'
import { CARD_HOVER_STYLE } from '../../lib/constants'
import { formatCurrency } from '../../lib/format-utils'

export function OperativaPreventiviSection({ pendingPreventivi }) {
  const count = pendingPreventivi?.length || 0
  const totalAmount = (pendingPreventivi || []).reduce((sum, p) => sum + (p.importo || 0), 0)

  return (
    <div>
      <h3 className="font-semibold text-lg mb-3">Preventivi</h3>
      <Link to="/costi" className={'block ' + CARD_HOVER_STYLE}>
        <div className="flex items-center gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${count > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-500'}`}>
            <Icon icon={COSTI_ICONS.preventivo} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">In attesa di approvazione</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-xl font-bold ${count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{count}</p>
              {count > 0 && (
                <p className="text-sm text-gray-500">{formatCurrency(totalAmount)}</p>
              )}
            </div>
          </div>
          <Icon icon={ACTION_ICONS.forward} size={16} className="text-gray-300 shrink-0" />
        </div>
      </Link>
    </div>
  )
}
