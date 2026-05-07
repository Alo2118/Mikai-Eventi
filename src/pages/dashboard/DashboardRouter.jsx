import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'

// Lazy: ognuno carica solo quando il ruolo dell'utente lo richiede.
// DashboardStrategica importa recharts (~170 kB) — non deve finire nel chunk dei commerciali.
const DashboardStrategica = lazy(() =>
  import('./DashboardStrategica').then(m => ({ default: m.DashboardStrategica }))
)
const DashboardOperativa = lazy(() =>
  import('./DashboardOperativa').then(m => ({ default: m.DashboardOperativa }))
)
const DashboardCommerciale = lazy(() =>
  import('./DashboardCommerciale').then(m => ({ default: m.DashboardCommerciale }))
)

export function DashboardRouter() {
  const profile = useAuthStore(s => s.profile)
  const permissions = useAuthStore(s => s.permissions)
  const loading = useAuthStore(s => s.loading)

  if (loading || !profile) return <LoadingSkeleton lines={6} />

  const ruolo = profile.ruolo
  const fallback = <LoadingSkeleton lines={6} />

  if (ruolo === 'direzione' || ruolo === 'admin') {
    return <Suspense fallback={fallback}><DashboardStrategica /></Suspense>
  }
  if (ruolo === 'ufficio') {
    const hasWarehouse = permissions.includes('gestione_spedizioni') || permissions.includes('gestione_magazzino')
    const hasOther = permissions.some(p => p.startsWith('gestione_') && p !== 'gestione_spedizioni' && p !== 'gestione_magazzino')
    return <Suspense fallback={fallback}><DashboardOperativa warehouseOnly={hasWarehouse && !hasOther} /></Suspense>
  }
  if (ruolo === 'commerciale' || ruolo === 'area_manager') {
    return <Suspense fallback={fallback}><DashboardCommerciale /></Suspense>
  }
  return <Navigate to="/eventi" replace />
}
