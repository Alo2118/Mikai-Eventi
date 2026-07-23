import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContactsStore } from '../../hooks/useContacts'
import { useAuthStore } from '../../hooks/useAuth'
import { useAdminStore } from '../../hooks/useAdmin'
import { ContactForm } from '../../components/contatti/ContactForm'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_CONTATTO, TIPO_CONTATTO_COLORE, CARD_STYLE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { Icon } from '../../components/ui/Icon'
import { CONTATTI_ICONS, TIPO_CONTATTO_ICONS, ACTION_ICONS } from '../../lib/icons'

function InfoRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="py-2.5 border-b border-gray-100 flex items-start gap-3">
      <Icon icon={icon} size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <dt className="text-xs text-gray-400">{label}</dt>
        <dd className="text-base text-gray-900">{value}</dd>
      </div>
    </div>
  )
}

export function ContattiDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contact = useContactsStore(s => s.contact)
  const loading = useContactsStore(s => s.loading)
  const fetchContact = useContactsStore(s => s.fetchContact)
  const fetchContactHistory = useContactsStore(s => s.fetchContactHistory)
  const updateContact = useContactsStore(s => s.updateContact)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)
  const zones = useAdminStore(s => s.zones)
  const users = useAdminStore(s => s.users)
  const fetchZones = useAdminStore(s => s.fetchZones)
  const fetchUsers = useAdminStore(s => s.fetchUsers)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetchContact(id)
    fetchZones()
    fetchUsers()
    fetchContactHistory(id).then(({ data }) => setHistory(data || []))
  }, [id])

  const canEdit = hasPermission('gestione_contatti') || (profile?.ruolo === 'commerciale' && contact?.proprietario_id === profile?.id)

  const handleSave = async (form) => {
    setSaving(true)
    const { error } = await updateContact(id, form)
    setSaving(false)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast('Contatto aggiornato', 'success')
    setEditing(false)
    fetchContact(id)
  }

  if (loading) return <LoadingSkeleton />
  if (!contact) return <EmptyState title="Contatto non trovato" />

  const isClinical = ['medico', 'specializzando', 'infermiere'].includes(contact.tipo_contatto)

  return (
    <div className="space-y-4 px-4 md:px-6 py-4">
      <Breadcrumb items={[{ label: 'Contatti', to: '/contatti' }, { label: `${contact.cognome} ${contact.nome}` }]} />
      <div className="md:hidden">
        <MobileHeader title={`${contact.cognome} ${contact.nome}`} subtitle={TIPO_CONTATTO[contact.tipo_contatto]} backTo="/contatti" />
      </div>

      <div className={CARD_STYLE}>
        {editing ? (
          <ContactForm contact={contact} users={users || []} zones={zones || []} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon icon={TIPO_CONTATTO_ICONS[contact.tipo_contatto] || TIPO_CONTATTO_ICONS.altro} size={24} className="text-gray-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{contact.cognome} {contact.nome}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge stato={contact.tipo_contatto} labels={TIPO_CONTATTO} colors={TIPO_CONTATTO_COLORE} />
                    {contact.citta && <span className="text-sm text-gray-500">{contact.citta}</span>}
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Icon icon={ACTION_ICONS.edit} size={16} className="mr-1" />
                  Modifica
                </Button>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <InfoRow icon={CONTATTI_ICONS.azienda} label={isClinical ? 'Struttura / Ente' : 'Azienda'} value={contact.azienda} />
                <InfoRow icon={CONTATTI_ICONS.email} label="Email" value={contact.email} />
                <InfoRow icon={CONTATTI_ICONS.telefono} label="Telefono" value={contact.telefono} />
                <InfoRow icon={CONTATTI_ICONS.zona} label="Zona" value={contact.zona?.nome} />
              </div>
              <div>
                {isClinical && (
                  <>
                    <InfoRow icon={CONTATTI_ICONS.ruolo} label="Ruolo" value={contact.ruolo_medico} />
                    <InfoRow icon={CONTATTI_ICONS.specializzazione} label="Specializzazione" value={contact.specializzazione} />
                  </>
                )}
                {contact.tipo_contatto === 'fornitore' && (
                  <InfoRow icon={CONTATTI_ICONS.azienda} label="Tipo servizio" value={contact.tipo_servizio} />
                )}
                <InfoRow icon={CONTATTI_ICONS.contatti} label="Referente" value={contact.proprietario ? `${contact.proprietario.cognome} ${contact.proprietario.nome}` : null} />
              </div>
            </div>

            {contact.note && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Note</p>
                <p className="text-base text-gray-700">{contact.note}</p>
              </div>
            )}

            {(contact.esigenze_alimentari || contact.esigenze_accessibilita) && (
              <div className="bg-orange-50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-orange-600 font-medium">Esigenze</p>
                {contact.esigenze_alimentari && (
                  <div>
                    <p className="text-xs text-gray-400">Alimentari</p>
                    <p className="text-base text-gray-700">{contact.esigenze_alimentari}</p>
                  </div>
                )}
                {contact.esigenze_accessibilita && (
                  <div>
                    <p className="text-xs text-gray-400">Accessibilità</p>
                    <p className="text-base text-gray-700">{contact.esigenze_accessibilita}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Storico eventi */}
      {history.length > 0 && (
        <div className={CARD_STYLE + ' space-y-3'}>
          <h2 className="font-semibold text-lg">Storico eventi ({history.length})</h2>
          <div className="space-y-2">
            {history.map(h => (
              <button key={h.id} onClick={() => navigate(`/eventi/${h.evento?.id}`)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 text-base min-h-[48px] flex items-center justify-between">
                <span className="font-medium">{h.evento?.titolo}</span>
                <span className="text-sm text-gray-400">{h.evento?.data_inizio ? formatDate(h.evento.data_inizio) : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
