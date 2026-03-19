import { STATO_GADGET_RICHIESTA } from '../../lib/constants'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'

export function GadgetCard({ gadget, eventGadget }) {
  const lowStock = gadget.quantita_disponibile <= gadget.soglia_minima

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-base font-medium text-gray-900">{gadget.nome}</h4>
          <p className="text-sm text-gray-500">
            Disponibili: <span className={lowStock ? 'text-red-600 font-semibold' : ''}>{gadget.quantita_disponibile}</span>
            {lowStock && (
              <span className="inline-flex items-center gap-1 ml-1 text-red-600">
                <Icon icon={FEEDBACK_ICONS.warning} size={14} />
                Scorta bassa
              </span>
            )}
          </p>
        </div>
        {eventGadget && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            eventGadget.stato === 'consegnato' ? 'bg-green-100 text-green-800' :
            eventGadget.stato === 'pronto' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {STATO_GADGET_RICHIESTA[eventGadget.stato]}
          </span>
        )}
      </div>
      {eventGadget && (
        <p className="text-sm text-gray-600 mt-2">
          Richiesti: {eventGadget.quantita_richiesta}
          {eventGadget.quantita_consegnata > 0 && ` · Consegnati: ${eventGadget.quantita_consegnata}`}
        </p>
      )}
    </div>
  )
}
