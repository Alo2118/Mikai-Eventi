import { useState, useEffect, useRef, lazy, Suspense } from 'react'
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
import { useDocumentsStore } from '../../hooks/useDocuments'
import { useTavoliStore } from '../../hooks/useTavoli'
import { TIPI_EVENTO_CON_TAVOLI } from '../../lib/constants'
import { useEventTypes } from '../../hooks/useEventTypes'
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
import { EventStatusFlow } from '../../components/eventi/EventStatusFlow'
import { EventApprovalBar } from '../../components/eventi/EventApprovalBar'

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
    tabs.push({ id: 'materiale', label: 'Materiale' })
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

function computeDetailReadiness({ eventActivities, eventMaterials, preventivi, hotels, trasporti, staff, participants }) {
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

  // Persone & Logistica (count unique person+direction, not raw records)
  const totalPeople = (staff?.length || 0) + (participants?.length || 0)
  const hConf = hotels.filter(h => h.stato === 'confermato' || h.stato === 'non_necessario').length
  const tPersonDir = new Set(trasporti.map(t => `${t.user_id || t.contact_id}-${t.direzione}`))
  const tConfPersonDir = new Set(trasporti.filter(t => t.stato === 'confermato' || t.stato === 'non_necessario').map(t => `${t.user_id || t.contact_id}-${t.direzione}`))
  const logTotal = hotels.length + tPersonDir.size
  const logPending = logTotal - hConf - tConfPersonDir.size
  if (totalPeople === 0) {
    areas.push({ icon: DETAIL_NAV_ICONS.logistica, label: 'Persone', color: 'gray', text: 'Nessuna', tab: 'logistica' })
  } else if (logTotal === 0) {
    areas.push({ icon: DETAIL_NAV_ICONS.logistica, label: 'Persone', color: 'yellow', text: `${totalPeople} senza logistica`, tab: 'logistica' })
  } else if (logPending > 0) {
    areas.push({ icon: DETAIL_NAV_ICONS.logistica, label: 'Persone', color: 'yellow', text: `${logPending} da confermare`, tab: 'logistica' })
  } else {
    areas.push({ icon: DETAIL_NAV_ICONS.logistica, label: 'Persone', color: 'green', text: `${totalPeople} ok`, tab: 'logistica' })
  }

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
  const { labels: tipoLabels } = useEventTypes()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const initialTab = (tabFromUrl && VALID_TABS.includes(tabFromUrl)) ? tabFromUrl : 'info'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showPackingList, setShowPackingList] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [showTabBanner, setShowTabBanner] = useState(false)
  const bannerShownRef = useRef(false)
  const legendRef = useRef(null)

  // Close legend popover on outside click
  useEffect(() => {
    if (!showLegend) return
    function handleClick(e) {
      if (legendRef.current && !legendRef.current.contains(e.target)) setShowLegend(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showLegend])

  useEffect(() => {
    setLoading(true)
    fetchEvent(id).then(({ data, error }) => {
      setEvent(data)
      setError(error?.message || error)
      setLoading(false)
      if (!tabFromUrl && data && ['in_preparazione', 'pronto'].includes(data.stato)) {
        setActiveTab('preparazione')
        if (!bannerShownRef.current) {
          bannerShownRef.current = true
          setShowTabBanner(true)
          setTimeout(() => setShowTabBanner(false), 4000)
        }
      }
    }).catch(err => {
      setError('Errore nel caricamento dell\'evento.')
      setLoading(false)
    })
  }, [id])

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    if (event?.id) {
      Promise.all([
        fetchEventStaff(event.id),
        fetchEventParticipants(event.id),
        fetchEventLogistics(event.id),
        fetchEventActivities(event.id),
        fetchEventTavoli(event.id),
        fetchEventMaterialList(event.id),
        fetchEventPreventivi(event.id),
      ])
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
      const hotelConfirmed = hotels.filter(h => h.stato === 'confermato' || h.stato === 'non_necessario').length
      // Count unique persons with all legs confirmed per direction
      const andataPersons = new Set(trasporti.filter(t => t.direzione === 'andata').map(t => t.user_id || t.contact_id))
      const andataAllOk = [...andataPersons].filter(pid =>
        trasporti.filter(t => t.direzione === 'andata' && (t.user_id === pid || t.contact_id === pid))
          .every(t => t.stato === 'confermato' || t.stato === 'non_necessario')
      ).length
      const ritornoPersons = new Set(trasporti.filter(t => t.direzione === 'ritorno').map(t => t.user_id || t.contact_id))
      const ritornoAllOk = [...ritornoPersons].filter(pid =>
        trasporti.filter(t => t.direzione === 'ritorno' && (t.user_id === pid || t.contact_id === pid))
          .every(t => t.stato === 'confermato' || t.stato === 'non_necessario')
      ).length
      const peopleOk = staffConfirmed && partConfirmed
      const logisticsOk = hotelConfirmed >= totalPeople && andataAllOk >= totalPeople && ritornoAllOk >= totalPeople
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
  const readinessAreas = READINESS_DETAIL_STATES.has(event.stato)
    ? computeDetailReadiness({ eventActivities, eventMaterials, preventivi, hotels, trasporti, staff, participants })
    : null

  // Build readiness detail map: tab id → { text, color }
  const readinessMap = {}
  if (readinessAreas) {
    readinessAreas.forEach(a => { readinessMap[a.tab] = { text: a.text, color: a.color } })
  }

  const tabs = getVisibleTabs(event, profile, permissions).map(tab => ({
    ...tab,
    status: tabStatuses[tab.id],
    detail: readinessMap[tab.id] || null,
  }))
  const subtitle = `${tipoLabels[event.tipo_evento] || event.tipo_evento} \u00B7 ${formatDateRange(event.data_inizio, event.data_fine)}${event.luogo ? ` \u00B7 ${event.luogo}` : ''}`

  const refreshEvent = () => {
    fetchEvent(id)
      .then(({ data, error }) => {
        if (data) setEvent(data)
        if (error) addToast('Errore durante l\'aggiornamento.', 'error')
      })
      .catch(() => addToast('Errore durante l\'aggiornamento.', 'error'))
  }

  const DOSSIER_STATES = ['confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']

  const handleGenerateDossier = async () => {
    setGenerating(true)
    try {
      // Fetch all data in parallel — use return values directly (no getState())
      const [matRes, subActRes, staffRes, partRes, , prevRes, docRes] = await Promise.all([
        fetchEventMaterialList(event.id),
        useSubActivitiesStore.getState().fetchEventSubActivities(event.id),
        fetchEventStaff(event.id),
        fetchEventParticipants(event.id),
        fetchEventLogistics(event.id),
        fetchEventPreventivi(event.id),
        useDocumentsStore.getState().fetchEventDocuments(event.id),
      ])
      // For logistics, read from store since fetchEventLogistics doesn't return data directly
      const freshHotels = useLogisticsStore.getState().hotels
      const freshTrasporti = useLogisticsStore.getState().trasporti

      const doc = await generateEventDossier({
        event,
        staff: staffRes?.data || [],
        participants: partRes?.data || [],
        subActivities: subActRes?.data || [],
        materials: matRes?.data || [],
        hotels: freshHotels,
        trasporti: freshTrasporti,
        preventivi: prevRes?.data || [],
        activities: eventActivities,
        documents: docRes?.data || [],
        permissions,
      })
      doc.save(`riepilogo_${event.titolo.replace(/\s+/g, '_')}_${todayISO()}.pdf`)
      addToast('Riepilogo evento generato', 'success')
    } catch {
      addToast('Errore nella generazione del riepilogo', 'error')
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

      <div className="hidden md:flex items-center justify-between gap-4 px-6 pt-3 pb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">{event.titolo}</h1>
            {event.certificato_previsto && (
              <span className="shrink-0 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">Certificato</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {DOSSIER_STATES.includes(event.stato) && (
          <Button variant="secondary" onClick={handleGenerateDossier} loading={generating} className="shrink-0">
            <Icon icon={DOCUMENTO_ICONS.dossier} size={16} className="mr-1.5" />
            Riepilogo
          </Button>
        )}
      </div>

      {/* Status flow — sempre visibile, su tutte le tab */}
      {!showPackingList && (
        <div className="px-4 md:px-6 pb-2 space-y-2">
          <EventApprovalBar event={event} onUpdate={refreshEvent} />
          <EventStatusFlow
            event={event}
            onUpdate={refreshEvent}
            canAdvance={(() => {
              if (!['confermato', 'in_preparazione', 'pronto', 'in_corso'].includes(event.stato)) return false
              if (event.stato === 'in_preparazione') {
                const mandatoryIncomplete = eventActivities.filter(a => a.obbligatoria && a.stato !== 'completata' && a.stato !== 'disattivata')
                const hasMat = eventMaterials.filter(m => m.stato !== 'rifiutato').length > 0
                const shipped = event.modalita === 'contributo' || !!event.spedizione_data
                return mandatoryIncomplete.length === 0 && (!hasMat || shipped)
              }
              return true
            })()}
            blockerText={(() => {
              if (event.stato !== 'in_preparazione') return null
              const mandatoryIncomplete = eventActivities.filter(a => a.obbligatoria && a.stato !== 'completata' && a.stato !== 'disattivata')
              const hasMat = eventMaterials.filter(m => m.stato !== 'rifiutato').length > 0
              const shipped = event.modalita === 'contributo' || !!event.spedizione_data
              if (mandatoryIncomplete.length > 0 && hasMat && !shipped) return 'Completa le attività e registra la spedizione'
              if (mandatoryIncomplete.length > 0) return 'Completa le attività obbligatorie'
              if (hasMat && !shipped) return 'Registra la spedizione del materiale'
              return null
            })()}
            hasContent={eventActivities.length > 0 || eventMaterials.filter(m => m.stato !== 'rifiutato').length > 0 || staff.length > 0 || participants.length > 0}
          />
        </div>
      )}

      {showPackingList ? (
        <div className="px-4 md:px-6 py-3 md:py-5">
          <EventPackingList event={event} onBack={() => setShowPackingList(false)} />
        </div>
      ) : (
        <>
          {showTabBanner && (
            <div
              className="mx-4 md:mx-6 mt-3 bg-mikai-50 border border-mikai-200 rounded-lg px-4 py-2.5 text-sm text-mikai-700 flex items-center justify-between cursor-pointer"
              onClick={() => setShowTabBanner(false)}
              role="status"
            >
              <span className="flex items-center gap-2">
                <Icon icon={FEEDBACK_ICONS.info} size={16} className="text-mikai-500" />
                Tab Preparazione selezionata in base allo stato dell'evento
              </span>
              <Icon icon={DETAIL_ACTION_ICONS.close} size={16} className="text-mikai-400" />
            </div>
          )}
          <div className="sticky top-[73px] md:static z-20 bg-white px-4 md:px-6 mt-2 md:mt-1">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
              </div>
              <div ref={legendRef} className="relative flex-shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => setShowLegend(v => !v)}
                  className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-mikai-500 transition-colors"
                  aria-label="Legenda pallini stato"
                  title="Legenda pallini stato"
                >
                  <Icon icon={FEEDBACK_ICONS.info} size={18} />
                </button>
                {showLegend && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 text-sm space-y-1.5">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> <span className="text-gray-700">Completato</span></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> <span className="text-gray-700">In corso</span></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> <span className="text-gray-700">Attenzione richiesta</span></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> <span className="text-gray-700">Da iniziare</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 md:px-6 py-3">
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
