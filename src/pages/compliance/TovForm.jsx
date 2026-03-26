import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Button } from '../../components/ui/Button'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_TOV, INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE, CARD_STYLE } from '../../lib/constants'
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
  const [form, setForm] = useState({
    hcp_id: searchParams.get('hcp_id') || '',
    evento_id: searchParams.get('evento_id') || '',
    tipo: '',
    importo: '',
    data_trasferimento: todayISO(),
    descrizione: '',
    giustificazione: '',
    periodo_riferimento: '',
  })

  useEffect(() => { fetchHcpList() }, [])

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

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

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Compliance', to: '/compliance' },
        { label: 'Trasferimenti', to: '/compliance/tov' },
        { label: 'Nuovo trasferimento' },
      ]} />
      <PageHeader title="Nuovo trasferimento di valore" />

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
                {h.contatto?.cognome} {h.contatto?.nome} — {h.contatto?.ente_ospedaliero || 'N/D'}
              </option>
            ))}
          </select>
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
