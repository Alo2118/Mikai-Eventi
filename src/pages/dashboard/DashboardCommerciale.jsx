import { useEffect, useState } from 'react'
import { useAuthStore } from '../../hooks/useAuth'
import { useDashboardCommercialeStore } from '../../hooks/useDashboardCommerciale'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { QuickActions } from '../../components/dashboard/QuickActions'
import { MyEventsSection } from '../../components/dashboard/MyEventsSection'
import { MyActivitiesSection } from '../../components/dashboard/MyActivitiesSection'
import { ParticipantConfirmation } from '../../components/dashboard/ParticipantConfirmation'
import { ZoneSummary } from '../../components/dashboard/ZoneSummary'
import { RecentContacts } from '../../components/dashboard/RecentContacts'
import { AgentInventorySection } from '../../components/dashboard/AgentInventorySection'
import { CARD_STYLE } from '../../lib/constants'

export function DashboardCommerciale() {
  const profile = useAuthStore(s => s.profile)
  const myEvents = useDashboardCommercialeStore(s => s.myEvents)
  const myActivities = useDashboardCommercialeStore(s => s.myActivities)
  const participantStats = useDashboardCommercialeStore(s => s.participantStats)
  const zoneSummary = useDashboardCommercialeStore(s => s.zoneSummary)
  const recentContacts = useDashboardCommercialeStore(s => s.recentContacts)
  const loading = useDashboardCommercialeStore(s => s.loading)
  const error = useDashboardCommercialeStore(s => s.error)
  const fetchAll = useDashboardCommercialeStore(s => s.fetchAll)
  const fetchAgentInventory = useMaterialsStore(s => s.fetchAgentInventory)
  const [inventory, setInventory] = useState([])

  useEffect(() => {
    if (profile?.id) {
      fetchAll(profile.id, profile.ruolo, profile)
      fetchAgentInventory(profile.id).then(r => setInventory(r.data || []))
    }
  }, [profile?.id])

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Dashboard" showBack={false} />
      </div>
      <PageHeader
        title={`Ciao, ${profile?.nome || ''}`}
        subtitle="La tua area di lavoro"
      />
      <div className="px-4 md:px-8 space-y-6 pb-8">
        {loading ? <LoadingSkeleton lines={8} /> : error ? (
          <EmptyState title="Errore nel caricamento" description={error} />
        ) : (
          <>
            <QuickActions />
            {(profile?.ruolo === 'commerciale' || profile?.ruolo === 'area_manager') && (
              <AgentInventorySection />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MyEventsSection events={myEvents} />
              <MyActivitiesSection activities={myActivities} />
            </div>
            <ParticipantConfirmation participantStats={participantStats} />
            <ZoneSummary zoneSummary={zoneSummary} />
            <RecentContacts contacts={recentContacts} />
            {inventory.length > 0 && (
              <div className={CARD_STYLE + ' space-y-3'}>
                <h3 className="font-semibold text-lg">Il mio inventario</h3>
                <div className="space-y-2">
                  {inventory.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-base font-medium text-gray-900">{item.product?.nome}</p>
                        {item.product?.brand?.nome && <p className="text-sm text-gray-500">{item.product.brand.nome}</p>}
                      </div>
                      <span className="text-lg font-semibold text-mikai-600">{item.quantita} pz</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
