import { useEffect } from 'react'
import { useAuthStore } from '../../hooks/useAuth'
import { useDashboardCommercialeStore } from '../../hooks/useDashboardCommerciale'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { QuickActions } from '../../components/dashboard/QuickActions'
import { MyEventsSection } from '../../components/dashboard/MyEventsSection'
import { MyActivitiesSection } from '../../components/dashboard/MyActivitiesSection'
import { ParticipantConfirmation } from '../../components/dashboard/ParticipantConfirmation'
import { ZoneSummary } from '../../components/dashboard/ZoneSummary'
import { RecentContacts } from '../../components/dashboard/RecentContacts'

export function DashboardCommerciale() {
  const profile = useAuthStore(s => s.profile)
  const myEvents = useDashboardCommercialeStore(s => s.myEvents)
  const myActivities = useDashboardCommercialeStore(s => s.myActivities)
  const participantStats = useDashboardCommercialeStore(s => s.participantStats)
  const zoneSummary = useDashboardCommercialeStore(s => s.zoneSummary)
  const recentContacts = useDashboardCommercialeStore(s => s.recentContacts)
  const loading = useDashboardCommercialeStore(s => s.loading)
  const fetchAll = useDashboardCommercialeStore(s => s.fetchAll)

  useEffect(() => {
    if (profile?.id) fetchAll(profile.id, profile.ruolo, profile)
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
        {loading ? <LoadingSkeleton lines={8} /> : (
          <>
            <QuickActions />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MyEventsSection events={myEvents} />
              <MyActivitiesSection activities={myActivities} />
            </div>
            <ParticipantConfirmation participantStats={participantStats} />
            <ZoneSummary zoneSummary={zoneSummary} />
            <RecentContacts contacts={recentContacts} />
          </>
        )}
      </div>
    </div>
  )
}
