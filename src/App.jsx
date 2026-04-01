import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/auth/Login'
import { LoadingSkeleton } from './components/ui/LoadingSkeleton'

// Lazy-loaded pages — each becomes its own chunk
const EventiList = lazy(() => import('./pages/eventi/EventiList').then(m => ({ default: m.EventiList })))
const EventiDetail = lazy(() => import('./pages/eventi/EventiDetail').then(m => ({ default: m.EventiDetail })))
const EventiWizard = lazy(() => import('./pages/eventi/EventiWizard').then(m => ({ default: m.EventiWizard })))
const EventiCalendar = lazy(() => import('./pages/eventi/EventiCalendar').then(m => ({ default: m.EventiCalendar })))
const MaterialeList = lazy(() => import('./pages/materiale/MaterialeList').then(m => ({ default: m.MaterialeList })))
const MaterialeDetail = lazy(() => import('./pages/materiale/MaterialeDetail').then(m => ({ default: m.MaterialeDetail })))
const AdminBrand = lazy(() => import('./pages/admin/AdminBrand').then(m => ({ default: m.AdminBrand })))
const AdminDistretti = lazy(() => import('./pages/admin/AdminDistretti').then(m => ({ default: m.AdminDistretti })))
const AdminProdotti = lazy(() => import('./pages/admin/AdminProdotti').then(m => ({ default: m.AdminProdotti })))
const AdminSedi = lazy(() => import('./pages/admin/AdminSedi').then(m => ({ default: m.AdminSedi })))
const AdminZone = lazy(() => import('./pages/admin/AdminZone').then(m => ({ default: m.AdminZone })))
const AdminUtenti = lazy(() => import('./pages/admin/AdminUtenti').then(m => ({ default: m.AdminUtenti })))
const DashboardRouter = lazy(() => import('./pages/dashboard/DashboardRouter').then(m => ({ default: m.DashboardRouter })))
const MieAttivitaPage = lazy(() => import('./pages/attivita/MieAttivitaPage').then(m => ({ default: m.MieAttivitaPage })))
const LogisticaPage = lazy(() => import('./pages/logistica/LogisticaPage').then(m => ({ default: m.LogisticaPage })))
const ContattiList = lazy(() => import('./pages/contatti/ContattiList').then(m => ({ default: m.ContattiList })))
const ContattiDetail = lazy(() => import('./pages/contatti/ContattiDetail').then(m => ({ default: m.ContattiDetail })))
const CostiPage = lazy(() => import('./pages/costi/CostiPage').then(m => ({ default: m.CostiPage })))
const AdminSottoAttivita = lazy(() => import('./pages/admin/AdminSottoAttivita').then(m => ({ default: m.AdminSottoAttivita })))
const AdminTemplate = lazy(() => import('./pages/admin/AdminTemplate').then(m => ({ default: m.AdminTemplate })))
const AdminTipoProdotto = lazy(() => import('./pages/admin/AdminTipoProdotto').then(m => ({ default: m.AdminTipoProdotto })))
const NotifichePage = lazy(() => import('./pages/notifiche/NotifichePage').then(m => ({ default: m.NotifichePage })))
const ReportMaterialePage = lazy(() => import('./pages/report/ReportMaterialePage').then(m => ({ default: m.ReportMaterialePage })))
const ComplianceDashboard = lazy(() => import('./pages/compliance/ComplianceDashboard').then(m => ({ default: m.ComplianceDashboard })))
const TovList = lazy(() => import('./pages/compliance/TovList').then(m => ({ default: m.TovList })))
const TovForm = lazy(() => import('./pages/compliance/TovForm').then(m => ({ default: m.TovForm })))
const TovDetail = lazy(() => import('./pages/compliance/TovDetail').then(m => ({ default: m.TovDetail })))
const HcpList = lazy(() => import('./pages/compliance/HcpList').then(m => ({ default: m.HcpList })))
const HcpDetail = lazy(() => import('./pages/compliance/HcpDetail').then(m => ({ default: m.HcpDetail })))
const AuditTrailPage = lazy(() => import('./pages/admin/AuditTrailPage').then(m => ({ default: m.AuditTrailPage })))
const AltroPage = lazy(() => import('./pages/altro/AltroPage').then(m => ({ default: m.AltroPage })))

function PageFallback() {
  return <div className="p-6"><LoadingSkeleton lines={5} /></div>
}

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
    <BrowserRouter basename="/Mikai-Eventi">
      <Suspense fallback={<PageFallback />}>
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
          <Route path="/notifiche" element={<NotifichePage />} />
          <Route path="/altro" element={<AltroPage />} />
          <Route path="/materiale" element={<MaterialeList />} />
          <Route path="/materiale/:id" element={<MaterialeDetail />} />
          <Route path="/report/materiale" element={<ReportMaterialePage />} />
          <Route path="/admin/brand" element={<AdminBrand />} />
          <Route path="/admin/distretti" element={<AdminDistretti />} />
          <Route path="/admin/prodotti" element={<AdminProdotti />} />
          <Route path="/admin/sedi" element={<AdminSedi />} />
          <Route path="/admin/zone" element={<AdminZone />} />
          <Route path="/contatti" element={<ContattiList />} />
          <Route path="/contatti/:id" element={<ContattiDetail />} />
          <Route path="/costi" element={<CostiPage />} />
          <Route path="/admin/sotto-attivita" element={<AdminSottoAttivita />} />
          <Route path="/admin/template" element={<AdminTemplate />} />
          <Route path="/admin/tipo-prodotto" element={<AdminTipoProdotto />} />
          <Route path="/compliance" element={<ComplianceDashboard />} />
          <Route path="/compliance/tov" element={<TovList />} />
          <Route path="/compliance/tov/nuovo" element={<TovForm />} />
          <Route path="/compliance/tov/:id" element={<TovDetail />} />
          <Route path="/compliance/hcp" element={<HcpList />} />
          <Route path="/compliance/hcp/:id" element={<HcpDetail />} />
          <Route path="/admin/audit" element={<AuditTrailPage />} />
          <Route path="/admin/utenti" element={<AdminUtenti />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
