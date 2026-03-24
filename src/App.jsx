import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/auth/Login'
import { LoadingSkeleton } from './components/ui/LoadingSkeleton'
import { EventiList } from './pages/eventi/EventiList'
import { EventiDetail } from './pages/eventi/EventiDetail'
import { EventiWizard } from './pages/eventi/EventiWizard'
import { EventiCalendar } from './pages/eventi/EventiCalendar'
import { MaterialeList } from './pages/materiale/MaterialeList'
import { MaterialeDetail } from './pages/materiale/MaterialeDetail'
import { AdminBrand } from './pages/admin/AdminBrand'
import { AdminDistretti } from './pages/admin/AdminDistretti'
import { AdminProdotti } from './pages/admin/AdminProdotti'
import { AdminMateriali } from './pages/admin/AdminMateriali'
import { AdminSedi } from './pages/admin/AdminSedi'
import { AdminZone } from './pages/admin/AdminZone'
import { AdminUtenti } from './pages/admin/AdminUtenti'
import { DashboardRouter } from './pages/dashboard/DashboardRouter'
import { MieAttivitaPage } from './pages/attivita/MieAttivitaPage'
import { LogisticaPage } from './pages/logistica/LogisticaPage'
import { ContattiList } from './pages/contatti/ContattiList'
import { ContattiDetail } from './pages/contatti/ContattiDetail'
import { CostiPage } from './pages/costi/CostiPage'
import { AdminSottoAttivita } from './pages/admin/AdminSottoAttivita'
import { ComingSoon } from './components/ui/ComingSoon'
import { AdminTemplate } from './pages/admin/AdminTemplate'

function ProtectedRoute({ children }) {
  const session = useAuthStore(s => s.session)
  const loading = useAuthStore(s => s.loading)

  if (loading) return <LoadingSkeleton lines={5} />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => { initialize() }, [initialize])

  return (
    <ErrorBoundary>
    <BrowserRouter basename="/Eventi">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardRouter />} />
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/mie-attivita" element={<MieAttivitaPage />} />
          <Route path="/logistica" element={<LogisticaPage />} />
          <Route path="/eventi" element={<EventiList />} />
          <Route path="/eventi/nuovo" element={<EventiWizard />} />
          <Route path="/eventi/calendario" element={<EventiCalendar />} />
          <Route path="/eventi/:id" element={<EventiDetail />} />
          <Route path="/notifiche" element={<ComingSoon title="Notifiche" description="Le notifiche in tempo reale saranno disponibili nella prossima versione." />} />
          <Route path="/materiale" element={<MaterialeList />} />
          <Route path="/materiale/:id" element={<MaterialeDetail />} />
          <Route path="/admin/brand" element={<AdminBrand />} />
          <Route path="/admin/distretti" element={<AdminDistretti />} />
          <Route path="/admin/prodotti" element={<AdminProdotti />} />
          <Route path="/admin/materiali" element={<AdminMateriali />} />
          <Route path="/admin/sedi" element={<AdminSedi />} />
          <Route path="/admin/zone" element={<AdminZone />} />
          <Route path="/contatti" element={<ContattiList />} />
          <Route path="/contatti/:id" element={<ContattiDetail />} />
          <Route path="/costi" element={<CostiPage />} />
          <Route path="/admin/sotto-attivita" element={<AdminSottoAttivita />} />
          <Route path="/admin/template" element={<AdminTemplate />} />
          <Route path="/admin/utenti" element={<AdminUtenti />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
