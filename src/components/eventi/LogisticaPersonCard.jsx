import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { ACTION_ICONS, LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import {
  STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE,
  RUOLO_EVENTO, TIPO_PARTECIPANTE,
  CARD_STYLE,
  ISCRIZIONE_CHIP_COLORS, CONFERMATO_CHIP, CONFERMATO_BADGE,
} from '../../lib/constants'
import { ISCRIZIONE_CYCLE, personKey, getPersonTavolo } from '../../lib/logistics-utils'
import { formatDateShort } from '../../lib/date-utils'
import { StatusDot } from './StatusDot'
import { TrasportoCell } from './TrasportoCell'

export function LogisticaPersonCard({
  person, hotel, andata, ritorno, hasTavoli, tavoli,
  selected, canEdit, canEditStaff, canEditPart,
  onToggleSelect, onSetStatoConfirm, onSetSingleEdit, onSetDeleting,
}) {
  const key = personKey(person)
  const currentTavolo = hasTavoli ? getPersonTavolo(person, tavoli) : null

  return (
    <div className={CARD_STYLE + ` space-y-3 ${selected ? 'border-mikai-300 bg-mikai-50/30' : ''}`}>
      <div className="flex items-start gap-2">
        {canEdit && (
          <input type="checkbox" checked={selected} onChange={() => onToggleSelect(person)}
            className="w-5 h-5 mt-1 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">{person.cognome} {person.nome}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex-shrink-0">
              {person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}
            </span>
          </div>
          {hasTavoli && currentTavolo && (
            <span className="text-xs font-medium text-gray-500">Tavolo {currentTavolo.numero}{currentTavolo.nome ? ` — ${currentTavolo.nome}` : ''}</span>
          )}
        </div>
        {(canEditStaff || canEditPart) && (
          <button onClick={() => onSetDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, personId: person.id, name: `${person.cognome} ${person.nome}` })}
            className="text-gray-400 hover:text-red-500 p-2 flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label={`Rimuovi ${person.cognome} ${person.nome}`}>
            <Icon icon={ACTION_ICONS.close} size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {person.type === 'staff' && canEditStaff && (
          <button
            onClick={() => onSetStatoConfirm({ person, newStato: !person.confermato, label: person.confermato ? 'Da confermare' : 'Confermato', type: 'staff' })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium min-h-[48px] transition-colors ${CONFERMATO_CHIP[person.confermato]}`}
          >
            {person.confermato ? 'Confermato' : 'Da confermare'}
          </button>
        )}
        {person.type === 'staff' && !canEditStaff && (
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${CONFERMATO_BADGE[person.confermato]}`}>
            {person.confermato ? 'Confermato' : 'Da confermare'}
          </span>
        )}
        {person.type === 'participant' && canEditPart && (
          <button
            onClick={() => { const nextStato = ISCRIZIONE_CYCLE[person.statoIscrizione || 'invitato']; onSetStatoConfirm({ person, newStato: nextStato, label: STATO_ISCRIZIONE[nextStato], type: 'participant' }) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium min-h-[48px] transition-colors ${ISCRIZIONE_CHIP_COLORS[person.statoIscrizione || 'invitato']}`}
          >
            {STATO_ISCRIZIONE[person.statoIscrizione || 'invitato']}
          </button>
        )}
        {person.type === 'participant' && !canEditPart && (
          <StatusBadge stato={person.statoIscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />
        )}
      </div>

      {hotel && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5">
          <StatusDot stato={hotel.stato} />
          <Icon icon={LOGISTICA_PERSONE_ICONS.hotel} size={16} className="text-gray-400 flex-shrink-0" />
          {hotel.stato === 'non_necessario' ? (
            <span className="text-sm text-gray-400 italic">Non nec.</span>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{hotel.nome_hotel || 'Hotel'}</div>
              {(hotel.check_in || hotel.check_out) && (
                <div className="text-xs text-gray-400">
                  {hotel.check_in && formatDateShort(hotel.check_in)}
                  {hotel.check_in && hotel.check_out && ' → '}
                  {hotel.check_out && formatDateShort(hotel.check_out)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(andata.length > 0 || ritorno.length > 0 || canEdit) && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
            <Icon icon={ACTION_ICONS.forward} size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-500 font-medium mb-0.5">Andata</div>
              <TrasportoCell records={andata} canEdit={canEdit}
                onClickLeg={(leg) => onSetSingleEdit({ type: 'andata', person, record: leg })}
                onAddLeg={() => onSetSingleEdit({ type: 'andata', person, record: null, ordine: andata.length + 1 })} />
            </div>
          </div>
          <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
            <Icon icon={ACTION_ICONS.back} size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-500 font-medium mb-0.5">Ritorno</div>
              <TrasportoCell records={ritorno} canEdit={canEdit}
                onClickLeg={(leg) => onSetSingleEdit({ type: 'ritorno', person, record: leg })}
                onAddLeg={() => onSetSingleEdit({ type: 'ritorno', person, record: null, ordine: ritorno.length + 1 })} />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {person.esigenze_alimentari && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={12} />{person.esigenze_alimentari}
          </span>
        )}
        {person.esigenze_accessibilita && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={12} />{person.esigenze_accessibilita}
          </span>
        )}
        {person.note && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={12} className="text-mikai-400" />
            {person.note.length > 30 ? person.note.slice(0, 30) + '...' : person.note}
          </span>
        )}
        {(canEdit || canEditPart) && (
          <button type="button" onClick={() => onSetSingleEdit({ type: 'dettagli', person })}
            className="text-xs text-mikai-500 hover:text-mikai-700 font-medium min-h-[48px]">
            Dettagli
          </button>
        )}
      </div>
    </div>
  )
}
