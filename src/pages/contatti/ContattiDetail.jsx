import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContactsStore } from '../../hooks/useContacts'
import { useAuthStore } from '../../hooks/useAuth'
import { useAdminStore } from '../../hooks/useAdmin'
import { ContactForm } from '../../components/contatti/ContactForm'
import { Button } from '../../components/ui/Button'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_CONTATTO } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

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
  const fetchZones = useAdminStore(s => s.fetchZones)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetchContact(id)
    fetchZones()
    fetchContactHistory(id).then(({ data }) => setHistory(data))
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
  if (!contact) return null

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Contatti', to: '/contatti' }, { label: `${contact.cognome} ${contact.nome}` }]} />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {editing ? (
          <ContactForm contact={contact} users={[]} zones={zones || []} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{contact.cognome} {contact.nome}</h1>
                <p className="text-gray-500">{TIPO_CONTATTO[contact.tipo_contatto] || '—'}</p>
              </div>
              {canEdit && <Button variant="secondary" onClick={() => setEditing(true)}>Modifica</Button>}
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-base">
              {contact.azienda && <><dt className="text-gray-500">Azienda</dt><dd>{contact.azienda}</dd></>}
              {contact.email && <><dt className="text-gray-500">Email</dt><dd>{contact.email}</dd></>}
              {contact.telefono && <><dt className="text-gray-500">Telefono</dt><dd>{contact.telefono}</dd></>}
              {contact.ruolo_medico && <><dt className="text-gray-500">Ruolo</dt><dd>{contact.ruolo_medico}</dd></>}
              {contact.specializzazione && <><dt className="text-gray-500">Specializzazione</dt><dd>{contact.specializzazione}</dd></>}
              {contact.proprietario && <><dt className="text-gray-500">Proprietario</dt><dd>{contact.proprietario.cognome} {contact.proprietario.nome}</dd></>}
              {contact.zona && <><dt className="text-gray-500">Zona</dt><dd>{contact.zona.nome}</dd></>}
            </dl>
            {contact.note && <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{contact.note}</p>}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-lg mb-3">Storico eventi</h2>
          <div className="space-y-2">
            {history.map(h => (
              <button key={h.id} onClick={() => navigate(`/eventi/${h.evento?.id}`)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 text-base">
                <span className="font-medium">{h.evento?.titolo}</span>
                <span className="text-gray-500 ml-2">{h.evento?.data_inizio ? formatDate(h.evento.data_inizio) : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
