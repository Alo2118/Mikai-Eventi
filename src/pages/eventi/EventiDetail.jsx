import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { EventInfoTab } from '../../components/eventi/EventInfoTab'
import { EventMaterialList } from '../../components/eventi/EventMaterialList'
import { EventPreparazioneTab } from '../../components/eventi/EventPreparazioneTab'
import { EventPersoneTab } from '../../components/eventi/EventPersoneTab'
import { EventProgrammaTab } from '../../components/eventi/EventProgrammaTab'
import { EventLogisticaTab } from '../../components/eventi/EventLogisticaTab'
import { EventCostiTab } from '../../components/eventi/EventCostiTab'
import { useAdminStore } from '../../hooks/useAdmin'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { EventTavoliTab } from '../../components/eventi/EventTavoliTab'
import { TIPO_EVENTO, TIPI_EVENTO_CON_TAVOLI } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'
import { ComingSoon } from '../../components/ui/ComingSoon'

function getVisibleTabs(event, profile, permissions) {
  const ruolo = profile?.ruolo
  const isUfficio = ['admin', 'direzione', 'ufficio'].includes(ruolo)
  const modalita = event.modalita

  const tabs = [{ id: 'info', label: 'Info' }]

  tabs.push({ id: 'persone', label: 'Persone' })
  if (TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento)) {
    tabs.push({ id: 'tavoli', label: 'Tavoli' })
  }
  tabs.push({ id: 'programma', label: 'Programma' })
  if (modalita !== 'contributo') {
    tabs.push({ id: 'materiale', label: 'Materiale & Gadget' })
  }
  tabs.push({ id: 'logistica', label: 'Logistica' })
  if (permissions.includes('gestione_costi') || permissions.includes('approva_preventivi')) {
    tabs.push({ id: 'costi', label: 'Costi' })
  }
  tabs.push({ id: 'documenti', label: 'Documenti' })
  tabs.push({ id: 'preparazione', label: 'Preparazione' })
  if (isUfficio) {
    tabs.push({ id: 'report', label: 'Report' })
  }

  return tabs
}


export function EventiDetail() {
  const { id } = useParams()
  const fetchEvent = useEventsStore(s => s.fetchEvent)
  const profile = useAuthStore(s => s.profile)
  const permissions = useAuthStore(s => s.permissions)
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const staff = useStaffStore(s => s.staff)
  const participants = useParticipantsStore(s => s.participants)
  const hotels = useLogisticsStore(s => s.hotels)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const fetchEventLogistics = useLogisticsStore(s => s.fetchEventLogistics)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    setLoading(true)
    fetchEvent(id).then(({ data, error }) => {
      setEvent(data)
      setError(error)
      setLoading(false)
    })
  }, [id])

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    if (event?.id) {
      fetchEventLogistics(event.id)
    }
  }, [event?.id])

  if (loading) return <LoadingSkeleton lines={8} />
  if (error || !event) {
    return <EmptyState title="Evento non trovato" description={error || 'L\'evento richiesto non esiste o non hai accesso.'} />
  }

  function computeTabStatus() {
    const statuses = {}

    // Persone
    if (staff.length > 0 || participants.length > 0) {
      const staffConfirmed = staff.every(s => s.confermato)
      const partConfirmed = participants.every(p => p.stato_iscrizione === 'confermato' || p.stato_iscrizione === 'presente')
      statuses.persone = (staffConfirmed && partConfirmed) ? 'complete' : 'warning'
    }

    // Logistica
    const totalPeople = staff.length + participants.length
    if (totalPeople > 0) {
      const hotelCount = hotels.length
      const andataCount = trasporti.filter(t => t.direzione === 'andata').length
      const ritornoCount = trasporti.filter(t => t.direzione === 'ritorno').length
      const allDone = hotelCount >= totalPeople && andataCount >= totalPeople && ritornoCount >= totalPeople
      statuses.logistica = allDone ? 'complete' : (hotelCount > 0 || andataCount > 0 || ritornoCount > 0) ? 'warning' : undefined
    }

    return statuses
  }

  const tabStatuses = computeTabStatus()
  const tabs = getVisibleTabs(event, profile, permissions).map(tab => ({
    ...tab,
    status: tabStatuses[tab.id],
  }))
  const subtitle = `${TIPO_EVENTO[event.tipo_evento]} \u00B7 ${formatDateRange(event.data_inizio, event.data_fine)}${event.luogo ? ` \u00B7 ${event.luogo}` : ''}`

  const refreshEvent = () => {
    fetchEvent(id).then(({ data }) => { if (data) setEvent(data) })
  }

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: event.titolo },
        ]} />
      </div>
      <MobileHeader title={event.titolo} subtitle={subtitle} />

      <div className="hidden md:block px-8 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">{event.titolo}</h1>
        <p className="mt-1 text-base text-gray-500">{subtitle}</p>
        {event.certificato_previsto && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mt-2 w-fit">
            Evento con certificato previsto
          </div>
        )}
      </div>

      <div className="mt-4 px-4 md:px-8">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 md:px-8 py-5">
        {activeTab === 'info' && <EventInfoTab event={event} onUpdate={refreshEvent} />}
        {activeTab === 'persone' && <EventPersoneTab event={event} users={users} />}
        {activeTab === 'tavoli' && <EventTavoliTab event={event} staff={staff} participants={participants} />}
        {activeTab === 'programma' && <EventProgrammaTab event={event} />}
        {activeTab === 'materiale' && <EventMaterialList event={event} />}
        {activeTab === 'logistica' && <EventLogisticaTab event={event} />}
        {activeTab === 'costi' && <EventCostiTab event={event} />}
        {activeTab === 'documenti' && <ComingSoon title="Documenti" description="La gestione documenti sarà disponibile nella prossima versione." />}
        {activeTab === 'preparazione' && <EventPreparazioneTab event={event} />}
        {activeTab === 'report' && <ComingSoon title="Report post-evento" description="I report saranno disponibili nella prossima versione." />}
      </div>
    </div>
  )
}
