import { useState } from 'react'
import { TIPO_EVENTO, MODALITA_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'
import { EventStatusFlow } from './EventStatusFlow'
import { EventApprovalBar } from './EventApprovalBar'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'

const INPUT = 'w-full px-3 py-2 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="py-3 border-b border-gray-100">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-base text-gray-900">{value}</dd>
    </div>
  )
}

const NON_EDITABLE_STATES = ['concluso', 'cancellato', 'rifiutato']

export function EventInfoTab({ event, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState({})

  const updateEvent = useEventsStore(s => s.updateEvent)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const canEdit =
    !NON_EDITABLE_STATES.includes(event.stato) &&
    (hasPermission('approva_eventi') || event.promotore_id === user?.id)

  const handleStartEdit = () => {
    setFields({
      titolo: event.titolo || '',
      luogo: event.luogo || '',
      sede_dettaglio: event.sede_dettaglio || '',
      data_inizio: event.data_inizio || '',
      data_fine: event.data_fine || '',
      budget_previsto: event.budget_previsto ?? '',
      indirizzo_spedizione: event.indirizzo_spedizione || '',
      note: event.note || '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...fields,
      budget_previsto: fields.budget_previsto !== '' ? Number(fields.budget_previsto) : null,
      data_fine: fields.data_fine || fields.data_inizio,
    }
    const { error } = await updateEvent(event.id, payload)
    setSaving(false)
    if (error) {
      addToast(`Errore durante il salvataggio: ${error}`, 'error')
    } else {
      addToast('Evento aggiornato!', 'success')
      setEditing(false)
      onUpdate?.()
    }
  }

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-6">
      <EventApprovalBar event={event} onUpdate={onUpdate} />
      <EventStatusFlow stato={event.stato} />

      {canEdit && !editing && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={handleStartEdit}>
            <Icon icon={ACTION_ICONS.edit} size={16} className="mr-2" />
            Modifica
          </Button>
        </div>
      )}

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo <span className="text-red-500">*</span></label>
            <input className={INPUT} value={fields.titolo} onChange={set('titolo')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
            <input className={INPUT} value={fields.luogo} onChange={set('luogo')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dettaglio sede</label>
            <input className={INPUT} value={fields.sede_dettaglio} onChange={set('sede_dettaglio')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio <span className="text-red-500">*</span></label>
              <input type="date" className={INPUT} value={fields.data_inizio} onChange={set('data_inizio')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
              <input type="date" className={INPUT} value={fields.data_fine} min={fields.data_inizio} onChange={set('data_fine')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget previsto (&euro;) <span className="text-gray-400 text-xs">opzionale</span></label>
            <input type="number" min="0" step="100" className={INPUT} value={fields.budget_previsto} onChange={set('budget_previsto')} placeholder="Es. 5000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo spedizione</label>
            <input className={INPUT} value={fields.indirizzo_spedizione} onChange={set('indirizzo_spedizione')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea className={`${INPUT} min-h-[80px]`} value={fields.note} onChange={set('note')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} disabled={!fields.titolo?.trim()}>
              <Icon icon={ACTION_ICONS.check} size={16} className="mr-2" />
              Salva
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>Annulla</Button>
          </div>
        </div>
      ) : (
        <dl className="divide-y divide-gray-100">
          <InfoRow label="Tipo evento" value={TIPO_EVENTO[event.tipo_evento]} />
          <InfoRow label="Modalita'" value={MODALITA_EVENTO[event.modalita]} />
          <InfoRow label="Date" value={formatDateRange(event.data_inizio, event.data_fine)} />
          <InfoRow label="Luogo" value={event.luogo} />
          <InfoRow label="Dettaglio sede" value={event.sede_dettaglio} />
          <InfoRow
            label="Promotore"
            value={event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : null}
          />
          <InfoRow
            label="Area Manager"
            value={event.manager ? `${event.manager.nome} ${event.manager.cognome}` : null}
          />
          <InfoRow label="Desk richiesto" value={event.desk_richiesto ? 'Si' : 'No'} />
          {event.desk_richiesto && (
            <InfoRow label="N. postazioni" value={event.n_postazioni} />
          )}
          <InfoRow
            label="Budget previsto"
            value={event.budget_previsto ? `\u20AC ${Number(event.budget_previsto).toLocaleString('it-IT')}` : null}
          />
          <InfoRow label="Indirizzo spedizione" value={event.indirizzo_spedizione} />
          <InfoRow label="Ricorrenza" value={event.ricorrenza} />
          <InfoRow label="Note" value={event.note} />
          {event.motivo_cancellazione && (
            <InfoRow label="Motivo annullamento" value={event.motivo_cancellazione} />
          )}
        </dl>
      )}
    </div>
  )
}
