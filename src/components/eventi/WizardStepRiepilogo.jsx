import { TIPO_EVENTO, MODALITA_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

export function WizardStepRiepilogo({ data }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Riepilogo</h2>
      <p className="text-base text-gray-500 mb-6">Controlla i dati prima di inviare la proposta.</p>

      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
        <div>
          <span className="text-sm text-gray-500">Tipo evento</span>
          <p className="text-base font-medium text-gray-900">{TIPO_EVENTO[data.tipo_evento]}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Titolo</span>
          <p className="text-base font-medium text-gray-900">{data.titolo}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Date</span>
          <p className="text-base font-medium text-gray-900">
            {formatDateRange(data.data_inizio, data.data_fine)}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Luogo</span>
          <p className="text-base font-medium text-gray-900">
            {data.luogo}
            {data.sede_dettaglio && ` \u2014 ${data.sede_dettaglio}`}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Modalita'</span>
          <p className="text-base font-medium text-gray-900">{MODALITA_EVENTO[data.modalita]}</p>
        </div>
      </div>
    </div>
  )
}
