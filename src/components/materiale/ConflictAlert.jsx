import { formatDateRange } from '../../lib/date-utils'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'

export function ConflictAlert({ conflicts }) {
  if (!conflicts || conflicts.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon icon={FEEDBACK_ICONS.warning} size={22} className="text-red-600" />
        <span className="text-base font-semibold text-red-800">
          Attenzione: materiale già prenotato!
        </span>
      </div>
      {conflicts.map((c) => (
        <p key={c.id} className="text-base text-red-700 ml-8">
          {c.event?.titolo || 'Evento'} ({formatDateRange(c.data_inizio_utilizzo, c.data_fine_utilizzo)})
        </p>
      ))}
      <p className="text-sm text-red-600 ml-8">
        Scegli date diverse o un materiale alternativo.
      </p>
    </div>
  )
}
