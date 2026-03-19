import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { DashboardOperativa } from './DashboardOperativa'
import { DashboardStrategica } from './DashboardStrategica'

export function DashboardRouter() {
  const profile = useAuthStore(s => s.profile)
  const permissions = useAuthStore(s => s.permissions)
  const loading = useAuthStore(s => s.loading)

  if (loading) return <LoadingSkeleton lines={6} />
  if (!profile) return <Navigate to="/login" replace />

  const ruolo = profile.ruolo
  if (ruolo === 'direzione' || ruolo === 'admin') return <DashboardStrategica />
  if (ruolo === 'ufficio') {
    const hasWarehouse = permissions.includes('gestione_spedizioni') || permissions.includes('gestione_magazzino')
    const hasOther = permissions.some(p => p.startsWith('gestione_') && p !== 'gestione_spedizioni' && p !== 'gestione_magazzino')
    return <DashboardOperativa warehouseOnly={hasWarehouse && !hasOther} />
  }
  return <Navigate to="/eventi" replace />
}
