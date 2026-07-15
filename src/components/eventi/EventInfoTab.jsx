import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MODALITA_EVENTO, AREA_MANAGER_ROLES, INPUT_STYLE, INPUT_ERROR_STYLE, SELECT_STYLE, TEXTAREA_STYLE, FORM_CONTAINER_STYLE, CARD_STYLE, GROUP_HEADING_STYLE } from '../../lib/constants'
import { formatDateRange, formatDate } from '../../lib/date-utils'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, NAV_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { useEventTypes } from '../../hooks/useEventTypes'
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
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Icon icon={icon} size={18} className="text-gray-400" />
        {title}
      </h3>
      <dl className={`grid grid-cols-2 ${cols3 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-x-4 gap-y-3`}>
        {children}
      </dl>
    </div>
  )
}

// Small labelled wrapper so every input is properly associated with its label
function Field({ id, label, required, optional, hint, error, errorMsg, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
        {optional && <span className="text-gray-400 text-xs"> opzionale</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-sm text-red-600 mt-1" role="alert">{errorMsg}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h4 className={GROUP_HEADING_STYLE}>{title}</h4>
      {children}
    </div>
  )
}

const NON_EDITABLE_STATES = ['concluso', 'cancellato', 'rifiutato']
const NON_EDITABLE_LABEL = { concluso: 'concluso', cancellato: 'annullato', rifiutato: 'rifiutato' }

export function EventInfoTab({ event, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState({})
  const [touched, setTouched] = useState({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const { eventTypes, labels: tipoLabels, icons: tipoIcons } = useEventTypes()
  const navigate = useNavigate()

  const handleBlur = (field) => setTouched(prev => ({ ...prev, [field]: true }))
  const fieldError = (field, value) => !!touched[field] && !value?.toString().trim()

  const updateEvent = useEventsStore(s => s.updateEvent)
  const deleteEvent = useEventsStore(s => s.deleteEvent)
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const agents = useContactsStore(s => s.agents)
  const fetchAgents = useContactsStore(s => s.fetchAgents)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const hasRole = useAuthStore(s => s.hasRole)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const canDelete = hasRole('admin', 'direzione') && event.stato !== 'concluso'
  const deleteConfirmed = deleteConfirmText.trim() === (event.titolo || '').trim()

  const handleDelete = async () => {
    if (!deleteConfirmed) return
    setDeleting(true)
    const { error } = await deleteEvent(event.id)
    setDeleting(false)
    if (error) {
      console.warn('Errore eliminazione evento:', error)
      addToast('Non siamo riusciti a eliminare l\'evento. Riprova.', 'error')
      return
    }
    setDeleteOpen(false)
    addToast('Evento eliminato', 'success')
    navigate('/eventi')
  }

  const isReadOnlyState = NON_EDITABLE_STATES.includes(event.stato)
  const canEdit = !isReadOnlyState && (hasPermission('approva_eventi') || event.promotore_id === user?.id)
  const readOnlyReason = isReadOnlyState
    ? `Evento ${NON_EDITABLE_LABEL[event.stato] || event.stato}: i dati non sono più modificabili.`
    : 'Solo il promotore o chi può approvare gli eventi può modificare questi dati.'

  const handleStartEdit = () => {
    if (!users || users.length === 0) fetchUsers()
    if (!agents || agents.length === 0) fetchAgents()
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

  const requiredOk = fields.titolo?.trim() && fields.tipo_evento?.trim() && fields.data_inizio?.trim()

  const handleSave = async () => {
    setTouched(prev => ({ ...prev, titolo: true, tipo_evento: true, data_inizio: true }))
    if (!requiredOk) {
      addToast('Compila tutti i campi obbligatori', 'warning')
      return
    }
    if (fields.data_fine && fields.data_inizio && fields.data_fine < fields.data_inizio) {
      addToast('La data di fine non può essere precedente alla data di inizio', 'warning')
      return
    }
    setSaving(true)
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
      console.warn('Errore salvataggio evento:', error)
      addToast('Non siamo riusciti a salvare le modifiche. Riprova.', 'error')
    } else {
      addToast('Evento aggiornato!', 'success')
      setEditing(false)
      onUpdate?.()
    }
  }

  const set = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.value }))
  const setBool = (key) => (e) => setFields(f => ({ ...f, [key]: e.target.checked }))

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {canEdit && !editing ? (
          <Button variant="secondary" onClick={handleStartEdit} className="shrink-0">
            <Icon icon={ACTION_ICONS.edit} size={16} className="mr-1.5" />
            Modifica
          </Button>
        ) : !editing ? (
          <span className="text-sm text-gray-500 flex items-center gap-1.5">
            <Icon icon={FEEDBACK_ICONS.info} size={14} />
            {readOnlyReason}
          </span>
        ) : null}
      </div>

      {editing ? (
        <div className={FORM_CONTAINER_STYLE + ' border border-gray-200 space-y-6'}>
          <Section title="Dettagli">
            <Field id="evt-titolo" label="Titolo" required error={fieldError('titolo', fields.titolo)} errorMsg="Il titolo è obbligatorio">
              <input id="evt-titolo" className={fieldError('titolo', fields.titolo) ? INPUT_ERROR_STYLE : INPUT_STYLE} value={fields.titolo} onChange={set('titolo')} onBlur={() => handleBlur('titolo')} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field id="evt-tipo" label="Tipo evento" required error={fieldError('tipo_evento', fields.tipo_evento)} errorMsg="Seleziona un tipo evento">
                <select id="evt-tipo" className={fieldError('tipo_evento', fields.tipo_evento) ? INPUT_ERROR_STYLE : SELECT_STYLE} value={fields.tipo_evento} onChange={set('tipo_evento')} onBlur={() => handleBlur('tipo_evento')}>
                  <option value="">— Seleziona —</option>
                  {eventTypes.filter(t => t.attivo).map(t => <option key={t.codice} value={t.codice}>{t.nome}</option>)}
                </select>
              </Field>
              <Field id="evt-modalita" label="Modalità">
                <select id="evt-modalita" className={SELECT_STYLE} value={fields.modalita} onChange={set('modalita')}>
                  <option value="">— Seleziona —</option>
                  {Object.entries(MODALITA_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field id="evt-luogo" label="Luogo">
              <input id="evt-luogo" className={INPUT_STYLE} value={fields.luogo} onChange={set('luogo')} />
            </Field>
            <Field id="evt-sede" label="Dettaglio sede">
              <input id="evt-sede" className={INPUT_STYLE} value={fields.sede_dettaglio} onChange={set('sede_dettaglio')} />
            </Field>
          </Section>

          <Section title="Date e orari">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field id="evt-data-inizio" label="Data inizio" required error={fieldError('data_inizio', fields.data_inizio)} errorMsg="La data di inizio è obbligatoria">
                <input id="evt-data-inizio" type="date" className={fieldError('data_inizio', fields.data_inizio) ? INPUT_ERROR_STYLE : INPUT_STYLE} value={fields.data_inizio} onChange={set('data_inizio')} onBlur={() => handleBlur('data_inizio')} />
              </Field>
              <Field id="evt-ora" label="Ora inizio">
                <input id="evt-ora" type="time" className={INPUT_STYLE} value={fields.ora_inizio} onChange={set('ora_inizio')} />
              </Field>
              <Field id="evt-data-fine" label="Data fine" hint="Lascia vuoto se l'evento dura un giorno solo">
                <input id="evt-data-fine" type="date" className={INPUT_STYLE} value={fields.data_fine} min={fields.data_inizio || undefined} onChange={set('data_fine')} />
              </Field>
            </div>
          </Section>

          <Section title="Organizzazione">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field id="evt-promotore" label="Promotore">
                <select id="evt-promotore" className={SELECT_STYLE} value={fields.promotore_combined} onChange={set('promotore_combined')}>
                  <option value="">Nessuno</option>
                  <optgroup label="Utenti interni">
                    {(users || []).filter(u => u.attivo !== false).map(u => <option key={u.id} value={`user:${u.id}`}>{u.cognome} {u.nome}</option>)}
                  </optgroup>
                  {(agents || []).length > 0 && (
                    <optgroup label="Agenti">
                      {agents.filter(a => a.attivo !== false).map(a => <option key={a.id} value={`contact:${a.id}`}>{a.cognome} {a.nome}{a.azienda ? ` (${a.azienda})` : ''}</option>)}
                    </optgroup>
                  )}
                </select>
              </Field>
              <Field id="evt-manager" label="Area Manager" hint="Di solito assegnato in automatico in base alla zona — qui puoi cambiarlo">
                <select id="evt-manager" className={SELECT_STYLE} value={fields.manager_user_id} onChange={set('manager_user_id')}>
                  <option value="">Nessuno</option>
                  {(users || []).filter(u => u.attivo !== false && AREA_MANAGER_ROLES.includes(u.ruolo)).map(u => <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>)}
                </select>
              </Field>
            </div>
            <Field id="evt-budget" label="Budget previsto (€)" optional>
              <input id="evt-budget" type="number" min="0" step="100" className={INPUT_STYLE} value={fields.budget_previsto} onChange={set('budget_previsto')} placeholder="Es. 5000" />
            </Field>
          </Section>

          <Section title="Setup e spedizione">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 min-h-[48px]">
                <input type="checkbox" id="evt-desk" className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" checked={fields.desk_richiesto} onChange={setBool('desk_richiesto')} />
                <label htmlFor="evt-desk" className="text-sm font-medium text-gray-700">Desk richiesto</label>
              </div>
              {fields.desk_richiesto && (
                <Field id="evt-postazioni" label="N. postazioni">
                  <input id="evt-postazioni" type="number" min="1" className={INPUT_STYLE} value={fields.n_postazioni} onChange={set('n_postazioni')} />
                </Field>
              )}
              <div className="flex items-center gap-3 min-h-[48px]">
                <input type="checkbox" id="evt-certificato" className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" checked={fields.certificato_previsto} onChange={setBool('certificato_previsto')} />
                <label htmlFor="evt-certificato" className="text-sm font-medium text-gray-700">Certificato previsto</label>
              </div>
            </div>
            <Field id="evt-ind-spedizione" label="Indirizzo spedizione">
              <input id="evt-ind-spedizione" className={INPUT_STYLE} value={fields.indirizzo_spedizione} onChange={set('indirizzo_spedizione')} />
            </Field>
          </Section>

          <Section title="Scadenze">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field id="evt-dl-prep" label="Preparazione">
                <input id="evt-dl-prep" type="date" className={INPUT_STYLE} value={fields.deadline_preparazione} max={fields.data_inizio || undefined} onChange={set('deadline_preparazione')} />
              </Field>
              <Field id="evt-dl-sped" label="Spedizione">
                <input id="evt-dl-sped" type="date" className={INPUT_STYLE} value={fields.data_spedizione_prevista} max={fields.data_inizio || undefined} onChange={set('data_spedizione_prevista')} />
              </Field>
              <Field id="evt-dl-consegna" label="Consegna prevista">
                <input id="evt-dl-consegna" type="date" className={INPUT_STYLE} value={fields.data_consegna_prevista} max={fields.data_inizio || undefined} onChange={set('data_consegna_prevista')} />
              </Field>
              <Field id="evt-dl-iscr" label="Iscrizioni">
                <input id="evt-dl-iscr" type="date" className={INPUT_STYLE} value={fields.deadline_partecipanti} max={fields.data_inizio || undefined} onChange={set('deadline_partecipanti')} />
              </Field>
            </div>
            <p className="text-xs text-gray-400">Di norma comprese tra oggi e la data di inizio evento.</p>
          </Section>

          <Section title="Note">
            <Field id="evt-note" label="Note">
              <textarea id="evt-note" className={TEXTAREA_STYLE} value={fields.note} onChange={set('note')} />
            </Field>
          </Section>

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} loading={saving} disabled={!requiredOk} title={!requiredOk ? 'Compila titolo, tipo evento e data di inizio' : ''}>
              <Icon icon={ACTION_ICONS.check} size={16} className="mr-2" />
              Salva
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>Annulla</Button>
          </div>
        </div>
      ) : (
        <>
        <InfoSection title="Dettagli" icon={tipoIcons[event.tipo_evento] || NAV_ICONS.eventi}>
          <InfoField label="Tipo" value={tipoLabels[event.tipo_evento] || event.tipo_evento} />
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

        <InfoSection title="Organizzazione" icon={NAV_ICONS.profilo}>
          <InfoField label="Promotore" value={getPromotoreName(event)} placeholder="Non assegnato" />
          <InfoField label="Area Manager" value={event.manager ? `${event.manager.nome} ${event.manager.cognome}` : null} placeholder="Non assegnato" />
          <InfoField label="Budget" value={event.budget_previsto ? formatCurrency(event.budget_previsto) : null} placeholder="—" />
          <InfoField label="Ind. spedizione" value={event.indirizzo_spedizione} placeholder="—" />
        </InfoSection>

        <InfoSection title="Scadenze" icon={NAV_ICONS.calendario} cols3>
          <InfoField label="Preparazione" value={event.deadline_preparazione ? formatDate(event.deadline_preparazione) : null} placeholder="—" />
          <InfoField label="Spedizione" value={event.data_spedizione_prevista ? formatDate(event.data_spedizione_prevista) : null} placeholder="—" />
          <InfoField label="Consegna" value={event.data_consegna_prevista ? formatDate(event.data_consegna_prevista) : null} placeholder="—" />
          <InfoField label="Iscrizioni" value={event.deadline_partecipanti ? formatDate(event.deadline_partecipanti) : null} placeholder="—" />
        </InfoSection>

        {event.note && (
          <div className={CARD_STYLE}>
            <p className="text-xs font-medium text-gray-400 mb-1">NOTE</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.note}</p>
          </div>
        )}

        {event.motivo_cancellazione && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-600 mb-1">MOTIVO ANNULLAMENTO</p>
            <p className="text-sm text-red-700">{event.motivo_cancellazione}</p>
          </div>
        )}
        </>
      )}

      {!editing && canDelete && (
        <div className="border border-red-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-red-700">
            <Icon icon={ACTION_ICONS.delete} size={18} />
            Zona pericolosa
          </h3>
          <p className="text-sm text-gray-600">
            L'eliminazione rimuove definitivamente l'evento e tutto ciò che ne dipende
            (materiali, persone, logistica, costi, attività, documenti). L'operazione è
            irreversibile. Per annullare senza cancellare usa invece "Annulla evento".
          </p>
          <Button variant="danger" onClick={() => { setDeleteConfirmText(''); setDeleteOpen(true) }}>
            <Icon icon={ACTION_ICONS.delete} size={16} className="mr-2" />
            Elimina evento definitivamente
          </Button>
        </div>
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="sm"
        title="Elimina evento definitivamente"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Annulla</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={!deleteConfirmed}>
              Elimina definitivamente
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-base text-gray-600">
          <p>
            Verranno eliminati in modo <strong>irreversibile</strong> l'evento
            <strong> «{event.titolo}»</strong> e tutti i dati collegati: materiali,
            persone, logistica, costi, attività e documenti.
          </p>
          <p className="text-sm">
            Per confermare, digita il titolo dell'evento:
          </p>
          <input
            className={INPUT_STYLE}
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder={event.titolo}
            aria-label="Titolo dell'evento per conferma"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  )
}
