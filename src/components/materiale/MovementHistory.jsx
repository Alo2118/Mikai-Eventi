import { STATO_MOVIMENTO, MODALITA_MOVIMENTO, STATO_RIENTRO } from '../../lib/constants'
import { formatDateTime } from '../../lib/date-utils'

export function MovementHistory({ movements }) {
  if (!movements || movements.length === 0) {
    return <p className="text-base text-gray-400 py-4">Nessun movimento registrato.</p>
  }

  return (
    <div className="space-y-3">
      {movements.map((m) => (
        <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-base font-medium ${m.tipo === 'uscita' ? 'text-red-700' : m.tipo === 'rientro' ? 'text-green-700' : 'text-blue-700'}`}>
              {STATO_MOVIMENTO[m.tipo]}
            </span>
            <span className="text-sm text-gray-400">{formatDateTime(m.data_movimento)}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {MODALITA_MOVIMENTO[m.modalita]}
            {m.event?.titolo && ` \u2014 ${m.event.titolo}`}
            {m.material?.nome && ` \u2014 ${m.material.nome}`}
          </p>
          <p className="text-sm text-gray-500">
            {m.da_posizione && `Da: ${m.da_posizione}`} {m.a_posizione && `\u2192 ${m.a_posizione}`}
          </p>
          {m.responsabile && (
            <p className="text-sm text-gray-400 mt-1">Resp: {m.responsabile.nome} {m.responsabile.cognome}</p>
          )}
          {m.tracking_spedizione && <p className="text-sm text-gray-400">Tracking: {m.tracking_spedizione}</p>}
          {m.stato_rientro && (
            <p className={`text-sm font-medium mt-1 ${m.stato_rientro === 'integro' ? 'text-green-600' : m.stato_rientro === 'danneggiato' ? 'text-red-600' : 'text-yellow-600'}`}>
              Rientro: {STATO_RIENTRO[m.stato_rientro]}
            </p>
          )}
          {m.note_danni && <p className="text-sm text-red-500">{m.note_danni}</p>}
        </div>
      ))}
    </div>
  )
}
