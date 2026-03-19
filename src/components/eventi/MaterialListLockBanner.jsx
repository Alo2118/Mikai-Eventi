import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'

export function MaterialListLockBanner({ dataSpedizione }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4" role="alert">
      <Icon icon={MATERIALE_ICONS.listLocked} size={20} className="text-yellow-600 flex-shrink-0" />
      <p className="text-base font-medium text-yellow-800">
        Lista chiusa — materiale in preparazione.
        {dataSpedizione && ` Spedizione prevista: ${formatDate(dataSpedizione)}`}
      </p>
    </div>
  )
}
