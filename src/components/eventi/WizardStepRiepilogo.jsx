import { TIPO_EVENTO, MODALITA_EVENTO, FORM_CONTAINER_STYLE, INPUT_STYLE, TEXTAREA_STYLE } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'
import { FormField } from '../ui/FormField'

export function WizardStepRiepilogo({ data, onChange, promotoreNome, managerNome }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Riepilogo</h2>
      <p className="text-base text-gray-500 mb-6">Controlla i dati prima di inviare la proposta.</p>

      <div className={FORM_CONTAINER_STYLE + ' space-y-3 mb-6'}>
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
            {data.sede_dettaglio && ` — ${data.sede_dettaglio}`}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Modalità</span>
          <p className="text-base font-medium text-gray-900">{MODALITA_EVENTO[data.modalita]}</p>
        </div>
        {promotoreNome && (
          <div>
            <span className="text-sm text-gray-500">Promotore</span>
            <p className="text-base font-medium text-gray-900">{promotoreNome}</p>
          </div>
        )}
        {managerNome && (
          <div>
            <span className="text-sm text-gray-500">Referente</span>
            <p className="text-base font-medium text-gray-900">{managerNome}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <FormField label="Budget previsto (€)" hint="Facoltativo">
          <input
            type="number"
            min="0"
            step="100"
            value={data.budget_previsto || ''}
            onChange={e => onChange({ budget_previsto: e.target.value ? Number(e.target.value) : null })}
            placeholder="Es. 5000"
            className={INPUT_STYLE}
          />
        </FormField>

        <FormField label="Note rapide" hint="Facoltativo — contesto della richiesta">
          <textarea
            value={data.note || ''}
            onChange={e => onChange({ note: e.target.value })}
            placeholder="Es: Richiesto da Marco via WhatsApp, confermato con Prof. Rossi"
            rows={3}
            className={TEXTAREA_STYLE}
          />
        </FormField>
      </div>
    </div>
  )
}
