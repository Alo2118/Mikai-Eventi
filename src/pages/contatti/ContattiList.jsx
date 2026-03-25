import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContactsStore } from '../../hooks/useContacts'
import { useAuthStore } from '../../hooks/useAuth'
import { useAdminStore } from '../../hooks/useAdmin'
import { ContactForm } from '../../components/contatti/ContactForm'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ExportButton } from '../../components/ui/ExportButton'
import { SearchInput } from '../../components/ui/SearchInput'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_CONTATTO, SELECT_STYLE } from '../../lib/constants'
import { CONTATTI_ICONS, ACTION_ICONS } from '../../lib/icons'
import { BulkImportModal } from '../../components/contatti/BulkImportModal'
import { exportToExcel } from '../../lib/export-utils'

const EXPORT_COLUMNS_CONTATTI = [
  { key: 'cognome', label: 'Cognome', width: 20 },
  { key: 'nome', label: 'Nome', width: 20 },
  { key: 'tipo_contatto', label: 'Tipo', format: v => TIPO_CONTATTO[v] || v },
  { key: 'azienda', label: 'Azienda', width: 25 },
  { key: 'email', label: 'Email', width: 25 },
  { key: 'telefono', label: 'Telefono' },
  { key: 'zona', label: 'Zona', format: v => v?.nome || '' },
]

export function ContattiList() {
  const navigate = useNavigate()
  const contacts = useContactsStore(s => s.contacts)
  const loading = useContactsStore(s => s.loading)
  const filters = useContactsStore(s => s.filters)
  const fetchContacts = useContactsStore(s => s.fetchContacts)
  const setFilter = useContactsStore(s => s.setFilter)
  const createContact = useContactsStore(s => s.createContact)
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const zones = useAdminStore(s => s.zones)
  const fetchZones = useAdminStore(s => s.fetchZones)

  useEffect(() => { fetchContacts(); fetchZones() }, [])

  const handleSave = async (form) => {
    setSaving(true)
    const payload = { ...form, created_by: profile.id }
    if (!payload.proprietario_id) payload.proprietario_id = profile.id
    if (!payload.zone_id) delete payload.zone_id
    const { error } = await createContact(payload)
    setSaving(false)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast('Contatto creato', 'success')
    setShowForm(false)
  }

  const canCreate = hasPermission('gestione_contatti') || profile?.ruolo === 'commerciale'

  const handleExport = async () => {
    if (contacts.length === 0) { addToast('Nessun dato da esportare', 'warning'); return }
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await exportToExcel({
        columns: EXPORT_COLUMNS_CONTATTI,
        rows: contacts,
        filename: `contatti_${today}.xlsx`,
        sheetName: 'Contatti',
      })
      addToast('File esportato', 'success')
    } catch { addToast('Errore durante l\'esportazione', 'error') }
    setExporting(false)
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Contatti' }]} />
      <PageHeader
        title="Rubrica contatti"
        subtitle={`${contacts.length} contatti`}
        actions={
          <div className="flex gap-2">
            <ExportButton onClick={handleExport} loading={exporting} />
            {canCreate && (
              <>
                <Button variant="secondary" onClick={() => setShowImport(true)}>
                  <Icon icon={ACTION_ICONS.upload} size={18} />
                  <span className="ml-2">Importa</span>
                </Button>
                <Button onClick={() => setShowForm(true)}>
                  <Icon icon={CONTATTI_ICONS.aggiungi} size={18} />
                  <span className="ml-2">Nuovo contatto</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ContactForm
            users={[]}
            zones={zones || []}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={filters.search} onChange={v => setFilter('search', v)} placeholder="Cerca per nome, cognome, azienda..." />
        </div>
        <select
          value={filters.tipo}
          onChange={e => { setFilter('tipo', e.target.value); fetchContacts() }}
          className={SELECT_STYLE}
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_CONTATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <LoadingSkeleton lines={5} /> : contacts.length === 0 ? (
        <EmptyState title="Nessun contatto" description="Aggiungi il primo contatto dalla rubrica" />
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/contatti/${c.id}`)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base">{c.cognome} {c.nome}</p>
                  {c.azienda && <p className="text-sm text-gray-500">{c.azienda}</p>}
                </div>
                <StatusBadge stato={c.tipo_contatto} labels={TIPO_CONTATTO} />
              </div>
            </button>
          ))}
        </div>
      )}
      <BulkImportModal
        open={showImport}
        onComplete={() => { setShowImport(false); fetchContacts() }}
        onClose={() => setShowImport(false)}
      />
    </div>
  )
}
