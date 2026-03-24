import { useEffect, useState } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { useTavoliStore } from '../../hooks/useTavoli'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { useToastStore } from '../ui/Toast'
import { STATO_PRENOTAZIONE, STATO_PRENOTAZIONE_COLORE, MEZZO_TRASPORTO, TIPI_EVENTO_CON_TAVOLI } from '../../lib/constants'
import { TRASPORTO_ICONS, ACTION_ICONS } from '../../lib/icons'
import { TrasportoForm } from './TrasportoForm'
import { TavoloModal, HotelModal, TrasportoModal } from './LogisticaBulkModals'
import { ProgressIndicator } from '../ui/ProgressIndicator'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { formatTime, formatDateShort } from '../../lib/date-utils'

const SELECT = 'px-3 py-1.5 rounded-lg text-sm border border-gray-200 min-h-[36px]'

const GROUP_OPTIONS = [
  { id: null, label: 'Tutti' },
  { id: 'tavolo', label: 'Per tavolo' },
  { id: 'tipo', label: 'Per tipo' },
  { id: 'zona', label: 'Per zona' },
]

// ─── Transport cell display ─────────────────────────────────────
function TrasportoCell({ record }) {
  if (!record) return <span className="text-gray-300">—</span>

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
export function EventLogisticaTab({ event }) {
  const hotels = useLogisticsStore(s => s.hotels)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const loading = useLogisticsStore(s => s.loading)
  const fetchEventLogistics = useLogisticsStore(s => s.fetchEventLogistics)

  const staff = useStaffStore(s => s.staff)
  const participants = useParticipantsStore(s => s.participants)
  const canEdit = useAuthStore(s => s.hasPermission)('gestione_logistica')
  const addToast = useToastStore(s => s.add)

  const tavoli = useTavoliStore(s => s.tavoli)
  const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
  const distributeDiscenti = useTavoliStore(s => s.distributeDiscenti)

  const [selected, setSelected] = useState(new Set()) // Set of "type-id" keys
  const [groupBy, setGroupBy] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // 'tavolo' | 'hotel' | 'andata' | 'ritorno'
  const [editingTransport, setEditingTransport] = useState(null)

  const hasTavoli = TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento)

  useEffect(() => {
    fetchEventLogistics(event.id)
    if (hasTavoli) fetchEventTavoli(event.id)
  }, [event.id])

  // ── People list ──
  const people = [
    ...staff.map(s => ({ type: 'staff', id: s.user_id, staffId: s.id, nome: s.user?.nome, cognome: s.user?.cognome, ruolo: s.ruolo_evento })),
    ...participants.map(p => ({ type: 'participant', id: p.contact_id, participantId: p.id, nome: p.contact?.nome, cognome: p.contact?.cognome, ruolo: p.tipo, zona: p.contact?.zona?.nome || p.contact?.citta || null })),
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

  if (loading) return <LoadingSkeleton lines={5} />

  return (
    <div className="space-y-4">
      {/* ── Header: grouping + actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-lg">Logistica persone</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {GROUP_OPTIONS.filter(g => hasTavoli || g.id !== 'tavolo').map(g => (
            <button
              key={g.id || 'all'}
              onClick={() => setGroupBy(g.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${
                groupBy === g.id ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g.label}
            </button>
          ))}
          {hasTavoli && canEdit && tavoli.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleDistribuisci}>Distribuisci discenti</Button>
          )}
        </div>
      </div>

      {/* ── Toolbar: bulk actions (visible when selection > 0) ── */}
      {canEdit && selected.size > 0 && (
        <div className="flex items-center gap-2 bg-mikai-50 border border-mikai-200 rounded-xl px-4 py-3 flex-wrap">
          <span className="text-sm font-medium text-mikai-700">{selected.size} selezionati</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            {hasTavoli && tavoli.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setActiveModal('tavolo')}>Imposta tavolo</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('hotel')}>Imposta hotel</Button>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('andata')}>Imposta andata</Button>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('ritorno')}>Imposta ritorno</Button>
          </div>
        </div>
      )}

      {people.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {people.length === 0 && <p className="text-gray-400 text-center py-6">Aggiungi staff o partecipanti nel tab Persone</p>}

      {/* ── Table ── */}
      {groupedPeople.map((group, gi) => (
        <div key={gi}>
          {group.label && (
            <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2 font-medium text-sm text-gray-700">
              {group.label} <span className="text-gray-400 font-normal">({group.people.length})</span>
            </div>
          )}
          <div className="overflow-x-auto">
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
                    <>
                      <tr key={key} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(key) ? 'bg-mikai-50/50' : ''}`}>
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
                          <span className="font-medium">{person.cognome} {person.nome}</span>
                          <span className="text-gray-400 text-sm ml-1">({person.type === 'staff' ? 'staff' : person.ruolo || 'partecipante'})</span>
                        </td>
                        {hasTavoli && (
                          <td className="py-3 px-2">
                            {currentTavolo
                              ? <span className="text-sm font-medium">T{currentTavolo.numero}</span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                        )}
                        <td className="py-3 px-2">
                          {hotel ? (
                            <div className="space-y-0.5">
                              {hotel.nome_hotel && <div className="text-sm font-medium">{hotel.nome_hotel}</div>}
                              {(hotel.check_in || hotel.check_out) && (
                                <div className="text-xs text-gray-400">
                                  {hotel.check_in && formatDateShort(hotel.check_in)}
                                  {hotel.check_in && hotel.check_out && ' → '}
                                  {hotel.check_out && formatDateShort(hotel.check_out)}
                                </div>
                              )}
                              <StatusBadge stato={hotel.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                            </div>
                          ) : <span className="text-gray-300">—</span>}
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
                    </>
                  )
                })}
              </tbody>
            </table>
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
    </div>
  )
}
