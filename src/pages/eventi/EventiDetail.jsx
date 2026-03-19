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
import { EventMaterialsTab } from '../../components/eventi/EventMaterialsTab'
import { EventPreparazioneTab } from '../../components/eventi/EventPreparazioneTab'
import { TIPO_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

function getVisibleTabs(event, profile, permissions) {
  const ruolo = profile?.ruolo
  const isUfficio = ['admin', 'direzione', 'ufficio'].includes(ruolo)
  const modalita = event.modalita

  const tabs = [{ id: 'info', label: 'Info' }]

  if (isUfficio && modalita !== 'contributo') {
    tabs.push({ id: 'staff', label: 'Staff' })
  }
  if (isUfficio && modalita === 'interno') {
    tabs.push({ id: 'partecipanti', label: 'Partecipanti' })
  }
  if (modalita !== 'contributo') {
    tabs.push({ id: 'materiale', label: 'Materiale & Gadget' })
  }
  if (isUfficio && (modalita === 'interno' || modalita === 'esterno')) {
    tabs.push({ id: 'subattivita', label: 'Sotto-attivita\'' })
    tabs.push({ id: 'logistica', label: 'Logistica' })
  }
  if (permissions.includes('gestione_costi')) {
    tabs.push({ id: 'costi', label: 'Costi' })
  }
  tabs.push({ id: 'documenti', label: 'Documenti' })
  tabs.push({ id: 'preparazione', label: 'Preparazione' })
  if (isUfficio) {
    tabs.push({ id: 'report', label: 'Report' })
  }

  return tabs
}

function PlaceholderTab({ name }) {
  return (
    <div className="py-12 text-center text-gray-400 text-base">
      {name} — In costruzione (Phase 3-5)
    </div>
  )
}

export function EventiDetail() {
  const { id } = useParams()
  const fetchEvent = useEventsStore(s => s.fetchEvent)
  const profile = useAuthStore(s => s.profile)
  const permissions = useAuthStore(s => s.permissions)
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

  if (loading) return <LoadingSkeleton lines={8} />
  if (error || !event) {
    return <EmptyState title="Evento non trovato" description={error || 'L\'evento richiesto non esiste o non hai accesso.'} />
  }

  const tabs = getVisibleTabs(event, profile, permissions)
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
      </div>

      <div className="mt-4 px-4 md:px-8">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 md:px-8 py-5">
        {activeTab === 'info' && <EventInfoTab event={event} onUpdate={refreshEvent} />}
        {activeTab === 'staff' && <PlaceholderTab name="Staff" />}
        {activeTab === 'partecipanti' && <PlaceholderTab name="Partecipanti" />}
        {activeTab === 'materiale' && <EventMaterialsTab event={event} />}
        {activeTab === 'subattivita' && <PlaceholderTab name="Sotto-attivita'" />}
        {activeTab === 'logistica' && <PlaceholderTab name="Logistica" />}
        {activeTab === 'costi' && <PlaceholderTab name="Costi" />}
        {activeTab === 'documenti' && <PlaceholderTab name="Documenti" />}
        {activeTab === 'preparazione' && <EventPreparazioneTab event={event} />}
        {activeTab === 'report' && <PlaceholderTab name="Report post-evento" />}
      </div>
    </div>
  )
}
