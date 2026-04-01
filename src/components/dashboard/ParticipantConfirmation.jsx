import { Icon } from '../ui/Icon'
import { DASHBOARD_ICONS } from '../../lib/icons'
import { CARD_STYLE } from '../../lib/constants'

export function ParticipantConfirmation({ participantStats }) {
  if (!participantStats || participantStats.total === 0) return null

  const { total, confermati, percentuale } = participantStats

  const barColor =
    percentuale >= 75 ? 'bg-green-500' :
    percentuale >= 40 ? 'bg-yellow-500' :
    'bg-red-500'

  const labelColor =
    percentuale >= 75 ? 'text-green-600' :
    percentuale >= 40 ? 'text-yellow-600' :
    'text-red-600'

  return (
    <div className={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-3">
        <Icon icon={DASHBOARD_ICONS.newContact} size={20} className="text-mikai-400" />
        <h3 className="font-semibold text-lg">Conferme partecipanti</h3>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        Partecipanti nei tuoi prossimi eventi
      </p>

      <div className="flex items-end gap-3 mb-2">
        <span className={`text-3xl font-bold ${labelColor}`}>{percentuale}%</span>
        <span className="text-sm text-gray-500 mb-1">confermati</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentuale}%` }}
        />
      </div>

      <p className="text-sm text-gray-500">
        {confermati} su {total} partecipanti {confermati === 1 ? 'ha confermato' : 'hanno confermato'}
      </p>
    </div>
  )
}
