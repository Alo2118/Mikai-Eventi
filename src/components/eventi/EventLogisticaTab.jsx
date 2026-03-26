import { useEffect, useState, Fragment } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { useTavoliStore } from '../../hooks/useTavoli'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { STATO_PRENOTAZIONE, STATO_PRENOTAZIONE_COLORE, STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE, MEZZO_TRASPORTO, TIPI_EVENTO_CON_TAVOLI, RUOLO_EVENTO, TIPO_PARTECIPANTE, SELECT_STYLE, FORM_CONTAINER_STYLE, SUMMARY_BAR_STYLE, GROUP_HEADING_STYLE } from '../../lib/constants'
import { TRASPORTO_ICONS, ACTION_ICONS, NAV_ICONS, LOGISTICA_PERSONE_ICONS, TAVOLI_ICONS } from '../../lib/icons'
import { ContactPicker } from '../contatti/ContactPicker'
import { BulkImportModal } from '../contatti/BulkImportModal'
import { TrasportoForm } from './TrasportoForm'
import { TavoloModal, HotelModal, TrasportoModal } from './LogisticaBulkModals'
import { EventChecklistView } from './EventChecklistView'
import { ProgressIndicator } from '../ui/ProgressIndicator'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { formatTime, formatDateShort } from '../../lib/date-utils'

const GROUP_OPTIONS = [
  { id: null, label: 'Tutti' },
  { id: 'tavolo', label: 'Per tavolo' },
  { id: 'tipo', label: 'Per tipo' },
  { id: 'zona', label: 'Per zona' },
]

// ─── Transport cell display ─────────────────────────────────────
function TrasportoCell({ record }) {
  if (!record) return <span className="text-gray-400">—</span>

  if (!record.mezzo) {
    return <StatusBadge stato={record.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
  }

  const icon = TRASPORTO_ICONS[record.mezzo]
  const time = record.orario ? formatTime(record.orario) : null
  const pickupTime = record.orario_pickup ? formatTime(record.orario_pickup) : null

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        {icon && <Icon icon={icon} size={16} className="text-gray-500" />}
        {record.codice && <span className="text-sm font-medium">{record.codice}</span>}
        {time && <span className="text-sm text-gray-600">{time}</span>}
        {!record.codice && !time && <span className="text-sm">{MEZZO_TRASPORTO[record.mezzo]}</span>}
      </div>
      {record.autista && (
        <div className="text-xs text-gray-400">
          {record.autista}{pickupTime ? ` pickup ${pickupTime}` : ''}
        </div>
      )}
      <StatusBadge stato={record.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────
function getPersonTavolo(person, tavoli) {
  for (const t of tavoli) {
    if (person.type === 'staff') {
      if ((t.formatori || []).some(f => f.staff?.user_id === person.id)) return t
    } else {
      if ((t.discenti || []).some(d => d.participant?.contact_id === person.id)) return t
    }
  }
  return null
}

// ─── Main Component ─────────────────────────────────────────────
export function EventLogisticaTab({ event, users = [] }) {
  const hotels = useLogisticsStore(s => s.hotels)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const loading = useLogisticsStore(s => s.loading)
  const fetchEventLogistics = useLogisticsStore(s => s.fetchEventLogistics)

  const staff = useStaffStore(s => s.staff)
  const staffLoading = useStaffStore(s => s.loading)
  const fetchEventStaff = useStaffStore(s => s.fetchEventStaff)
  const addStaff = useStaffStore(s => s.addStaff)
  const updateStaff = useStaffStore(s => s.updateStaff)
  const removeStaff = useStaffStore(s => s.removeStaff)

  const participants = useParticipantsStore(s => s.participants)
  const fetchEventParticipants = useParticipantsStore(s => s.fetchEventParticipants)
  const addParticipant = useParticipantsStore(s => s.addParticipant)
  const updateParticipant = useParticipantsStore(s => s.updateParticipant)
  const removeParticipant = useParticipantsStore(s => s.removeParticipant)

  const hasPermission = useAuthStore(s => s.hasPermission)
  const canEdit = hasPermission('gestione_logistica')
  const canEditStaff = hasPermission('gestione_staff_evento')
  const canEditPart = hasPermission('gestione_contatti') || hasPermission('gestione_staff_evento')
  const addToast = useToastStore(s => s.add)

  const tavoli = useTavoliStore(s => s.tavoli)
  const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
  const distributeDiscenti = useTavoliStore(s => s.distributeDiscenti)

  const [selected, setSelected] = useState(new Set())
  const [groupBy, setGroupBy] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  const [editingTransport, setEditingTransport] = useState(null)
  const [staffForm, setStaffForm] = useState(null)
  const [partForm, setPartForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [checklistMode, setChecklistMode] = useState(false)

  const hasTavoli = TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento)

  useEffect(() => {
    fetchEventStaff(event.id)
    fetchEventParticipants(event.id)
    fetchEventLogistics(event.id)
    if (hasTavoli) fetchEventTavoli(event.id)
  }, [event.id])

  // ── People CRUD ──
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

  // ── People list ──
  const people = [
    ...staff.map(s => ({ type: 'staff', id: s.user_id, staffId: s.id, nome: s.user?.nome, cognome: s.user?.cognome, ruolo: s.ruolo_evento, confermato: s.confermato })),
    ...participants.map(p => ({ type: 'participant', id: p.contact_id, participantId: p.id, nome: p.contact?.nome, cognome: p.contact?.cognome, ruolo: p.tipo, statoIscrizione: p.stato_iscrizione, zona: p.contact?.zona?.nome || p.contact?.citta || null })),
  ]

  const personKey = (p) => `${p.type}-${p.id}`
  const selectedPeople = people.filter(p => selected.has(personKey(p)))

  // ── Selection ──
  const toggleSelect = (person) => {
    setSelected(prev => {
      const next = new Set(prev)
      const key = personKey(person)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === people.length) setSelected(new Set())
    else setSelected(new Set(people.map(p => personKey(p))))
  }

  // ── Grouping ──
  const groupedPeople = (() => {
    if (!groupBy) return [{ label: null, people }]
    if (groupBy === 'tavolo') {
      const groups = []
      const assigned = new Set()
      for (const t of tavoli) {
        const inTavolo = people.filter(p => {
          if (getPersonTavolo(p, [t])) { assigned.add(personKey(p)); return true }
          return false
        })
        if (inTavolo.length > 0) groups.push({ label: `Tavolo ${t.numero}${t.nome ? ` — ${t.nome}` : ''}`, people: inTavolo })
      }
      const unassigned = people.filter(p => !assigned.has(personKey(p)))
      if (unassigned.length > 0) groups.push({ label: 'Non assegnati', people: unassigned })
      return groups
    }
    if (groupBy === 'tipo') {
      const groups = []
      const staffP = people.filter(p => p.type === 'staff')
      const partP = people.filter(p => p.type === 'participant')
      if (staffP.length > 0) groups.push({ label: 'Staff', people: staffP })
      if (partP.length > 0) groups.push({ label: 'Partecipanti', people: partP })
      return groups
    }
    if (groupBy === 'zona') {
      const zoneMap = {}
      for (const p of people) {
        const zona = p.zona || 'Zona non assegnata'
        if (!zoneMap[zona]) zoneMap[zona] = []
        zoneMap[zona].push(p)
      }
      return Object.entries(zoneMap).map(([label, people]) => ({ label, people }))
    }
    return [{ label: null, people }]
  })()

  // ── Lookups ──
  const getHotel = (person) => hotels.find(h => person.type === 'staff' ? h.user_id === person.id : h.contact_id === person.id)
  const getAndata = (person) => trasporti.find(t => t.direzione === 'andata' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))
  const getRitorno = (person) => trasporti.find(t => t.direzione === 'ritorno' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))

  // ── Bulk modal done ──
  const handleModalDone = () => {
    setActiveModal(null)
    setSelected(new Set())
    fetchEventLogistics(event.id)
    if (hasTavoli) fetchEventTavoli(event.id)
  }

  const handleDistribuisci = async () => {
    const { error } = await distributeDiscenti(event.id)
    if (error) addToast(error, 'error')
    else addToast('Discenti distribuiti ai tavoli', 'success')
  }

  const colSpan = (hasTavoli ? 6 : 5) // checkbox + persona + [tavolo] + hotel + andata + ritorno

  if (loading || staffLoading) return <LoadingSkeleton lines={5} />

  // ── Checklist presenze mode ──
  if (checklistMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Checklist presenze</h3>
          <Button variant="secondary" size="sm" onClick={() => setChecklistMode(false)}>
            <Icon icon={ACTION_ICONS.back} size={16} className="mr-1" />
            Torna alla gestione
          </Button>
        </div>
        <EventChecklistView event={event} participants={participants} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Aggiungi persone ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Icon icon={NAV_ICONS.contatti} size={20} className="text-gray-400" />
            Persone
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {['pronto', 'in_corso'].includes(event.stato) && (
              <Button variant="secondary" size="sm" onClick={() => setChecklistMode(true)}>
                <Icon icon={NAV_ICONS.checklist} size={16} className="mr-1" />
                Presenze
              </Button>
            )}
            {canEditPart && (
              <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                <Icon icon={ACTION_ICONS.upload} size={16} />
                <span className="ml-1 hidden sm:inline">Importa</span>
              </Button>
            )}
            {canEditPart && (
              <Button variant="secondary" size="sm" onClick={() => setPartForm({ contact: null, tipo: 'discente' })}>
                <Icon icon={ACTION_ICONS.add} size={16} />
                <span className="ml-1">Partecipante</span>
              </Button>
            )}
            {canEditStaff && (
              <Button variant="secondary" size="sm" onClick={() => setStaffForm({ userId: '', ruolo: 'staff' })}>
                <Icon icon={ACTION_ICONS.add} size={16} />
                <span className="ml-1">Staff</span>
              </Button>
            )}
          </div>
        </div>

        {/* Inline form: aggiungi staff */}
        {staffForm && (
          <div className={FORM_CONTAINER_STYLE + ' flex flex-col md:flex-row gap-3'}>
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

        {/* Inline form: aggiungi partecipante */}
        {partForm && (
          <div className={FORM_CONTAINER_STYLE + ' flex flex-col md:flex-row gap-3'}>
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
      </div>

      {/* ── Logistica: grouping + actions ── */}
      {people.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Icon icon={NAV_ICONS.logistica} size={20} className="text-gray-400" />
              Logistica
            </h3>
            {hasTavoli && canEdit && tavoli.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handleDistribuisci}>Distribuisci</Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {GROUP_OPTIONS.filter(g => hasTavoli || g.id !== 'tavolo').map(g => (
              <button
                key={g.id || 'all'}
                onClick={() => setGroupBy(g.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${
                  groupBy === g.id ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar: bulk actions (visible when selection > 0) ── */}
      {canEdit && selected.size > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' flex items-center gap-3 flex-wrap'}>
          <span className="text-sm font-medium text-mikai-700">{selected.size} selezionati</span>
          <div className="flex gap-3 ml-auto flex-wrap">
            {hasTavoli && tavoli.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setActiveModal('tavolo')}>
                <Icon icon={TAVOLI_ICONS.tavoli} size={16} className="mr-1" />
                Imposta tavolo
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('hotel')}>
              <Icon icon={LOGISTICA_PERSONE_ICONS.hotel} size={16} className="mr-1" />
              Imposta hotel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('andata')}>
              <Icon icon={ACTION_ICONS.forward} size={16} className="mr-1" />
              Imposta andata
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('ritorno')}>
              <Icon icon={ACTION_ICONS.back} size={16} className="mr-1" />
              Imposta ritorno
            </Button>
          </div>
        </div>
      )}

      {people.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {hasTavoli && (
            <ProgressIndicator
              label="Tavoli"
              current={people.filter(p => getPersonTavolo(p, tavoli)).length}
              total={people.length}
              color="mikai"
            />
          )}
          <ProgressIndicator
            label="Hotel"
            current={hotels.length}
            total={people.length}
            color="blue"
          />
          <ProgressIndicator
            label="Andata"
            current={trasporti.filter(t => t.direzione === 'andata').length}
            total={people.length}
          />
          <ProgressIndicator
            label="Ritorno"
            current={trasporti.filter(t => t.direzione === 'ritorno').length}
            total={people.length}
          />
        </div>
      )}

      {people.length === 0 && <EmptyState title="Nessuna persona" description="Aggiungi staff o partecipanti con i bottoni sopra" />}

      {/* ── Table ── */}
      {groupedPeople.map((group, gi) => (
        <div key={gi}>
          {group.label && (
            <div className={GROUP_HEADING_STYLE + ' mb-2'}>
              {group.label} <span className="text-gray-400 font-normal">({group.people.length})</span>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-base">
              {gi === 0 && (
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    {canEdit && (
                      <th className="pb-2 px-2 w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === people.length && people.length > 0}
                          onChange={toggleSelectAll}
                          className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                        />
                      </th>
                    )}
                    <th className="pb-2 pr-4">Persona</th>
                    {hasTavoli && <th className="pb-2 px-2">Tavolo</th>}
                    <th className="pb-2 px-2">Hotel</th>
                    <th className="pb-2 px-2">Andata</th>
                    <th className="pb-2 px-2">Ritorno</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {group.people.map(person => {
                  const key = personKey(person)
                  const hotel = getHotel(person)
                  const andata = getAndata(person)
                  const ritorno = getRitorno(person)
                  const currentTavolo = hasTavoli ? getPersonTavolo(person, tavoli) : null

                  return (
                    <Fragment key={key}>
                      <tr className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(key) ? 'bg-mikai-50/50' : ''}`}>
                        {canEdit && (
                          <td className="py-3 px-2">
                            <input
                              type="checkbox"
                              checked={selected.has(key)}
                              onChange={() => toggleSelect(person)}
                              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                            />
                          </td>
                        )}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <span className="font-medium truncate block">{person.cognome} {person.nome}</span>
                              <span className="text-gray-400 text-sm">{person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}</span>
                            </div>
                            {person.type === 'staff' && canEditStaff && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStaff(person.staffId, { confermato: !person.confermato }) }}
                                className={`px-2 py-0.5 rounded text-xs font-medium ${person.confermato ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                              >
                                {person.confermato ? '✓' : '?'}
                              </button>
                            )}
                            {person.type === 'participant' && canEditPart && (
                              <select
                                value={person.statoIscrizione || 'invitato'}
                                onChange={e => updateParticipant(person.participantId, { stato_iscrizione: e.target.value })}
                                className="px-2 py-0.5 rounded text-xs border border-gray-200"
                                onClick={e => e.stopPropagation()}
                              >
                                {Object.entries(STATO_ISCRIZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            )}
                            {(canEditStaff || canEditPart) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, name: `${person.cognome} ${person.nome}` }) }}
                                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                aria-label={`Rimuovi ${person.cognome} ${person.nome}`}
                              >
                                <Icon icon={ACTION_ICONS.close} size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        {hasTavoli && (
                          <td className="py-3 px-2">
                            {currentTavolo
                              ? <span className="text-sm font-medium">T{currentTavolo.numero}</span>
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                        )}
                        <td className="py-3 px-2">
                          {hotel ? (
                            <div className="space-y-0.5">
                              {hotel.nome_hotel && <div className="text-sm font-medium truncate max-w-[180px]">{hotel.nome_hotel}</div>}
                              {(hotel.check_in || hotel.check_out) && (
                                <div className="text-xs text-gray-400">
                                  {hotel.check_in && formatDateShort(hotel.check_in)}
                                  {hotel.check_in && hotel.check_out && ' → '}
                                  {hotel.check_out && formatDateShort(hotel.check_out)}
                                </div>
                              )}
                              <StatusBadge stato={hotel.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 px-2">
                          <TrasportoCell record={andata} />
                        </td>
                        <td className="py-3 px-2">
                          <TrasportoCell record={ritorno} />
                        </td>
                      </tr>
                      {editingTransport?.personId === person.id && (
                        <tr key={`form-${key}`}>
                          <td colSpan={colSpan} className="p-2">
                            <TrasportoForm
                              trasporto={editingTransport.record}
                              eventId={event.id}
                              personId={person.id}
                              personType={person.type}
                              direzione={editingTransport.direzione}
                              onSave={() => setEditingTransport(null)}
                              onCancel={() => setEditingTransport(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {canEdit && gi === 0 && (
              <label className="flex items-center gap-2 p-2 min-h-[48px]">
                <input
                  type="checkbox"
                  checked={selected.size === people.length && people.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                />
                <span className="text-sm text-gray-500">Seleziona tutti</span>
              </label>
            )}
            {group.people.map(person => {
              const key = personKey(person)
              const hotel = getHotel(person)
              const andata = getAndata(person)
              const ritorno = getRitorno(person)
              const currentTavolo = hasTavoli ? getPersonTavolo(person, tavoli) : null

              const hasAnyData = hotel || andata || ritorno
              return (
                <div key={key} className={`bg-white rounded-xl border border-gray-200 p-3 space-y-2 ${selected.has(key) ? 'border-mikai-300 bg-mikai-50/30' : ''}`}>
                  {/* Row 1: checkbox + name + delete */}
                  <div className="flex items-start gap-2">
                    {canEdit && (
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggleSelect(person)}
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm block">{person.cognome} {person.nome}</span>
                      <span className="text-gray-400 text-xs">{person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}</span>
                    </div>
                    {(canEditStaff || canEditPart) && (
                      <button
                        onClick={() => setDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, name: `${person.cognome} ${person.nome}` })}
                        className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                        aria-label={`Rimuovi ${person.cognome} ${person.nome}`}
                      >
                        <Icon icon={ACTION_ICONS.close} size={14} />
                      </button>
                    )}
                  </div>

                  {/* Row 2: tavolo + stato conferma */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasTavoli && currentTavolo && (
                      <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">T{currentTavolo.numero}</span>
                    )}
                    {person.type === 'staff' && canEditStaff && (
                      <button
                        onClick={() => updateStaff(person.staffId, { confermato: !person.confermato })}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${person.confermato ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                      >
                        {person.confermato ? 'Confermato' : 'Da confermare'}
                      </button>
                    )}
                    {person.type === 'participant' && (
                      canEditPart ? (
                        <select
                          value={person.statoIscrizione || 'invitato'}
                          onChange={e => updateParticipant(person.participantId, { stato_iscrizione: e.target.value })}
                          className="px-2 py-0.5 rounded text-xs border border-gray-200"
                        >
                          {Object.entries(STATO_ISCRIZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <StatusBadge stato={person.statoIscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />
                      )
                    )}
                  </div>

                  {/* Row 3: logistica (solo se ci sono dati) */}
                  {hasAnyData && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs border-t border-gray-100 pt-2">
                      {hotel && (
                        <div className="flex items-center gap-1">
                          <Icon icon={LOGISTICA_PERSONE_ICONS.hotel} size={14} className="text-gray-400" />
                          <StatusBadge stato={hotel.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                        </div>
                      )}
                      {andata && (
                        <div className="flex items-center gap-1">
                          <Icon icon={ACTION_ICONS.forward} size={14} className="text-gray-400" />
                          <TrasportoCell record={andata} />
                        </div>
                      )}
                      {ritorno && (
                        <div className="flex items-center gap-1">
                          <Icon icon={ACTION_ICONS.back} size={14} className="text-gray-400" />
                          <TrasportoCell record={ritorno} />
                        </div>
                      )}
                    </div>
                  )}
                  {editingTransport?.personId === person.id && (
                    <TrasportoForm
                      trasporto={editingTransport.record}
                      eventId={event.id}
                      personId={person.id}
                      personType={person.type}
                      direzione={editingTransport.direzione}
                      onSave={() => setEditingTransport(null)}
                      onCancel={() => setEditingTransport(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* ── Bulk Modals ── */}
      {activeModal === 'tavolo' && (
        <TavoloModal selectedPeople={selectedPeople} eventId={event.id} tavoli={tavoli} onDone={handleModalDone} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'hotel' && (
        <HotelModal selectedPeople={selectedPeople} eventId={event.id} onDone={handleModalDone} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'andata' && (
        <TrasportoModal selectedPeople={selectedPeople} eventId={event.id} direzione="andata" onDone={handleModalDone} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'ritorno' && (
        <TrasportoModal selectedPeople={selectedPeople} eventId={event.id} direzione="ritorno" onDone={handleModalDone} onClose={() => setActiveModal(null)} />
      )}

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
