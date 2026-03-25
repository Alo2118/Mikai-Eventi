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
import { useActivitiesStore } from '../../hooks/useActivities'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useCostsStore } from '../../hooks/useCosts'
import { useTavoliStore } from '../../hooks/useTavoli'
import { EventTavoliTab } from '../../components/eventi/EventTavoliTab'
import { TIPO_EVENTO, TIPI_EVENTO_CON_TAVOLI } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { ComingSoon } from '../../components/ui/ComingSoon'
import { EventDocumentiTab } from '../../components/eventi/EventDocumentiTab'
import { EventPackingList } from '../../components/eventi/EventPackingList'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { DOCUMENTO_ICONS } from '../../lib/icons'
import { useToastStore } from '../../components/ui/Toast'
import { generateEventDossier } from '../../lib/generate-dossier'

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
  const eventActivities = useActivitiesStore(s => s.eventActivities)
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)
  const tavoli = useTavoliStore(s => s.tavoli)
  const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
  const fetchEventPreventivi = useCostsStore(s => s.fetchEventPreventivi)
  const preventivi = useCostsStore(s => s.preventivi)
  const addToast = useToastStore(s => s.add)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const [eventMaterials, setEventMaterials] = useState([])
  const [showPackingList, setShowPackingList] = useState(false)
  const [generating, setGenerating] = useState(false)

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
      fetchEventActivities(event.id)
      fetchEventTavoli(event.id)
      fetchEventMaterialList(event.id).then(({ data }) => setEventMaterials(data || []))
      fetchEventPreventivi(event.id)
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

    // Tavoli (solo per eventi con tavoli)
    if (TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento) && tavoli.length > 0) {
      const allPeople = [...participants, ...staff]
      const assignedIds = new Set()
      tavoli.forEach(t => {
        t.discenti?.forEach(d => assignedIds.add(d.participant_id || d.id))
        t.formatori?.forEach(f => assignedIds.add(f.staff_id || f.id))
      })
      statuses.tavoli = assignedIds.size >= allPeople.length ? 'complete' : 'warning'
    }

    // Logistica
    const totalPeople = staff.length + participants.length
    if (totalPeople > 0) {
      const hotelConfirmed = hotels.filter(h => h.stato === 'confermato').length
      const andataConfirmed = trasporti.filter(t => t.direzione === 'andata' && t.stato === 'confermato').length
      const ritornoConfirmed = trasporti.filter(t => t.direzione === 'ritorno' && t.stato === 'confermato').length
      const allDone = hotelConfirmed >= totalPeople && andataConfirmed >= totalPeople && ritornoConfirmed >= totalPeople
      statuses.logistica = allDone ? 'complete' : (hotels.length > 0 || trasporti.length > 0) ? 'warning' : undefined
    }

    // Materiale
    if (eventMaterials.length > 0) {
      const allConfirmed = eventMaterials.every(m => m.stato === 'approvato' || m.stato === 'in_preparazione')
      const anyRejected = eventMaterials.some(m => m.stato === 'rifiutato')
      statuses.materiale = allConfirmed ? 'complete' : anyRejected ? 'incomplete' : 'warning'
    }

    // Costi
    if (preventivi.length > 0) {
      const allApproved = preventivi.every(p => p.stato === 'approvato')
      const anyRejected = preventivi.some(p => p.stato === 'rifiutato')
      statuses.costi = allApproved ? 'complete' : anyRejected ? 'incomplete' : 'warning'
    }

    // Preparazione
    const visibleActivities = eventActivities.filter(a => a.stato !== 'disattivata')
    if (visibleActivities.length > 0) {
      const allComplete = visibleActivities.every(a => a.stato === 'completata')
      const anyOverdue = visibleActivities.some(a => a.obbligatoria && a.deadline && new Date(a.deadline) < new Date() && a.stato !== 'completata')
      statuses.preparazione = allComplete ? 'complete' : anyOverdue ? 'incomplete' : 'warning'
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

  const DOSSIER_STATES = ['confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']

  const handleGenerateDossier = async () => {
    setGenerating(true)
    try {
      // Fetch all data in parallel to ensure freshness
      const [matRes, subActRes] = await Promise.all([
        fetchEventMaterialList(event.id),
        useSubActivitiesStore.getState().fetchEventSubActivities(event.id),
        useStaffStore.getState().fetchEventStaff(event.id),
        useParticipantsStore.getState().fetchEventParticipants(event.id),
        fetchEventLogistics(event.id),
        fetchEventPreventivi(event.id),
      ])
      // Read fresh data from stores after parallel fetch
      const freshStaff = useStaffStore.getState().staff
      const freshParticipants = useParticipantsStore.getState().participants
      const freshHotels = useLogisticsStore.getState().hotels
      const freshTrasporti = useLogisticsStore.getState().trasporti
      const freshPreventivi = useCostsStore.getState().preventivi

      const doc = await generateEventDossier({
        event,
        staff: freshStaff,
        participants: freshParticipants,
        subActivities: subActRes.data || [],
        materials: matRes.data || [],
        hotels: freshHotels,
        trasporti: freshTrasporti,
        preventivi: freshPreventivi,
        activities: eventActivities,
        permissions,
      })
      doc.save(`dossier_${event.titolo.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
      addToast('Dossier PDF generato', 'success')
    } catch {
      addToast('Errore nella generazione del dossier', 'error')
    }
    setGenerating(false)
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.titolo}</h1>
            <p className="mt-1 text-base text-gray-500">{subtitle}</p>
            {event.certificato_previsto && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mt-2 w-fit">
                Evento con certificato previsto
              </div>
            )}
          </div>
          {DOSSIER_STATES.includes(event.stato) && (
            <Button variant="secondary" onClick={handleGenerateDossier} loading={generating}>
              <Icon icon={DOCUMENTO_ICONS.dossier} size={18} className="mr-2" />
              Genera dossier
            </Button>
          )}
        </div>
      </div>

      {showPackingList ? (
        <div className="px-4 md:px-8 py-5">
          <EventPackingList event={event} onBack={() => setShowPackingList(false)} />
        </div>
      ) : (
        <>
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
            {activeTab === 'documenti' && <EventDocumentiTab event={event} onShowPackingList={() => setShowPackingList(true)} />}
            {activeTab === 'preparazione' && <EventPreparazioneTab event={event} onShowPackingList={() => setShowPackingList(true)} />}
            {activeTab === 'report' && <ComingSoon title="Report post-evento" description="I report saranno disponibili nella prossima versione." />}
          </div>
        </>
      )}
    </div>
  )
}
