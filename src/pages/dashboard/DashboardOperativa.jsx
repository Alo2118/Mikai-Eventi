import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { useMaterialAnalyticsStore } from '../../hooks/useMaterialAnalytics'
import { useCostsStore } from '../../hooks/useCosts'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/SearchInput'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../components/ui/Toast'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { MyWorkEventsSection } from '../../components/dashboard/MyWorkEventsSection'
import { OperativaMaterialSection } from '../../components/dashboard/OperativaMaterialSection'
import { OperativaPreventiviSection } from '../../components/dashboard/OperativaPreventiviSection'
import { ActivityCard } from '../../components/dashboard/ActivityCard'
import { QuickActions, QUICK_ACTIONS_OPERATIVA } from '../../components/dashboard/QuickActions'
import { CATEGORIA_ATTIVITA, CARD_STYLE, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { CATEGORIA_ICONS, FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { todayISO, subtractDays } from '../../lib/date-utils'

// --- Urgency grouping ---

function urgencyGroup(activities) {
  const today = todayISO()
  const in3 = subtractDays(today, -3)
  const in7 = subtractDays(today, -7)

  const groups = { overdue: [], today: [], in3days: [], in7days: [], noDeadline: [] }
  for (const act of activities) {
    if (!act.deadline) { groups.noDeadline.push(act); continue }
    if (act.deadline === today) groups.today.push(act)
    else if (act.deadline < today) groups.overdue.push(act)
    else if (act.deadline <= in3) groups.in3days.push(act)
    else if (act.deadline <= in7) groups.in7days.push(act)
    else groups.noDeadline.push(act)
  }
  return groups
}

const GROUP_CONFIG = [
  { key: 'overdue', title: 'In ritardo', color: 'text-red-600', dotColor: 'bg-red-500' },
  { key: 'today', title: 'Oggi', color: 'text-yellow-600', dotColor: 'bg-yellow-400' },
  { key: 'in3days', title: 'Entro 3 giorni', color: 'text-mikai-600', dotColor: 'bg-mikai-400' },
  { key: 'in7days', title: 'Entro 7 giorni', color: 'text-gray-600', dotColor: 'bg-gray-400' },
  { key: 'noDeadline', title: 'Senza scadenza', color: 'text-gray-500', dotColor: 'bg-gray-300' },
]

function ActivityGroup({ title, activities, color, dotColor, onComplete, onAssign, completing }) {
  if (activities.length === 0) return null
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${color}`}>{title}</h3>
        <span className="text-xs font-bold text-gray-500">{activities.length}</span>
      </div>
      <div className="space-y-3">
        {activities.map(act => (
          <ActivityCard
            key={act.id}
            act={act}
            onComplete={onComplete}
            onAssign={onAssign}
            completing={completing}
          />
        ))}
      </div>
    </div>
  )
}

// --- Main component ---

export function DashboardOperativa({ warehouseOnly = false }) {
  // Activity store
  const dashboardActivities = useActivitiesStore(s => s.dashboardActivities)
  const loading = useActivitiesStore(s => s.dashboardLoading)
  const error = useActivitiesStore(s => s.dashboardError)
  const fetchDashboardActivities = useActivitiesStore(s => s.fetchDashboardActivities)
  const completeActivity = useActivitiesStore(s => s.completeActivity)
  const assignActivity = useActivitiesStore(s => s.assignActivity)
  const fetchCompletedToday = useActivitiesStore(s => s.fetchCompletedToday)
  const completedTodayCount = useActivitiesStore(s => s.completedTodayCount)
  const completedTodayTeamCount = useActivitiesStore(s => s.completedTodayTeamCount)
  const fetchEventSemaphores = useActivitiesStore(s => s.fetchEventSemaphores)
  const fetchBatchActivityStatus = useActivitiesStore(s => s.fetchBatchActivityStatus)

  // Auth
  const permissions = useAuthStore(s => s.permissions)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)

  // Material store
  const upcomingBookings = useMaterialAnalyticsStore(s => s.upcomingBookings)
  const overdueReturns = useMaterialAnalyticsStore(s => s.overdueReturns)
  const fetchUpcomingBookings = useMaterialAnalyticsStore(s => s.fetchUpcomingBookings)
  const fetchOverdueReturns = useMaterialAnalyticsStore(s => s.fetchOverdueReturns)

  // Cost store
  const fetchPendingPreventivi = useCostsStore(s => s.fetchPendingPreventivi)

  const addToast = useToastStore(s => s.add)
  const navigate = useNavigate()

  // Local state
  const [viewMode, setViewMode] = useState('mine')
  const [activeCategory, setActiveCategory] = useState('tutte')
  const [search, setSearch] = useState('')
  const [completing, setCompleting] = useState(null)
  const [confirmingComplete, setConfirmingComplete] = useState(null)
  const [eventSemaphores, setEventSemaphores] = useState({})
  const [activityStatus, setActivityStatus] = useState({})
  const [pendingPreventivi, setPendingPreventivi] = useState([])

  // Permission checks
  const showMaterial = hasPermission('gestione_magazzino') || hasPermission('gestione_spedizioni')
  const showCosts = hasPermission('gestione_costi')

  const loadData = useCallback(async () => {
    if (!permissions || permissions.length === 0) return
    const perms = warehouseOnly
      ? permissions.filter(p => p === 'gestione_spedizioni' || p === 'gestione_magazzino')
      : permissions

    // Primary fetch — use return value to avoid getState() race condition
    const { data: activities } = await fetchDashboardActivities(perms)

    // Derive event IDs from fetched data
    const workingStates = new Set(['in_preparazione', 'pronto', 'in_corso'])
    const eventIds = [...new Set(
      (activities || [])
        .filter(a => a.evento && workingStates.has(a.evento.stato))
        .map(a => a.evento.id)
    )]

    // Secondary fetches in parallel with error handling
    const promises = [
      fetchCompletedToday(user?.id).catch(() => null),
      eventIds.length > 0
        ? fetchEventSemaphores(eventIds).then(setEventSemaphores).catch(() => null)
        : Promise.resolve(),
      eventIds.length > 0
        ? fetchBatchActivityStatus(eventIds).then(setActivityStatus).catch(() => null)
        : Promise.resolve(),
    ]
    if (showMaterial) {
      promises.push(fetchUpcomingBookings().catch(() => null))
      promises.push(fetchOverdueReturns().catch(() => null))
    }
    if (showCosts) {
      promises.push(
        fetchPendingPreventivi()
          .then(r => setPendingPreventivi(r.data || []))
          .catch(() => null)
      )
    }
    await Promise.all(promises)
  }, [warehouseOnly, permissions, user?.id, showMaterial, showCosts])

  // Initial fetch
  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  // --- Derived data ---

  const kpiSource = useMemo(() => {
    return viewMode === 'mine' && user?.id
      ? dashboardActivities.filter(a => a.assegnato_a === user.id)
      : dashboardActivities
  }, [dashboardActivities, viewMode, user?.id])

  const allGroups = useMemo(() => urgencyGroup(kpiSource), [kpiSource])
  const overdueCount = allGroups.overdue.length
  const todayCount = allGroups.today.length
  const totalOpen = kpiSource.length
  const unassignedCount = kpiSource.filter(a => !a.assegnato).length

  const teamTotals = useMemo(() => {
    if (viewMode !== 'mine') return null
    const teamGroups = urgencyGroup(dashboardActivities)
    return {
      total: dashboardActivities.length,
      overdue: teamGroups.overdue.length,
      today: teamGroups.today.length,
      unassigned: dashboardActivities.filter(a => !a.assegnato).length,
    }
  }, [dashboardActivities, viewMode])

  const workEvents = useMemo(() => {
    const workingStates = new Set(['in_preparazione', 'pronto', 'in_corso'])
    const source = viewMode === 'mine' && user?.id
      ? dashboardActivities.filter(a => a.assegnato_a === user.id)
      : dashboardActivities
    const eventMap = new Map()
    for (const act of source) {
      if (act.evento && workingStates.has(act.evento.stato) && !eventMap.has(act.evento.id)) {
        eventMap.set(act.evento.id, act.evento)
      }
    }
    return Array.from(eventMap.values())
      .sort((a, b) => (a.data_inizio || '').localeCompare(b.data_inizio || ''))
  }, [dashboardActivities, viewMode, user?.id])

  const filtered = useMemo(() => {
    let result = dashboardActivities
    if (viewMode === 'mine' && user?.id) {
      result = result.filter(a => a.assegnato_a === user.id)
    }
    if (activeCategory !== 'tutte') result = result.filter(a => a.categoria === activeCategory)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(a =>
        a.descrizione?.toLowerCase().includes(s) ||
        a.evento?.titolo?.toLowerCase().includes(s)
      )
    }
    return result
  }, [dashboardActivities, activeCategory, search, viewMode, user?.id])

  const groups = useMemo(() => urgencyGroup(filtered), [filtered])

  // --- Actions ---

  const handleConfirmComplete = async () => {
    if (!confirmingComplete) return
    setCompleting(confirmingComplete)
    const { error } = await completeActivity(confirmingComplete, user.id)
    setCompleting(null)
    setConfirmingComplete(null)
    if (error) { addToast(error, 'error'); return }
    addToast('Attività completata!', 'success')
    loadData()
  }

  const handleAssign = async (actId) => {
    const { error } = await assignActivity(actId, user.id)
    if (error) { addToast(error, 'error'); return }
    addToast('Attività assegnata a te!', 'success')
    loadData()
  }

  const categories = Object.entries(CATEGORIA_ATTIVITA)
  const title = warehouseOnly ? 'Dashboard Logistica' : 'Dashboard Operativa'

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: title }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title={title} />
      </div>
      <PageHeader
        title={`Ciao, ${profile?.nome || ''}`}
        subtitle={`${title} — ${totalOpen} attività ${viewMode === 'mine' ? 'assegnate a te' : 'in corso'}`}
        actions={
          <Button variant="secondary" onClick={loadData} disabled={loading} size="sm">
            <Icon icon={ACTION_ICONS.refresh} size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden md:inline ml-1">Aggiorna</span>
          </Button>
        }
      />

      <div className="px-4 md:px-8 space-y-6 pb-8">
        {loading && !dashboardActivities.length ? (
          <LoadingSkeleton lines={8} />
        ) : error ? (
          <EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare le attività. Riprova." />
        ) : (
          <>
            <QuickActions items={QUICK_ACTIONS_OPERATIVA} />

            {/* 1. Toggle + context */}
            <div>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode('mine')}
                  aria-label="Mostra le mie attività"
                  className={`min-h-[48px] px-4 rounded-lg text-base font-medium border transition-colors ${
                    viewMode === 'mine'
                      ? 'bg-mikai-400 text-white border-mikai-400'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Le mie
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  aria-label="Mostra tutte le attività del team"
                  className={`min-h-[48px] px-4 rounded-lg text-base font-medium border transition-colors ${
                    viewMode === 'all'
                      ? 'bg-mikai-400 text-white border-mikai-400'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Tutte
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {viewMode === 'mine'
                  ? 'Stai vedendo le attività assegnate a te'
                  : 'Stai vedendo tutte le attività del team'}
              </p>
            </div>

            {/* 2. KPI Summary */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Aperte</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalOpen}</p>
                {viewMode === 'mine' && teamTotals && (
                  <p className="text-xs text-gray-400 mt-1">{teamTotals.total} nel team</p>
                )}
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">In ritardo</p>
                <p className={`text-2xl md:text-3xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p>
                {viewMode === 'mine' && teamTotals ? (
                  <p className="text-xs text-gray-400 mt-1">{teamTotals.overdue} nel team</p>
                ) : overdueCount === 0 ? (
                  <p className="text-xs text-green-600 mt-1">Nessun ritardo</p>
                ) : null}
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Scadono oggi</p>
                <p className={`text-2xl md:text-3xl font-bold ${todayCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{todayCount}</p>
                {viewMode === 'mine' && teamTotals ? (
                  <p className="text-xs text-gray-400 mt-1">{teamTotals.today} nel team</p>
                ) : todayCount === 0 ? (
                  <p className="text-xs text-gray-400 mt-1">Nessuna oggi</p>
                ) : null}
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Non assegnate</p>
                <p className={`text-2xl md:text-3xl font-bold ${unassignedCount > 0 ? 'text-red-500' : 'text-green-600'}`}>{unassignedCount}</p>
                {viewMode === 'mine' && teamTotals ? (
                  <p className="text-xs text-gray-400 mt-1">{teamTotals.unassigned} nel team</p>
                ) : unassignedCount === 0 ? (
                  <p className="text-xs text-green-600 mt-1">Tutte assegnate</p>
                ) : null}
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Completate oggi</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">{completedTodayCount}</p>
                {viewMode === 'mine' && completedTodayTeamCount > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{completedTodayTeamCount} nel team</p>
                )}
              </div>
            </div>

            {/* 3. Search + filters BEFORE activities */}
            <div className="space-y-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Cerca attività o evento..."
              />
              <div className="flex gap-3 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveCategory('tutte')}
                  aria-label="Mostra tutte le categorie"
                  className={`min-h-[48px] px-4 rounded-lg text-base font-medium border transition-colors shrink-0 ${
                    activeCategory === 'tutte'
                      ? 'bg-mikai-400 text-white border-mikai-400'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Tutte
                </button>
                {categories.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    aria-label={`Filtra per ${label}`}
                    className={`min-h-[48px] px-4 rounded-lg text-base font-medium border transition-colors flex items-center gap-2 shrink-0 ${
                      activeCategory === key
                        ? 'bg-mikai-400 text-white border-mikai-400'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Icon icon={CATEGORIA_ICONS[key]} size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Summary bar */}
            {filtered.length > 0 && (
              <div className={SUMMARY_BAR_STYLE + ' flex flex-wrap gap-x-4 gap-y-1 text-sm'}>
                {overdueCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <strong className="text-red-600">{groups.overdue.length}</strong> in ritardo
                  </span>
                )}
                {todayCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <strong className="text-yellow-600">{groups.today.length}</strong> oggi
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-gray-500">
                  <strong>{filtered.length}</strong> totali
                </span>
              </div>
            )}

            {/* 5. Activity groups */}
            {filtered.length === 0 ? (
              <EmptyState
                title={search ? 'Nessun risultato' : 'Nessuna attività'}
                description={
                  search
                    ? 'Prova a modificare la ricerca.'
                    : viewMode === 'mine'
                    ? 'Non hai attività assegnate. Controlla la sezione "Tutte" o contatta il tuo responsabile.'
                    : 'Nessuna attività in corso per la tua area.'
                }
                action={viewMode === 'mine' && !search ? (
                  <Button variant="secondary" onClick={() => setViewMode('all')}>
                    Visualizza tutte
                  </Button>
                ) : null}
              />
            ) : (
              <div>
                {GROUP_CONFIG.map(g => (
                  <ActivityGroup
                    key={g.key}
                    title={g.title}
                    activities={groups[g.key]}
                    color={g.color}
                    dotColor={g.dotColor}
                    onComplete={setConfirmingComplete}
                    onAssign={handleAssign}
                    completing={completing}
                  />
                ))}
              </div>
            )}

            {/* 6. Eventi in lavorazione */}
            <MyWorkEventsSection
              events={workEvents}
              activityStatus={activityStatus}
              semaphores={eventSemaphores}
            />

            {/* 7. Materiale (permission-gated) */}
            {showMaterial && (
              <OperativaMaterialSection
                upcomingBookings={upcomingBookings}
                overdueReturns={overdueReturns}
              />
            )}

            {/* 8. Preventivi (permission-gated) */}
            {showCosts && (
              <OperativaPreventiviSection pendingPreventivi={pendingPreventivi} />
            )}
          </>
        )}
      </div>

      {/* Confirm dialog for completing activities */}
      <ConfirmDialog
        open={!!confirmingComplete}
        title="Completare attività?"
        message="Confermi di aver completato questa attività? L'azione non può essere annullata."
        confirmLabel="Sì, completa"
        onConfirm={handleConfirmComplete}
        onCancel={() => setConfirmingComplete(null)}
      />
    </div>
  )
}
