import { useState, useEffect } from 'react'
import { MODALITA_EVENTO, FORM_CONTAINER_STYLE, INPUT_STYLE, TEXTAREA_STYLE } from '../../lib/constants'
import { useEventTypes } from '../../hooks/useEventTypes'
import { useActivityTemplatesStore } from '../../hooks/useActivityTemplates'
import { formatDateRange, daysBetween, todayISO } from '../../lib/date-utils'
import { FormField } from '../ui/FormField'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS } from '../../lib/icons'

export function WizardStepRiepilogo({ data, onChange, promotoreNome, managerNome }) {
  const [touched, setTouched] = useState({})
  const [tempiStretti, setTempiStretti] = useState(false)
  const { labels: tipoLabels } = useEventTypes()
  const fetchTemplatePreview = useActivityTemplatesStore(s => s.fetchTemplatePreview)
  const touch = (field) => setTouched(t => ({ ...t, [field]: true }))

  // Avviso "tempi stretti": se l'evento è proposto con meno giorni di anticipo del
  // massimo lead-time richiesto dal template (max |giorni_prima_evento| tra gli item
  // che scadono prima dell'evento), alcune attività risulteranno subito urgenti.
  useEffect(() => {
    let active = true
    if (!data.tipo_evento || !data.modalita || !data.data_inizio) {
      setTempiStretti(false)
      return
    }
    fetchTemplatePreview(data.tipo_evento, data.modalita).then(({ data: items }) => {
      if (!active) return
      if (!items?.length) { setTempiStretti(false); return }
      const maxLeadTime = items.reduce(
        (max, i) => (i.giorni_prima_evento < 0 ? Math.max(max, -i.giorni_prima_evento) : max),
        0
      )
      const giorniAllEvento = daysBetween(data.data_inizio, todayISO())
      setTempiStretti(giorniAllEvento < maxLeadTime)
    })
    return () => { active = false }
  }, [data.tipo_evento, data.modalita, data.data_inizio, fetchTemplatePreview])

  const budgetError = touched.budget_previsto && data.budget_previsto !== '' && data.budget_previsto !== null && Number(data.budget_previsto) < 0
    ? 'Il budget non può essere negativo'
    : null

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Riepilogo</h2>
      <p className="text-base text-gray-500 mb-6">Controlla i dati prima di inviare la proposta.</p>

      <div className={FORM_CONTAINER_STYLE + ' space-y-3 mb-6'}>
        <div>
          <span className="text-sm text-gray-500">Tipo evento</span>
          <p className="text-base font-medium text-gray-900">{tipoLabels[data.tipo_evento] || data.tipo_evento}</p>
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

      {tempiStretti && (
        <div
          className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-6"
          role="status"
        >
          <Icon icon={FEEDBACK_ICONS.warning} size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Tempi stretti:</span> l'evento è vicino, alcune attività di preparazione risulteranno già urgenti. Puoi comunque inviare la proposta.
          </span>
        </div>
      )}

      <div className="space-y-4">
        <FormField label="Budget previsto (€)" hint="Facoltativo" error={budgetError}>
          <input
            type="number"
            step="100"
            value={data.budget_previsto ?? ''}
            onChange={e => onChange({ budget_previsto: e.target.value !== '' ? Number(e.target.value) : null })}
            onBlur={() => touch('budget_previsto')}
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
