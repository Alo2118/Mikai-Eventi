import { Fragment } from 'react'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { ACTION_ICONS, LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import {
  STATO_PRENOTAZIONE, STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE,
  RUOLO_EVENTO, TIPO_PARTECIPANTE,
  ISCRIZIONE_CHIP_COLORS, CONFERMATO_CHIP,
} from '../../lib/constants'
import { ISCRIZIONE_CYCLE, personKey, getPersonTavolo } from '../../lib/logistics-utils'
import { formatDateShort } from '../../lib/date-utils'
import { StatusDot } from './StatusDot'
import { TrasportoCell } from './TrasportoCell'
import { TavoloBadge } from './LogisticaPickers'

export function LogisticaPersonRow({
  person, logistics, hasTavoli, selected, perms, actions,
}) {
  // Bundle raggruppati (sotto il limite prop); destrutturati qui, corpo invariato.
  const { hotel, andata, ritorno, tavoli } = logistics || {}
  const { canEdit, canEditStaff, canEditPart } = perms || {}
  const { onToggleSelect, onSetStatoConfirm, onSetSingleEdit, onSetDeleting } = actions || {}
  const key = personKey(person)
  const currentTavolo = hasTavoli ? getPersonTavolo(person, tavoli) : null

  return (
    <Fragment>
      <tr className={`group border-b border-gray-100 hover:bg-gray-50 ${selected ? 'bg-mikai-50/50' : ''}`}>
        {canEdit && (
          <td className="py-2 px-2">
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(person)}
              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
          </td>
        )}
        <td className="py-2 pr-2">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{person.cognome} {person.nome}</span>
                <span className="flex-shrink-0">
                  {person.type === 'staff' && canEditStaff && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetStatoConfirm({ person, newStato: !person.confermato, label: person.confermato ? 'Da confermare' : 'Confermato', type: 'staff' }) }}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${CONFERMATO_CHIP[person.confermato]}`}
                    >
                      {person.confermato ? 'Confermato' : 'Da confermare'}
                    </button>
                  )}
                  {person.type === 'participant' && canEditPart && (
                    <button
                      onClick={(e) => { e.stopPropagation(); const nextStato = ISCRIZIONE_CYCLE[person.statoIscrizione || 'invitato']; onSetStatoConfirm({ person, newStato: nextStato, label: STATO_ISCRIZIONE[nextStato], type: 'participant' }) }}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${ISCRIZIONE_CHIP_COLORS[person.statoIscrizione || 'invitato']}`}
                    >
                      {STATO_ISCRIZIONE[person.statoIscrizione || 'invitato']}
                    </button>
                  )}
                  {person.type === 'participant' && !canEditPart && (
                    <StatusBadge stato={person.statoIscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}</span>
                {(person.esigenze_alimentari || person.esigenze_accessibilita || person.note) && (
                  <span className="inline-flex items-center gap-1.5">
                    {person.esigenze_alimentari && <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={16} className="text-red-400" />}
                    {person.esigenze_accessibilita && <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={16} className="text-blue-400" />}
                    {person.note && <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={16} className="text-mikai-400" />}
                  </span>
                )}
                {(canEdit || canEditPart) && (
                  <button type="button" onClick={() => onSetSingleEdit({ type: 'dettagli', person })}
                    className="inline-flex items-center gap-1 text-gray-300 hover:text-mikai-500 transition-colors min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 md:p-0.5 justify-center"
                    title="Modifica dettagli persona"
                  >
                    <Icon icon={ACTION_ICONS.edit} size={16} />
                  </button>
                )}
              </div>
            </div>
            {(canEditStaff || canEditPart) && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, personId: person.id, name: `${person.cognome} ${person.nome}` }) }}
                className="text-gray-300 hover:text-red-500 p-1 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 flex items-center justify-center"
                aria-label={`Rimuovi ${person.cognome} ${person.nome}`}
              >
                <Icon icon={ACTION_ICONS.close} size={14} />
              </button>
            )}
          </div>
        </td>
        {hasTavoli && (
          <td className="py-2 px-2">
            <TavoloBadge tavolo={currentTavolo} compact />
          </td>
        )}
        <td className="py-2 px-2">
          {hotel ? (
            <button type="button" onClick={canEdit ? () => onSetSingleEdit({ type: 'hotel', person, record: hotel }) : undefined}
              className={`text-left w-full ${canEdit ? 'hover:bg-mikai-50 rounded px-1 -mx-1 cursor-pointer' : ''} transition-colors`}
              title={hotel.stato === 'non_necessario' ? 'Non necessario' : `${hotel.nome_hotel || 'Hotel'} — ${STATO_PRENOTAZIONE[hotel.stato] || ''}`}
            >
              <div className="flex items-center gap-1.5">
                <StatusDot stato={hotel.stato} />
                {hotel.stato === 'non_necessario' ? (
                  <span className="text-gray-400 italic text-xs">Non nec.</span>
                ) : (
                  <div className="min-w-0">
                    {hotel.nome_hotel && <div className="font-medium truncate">{hotel.nome_hotel}</div>}
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
            </button>
          ) : canEdit ? (
            <button type="button" onClick={() => onSetSingleEdit({ type: 'hotel', person, record: null })}
              className="w-7 h-7 rounded border border-dashed border-gray-200 text-gray-300 hover:border-mikai-400 hover:text-mikai-500 flex items-center justify-center transition-colors"
              aria-label="Aggiungi hotel"
            >
              <Icon icon={ACTION_ICONS.add} size={14} />
            </button>
          ) : null}
        </td>
        <td className="py-2 px-2">
          <TrasportoCell records={andata} canEdit={canEdit}
            onClickLeg={(leg) => onSetSingleEdit({ type: 'andata', person, record: leg })}
            onAddLeg={() => onSetSingleEdit({ type: 'andata', person, record: null, ordine: andata.length + 1 })} />
        </td>
        <td className="py-2 px-2">
          <TrasportoCell records={ritorno} canEdit={canEdit}
            onClickLeg={(leg) => onSetSingleEdit({ type: 'ritorno', person, record: leg })}
            onAddLeg={() => onSetSingleEdit({ type: 'ritorno', person, record: null, ordine: ritorno.length + 1 })} />
        </td>
      </tr>
    </Fragment>
  )
}
