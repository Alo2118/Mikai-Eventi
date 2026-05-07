import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { useAuthStore } from '../../hooks/useAuth'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { Modal } from '../ui/Modal'
import { useToastStore } from '../ui/Toast'
import { TIPO_TOV, STATO_TOV, STATO_TOV_COLORE, TIPO_INTERAZIONE_HCP, SELECT_STYLE, INPUT_STYLE, TEXTAREA_STYLE, SUMMARY_BAR_STYLE, CARD_STYLE } from '../../lib/constants'
import { COMPLIANCE_ICONS, ACTION_ICONS } from '../../lib/icons'
import { formatDate, todayISO } from '../../lib/date-utils'
import { formatCurrencyDecimals } from '../../lib/format-utils'

function InterazioneFormModal({ open, onClose, event, hcpList, onSave }) {
  const profile = useAuthStore(s => s.profile)
  const [form, setForm] = useState({
    hcp_id: '', tipo: 'evento', data_interazione: todayISO(),
    note: '', materiale_presentato: '',
  })
  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.hcp_id || !form.tipo) return
    onSave({ ...form, evento_id: event.id, user_id: profile.id })
  }

  return (
    <Modal open={open} onClose={onClose} title="Registra interazione">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Professionista HCP <span className="text-red-500">*</span></label>
          <select value={form.hcp_id} onChange={e => set('hcp_id', e.target.value)} className={SELECT_STYLE} required>
            <option value="">Seleziona HCP...</option>
            {hcpList.map(h => (
              <option key={h.id} value={h.id}>{h.contatto?.cognome} {h.contatto?.nome}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={SELECT_STYLE} required>
              {Object.entries(TIPO_INTERAZIONE_HCP).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input type="date" value={form.data_interazione} onChange={e => set('data_interazione', e.target.value)} className={INPUT_STYLE} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea value={form.note} onChange={e => set('note', e.target.value)} className={TEXTAREA_STYLE} placeholder="Note sull'interazione..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Materiale presentato</label>
          <input value={form.materiale_presentato} onChange={e => set('materiale_presentato', e.target.value)} className={INPUT_STYLE} placeholder="Descrivi il materiale presentato..." />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button variant="primary" type="submit">Registra</Button>
        </div>
      </form>
    </Modal>
  )
}

export function EventComplianceTab({ event }) {
  const navigate = useNavigate()
  const tovList = useComplianceStore(s => s.tovList)
  const tovLoading = useComplianceStore(s => s.tovLoading)
  const fetchTovList = useComplianceStore(s => s.fetchTovList)
  const interazioni = useComplianceStore(s => s.interazioni)
  const interazioniLoading = useComplianceStore(s => s.interazioniLoading)
  const fetchInterazioni = useComplianceStore(s => s.fetchInterazioni)
  const hcpList = useComplianceStore(s => s.hcpList)
  const fetchHcpList = useComplianceStore(s => s.fetchHcpList)
  const createInterazione = useComplianceStore(s => s.createInterazione)
  const addToast = useToastStore(s => s.add)

  const [showInterazione, setShowInterazione] = useState(false)

  useEffect(() => {
    fetchTovList({ evento_id: event.id })
    fetchInterazioni({ evento_id: event.id })
    fetchHcpList()
  }, [event.id])

  const handleSaveInterazione = async (data) => {
    const { error } = await createInterazione(data)
    if (error) { addToast('Non è stato possibile salvare l\'interazione. Riprova.', 'error'); return }
    addToast('Interazione registrata', 'success')
    setShowInterazione(false)
    fetchInterazioni({ evento_id: event.id })
  }

  const totaleToV = tovList.reduce((sum, t) => sum + Number(t.importo), 0)

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className={SUMMARY_BAR_STYLE + ' flex flex-col md:flex-row md:items-center justify-between gap-3'}>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-mikai-700">{tovList.length}</p>
            <p className="text-xs text-mikai-600">Trasferimenti</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mikai-700">{interazioni.length}</p>
            <p className="text-xs text-mikai-600">Interazioni</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mikai-700">{formatCurrencyDecimals(totaleToV)}</p>
            <p className="text-xs text-mikai-600">Totale ToV</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowInterazione(true)}>
            <Icon icon={COMPLIANCE_ICONS.interazione} size={16} />
            <span className="ml-1">Interazione</span>
          </Button>
          <Button variant="primary" onClick={() => navigate(`/compliance/tov/nuovo?evento_id=${event.id}`)}>
            <Icon icon={ACTION_ICONS.add} size={16} />
            <span className="ml-1">Trasferimento</span>
          </Button>
        </div>
      </div>

      {/* ToV list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Trasferimenti di valore</h3>
        {tovLoading ? (
          <LoadingSkeleton lines={3} />
        ) : tovList.length === 0 ? (
          <EmptyState title="Nessun trasferimento" description="Nessun trasferimento di valore associato a questo evento." />
        ) : (
          <div className="space-y-3">
            {tovList.map(tov => (
              <div
                key={tov.id}
                onClick={() => navigate(`/compliance/tov/${tov.id}`)}
                className={CARD_STYLE + ' hover:shadow-sm transition-all cursor-pointer'}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {tov.hcp?.contatto?.cognome} {tov.hcp?.contatto?.nome}
                      </span>
                      <StatusBadge stato={tov.stato} labels={STATO_TOV} colors={STATO_TOV_COLORE} />
                    </div>
                    <p className="text-xs text-gray-500">{TIPO_TOV[tov.tipo]} — {formatDate(tov.data_trasferimento)}</p>
                  </div>
                  <span className="font-bold text-gray-900 flex-shrink-0">
                    {formatCurrencyDecimals(tov.importo)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interazioni list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Interazioni HCP</h3>
        {interazioniLoading ? (
          <LoadingSkeleton lines={3} />
        ) : interazioni.length === 0 ? (
          <EmptyState title="Nessuna interazione" description="Nessuna interazione registrata per questo evento." />
        ) : (
          <div className="space-y-3">
            {interazioni.map(int => (
              <div key={int.id} className={CARD_STYLE}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">
                      {int.hcp?.contatto?.cognome} {int.hcp?.contatto?.nome}
                    </span>
                    <p className="text-xs text-gray-500">
                      {TIPO_INTERAZIONE_HCP[int.tipo]} — {formatDate(int.data_interazione)}
                      {int.utente && <span> — {int.utente.nome} {int.utente.cognome}</span>}
                    </p>
                  </div>
                </div>
                {int.note && <p className="text-xs text-gray-400 mt-1">{int.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <InterazioneFormModal
        open={showInterazione}
        onClose={() => setShowInterazione(false)}
        event={event}
        hcpList={hcpList}
        onSave={handleSaveInterazione}
      />
    </div>
  )
}
