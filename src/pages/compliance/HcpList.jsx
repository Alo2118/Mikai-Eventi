import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { ExportButton } from '../../components/ui/ExportButton'
import { Modal } from '../../components/ui/Modal'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_HCP, SELECT_STYLE, INPUT_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { COMPLIANCE_ICONS, ACTION_ICONS } from '../../lib/icons'
import { nowISO } from '../../lib/date-utils'
import { useExportHandler } from '../../hooks/useExportHandler'
import { useContactsStore } from '../../hooks/useContacts'

const TIPO_HCP_COLORE = {
  medico: 'blue',
  infermiere: 'green',
  tecnico: 'yellow',
  fisioterapista: 'emerald',
  farmacista: 'purple',
  altro: 'gray',
}

const EXPORT_COLUMNS = [
  { key: 'cognome', label: 'Cognome', width: 20 },
  { key: 'nome', label: 'Nome', width: 20 },
  { key: 'categoria', label: 'Categoria', format: v => TIPO_HCP[v] || v },
  { key: 'ente', label: 'Struttura', width: 25 },
  { key: 'specializzazione', label: 'Specializzazione', width: 20 },
  { key: 'email', label: 'Email', width: 25 },
  { key: 'telefono', label: 'Telefono' },
]

function HcpFormModal({ open, onClose, onSave, contacts }) {
  const [form, setForm] = useState({ contatto_id: '', categoria: 'medico', specializzazione: '', ordine_provinciale: '', codice_fiscale: '', struttura_appartenenza: '', consenso_privacy: false })
  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.contatto_id || !form.categoria) return
    onSave(form)
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuovo profilo HCP">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contatto <span className="text-red-500">*</span></label>
          <select value={form.contatto_id} onChange={e => set('contatto_id', e.target.value)} className={SELECT_STYLE} required>
            <option value="">Seleziona contatto...</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.cognome} {c.nome} — {c.ente_ospedaliero || c.azienda || 'N/D'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
          <select value={form.categoria} onChange={e => set('categoria', e.target.value)} className={SELECT_STYLE} required>
            {Object.entries(TIPO_HCP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specializzazione</label>
            <input value={form.specializzazione} onChange={e => set('specializzazione', e.target.value)} className={INPUT_STYLE} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Struttura appartenenza</label>
            <input value={form.struttura_appartenenza} onChange={e => set('struttura_appartenenza', e.target.value)} className={INPUT_STYLE} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordine provinciale</label>
            <input value={form.ordine_provinciale} onChange={e => set('ordine_provinciale', e.target.value)} className={INPUT_STYLE} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice fiscale</label>
            <input value={form.codice_fiscale} onChange={e => set('codice_fiscale', e.target.value)} className={INPUT_STYLE} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="consenso" checked={form.consenso_privacy} onChange={e => set('consenso_privacy', e.target.checked)} className="w-5 h-5" />
          <label htmlFor="consenso" className="text-sm text-gray-700">Consenso privacy acquisito</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button variant="primary" type="submit">Salva profilo HCP</Button>
        </div>
      </form>
    </Modal>
  )
}

export function HcpList() {
  const navigate = useNavigate()
  const hcpList = useComplianceStore(s => s.hcpList)
  const hcpLoading = useComplianceStore(s => s.hcpLoading)
  const fetchHcpList = useComplianceStore(s => s.fetchHcpList)
  const createHcp = useComplianceStore(s => s.createHcp)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [showForm, setShowForm] = useState(false)
  const { exporting, handleExport } = useExportHandler()
  const allContacts = useContactsStore(s => s.contacts)
  const fetchContacts = useContactsStore(s => s.fetchContacts)

  useEffect(() => { fetchHcpList({ categoria: filtroCategoria || undefined }) }, [filtroCategoria])
  useEffect(() => { if (showForm) fetchContacts() }, [showForm])

  // Filter to medical contacts for HCP creation
  const medicalContacts = allContacts.filter(c => c.tipo_contatto === 'medico')

  const filtered = hcpList.filter(h => {
    if (!search) return true
    const name = `${h.contatto?.nome || ''} ${h.contatto?.cognome || ''}`.toLowerCase()
    const ente = (h.contatto?.ente_ospedaliero || '').toLowerCase()
    return name.includes(search.toLowerCase()) || ente.includes(search.toLowerCase())
  })

  const handleSave = async (form) => {
    const payload = { ...form }
    if (!payload.consenso_privacy) payload.data_consenso = null
    else payload.data_consenso = nowISO()
    if (!payload.specializzazione) delete payload.specializzazione
    if (!payload.ordine_provinciale) delete payload.ordine_provinciale
    if (!payload.codice_fiscale) delete payload.codice_fiscale
    if (!payload.struttura_appartenenza) delete payload.struttura_appartenenza

    const { error } = await createHcp(payload)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast('Profilo HCP creato', 'success')
    setShowForm(false)
    fetchHcpList()
  }

  const exportHcp = () => {
    const rows = filtered.map(h => ({
      cognome: h.contatto?.cognome,
      nome: h.contatto?.nome,
      categoria: h.categoria,
      ente: h.contatto?.ente_ospedaliero || h.struttura_appartenenza,
      specializzazione: h.specializzazione || h.contatto?.specializzazione,
      email: h.contatto?.email,
      telefono: h.contatto?.telefono,
    }))
    handleExport({ columns: EXPORT_COLUMNS, rows, filename: 'hcp', sheetName: 'HCP' })
  }

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[{ label: 'Compliance', to: '/compliance' }, { label: 'Professionisti HCP' }]} />
      <PageHeader
        title="Professionisti HCP"
        subtitle="Anagrafica dei professionisti sanitari con profilo compliance"
        actions={
          <div className="flex gap-2">
            <ExportButton onClick={exportHcp} loading={exporting} />
            {hasPermission('compliance') && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Icon icon={ACTION_ICONS.add} size={18} />
                <span className="ml-2">Nuovo HCP</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Cerca per nome o struttura..." />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className={SELECT_STYLE + ' md:max-w-[200px]'}>
          <option value="">Tutte le categorie</option>
          {Object.entries(TIPO_HCP).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {hcpLoading ? (
        <LoadingSkeleton lines={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nessun professionista HCP"
          description="Non ci sono profili HCP registrati."
          action={hasPermission('compliance') ? { label: 'Aggiungi HCP', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(hcp => (
            <div
              key={hcp.id}
              onClick={() => navigate(`/compliance/hcp/${hcp.id}`)}
              className={CARD_HOVER_STYLE + ' cursor-pointer'}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mikai-50 flex items-center justify-center flex-shrink-0">
                    <Icon icon={COMPLIANCE_ICONS.hcp} size={20} className="text-mikai-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {hcp.contatto?.cognome} {hcp.contatto?.nome}
                    </p>
                    <p className="text-sm text-gray-500">
                      {hcp.contatto?.ente_ospedaliero || hcp.struttura_appartenenza || '—'}
                      {hcp.specializzazione && <span> — {hcp.specializzazione}</span>}
                    </p>
                  </div>
                </div>
                <StatusBadge stato={hcp.categoria} labels={TIPO_HCP} colors={TIPO_HCP_COLORE} />
              </div>
            </div>
          ))}
        </div>
      )}

      <HcpFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        contacts={medicalContacts}
      />
    </div>
  )
}
