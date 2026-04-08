import { StatusDot } from './StatusDot'
import { Icon } from '../ui/Icon'
import { TRASPORTO_ICONS, ACTION_ICONS } from '../../lib/icons'
import { MEZZO_TRASPORTO, STATO_PRENOTAZIONE } from '../../lib/constants'
import { formatTime } from '../../lib/date-utils'

function SingleLeg({ record, onClick, canEdit }) {
  if (record.stato === 'non_necessario') {
    return (
      <button onClick={canEdit ? onClick : undefined} className={`flex items-center gap-1.5 ${canEdit ? 'hover:bg-gray-100 rounded px-1 -mx-1 cursor-pointer' : ''} transition-colors`} title="Non necessario" type="button">
        <StatusDot stato={record.stato} />
        <span className="text-gray-400 italic text-xs">Non nec.</span>
      </button>
    )
  }
  const icon = record.mezzo ? TRASPORTO_ICONS[record.mezzo] : null
  const depTime = record.orario ? formatTime(record.orario) : null
  const arrTime = record.orario_arrivo ? formatTime(record.orario_arrivo) : null
  const route = [record.luogo_partenza, record.luogo_arrivo].filter(Boolean).join(' → ')
  return (
    <button onClick={canEdit ? onClick : undefined} className={`text-left w-full ${canEdit ? 'hover:bg-mikai-50 rounded px-1 -mx-1 cursor-pointer' : ''} transition-colors`} title={`${MEZZO_TRASPORTO[record.mezzo] || ''} — ${STATO_PRENOTAZIONE[record.stato] || ''}`} type="button">
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusDot stato={record.stato} />
        {icon && <Icon icon={icon} size={14} className="text-gray-500" />}
        {record.codice && <span className="font-medium">{record.codice}</span>}
        {(record.luogo_partenza || depTime) && (
          <span className="text-gray-500">{[record.luogo_partenza, depTime].filter(Boolean).join(' ')}</span>
        )}
        {(record.luogo_partenza || depTime) && (record.luogo_arrivo || arrTime) && <span className="text-gray-300">→</span>}
        {(record.luogo_arrivo || arrTime) && (
          <span className="text-gray-500">{[record.luogo_arrivo, arrTime].filter(Boolean).join(' ')}</span>
        )}
        {!record.codice && !depTime && !record.luogo_partenza && record.mezzo && <span className="text-gray-500">{MEZZO_TRASPORTO[record.mezzo]}</span>}
      </div>
    </button>
  )
}

export function TrasportoCell({ records = [], onClickLeg, onAddLeg, canEdit }) {
  if (records.length === 0) {
    return canEdit ? (
      <button onClick={onAddLeg} className="min-h-[48px] min-w-[48px] md:min-h-[28px] md:min-w-[28px] rounded-lg border border-dashed border-gray-200 text-gray-300 hover:border-mikai-400 hover:text-mikai-500 flex items-center justify-center transition-colors" aria-label="Aggiungi trasporto" type="button">
        <Icon icon={ACTION_ICONS.add} size={14} />
      </button>
    ) : null
  }

  return (
    <div className="space-y-0.5">
      {records.map(record => (
        <SingleLeg key={record.id} record={record} onClick={() => onClickLeg?.(record)} canEdit={canEdit} />
      ))}
      {canEdit && (
        <button onClick={onAddLeg} className="flex items-center gap-1 text-xs text-gray-300 hover:text-mikai-500 transition-colors min-h-[48px] md:min-h-0 py-0.5" aria-label="Aggiungi tratta" type="button">
          <Icon icon={ACTION_ICONS.add} size={12} />
          <span>Tratta</span>
        </button>
      )}
    </div>
  )
}
