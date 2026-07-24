import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_TOV, INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE, CARD_STYLE } from '../../lib/constants'
import { FEEDBACK_ICONS } from '../../lib/icons'
import { todayISO } from '../../lib/date-utils'

export function TovForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const createTov = useComplianceStore(s => s.createTov)
  const hcpList = useComplianceStore(s => s.hcpList)
  const fetchHcpList = useComplianceStore(s => s.fetchHcpList)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)

  const [saving, setSaving] = useState(false)
  // Precompilazione da "ToV suggeriti" (ponte ospitalità HCP): i parametri sono
  // proposte modificabili — l'utente conferma prima di registrare (materia legale).
  const [form, setForm] = useState({
    hcp_id: searchParams.get('hcp_id') || '',
    evento_id: searchParams.get('evento_id') || '',
    tipo: searchParams.get('tipo') || '',
    importo: searchParams.get('importo') || '',
    data_trasferimento: searchParams.get('data_trasferimento') || todayISO(),
    descrizione: searchParams.get('descrizione') || '',
    giustificazione: searchParams.get('giustificazione') || '',
    periodo_riferimento: searchParams.get('periodo_riferimento') || '',
  })
  const prefilled = !!searchParams.get('tipo')

  useEffect(() => { fetchHcpList() }, [])

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const selectedHcp = hcpList.find(h => h.id === form.hcp_id)
  const senzaConsenso = selectedHcp && !selectedHcp.consenso_privacy

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.hcp_id || !form.tipo || !form.importo || !form.descrizione || !form.giustificazione) {
      addToast('Compila tutti i campi obbligatori', 'warning')
      return
    }

    setSaving(true)
    const payload = {
      ...form,
      importo: parseFloat(form.importo),
      evento_id: form.evento_id || null,
      periodo_riferimento: form.periodo_riferimento || null,
      created_by: profile.id,
    }
    const { error } = await createTov(payload)
    setSaving(false)

    if (error) {
      addToast('Errore nel salvataggio', 'error')
      return
    }
    addToast('Trasferimento registrato', 'success')
    navigate('/compliance/tov')
  }

  // Generate period options
  const year = new Date().getFullYear()
  const periodi = [
    { value: '', label: 'Seleziona periodo (opzionale)' },
    { value: `${year}-S1`, label: `${year} — 1° semestre` },
    { value: `${year}-S2`, label: `${year} — 2° semestre` },
    { value: `${year}`, label: `${year} (intero anno)` },
  ]
  // Se la bozza suggerisce un periodo non presente (es. evento di un altro anno),
  // aggiungilo così la select ne conserva il valore.
  if (form.periodo_riferimento && !periodi.some(p => p.value === form.periodo_riferimento)) {
    periodi.push({ value: form.periodo_riferimento, label: form.periodo_riferimento })
  }

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Compliance', to: '/compliance' },
        { label: 'Trasferimenti', to: '/compliance/tov' },
        { label: 'Nuovo trasferimento' },
      ]} />
      <PageHeader title="Nuovo trasferimento di valore" />

      {prefilled && (
        <div className="flex items-start gap-2 bg-mikai-50 border border-mikai-200 rounded-lg px-4 py-3 max-w-2xl" role="status">
          <Icon icon={FEEDBACK_ICONS.info} size={18} className="text-mikai-600 mt-0.5 shrink-0" />
          <p className="text-sm text-mikai-800">
            Bozza precompilata dai costi di ospitalità dell'evento. Controlla importo e dati, poi registra.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${CARD_STYLE} space-y-5 max-w-2xl`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Professionista HCP <span className="text-red-500">*</span>
          </label>
          <select
            value={form.hcp_id}
            onChange={e => set('hcp_id', e.target.value)}
            className={SELECT_STYLE}
            required
          >
            <option value="">Seleziona HCP...</option>
            {hcpList.map(h => (
              <option key={h.id} value={h.id}>
                {h.contatto?.cognome} {h.contatto?.nome} — {h.contatto?.azienda || 'N/D'}
              </option>
            ))}
          </select>
          {senzaConsenso && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mt-3" role="alert">
              <Icon icon={FEEDBACK_ICONS.warning} size={18} className="text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-yellow-800">
                Questo professionista non ha dato il consenso privacy: il trasferimento sarà pubblicabile solo in forma aggregata.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={SELECT_STYLE} required>
              <option value="">Seleziona tipo...</option>
              {Object.entries(TIPO_TOV).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importo (€) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.importo}
              onChange={e => set('importo', e.target.value)}
              className={INPUT_STYLE}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data trasferimento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.data_trasferimento}
              onChange={e => set('data_trasferimento', e.target.value)}
              className={INPUT_STYLE}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo di riferimento</label>
            <select value={form.periodo_riferimento} onChange={e => set('periodo_riferimento', e.target.value)} className={SELECT_STYLE}>
              {periodi.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrizione <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.descrizione}
            onChange={e => set('descrizione', e.target.value)}
            className={TEXTAREA_STYLE}
            placeholder="Descrivi il trasferimento di valore..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giustificazione <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.giustificazione}
            onChange={e => set('giustificazione', e.target.value)}
            className={TEXTAREA_STYLE}
            placeholder="Motivazione del trasferimento di valore..."
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={() => navigate('/compliance/tov')}>Annulla</Button>
          <Button variant="primary" type="submit" loading={saving}>Registra trasferimento</Button>
        </div>
      </form>
    </div>
  )
}
