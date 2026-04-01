import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { todayISO, formatDateRange } from '../../lib/date-utils'
import { useAdminStore } from '../../hooks/useAdmin'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useCostsStore } from '../../hooks/useCosts'
import { useTavoliStore } from '../../hooks/useTavoli'
import { TIPO_EVENTO, TIPI_EVENTO_CON_TAVOLI, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { DOCUMENTO_ICONS, CATEGORIA_ICONS, MATERIALE_ICONS, NAV_ICONS as DETAIL_NAV_ICONS, COSTI_ICONS, FEEDBACK_ICONS, ACTION_ICONS as DETAIL_ACTION_ICONS } from '../../lib/icons'
import { useToastStore } from '../../components/ui/Toast'
import { generateEventDossier } from '../../lib/generate-dossier'

// Lazy-loaded tabs — only the active tab is loaded
const EventInfoTab = lazy(() => import('../../components/eventi/EventInfoTab').then(m => ({ default: m.EventInfoTab })))
const EventMaterialList = lazy(() => import('../../components/eventi/EventMaterialList').then(m => ({ default: m.EventMaterialList })))
const EventPreparazioneTab = lazy(() => import('../../components/eventi/EventPreparazioneTab').then(m => ({ default: m.EventPreparazioneTab })))
// EventPersoneTab merged into EventLogisticaTab
const EventProgrammaTab = lazy(() => import('../../components/eventi/EventProgrammaTab').then(m => ({ default: m.EventProgrammaTab })))
const EventLogisticaTab = lazy(() => import('../../components/eventi/EventLogisticaTab').then(m => ({ default: m.EventLogisticaTab })))
const EventCostiTab = lazy(() => import('../../components/eventi/EventCostiTab').then(m => ({ default: m.EventCostiTab })))
const EventTavoliTab = lazy(() => import('../../components/eventi/EventTavoliTab').then(m => ({ default: m.EventTavoliTab })))
const EventDocumentiTab = lazy(() => import('../../components/eventi/EventDocumentiTab').then(m => ({ default: m.EventDocumentiTab })))
const EventComplianceTab = lazy(() => import('../../components/eventi/EventComplianceTab').then(m => ({ default: m.EventComplianceTab })))
const EventPackingList = lazy(() => import('../../components/eventi/EventPackingList').then(m => ({ default: m.EventPackingList })))
const ComingSoon = lazy(() => import('../../components/ui/ComingSoon').then(m => ({ default: m.ComingSoon })))

function getVisibleTabs(event, profile, permissions) {
  const ruolo = profile?.ruolo
  const isUfficio = ['admin', 'direzione', 'ufficio'].includes(ruolo)
  const modalita = event.modalita

  const tabs = [{ id: 'info', label: 'Info' }]

  if (TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento)) {
    tabs.push({ id: 'tavoli', label: 'Tavoli' })
  }
  tabs.push({ id: 'programma', label: 'Programma' })
  if (modalita !== 'contributo') {
    tabs.push({ id: 'materiale', label: 'Materiale & Gadget' })
  }
  tabs.push({ id: 'logistica', label: 'Persone' })
  if (permissions.includes('gestione_costi') || permissions.includes('approva_preventivi')) {
    tabs.push({ id: 'costi', label: 'Costi' })
  }
  tabs.push({ id: 'documenti', label: 'Documenti' })
  tabs.push({ id: 'preparazione', label: 'Preparazione' })
  if (permissions.includes('compliance')) {
    tabs.push({ id: 'compliance', label: 'Compliance' })
  }
  if (isUfficio) {
    tabs.push({ id: 'report', label: 'Report' })
  }

  return tabs
}


const READINESS_DETAIL_STATES = new Set(['confermato', 'in_preparazione', 'pronto', 'in_corso'])
const READINESS_COLOR = { green: 'text-green-600', yellow: 'text-yellow-600', red: 'text-red-600', gray: 'text-gray-400' }
const READINESS_DOT = { green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500', gray: 'bg-gray-300' }

function computeDetailReadiness({ eventActivities, eventMaterials, preventivi, hotels, trasporti }) {
  const today = todayISO()
  const areas = []

  // Attivita
  const vis = eventActivities.filter(a => a.stato !== 'disattivata')
  const attComp = vis.filter(a => a.stato === 'completata').length
  const attOverdue = vis.filter(a => a.obbligatoria && a.deadline && a.deadline < today && a.stato !== 'completata').length
  if (vis.length === 0) areas.push({ icon: CATEGORIA_ICONS.organizzazione, label: 'Attivita', color: 'gray', text: 'Nessuna', tab: 'preparazione' })
  else if (attOverdue > 0) areas.push({ icon: CATEGORIA_ICONS.organizzazione, label: 'Attivita', color: 'red', text: `${attOverdue} in ritardo`, tab: 'preparazione' })
  else if (attComp < vis.length) areas.push({ icon: CATEGORIA_ICONS.organizzazione, label: 'Attivita', color: 'yellow', text: `${vis.length - attComp}/${vis.length}`, tab: 'preparazione' })
  else areas.push({ icon: CATEGORIA_ICONS.organizzazione, label: 'Attivita', color: 'green', text: `${vis.length}/${vis.length}`, tab: 'preparazione' })

  // Materiale
  const matRif = eventMaterials.filter(m => m.stato === 'rifiutato').length
  const matReq = eventMaterials.filter(m => m.stato === 'richiesto').length
  if (eventMaterials.length === 0) areas.push({ icon: MATERIALE_ICONS.package, label: 'Materiale', color: 'gray', text: 'Nessuno', tab: 'materiale' })
  else if (matRif > 0) areas.push({ icon: MATERIALE_ICONS.package, label: 'Materiale', color: 'red', text: `${matRif} rifiutati`, tab: 'materiale' })
  else if (matReq > 0) areas.push({ icon: MATERIALE_ICONS.package, label: 'Materiale', color: 'yellow', text: `${matReq} da confermare`, tab: 'materiale' })
  else areas.push({ icon: MATERIALE_ICONS.package, label: 'Materiale', color: 'green', text: 'Confermato', tab: 'materiale' })

  // Logistica
  const hConf = hotels.filter(h => h.stato === 'confermato').length
  const tConf = trasporti.filter(t => t.stato === 'confermato').length
  const logTotal = hotels.length + trasporti.length
  const logPending = logTotal - hConf - tConf
  if (logTotal === 0) areas.push({ icon: DETAIL_NAV_ICONS.logistica, label: 'Logistica', color: 'gray', text: 'Nessuna', tab: 'logistica' })
  else if (logPending > 0) areas.push({ icon: DETAIL_NAV_ICONS.logistica, label: 'Logistica', color: 'yellow', text: `${logPending} da confermare`, tab: 'logistica' })
  else areas.push({ icon: DETAIL_NAV_ICONS.logistica, label: 'Logistica', color: 'green', text: 'Confermata', tab: 'logistica' })

  // Costi
  const cosRif = preventivi.filter(p => p.stato === 'rifiutato').length
  const cosPend = preventivi.filter(p => ['in_attesa', 'in_revisione'].includes(p.stato)).length
  if (preventivi.length === 0) areas.push({ icon: COSTI_ICONS.costo, label: 'Costi', color: 'gray', text: 'Nessuno', tab: 'costi' })
  else if (cosRif > 0) areas.push({ icon: COSTI_ICONS.costo, label: 'Costi', color: 'red', text: `${cosRif} rifiutati`, tab: 'costi' })
  else if (cosPend > 0) areas.push({ icon: COSTI_ICONS.costo, label: 'Costi', color: 'yellow', text: `${cosPend} in attesa`, tab: 'costi' })
  else areas.push({ icon: COSTI_ICONS.costo, label: 'Costi', color: 'green', text: 'Approvati', tab: 'costi' })

  return areas
}

const VALID_TABS = ['info', 'tavoli', 'programma', 'materiale', 'logistica', 'costi', 'documenti', 'preparazione', 'compliance', 'report']

export function EventiDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const fetchEvent = useEventsStore(s => s.fetchEvent)
  const profile = useAuthStore(s => s.profile)
  const permissions = useAuthStore(s => s.permissions)
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const staff = useStaffStore(s => s.staff)
  const fetchEventStaff = useStaffStore(s => s.fetchEventStaff)
  const participants = useParticipantsStore(s => s.participants)
  const fetchEventParticipants = useParticipantsStore(s => s.fetchEventParticipants)
  const hotels = useLogisticsStore(s => s.hotels)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const fetchEventLogistics = useLogisticsStore(s => s.fetchEventLogistics)
  const eventActivities = useActivitiesStore(s => s.eventActivities)
  const fetchEventActivities = useActivitiesStore(s => s.fetchEventActivities)
  const tavoli = useTavoliStore(s => s.tavoli)
  const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
  const eventMaterials = useMaterialsStore(s => s.eventMaterials)
  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
  const fetchEventPreventivi = useCostsStore(s => s.fetchEventPreventivi)
  const preventivi = useCostsStore(s => s.preventivi)
  const addToast = useToastStore(s => s.add)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const initialTab = (tabFromUrl && VALID_TABS.includes(tabFromUrl)) ? tabFromUrl : 'info'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showPackingList, setShowPackingList] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchEvent(id).then(({ data, error }) => {
      setEvent(data)
      setError(error)
      setLoading(false)
      // Auto-select Preparazione tab for events in preparation (only if no tab specified in URL)
      if (!tabFromUrl && data && ['in_preparazione', 'pronto'].includes(data.stato)) {
        setActiveTab('preparazione')
      }
    })
  }, [id])

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    if (event?.id) {
      fetchEventStaff(event.id)
      fetchEventParticipants(event.id)
      fetchEventLogistics(event.id)
      fetchEventActivities(event.id)
      fetchEventTavoli(event.id)
      fetchEventMaterialList(event.id)
      fetchEventPreventivi(event.id)
    }
  }, [event?.id])

  if (loading) return <LoadingSkeleton lines={8} />
  if (error || !event) {
    return <EmptyState title="Evento non trovato" description={error || 'L\'evento richiesto non esiste o non hai accesso.'} />
  }

  function computeTabStatus() {
    const statuses = {}

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

    // Persone & Logistica (merged tab)
    const totalPeople = staff.length + participants.length
    if (totalPeople > 0) {
      const staffConfirmed = staff.every(s => s.confermato)
      const partConfirmed = participants.every(p => p.stato_iscrizione === 'confermato' || p.stato_iscrizione === 'presente')
      const hotelConfirmed = hotels.filter(h => h.stato === 'confermato').length
      const andataConfirmed = trasporti.filter(t => t.direzione === 'andata' && t.stato === 'confermato').length
      const ritornoConfirmed = trasporti.filter(t => t.direzione === 'ritorno' && t.stato === 'confermato').length
      const peopleOk = staffConfirmed && partConfirmed
      const logisticsOk = hotelConfirmed >= totalPeople && andataConfirmed >= totalPeople && ritornoConfirmed >= totalPeople
      statuses.logistica = (peopleOk && logisticsOk) ? 'complete' : 'warning'
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

  const readinessAreas = READINESS_DETAIL_STATES.has(event.stato)
    ? computeDetailReadiness({ eventActivities, eventMaterials, preventivi, hotels, trasporti })
    : null

  const DOSSIER_STATES = ['confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']

  const handleGenerateDossier = async () => {
    setGenerating(true)
    try {
      // Fetch all data in parallel to ensure freshness
      const [matRes, subActRes] = await Promise.all([
        fetchEventMaterialList(event.id),
        useSubActivitiesStore.getState().fetchEventSubActivities(event.id),
        fetchEventStaff(event.id),
        fetchEventParticipants(event.id),
        fetchEventLogistics(event.id),
        fetchEventPreventivi(event.id),
      ])
      // Read fresh data from stores
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
      doc.save(`dossier_${event.titolo.replace(/\s+/g, '_')}_${todayISO()}.pdf`)
      addToast('Dossier PDF generato', 'success')
    } catch {
      addToast('Errore nella generazione del dossier', 'error')
    }
    setGenerating(false)
  }

  return (
    <div>
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: event.titolo },
        ]} />
      </div>
      <MobileHeader title={event.titolo} subtitle={subtitle} />

      <div className="hidden md:block px-6 pt-5">
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
        <div className="px-4 md:px-6 py-3 md:py-5">
          <EventPackingList event={event} onBack={() => setShowPackingList(false)} />
        </div>
      ) : (
        <>
          {readinessAreas && (
            <div className="px-4 md:px-6 mt-3">
              <div className={SUMMARY_BAR_STYLE + ' flex flex-wrap gap-1'}>
                {readinessAreas.map(a => (
                  <button
                    key={a.tab}
                    type="button"
                    onClick={() => setActiveTab(a.tab)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg min-h-[48px] transition-colors hover:bg-white/60 ${
                      activeTab === a.tab ? 'bg-white shadow-sm ring-1 ring-gray-200' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${READINESS_DOT[a.color]}`} />
                    <Icon icon={a.icon} size={16} className={READINESS_COLOR[a.color]} />
                    <span className="text-sm text-gray-700 font-medium">{a.label}</span>
                    <span className={`text-sm ${READINESS_COLOR[a.color]}`}>{a.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sticky top-[73px] md:static z-20 bg-white px-4 md:px-6 mt-4 md:mt-4">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          <div className="px-4 md:px-6 py-3 md:py-5">
            <Suspense fallback={<LoadingSkeleton lines={5} />}>
              {activeTab === 'info' && <EventInfoTab event={event} onUpdate={refreshEvent} />}
              {activeTab === 'tavoli' && <EventTavoliTab event={event} staff={staff} participants={participants} />}
              {activeTab === 'programma' && <EventProgrammaTab event={event} />}
              {activeTab === 'materiale' && <EventMaterialList event={event} onShowPackingList={() => setShowPackingList(true)} onUpdate={refreshEvent} />}
              {activeTab === 'logistica' && <EventLogisticaTab event={event} users={users} />}
              {activeTab === 'costi' && <EventCostiTab event={event} />}
              {activeTab === 'documenti' && <EventDocumentiTab event={event} onShowPackingList={() => setShowPackingList(true)} />}
              {activeTab === 'compliance' && <EventComplianceTab event={event} />}
              {activeTab === 'preparazione' && <EventPreparazioneTab event={event} onShowPackingList={() => setShowPackingList(true)} onUpdate={refreshEvent} />}
              {activeTab === 'report' && <ComingSoon title="Report post-evento" description="I report saranno disponibili nella prossima versione." />}
            </Suspense>
          </div>
        </>
      )}
    </div>
  )
}
