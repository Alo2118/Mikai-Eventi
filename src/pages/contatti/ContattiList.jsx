import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useContactsStore } from '../../hooks/useContacts'
import { useAuthStore } from '../../hooks/useAuth'
import { useUsersStore } from '../../hooks/useUsers'
import { useZonesStore } from '../../hooks/useZones'
import { useExportHandler } from '../../hooks/useExportHandler'
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
import { TIPO_CONTATTO, SELECT_STYLE, CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { CONTATTI_ICONS, ACTION_ICONS } from '../../lib/icons'
import { normalizeWhatsappNumber } from '../../lib/format-utils'
import { BulkImportModal } from '../../components/contatti/BulkImportModal'

const EXPORT_COLUMNS_CONTATTI = [
  { key: 'cognome', label: 'Cognome', width: 20 },
  { key: 'nome', label: 'Nome', width: 20 },
  { key: 'tipo_contatto', label: 'Tipo', format: v => TIPO_CONTATTO[v] || v },
  { key: 'azienda', label: 'Azienda', width: 25 },
  { key: 'citta', label: 'Città' },
  { key: 'email', label: 'Email', width: 25 },
  { key: 'telefono', label: 'Telefono' },
  { key: 'zona', label: 'Zona', format: v => v?.nome || '' },
  { key: 'proprietario', label: 'Referente', format: v => v ? `${v.cognome} ${v.nome}` : '' },
]

export function ContattiList() {
  const navigate = useNavigate()
  const contacts = useContactsStore(s => s.contacts)
  const loading = useContactsStore(s => s.loading)
  const loadingMore = useContactsStore(s => s.loadingMore)
  const hasMore = useContactsStore(s => s.hasMore)
  const totalCount = useContactsStore(s => s.totalCount)
  const filters = useContactsStore(s => s.filters)
  const fetchContacts = useContactsStore(s => s.fetchContacts)
  const loadMore = useContactsStore(s => s.loadMore)
  const resetFilters = useContactsStore(s => s.resetFilters)
  const setFilter = useContactsStore(s => s.setFilter)
  const createContact = useContactsStore(s => s.createContact)
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [saving, setSaving] = useState(false)
  const { exporting, handleExport } = useExportHandler()
  const [searchParams] = useSearchParams()

  const zones = useZonesStore(s => s.zones)
  const users = useUsersStore(s => s.users)
  const fetchZones = useZonesStore(s => s.fetchZones)
  const fetchUsers = useUsersStore(s => s.fetchUsers)

  useEffect(() => {
    resetFilters()
    fetchZones()
    fetchUsers()
    const searchFromUrl = searchParams.get('search')
    if (searchFromUrl) setFilter('search', searchFromUrl)
  }, [])

  // Scroll to top when filters change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filters.search, filters.tipo, filters.zoneId])

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

  return (
    <div className="px-4 md:px-6 py-4 space-y-4">
      <Breadcrumb items={[{ label: 'Contatti' }]} />
      <PageHeader
        title="Rubrica contatti"
        subtitle={totalCount > 0 ? `${contacts.length} di ${totalCount} contatti` : `${contacts.length} contatti`}
        actions={
          <div className="flex gap-3">
            <ExportButton onClick={() => handleExport({ columns: EXPORT_COLUMNS_CONTATTI, rows: contacts, filename: 'contatti', sheetName: 'Contatti' })} loading={exporting} />
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
        <div className={CARD_STYLE}>
          <ContactForm
            users={users || []}
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
          onChange={e => setFilter('tipo', e.target.value)}
          className={SELECT_STYLE + ' md:max-w-[200px]'}
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_CONTATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filters.zoneId}
          onChange={e => setFilter('zoneId', e.target.value)}
          className={SELECT_STYLE + ' md:max-w-[200px]'}
        >
          <option value="">Tutte le zone</option>
          {(zones || []).map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
        </select>
      </div>

      {/* Risultati + chip filtri attivi */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">
            {contacts.length === 0
              ? 'Nessun contatto trovato'
              : totalCount > contacts.length
                ? `Mostrati ${contacts.length} di ${totalCount} contatti`
                : `${contacts.length} ${contacts.length === 1 ? 'contatto trovato' : 'contatti trovati'}`
            }
          </span>
          {filters.tipo && (
            <button
              onClick={() => setFilter('tipo', '')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium min-h-[48px] transition-colors"
              aria-label={`Rimuovi filtro tipo: ${TIPO_CONTATTO[filters.tipo]}`}
            >
              Tipo: {TIPO_CONTATTO[filters.tipo]}
              <Icon name="close" size={14} />
            </button>
          )}
          {filters.zoneId && (
            <button
              onClick={() => setFilter('zoneId', '')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium min-h-[48px] transition-colors"
              aria-label="Rimuovi filtro zona"
            >
              Zona: {(zones || []).find(z => z.id === filters.zoneId)?.nome}
              <Icon name="close" size={14} />
            </button>
          )}
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mikai-100 text-mikai-700 hover:bg-mikai-200 rounded-full text-sm font-medium min-h-[48px] transition-colors"
              aria-label="Rimuovi ricerca"
            >
              "{filters.search}"
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      )}

      {loading ? <LoadingSkeleton lines={5} /> : contacts.length === 0 ? (
        <EmptyState
          title="Nessun contatto"
          description="Aggiungi il primo contatto dalla rubrica"
          action={canCreate && (
            <Button onClick={() => setShowForm(true)}>
              <Icon icon={CONTATTI_ICONS.aggiungi} size={18} className="mr-2" />
              Nuovo contatto
            </Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {contacts.map(c => {
            const waNumber = normalizeWhatsappNumber(c.telefono)
            return (
            <div key={c.id} className={CARD_HOVER_STYLE + ' flex items-start justify-between gap-3'}>
              <button
                onClick={() => navigate(`/contatti/${c.id}`)}
                className="flex-1 min-w-0 text-left flex flex-col justify-center min-h-[48px]"
                aria-label={`Apri contatto ${c.cognome} ${c.nome}`}
              >
                <p className="font-semibold text-base">{c.cognome} {c.nome}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-sm text-gray-500">
                  {c.azienda && <span>{c.azienda}</span>}
                  {c.citta && <span>{c.citta}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-400">
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Icon icon={CONTATTI_ICONS.email} size={12} />
                      <span className="truncate max-w-[200px]">{c.email}</span>
                    </span>
                  )}
                  {c.telefono && (
                    <span className="flex items-center gap-1">
                      <Icon icon={CONTATTI_ICONS.telefono} size={12} />
                      {c.telefono}
                    </span>
                  )}
                  {c.proprietario && (
                    <span className="flex items-center gap-1">
                      <Icon icon={CONTATTI_ICONS.contatti} size={12} />
                      {c.proprietario.cognome} {c.proprietario.nome}
                    </span>
                  )}
                  {c.zona && (
                    <span className="flex items-center gap-1">
                      <Icon icon={CONTATTI_ICONS.zona} size={12} />
                      {c.zona.nome}
                    </span>
                  )}
                </div>
              </button>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge stato={c.tipo_contatto} labels={TIPO_CONTATTO} />
                {(c.telefono || c.email) && (
                  <div className="flex items-center gap-1">
                    {c.telefono && (
                      <a
                        href={`tel:${c.telefono.replace(/\s/g, '')}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-lg text-mikai-600 hover:bg-mikai-50"
                        aria-label={`Chiama ${c.cognome} ${c.nome}`}
                      >
                        <Icon icon={CONTATTI_ICONS.telefono} size={20} />
                      </a>
                    )}
                    {waNumber && (
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-lg text-green-600 hover:bg-green-50"
                        aria-label={`Scrivi su WhatsApp a ${c.cognome} ${c.nome}`}
                      >
                        <Icon icon={CONTATTI_ICONS.whatsapp} size={20} />
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-lg text-mikai-600 hover:bg-mikai-50"
                        aria-label={`Invia email a ${c.cognome} ${c.nome}`}
                      >
                        <Icon icon={CONTATTI_ICONS.email} size={20} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            )
          })}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Carica altri
              </Button>
            </div>
          )}
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
