import { useEffect } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { useToastStore } from '../ui/Toast'
import { STATO_PRENOTAZIONE, STATO_PRENOTAZIONE_COLORE } from '../../lib/constants'

const SELECT = 'px-3 py-1.5 rounded-lg text-sm border border-gray-200 min-h-[36px]'

export function EventLogisticaTab({ event }) {
  const hotels = useLogisticsStore(s => s.hotels)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const loading = useLogisticsStore(s => s.loading)
  const fetchEventLogistics = useLogisticsStore(s => s.fetchEventLogistics)
  const createHotel = useLogisticsStore(s => s.createHotel)
  const updateHotel = useLogisticsStore(s => s.updateHotel)
  const createTrasporto = useLogisticsStore(s => s.createTrasporto)
  const updateTrasporto = useLogisticsStore(s => s.updateTrasporto)

  const staff = useStaffStore(s => s.staff)
  const participants = useParticipantsStore(s => s.participants)
  const canEdit = useAuthStore(s => s.hasPermission)('gestione_logistica')
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchEventLogistics(event.id) }, [event.id])

  // Build unified people list
  const people = [
    ...staff.map(s => ({ type: 'staff', id: s.user_id, nome: s.user?.nome, cognome: s.user?.cognome, ruolo: s.ruolo_evento })),
    ...participants.map(p => ({ type: 'participant', id: p.contact_id, nome: p.contact?.nome, cognome: p.contact?.cognome, ruolo: p.tipo })),
  ]

  const getHotel = (person) => hotels.find(h => person.type === 'staff' ? h.user_id === person.id : h.contact_id === person.id)
  const getAndata = (person) => trasporti.find(t => t.direzione === 'andata' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))
  const getRitorno = (person) => trasporti.find(t => t.direzione === 'ritorno' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))

  const ensureHotel = async (person) => {
    const payload = { event_id: event.id, stato: 'da_prenotare' }
    if (person.type === 'staff') payload.user_id = person.id
    else payload.contact_id = person.id
    const { error } = await createHotel(payload)
    if (error) addToast('Errore', 'error')
  }

  const ensureTrasporto = async (person, direzione) => {
    const payload = { event_id: event.id, direzione, stato: 'da_prenotare' }
    if (person.type === 'staff') payload.user_id = person.id
    else payload.contact_id = person.id
    const { error } = await createTrasporto(payload)
    if (error) addToast('Errore', 'error')
  }

  if (loading) return <p className="text-gray-400 text-center py-6">Caricamento...</p>

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Logistica persone</h3>

      {people.length === 0 && <p className="text-gray-400 text-center py-6">Aggiungi staff o partecipanti nel tab Persone</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="pb-2 pr-4">Persona</th>
              <th className="pb-2 px-2">Hotel</th>
              <th className="pb-2 px-2">Andata</th>
              <th className="pb-2 px-2">Ritorno</th>
            </tr>
          </thead>
          <tbody>
            {people.map(person => {
              const hotel = getHotel(person)
              const andata = getAndata(person)
              const ritorno = getRitorno(person)
              return (
                <tr key={`${person.type}-${person.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{person.cognome} {person.nome}</span>
                    <span className="text-gray-400 text-sm ml-1">({person.type === 'staff' ? 'staff' : 'partecipante'})</span>
                  </td>
                  <td className="py-3 px-2">
                    {hotel ? (
                      canEdit ? (
                        <select className={SELECT} value={hotel.stato} onChange={e => updateHotel(hotel.id, { stato: e.target.value })}>
                          {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <StatusBadge stato={hotel.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                      )
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => ensureHotel(person)}>+ Hotel</Button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-2">
                    {andata ? (
                      canEdit ? (
                        <select className={SELECT} value={andata.stato} onChange={e => updateTrasporto(andata.id, { stato: e.target.value })}>
                          {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <StatusBadge stato={andata.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                      )
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => ensureTrasporto(person, 'andata')}>+ Andata</Button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-2">
                    {ritorno ? (
                      canEdit ? (
                        <select className={SELECT} value={ritorno.stato} onChange={e => updateTrasporto(ritorno.id, { stato: e.target.value })}>
                          {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        <StatusBadge stato={ritorno.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                      )
                    ) : canEdit ? (
                      <Button variant="ghost" size="sm" onClick={() => ensureTrasporto(person, 'ritorno')}>+ Ritorno</Button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
