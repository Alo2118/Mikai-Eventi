import { useEffect, useState } from 'react'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { ContactPicker } from '../contatti/ContactPicker'
import { BulkImportModal } from '../contatti/BulkImportModal'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS, NAV_ICONS } from '../../lib/icons'
import { RUOLO_EVENTO, TIPO_PARTECIPANTE, STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE, SELECT_STYLE, CARD_STYLE } from '../../lib/constants'
import { ProgressIndicator } from '../ui/ProgressIndicator'
import { EventChecklistView } from './EventChecklistView'


export function EventPersoneTab({ event, users = [] }) {
  const staff = useStaffStore(s => s.staff)
  const staffLoading = useStaffStore(s => s.loading)
  const fetchEventStaff = useStaffStore(s => s.fetchEventStaff)
  const addStaff = useStaffStore(s => s.addStaff)
  const updateStaff = useStaffStore(s => s.updateStaff)
  const removeStaff = useStaffStore(s => s.removeStaff)

  const participants = useParticipantsStore(s => s.participants)
  const participantsLoading = useParticipantsStore(s => s.loading)
  const fetchEventParticipants = useParticipantsStore(s => s.fetchEventParticipants)
  const addParticipant = useParticipantsStore(s => s.addParticipant)
  const updateParticipant = useParticipantsStore(s => s.updateParticipant)
  const removeParticipant = useParticipantsStore(s => s.removeParticipant)

  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [staffForm, setStaffForm] = useState(null) // { userId, ruolo }
  const [partForm, setPartForm] = useState(null) // { contact, tipo }
  const [deleting, setDeleting] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [checklistMode, setChecklistMode] = useState(false)

  const canEditStaff = hasPermission('gestione_staff_evento')
  const canEditPart = hasPermission('gestione_contatti') || hasPermission('gestione_staff_evento')

  useEffect(() => {
    fetchEventStaff(event.id)
    fetchEventParticipants(event.id)
  }, [event.id])

  const handleAddStaff = async () => {
    if (!staffForm?.userId || !staffForm?.ruolo) return
    const { error } = await addStaff(event.id, staffForm.userId, staffForm.ruolo)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Staff aggiunto', 'success')
    setStaffForm(null)
  }

  const handleAddParticipant = async () => {
    if (!partForm?.contact || !partForm?.tipo) return
    const { error } = await addParticipant(event.id, partForm.contact.id, partForm.tipo)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Partecipante aggiunto', 'success')
    setPartForm(null)
  }

  const staffConfermati = staff.filter(s => s.confermato).length
  const partConfermati = participants.filter(p => p.stato_iscrizione === 'confermato' || p.stato_iscrizione === 'presente').length

  if (checklistMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Checklist presenze</h2>
          <Button variant="secondary" size="sm" onClick={() => setChecklistMode(false)}>
            <Icon icon={ACTION_ICONS.back} size={16} className="mr-1" />
            Gestione persone
          </Button>
        </div>
        <EventChecklistView event={event} participants={participants} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {['pronto', 'in_corso'].includes(event.stato) && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setChecklistMode(true)}>
            <Icon icon={NAV_ICONS.checklist} size={16} className="mr-1" />
            Checklist presenze
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ProgressIndicator
          label="Staff confermati"
          current={staff.filter(s => s.confermato).length}
          total={staff.length}
          color="mikai"
        />
        <ProgressIndicator
          label="Partecipanti confermati"
          current={participants.filter(p => p.stato_iscrizione === 'confermato' || p.stato_iscrizione === 'presente').length}
          total={participants.length}
          color="blue"
        />
      </div>
      {/* Riepilogo */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>Staff: {staff.length} ({staffConfermati} confermati)</span>
        <span>Partecipanti: {participants.length} ({partConfermati} confermati)</span>
      </div>

      {/* === STAFF === */}
      <div className={CARD_STYLE}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Staff interno</h3>
          {canEditStaff && !staffForm && (
            <Button variant="secondary" size="sm" onClick={() => setStaffForm({ userId: '', ruolo: 'staff' })}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Aggiungi</span>
            </Button>
          )}
        </div>

        {staffForm && (
          <div className="flex flex-col md:flex-row gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <select className={SELECT_STYLE + ' flex-1'} value={staffForm.userId} onChange={e => setStaffForm(f => ({ ...f, userId: e.target.value }))}>
              <option value="">Seleziona persona...</option>
              {users.filter(u => !staff.some(s => s.user_id === u.id)).map(u => (
                <option key={u.id} value={u.id}>{u.cognome} {u.nome} ({u.ruolo})</option>
              ))}
            </select>
            <select className={SELECT_STYLE} value={staffForm.ruolo} onChange={e => setStaffForm(f => ({ ...f, ruolo: e.target.value }))}>
              {Object.entries(RUOLO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddStaff}>Aggiungi</Button>
              <Button variant="ghost" size="sm" onClick={() => setStaffForm(null)}>Annulla</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {staff.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 min-h-[48px]">
              <div>
                <span className="font-medium">{s.user?.cognome} {s.user?.nome}</span>
                <span className="text-gray-500 ml-2">— {RUOLO_EVENTO[s.ruolo_evento]}</span>
              </div>
              <div className="flex items-center gap-2">
                {canEditStaff && (
                  <button
                    onClick={() => updateStaff(s.id, { confermato: !s.confermato })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[48px] ${s.confermato ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {s.confermato ? 'Confermato' : 'Da confermare'}
                  </button>
                )}
                {canEditStaff && (
                  <button onClick={() => setDeleting({ type: 'staff', id: s.id, name: `${s.user?.cognome} ${s.user?.nome}` })} className="text-red-500 p-2 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label={`Rimuovi ${s.user?.cognome} ${s.user?.nome}`}>
                    <Icon icon={ACTION_ICONS.close} size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {staff.length === 0 && !staffLoading && <p className="text-gray-400 text-center py-4">Nessuno staff assegnato</p>}
        </div>
      </div>

      {/* === PARTECIPANTI === */}
      <div className={CARD_STYLE}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Partecipanti</h3>
          {canEditPart && !partForm && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                <Icon icon={ACTION_ICONS.upload} size={16} />
                <span className="ml-1">Importa lista</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPartForm({ contact: null, tipo: 'discente' })}>
                <Icon icon={ACTION_ICONS.add} size={16} />
                <span className="ml-1">Aggiungi</span>
              </Button>
            </div>
          )}
        </div>

        {partForm && (
          <div className="flex flex-col md:flex-row gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <ContactPicker value={partForm.contact} onChange={c => setPartForm(f => ({ ...f, contact: c }))} />
            </div>
            <select className={SELECT_STYLE} value={partForm.tipo} onChange={e => setPartForm(f => ({ ...f, tipo: e.target.value }))}>
              {Object.entries(TIPO_PARTECIPANTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddParticipant}>Aggiungi</Button>
              <Button variant="ghost" size="sm" onClick={() => setPartForm(null)}>Annulla</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {participants.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 min-h-[48px]">
              <div>
                <span className="font-medium">{p.contact?.cognome} {p.contact?.nome}</span>
                {p.contact?.azienda && <span className="text-gray-500 ml-2">— {p.contact.azienda}</span>}
                <span className="text-gray-400 ml-2 text-sm">{TIPO_PARTECIPANTE[p.tipo]}</span>
              </div>
              <div className="flex items-center gap-2">
                {canEditPart && (
                  <select
                    value={p.stato_iscrizione}
                    onChange={e => updateParticipant(p.id, { stato_iscrizione: e.target.value })}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 min-h-[48px]"
                  >
                    {Object.entries(STATO_ISCRIZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}
                {!canEditPart && <StatusBadge stato={p.stato_iscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />}
                {canEditPart && (
                  <button onClick={() => setDeleting({ type: 'participant', id: p.id, name: `${p.contact?.cognome} ${p.contact?.nome}` })} className="text-red-500 p-2 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label={`Rimuovi ${p.contact?.cognome} ${p.contact?.nome}`}>
                    <Icon icon={ACTION_ICONS.close} size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {participants.length === 0 && !participantsLoading && <p className="text-gray-400 text-center py-4">Nessun partecipante</p>}
        </div>
      </div>

      <BulkImportModal
        open={showImport}
        eventId={event.id}
        onComplete={() => { setShowImport(false); fetchEventParticipants(event.id) }}
        onClose={() => setShowImport(false)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Rimuovi persona"
        message={`Rimuovere ${deleting?.name} dall'evento?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={async () => {
          if (deleting.type === 'staff') await removeStaff(deleting.id)
          else await removeParticipant(deleting.id)
          setDeleting(null)
          addToast('Rimosso', 'success')
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
