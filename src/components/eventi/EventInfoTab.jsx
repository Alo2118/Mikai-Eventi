import { useState } from 'react'
import { TIPO_EVENTO, MODALITA_EVENTO, INPUT_STYLE, SELECT_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'
import { formatDateRange, formatDate } from '../../lib/date-utils'
import { EventStatusFlow } from './EventStatusFlow'
import { EventApprovalBar } from './EventApprovalBar'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, TIPO_EVENTO_ICONS, MODALITA_ICONS, NAV_ICONS, COSTI_ICONS, INFO_EVENTO_ICONS, FEEDBACK_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { useEventsStore } from '../../hooks/useEvents'
import { useAdminStore } from '../../hooks/useAdmin'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { formatCurrency } from '../../lib/format-utils'

function InfoRow({ label, icon, value }) {
  if (!value) return null
  return (
    <div className="py-3 border-b border-gray-100">
      <dt className="text-sm text-gray-500 flex items-center gap-1.5">
        {icon && <Icon icon={icon} size={14} className="text-gray-400" />}
        {label}
      </dt>
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
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const canEdit =
    !NON_EDITABLE_STATES.includes(event.stato) &&
    (hasPermission('approva_eventi') || event.promotore_id === user?.id)

  const handleStartEdit = () => {
    if (!users || users.length === 0) fetchUsers()
    setFields({
      titolo: event.titolo || '',
      tipo_evento: event.tipo_evento || '',
      modalita: event.modalita || '',
      promotore_id: event.promotore_id || '',
      manager_user_id: event.manager_user_id || '',
      luogo: event.luogo || '',
      sede_dettaglio: event.sede_dettaglio || '',
      data_inizio: event.data_inizio || '',
      ora_inizio: event.ora_inizio || '',
      data_fine: event.data_fine || '',
      desk_richiesto: event.desk_richiesto ?? false,
      n_postazioni: event.n_postazioni ?? '',
      certificato_previsto: event.certificato_previsto ?? false,
      budget_previsto: event.budget_previsto ?? '',
      indirizzo_spedizione: event.indirizzo_spedizione || '',
      note: event.note || '',
      deadline_preparazione: event.deadline_preparazione || '',
      deadline_partecipanti: event.deadline_partecipanti || '',
      data_consegna_prevista: event.data_consegna_prevista || '',
      data_spedizione_prevista: event.data_spedizione_prevista || '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...fields,
      promotore_id: fields.promotore_id || null,
      manager_user_id: fields.manager_user_id || null,
      budget_previsto: fields.budget_previsto !== '' ? Number(fields.budget_previsto) : null,
      n_postazioni: fields.desk_richiesto && fields.n_postazioni !== '' ? Number(fields.n_postazioni) : null,
      ora_inizio: fields.ora_inizio || null,
      data_fine: fields.data_fine || fields.data_inizio,
      deadline_preparazione: fields.deadline_preparazione || null,
      deadline_partecipanti: fields.deadline_partecipanti || null,
      data_consegna_prevista: fields.data_consegna_prevista || null,
      data_spedizione_prevista: fields.data_spedizione_prevista || null,
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
        <div className={FORM_CONTAINER_STYLE + ' border border-gray-200 space-y-4'}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo <span className="text-red-500">*</span></label>
            <input className={INPUT_STYLE} value={fields.titolo} onChange={set('titolo')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo evento <span className="text-red-500">*</span></label>
              <select className={SELECT_STYLE} value={fields.tipo_evento} onChange={set('tipo_evento')}>
                {Object.entries(TIPO_EVENTO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modalità <span className="text-red-500">*</span></label>
              <select className={SELECT_STYLE} value={fields.modalita} onChange={set('modalita')}>
                {Object.entries(MODALITA_EVENTO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Promotore</label>
              <select className={SELECT_STYLE} value={fields.promotore_id} onChange={set('promotore_id')}>
                <option value="">Nessuno</option>
                {(users || []).filter(u => u.attivo !== false).map(u => (
                  <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area Manager</label>
              <select className={SELECT_STYLE} value={fields.manager_user_id} onChange={set('manager_user_id')}>
                <option value="">Nessuno</option>
                {(users || []).filter(u => u.attivo !== false && ['area_manager', 'direzione', 'admin'].includes(u.ruolo)).map(u => (
                  <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
            <input className={INPUT_STYLE} value={fields.luogo} onChange={set('luogo')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dettaglio sede</label>
            <input className={INPUT_STYLE} value={fields.sede_dettaglio} onChange={set('sede_dettaglio')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio <span className="text-red-500">*</span></label>
              <input type="date" className={INPUT_STYLE} value={fields.data_inizio} onChange={set('data_inizio')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
              <input type="time" className={INPUT_STYLE} value={fields.ora_inizio} onChange={set('ora_inizio')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
              <input type="date" className={INPUT_STYLE} value={fields.data_fine} min={fields.data_inizio} onChange={set('data_fine')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 min-h-[48px]">
              <input
                type="checkbox"
                id="desk_richiesto"
                className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                checked={fields.desk_richiesto}
                onChange={e => setFields(f => ({ ...f, desk_richiesto: e.target.checked }))}
              />
              <label htmlFor="desk_richiesto" className="text-sm font-medium text-gray-700">Desk richiesto</label>
            </div>
            {fields.desk_richiesto && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N. postazioni</label>
                <input type="number" min="1" className={INPUT_STYLE} value={fields.n_postazioni} onChange={set('n_postazioni')} />
              </div>
            )}
            <div className="flex items-center gap-3 min-h-[48px]">
              <input
                type="checkbox"
                id="certificato_previsto"
                className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                checked={fields.certificato_previsto}
                onChange={e => setFields(f => ({ ...f, certificato_previsto: e.target.checked }))}
              />
              <label htmlFor="certificato_previsto" className="text-sm font-medium text-gray-700">Certificato previsto</label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget previsto (&euro;) <span className="text-gray-400 text-xs">opzionale</span></label>
            <input type="number" min="0" step="100" className={INPUT_STYLE} value={fields.budget_previsto} onChange={set('budget_previsto')} placeholder="Es. 5000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo spedizione</label>
            <input className={INPUT_STYLE} value={fields.indirizzo_spedizione} onChange={set('indirizzo_spedizione')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza preparazione</label>
              <input type="date" className={INPUT_STYLE} value={fields.deadline_preparazione} onChange={set('deadline_preparazione')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza spedizione</label>
              <input type="date" className={INPUT_STYLE} value={fields.data_spedizione_prevista} onChange={set('data_spedizione_prevista')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consegna prevista</label>
              <input type="date" className={INPUT_STYLE} value={fields.data_consegna_prevista} onChange={set('data_consegna_prevista')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza iscrizioni</label>
              <input type="date" className={INPUT_STYLE} value={fields.deadline_partecipanti} onChange={set('deadline_partecipanti')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea className={`${INPUT_STYLE} min-h-[80px]`} value={fields.note} onChange={set('note')} />
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
          <InfoRow label="Tipo evento" icon={TIPO_EVENTO_ICONS[event.tipo_evento]} value={TIPO_EVENTO[event.tipo_evento]} />
          <InfoRow label="Modalità" icon={MODALITA_ICONS[event.modalita]} value={MODALITA_EVENTO[event.modalita]} />
          <InfoRow label="Date" icon={NAV_ICONS.eventi} value={formatDateRange(event.data_inizio, event.data_fine)} />
          <InfoRow label="Ora inizio" icon={NAV_ICONS.eventi} value={event.ora_inizio ? event.ora_inizio.substring(0, 5) : null} />
          <InfoRow label="Luogo" icon={INFO_EVENTO_ICONS.luogo} value={event.luogo} />
          <InfoRow label="Dettaglio sede" icon={INFO_EVENTO_ICONS.sede} value={event.sede_dettaglio} />
          <InfoRow
            label="Promotore"
            icon={NAV_ICONS.profilo}
            value={event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : null}
          />
          <InfoRow
            label="Area Manager"
            icon={NAV_ICONS.profilo}
            value={event.manager ? `${event.manager.nome} ${event.manager.cognome}` : null}
          />
          <InfoRow label="Desk richiesto" icon={INFO_EVENTO_ICONS.desk} value={event.desk_richiesto ? 'Sì' : 'No'} />
          {event.desk_richiesto && (
            <InfoRow label="N. postazioni" icon={INFO_EVENTO_ICONS.postazioni} value={event.n_postazioni} />
          )}
          <InfoRow
            label="Budget previsto"
            icon={COSTI_ICONS.costo}
            value={event.budget_previsto ? formatCurrency(event.budget_previsto) : null}
          />
          <InfoRow label="Indirizzo spedizione" icon={NAV_ICONS.logistica} value={event.indirizzo_spedizione} />
          <InfoRow label="Ricorrenza" icon={INFO_EVENTO_ICONS.ricorrenza} value={event.ricorrenza} />
          <InfoRow label="Note" icon={INFO_EVENTO_ICONS.note} value={event.note} />
          {(event.deadline_preparazione || event.data_spedizione_prevista || event.data_consegna_prevista || event.deadline_partecipanti) && (
            <div className="pt-4">
              <h3 className="font-semibold text-lg mb-2">Scadenze</h3>
              <dl className="divide-y divide-gray-100">
                <InfoRow label="Scadenza preparazione" icon={FEEDBACK_ICONS.warning} value={event.deadline_preparazione ? formatDate(event.deadline_preparazione) : null} />
                <InfoRow label="Scadenza spedizione" icon={MATERIALE_ICONS.uscita} value={event.data_spedizione_prevista ? formatDate(event.data_spedizione_prevista) : null} />
                <InfoRow label="Consegna prevista" icon={ACTION_ICONS.check} value={event.data_consegna_prevista ? formatDate(event.data_consegna_prevista) : null} />
                <InfoRow label="Scadenza iscrizioni" icon={NAV_ICONS.contatti} value={event.deadline_partecipanti ? formatDate(event.deadline_partecipanti) : null} />
              </dl>
            </div>
          )}
          {event.motivo_cancellazione && (
            <InfoRow label="Motivo annullamento" icon={INFO_EVENTO_ICONS.cancellazione} value={event.motivo_cancellazione} />
          )}
        </dl>
      )}
    </div>
  )
}
