import { useState } from 'react'
import { TIPO_EVENTO, MODALITA_EVENTO, INPUT_STYLE, SELECT_STYLE, FORM_CONTAINER_STYLE, CARD_STYLE } from '../../lib/constants'
import { formatDateRange, formatDate } from '../../lib/date-utils'
import { EventStatusFlow } from './EventStatusFlow'
import { EventApprovalBar } from './EventApprovalBar'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, TIPO_EVENTO_ICONS, MODALITA_ICONS, NAV_ICONS, COSTI_ICONS, INFO_EVENTO_ICONS, FEEDBACK_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { useEventsStore } from '../../hooks/useEvents'
import { useAdminStore } from '../../hooks/useAdmin'
import { useContactsStore } from '../../hooks/useContacts'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { formatCurrency, getPromotoreName } from '../../lib/format-utils'

function InfoField({ label, value, placeholder }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">
        {value || <span className="text-gray-300">{placeholder || '—'}</span>}
      </dd>
    </div>
  )
}

function InfoSection({ title, icon, children, cols3 }) {
  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <Icon icon={icon} size={14} className="text-gray-400" />
        {title}
      </h3>
      <dl className={`grid grid-cols-2 ${cols3 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-x-4 gap-y-3`}>
        {children}
      </dl>
    </div>
  )
}

const NON_EDITABLE_STATES = ['concluso', 'cancellato', 'rifiutato']

export function EventInfoTab({ event, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState({})
  const [touched, setTouched] = useState({})

  const handleBlur = (field) => setTouched(prev => ({ ...prev, [field]: true }))
  const fieldError = (field, value) => touched[field] && !value?.toString().trim() ? true : false

  const updateEvent = useEventsStore(s => s.updateEvent)
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const agents = useContactsStore(s => s.agents)
  const fetchAgents = useContactsStore(s => s.fetchAgents)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const canEdit =
    !NON_EDITABLE_STATES.includes(event.stato) &&
    (hasPermission('approva_eventi') || event.promotore_id === user?.id)

  const handleStartEdit = () => {
    if (!users || users.length === 0) fetchUsers()
    if (!agents || agents.length === 0) fetchAgents()
    // Encode promotore as "user:ID" or "contact:ID" for the combined select
    let promotoreValue = ''
    if (event.promotore_id) promotoreValue = `user:${event.promotore_id}`
    else if (event.promotore_contact_id) promotoreValue = `contact:${event.promotore_contact_id}`
    setFields({
      titolo: event.titolo || '',
      tipo_evento: event.tipo_evento || '',
      modalita: event.modalita || '',
      promotore_combined: promotoreValue,
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
    setTouched({})
    setEditing(true)
  }

  const handleSave = async () => {
    // Mark all required fields as touched
    const requiredTouched = { titolo: true, tipo_evento: true, data_inizio: true }
    setTouched(prev => ({ ...prev, ...requiredTouched }))
    // Validate required fields
    if (!fields.titolo?.trim() || !fields.tipo_evento?.trim() || !fields.data_inizio?.trim()) {
      addToast('Compila tutti i campi obbligatori', 'warning')
      return
    }
    setSaving(true)
    // Decode combined promotore field
    const [pType, pId] = (fields.promotore_combined || '').split(':')
    const payload = {
      ...fields,
      promotore_id: pType === 'user' ? pId : null,
      promotore_contact_id: pType === 'contact' ? pId : null,
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
    delete payload.promotore_combined
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
    <div className="space-y-4">
      <EventApprovalBar event={event} onUpdate={onUpdate} />
      <div className="flex items-center justify-between gap-3">
        <EventStatusFlow stato={event.stato} />
        {canEdit && !editing && (
          <Button variant="secondary" onClick={handleStartEdit} className="shrink-0">
            <Icon icon={ACTION_ICONS.edit} size={16} className="mr-1.5" />
            Modifica
          </Button>
        )}
      </div>

      {editing ? (
        <div className={FORM_CONTAINER_STYLE + ' border border-gray-200 space-y-4'}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo <span className="text-red-500">*</span></label>
            <input
              className={INPUT_STYLE + (fieldError('titolo', fields.titolo) ? ' border-red-400 ring-1 ring-red-400' : '')}
              value={fields.titolo}
              onChange={set('titolo')}
              onBlur={() => handleBlur('titolo')}
            />
            {fieldError('titolo', fields.titolo) && (
              <p className="text-xs text-red-500 mt-1" role="alert">Il titolo è obbligatorio</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo evento <span className="text-red-500">*</span></label>
              <select
                className={SELECT_STYLE + (fieldError('tipo_evento', fields.tipo_evento) ? ' border-red-400 ring-1 ring-red-400' : '')}
                value={fields.tipo_evento}
                onChange={set('tipo_evento')}
                onBlur={() => handleBlur('tipo_evento')}
              >
                {Object.entries(TIPO_EVENTO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {fieldError('tipo_evento', fields.tipo_evento) && (
                <p className="text-xs text-red-500 mt-1" role="alert">Seleziona un tipo evento</p>
              )}
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
              <select className={SELECT_STYLE} value={fields.promotore_combined} onChange={set('promotore_combined')}>
                <option value="">Nessuno</option>
                <optgroup label="Utenti interni">
                  {(users || []).filter(u => u.attivo !== false).map(u => (
                    <option key={u.id} value={`user:${u.id}`}>{u.cognome} {u.nome}</option>
                  ))}
                </optgroup>
                {(agents || []).length > 0 && (
                  <optgroup label="Agenti">
                    {agents.filter(a => a.attivo !== false).map(a => (
                      <option key={a.id} value={`contact:${a.id}`}>{a.cognome} {a.nome}{a.azienda ? ` (${a.azienda})` : ''}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Area Manager
                <span title="Assegnato automaticamente in base alla zona dell'evento">
                  <Icon icon={FEEDBACK_ICONS.info} size={14} className="text-gray-400" />
                </span>
              </label>
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
              <input
                type="date"
                className={INPUT_STYLE + (fieldError('data_inizio', fields.data_inizio) ? ' border-red-400 ring-1 ring-red-400' : '')}
                value={fields.data_inizio}
                onChange={set('data_inizio')}
                onBlur={() => handleBlur('data_inizio')}
              />
              {fieldError('data_inizio', fields.data_inizio) && (
                <p className="text-xs text-red-500 mt-1" role="alert">La data di inizio è obbligatoria</p>
              )}
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
            <Button onClick={handleSave} loading={saving} disabled={!fields.titolo?.trim() || !fields.tipo_evento?.trim() || !fields.data_inizio?.trim()}>
              <Icon icon={ACTION_ICONS.check} size={16} className="mr-2" />
              Salva
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>Annulla</Button>
          </div>
        </div>
      ) : (
        <>
        {/* Dettagli + Date + Luogo — una card sola */}
        <InfoSection title="Dettagli" icon={TIPO_EVENTO_ICONS[event.tipo_evento] || NAV_ICONS.eventi}>
          <InfoField label="Tipo" value={TIPO_EVENTO[event.tipo_evento]} />
          <InfoField label="Modalità" value={MODALITA_EVENTO[event.modalita]} />
          <InfoField label="Date" value={formatDateRange(event.data_inizio, event.data_fine)} />
          <InfoField label="Ora inizio" value={event.ora_inizio ? event.ora_inizio.substring(0, 5) : null} placeholder="—" />
          <InfoField label="Luogo" value={event.luogo} placeholder="—" />
          <InfoField label="Sede" value={event.sede_dettaglio} placeholder="—" />
          <InfoField label="Certificato" value={
            event.certificato_previsto
              ? <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium"><Icon icon={ACTION_ICONS.check} size={13} /> Sì</span>
              : 'No'
          } />
          <InfoField label="Desk" value={
            event.desk_richiesto
              ? <span className="text-sm font-medium">{event.n_postazioni ? `Sì · ${event.n_postazioni} postaz.` : 'Sì'}</span>
              : 'No'
          } />
          {event.ricorrenza && <InfoField label="Ricorrenza" value={event.ricorrenza} />}
        </InfoSection>

        {/* Organizzazione: persone + budget + spedizione */}
        <InfoSection title="Organizzazione" icon={NAV_ICONS.profilo}>
          <InfoField label="Promotore" value={getPromotoreName(event)} placeholder="Non assegnato" />
          <InfoField label="Area Manager" value={event.manager ? `${event.manager.nome} ${event.manager.cognome}` : null} placeholder="Non assegnato" />
          <InfoField label="Budget" value={event.budget_previsto ? formatCurrency(event.budget_previsto) : null} placeholder="—" />
          <InfoField label="Ind. spedizione" value={event.indirizzo_spedizione} placeholder="—" />
        </InfoSection>

        {/* Scadenze — 4 colonne su desktop */}
        <InfoSection title="Scadenze" icon={FEEDBACK_ICONS.warning} cols3>
          <InfoField label="Preparazione" value={event.deadline_preparazione ? formatDate(event.deadline_preparazione) : null} placeholder="—" />
          <InfoField label="Spedizione" value={event.data_spedizione_prevista ? formatDate(event.data_spedizione_prevista) : null} placeholder="—" />
          <InfoField label="Consegna" value={event.data_consegna_prevista ? formatDate(event.data_consegna_prevista) : null} placeholder="—" />
          <InfoField label="Iscrizioni" value={event.deadline_partecipanti ? formatDate(event.deadline_partecipanti) : null} placeholder="—" />
        </InfoSection>

        {/* Note — compatto */}
        {event.note && (
          <div className={CARD_STYLE}>
            <p className="text-xs font-medium text-gray-400 mb-1">NOTE</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.note}</p>
          </div>
        )}

        {/* Motivo cancellazione */}
        {event.motivo_cancellazione && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-600 mb-1">MOTIVO ANNULLAMENTO</p>
            <p className="text-sm text-red-700">{event.motivo_cancellazione}</p>
          </div>
        )}
        </>
      )}
    </div>
  )
}
