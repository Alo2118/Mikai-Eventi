import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/SearchInput'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useToastStore } from '../../components/ui/Toast'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { CATEGORIA_ATTIVITA, CARD_STYLE, CARD_HOVER_STYLE, SUMMARY_BAR_STYLE, PERMESSO_SHORT_LABELS, PERMESSO_BADGE_COLORE } from '../../lib/constants'
import { CATEGORIA_ICONS, FEEDBACK_ICONS, ACTION_ICONS, ATTIVITA_STATO_ICONS } from '../../lib/icons'
import { formatDate, todayISO, subtractDays } from '../../lib/date-utils'

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

function ActivityCard({ act, colorClass, iconClass, onComplete, onAssign, completing }) {
  return (
    <div className={CARD_HOVER_STYLE + ' space-y-2'}>
      <Link to={`/eventi/${act.evento?.id}`} className="block">
        <div className="flex items-start gap-3">
          <Icon icon={CATEGORIA_ICONS[act.categoria] || FEEDBACK_ICONS.info} size={20} className={`mt-0.5 shrink-0 ${iconClass}`} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-900 truncate">{act.descrizione}</p>
            <p className="text-sm text-gray-500 truncate">{act.evento?.titolo}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {act.permesso_responsabile && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  { purple: 'text-purple-700 bg-purple-100', blue: 'text-blue-700 bg-blue-100', mikai: 'text-mikai-600 bg-mikai-50', emerald: 'text-emerald-700 bg-emerald-100', yellow: 'text-yellow-700 bg-yellow-100', gray: 'text-gray-500 bg-gray-100' }[PERMESSO_BADGE_COLORE[act.permesso_responsabile] || 'gray'] || 'text-gray-500 bg-gray-100'
                }`}>
                  {PERMESSO_SHORT_LABELS[act.permesso_responsabile] || act.permesso_responsabile}
                </span>
              )}
              {act.deadline && (
                <span className={`text-xs ${colorClass}`}>Scadenza: {formatDate(act.deadline)}</span>
              )}
              {act.assegnato ? (
                <span className="text-xs text-gray-400">{act.assegnato.nome} {act.assegnato.cognome}</span>
              ) : (
                <span className="text-xs font-medium text-red-500">Non assegnata</span>
              )}
            </div>
          </div>
        </div>
      </Link>
      {/* Quick actions */}
      <div className="flex gap-2 pl-8">
        <button
          onClick={(e) => { e.preventDefault(); onComplete(act.id) }}
          disabled={completing === act.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors min-h-[48px]"
          aria-label={`Completa attività: ${act.descrizione}`}
        >
          <Icon icon={ACTION_ICONS.check} size={14} />
          Completata
        </button>
        {!act.assegnato && (
          <button
            onClick={(e) => { e.preventDefault(); onAssign(act.id) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-mikai-700 bg-mikai-50 hover:bg-mikai-100 rounded-lg transition-colors min-h-[48px]"
            aria-label={`Assegna a me: ${act.descrizione}`}
          >
            <Icon icon={ACTION_ICONS.add} size={14} />
            Assegna a me
          </button>
        )}
      </div>
    </div>
  )
}

function ActivityGroup({ title, activities, colorClass, iconClass, count, onComplete, onAssign, completing }) {
  if (activities.length === 0) return null
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${colorClass}`}>{title}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass} bg-opacity-10`} style={{ backgroundColor: 'currentColor', color: 'inherit', opacity: 0.15 }}>
          {/* inline badge */}
        </span>
        <span className={`text-xs font-bold ${colorClass}`}>{count}</span>
      </div>
      <div className="space-y-3">
        {activities.map(act => (
          <ActivityCard
            key={act.id}
            act={act}
            colorClass={colorClass}
            iconClass={iconClass}
            onComplete={onComplete}
            onAssign={onAssign}
            completing={completing}
          />
        ))}
      </div>
    </div>
  )
}

export function DashboardOperativa({ warehouseOnly = false }) {
  const dashboardActivities = useActivitiesStore(s => s.dashboardActivities)
  const loading = useActivitiesStore(s => s.dashboardLoading)
  const error = useActivitiesStore(s => s.dashboardError)
  const fetchDashboardActivities = useActivitiesStore(s => s.fetchDashboardActivities)
  const completeActivity = useActivitiesStore(s => s.completeActivity)
  const assignActivity = useActivitiesStore(s => s.assignActivity)
  const permissions = useAuthStore(s => s.permissions)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const [activeCategory, setActiveCategory] = useState('tutte')
  const [search, setSearch] = useState('')
  const [completing, setCompleting] = useState(null)

  const loadData = useCallback(() => {
    if (!permissions || permissions.length === 0) return
    const perms = warehouseOnly
      ? permissions.filter(p => p === 'gestione_spedizioni' || p === 'gestione_magazzino')
      : permissions
    fetchDashboardActivities(perms)
  }, [warehouseOnly, permissions])

  // Initial fetch
  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [loadData])

  // Filter by category + search
  const filtered = useMemo(() => {
    let result = dashboardActivities
    if (activeCategory !== 'tutte') result = result.filter(a => a.categoria === activeCategory)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(a =>
        a.descrizione?.toLowerCase().includes(s) ||
        a.evento?.titolo?.toLowerCase().includes(s)
      )
    }
    return result
  }, [dashboardActivities, activeCategory, search])

  // Urgency groups (memoized)
  const groups = useMemo(() => urgencyGroup(filtered), [filtered])

  // KPI from all activities (not filtered)
  const allGroups = useMemo(() => urgencyGroup(dashboardActivities), [dashboardActivities])
  const overdueCount = allGroups.overdue.length
  const todayCount = allGroups.today.length
  const totalOpen = dashboardActivities.length
  const unassignedCount = dashboardActivities.filter(a => !a.assegnato).length

  // Quick actions
  const handleComplete = async (actId) => {
    setCompleting(actId)
    const { error } = await completeActivity(actId, user.id)
    setCompleting(null)
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
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[{ label: title }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title={title} />
      </div>
      <PageHeader
        title={title}
        subtitle={`${totalOpen} attività in corso`}
        actions={
          <Button variant="secondary" onClick={loadData} disabled={loading} size="sm">
            <Icon icon={ACTION_ICONS.refresh} size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden md:inline ml-1">Aggiorna</span>
          </Button>
        }
      />

      <div className="px-4 md:px-6">
        {/* KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className={CARD_STYLE}>
            <p className="text-sm text-gray-500">Aperte</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalOpen}</p>
            <p className="text-xs text-gray-400 mt-1">—&nbsp;Totale attività</p>
          </div>
          <div className={CARD_STYLE}>
            <p className="text-sm text-gray-500">In ritardo</p>
            <p className={`text-2xl md:text-3xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueCount}</p>
            {overdueCount === 0 && (
              <p className="text-xs text-green-600 mt-1">↓&nbsp;Nessun ritardo</p>
            )}
            {overdueCount > 0 && overdueCount <= 5 && (
              <p className="text-xs text-yellow-600 mt-1">↑&nbsp;Richiede attenzione</p>
            )}
            {overdueCount > 5 && (
              <p className="text-xs text-red-500 mt-1">↑↑&nbsp;Situazione critica</p>
            )}
          </div>
          <div className={CARD_STYLE}>
            <p className="text-sm text-gray-500">Scadono oggi</p>
            <p className={`text-2xl md:text-3xl font-bold ${todayCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{todayCount}</p>
            {todayCount === 0
              ? <p className="text-xs text-gray-400 mt-1">—&nbsp;Nessuna oggi</p>
              : <p className="text-xs text-yellow-600 mt-1">↑&nbsp;Da completare oggi</p>
            }
          </div>
          <div className={CARD_STYLE}>
            <p className="text-sm text-gray-500">Non assegnate</p>
            <p className={`text-2xl md:text-3xl font-bold ${unassignedCount > 0 ? 'text-red-500' : 'text-green-600'}`}>{unassignedCount}</p>
            {unassignedCount === 0
              ? <p className="text-xs text-green-600 mt-1">↓&nbsp;Tutte assegnate</p>
              : <p className="text-xs text-red-400 mt-1">↑&nbsp;Da assegnare</p>
            }
          </div>
        </div>

        {/* Search + category filter */}
        <div className="space-y-3 mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cerca attività o evento..."
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory('tutte')}
              className={`min-h-[48px] px-4 rounded-lg text-base font-medium border transition-colors ${
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
                className={`min-h-[48px] px-4 rounded-lg text-base font-medium border transition-colors flex items-center gap-2 ${
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

        {/* Content */}
        {loading ? (
          <LoadingSkeleton lines={6} />
        ) : error ? (
          <EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare le attività. Riprova." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nessuna attività"
            description={search ? 'Nessun risultato per la ricerca.' : 'Nessuna attività in corso per la tua area.'}
          />
        ) : (
          <div>
            <ActivityGroup
              title="In ritardo"
              activities={groups.overdue}
              count={groups.overdue.length}
              colorClass="text-red-600"
              iconClass="text-red-500"
              onComplete={handleComplete}
              onAssign={handleAssign}
              completing={completing}
            />
            <ActivityGroup
              title="Oggi"
              activities={groups.today}
              count={groups.today.length}
              colorClass="text-yellow-600"
              iconClass="text-yellow-500"
              onComplete={handleComplete}
              onAssign={handleAssign}
              completing={completing}
            />
            <ActivityGroup
              title="Entro 3 giorni"
              activities={groups.in3days}
              count={groups.in3days.length}
              colorClass="text-mikai-600"
              iconClass="text-mikai-500"
              onComplete={handleComplete}
              onAssign={handleAssign}
              completing={completing}
            />
            <ActivityGroup
              title="Entro 7 giorni"
              activities={groups.in7days}
              count={groups.in7days.length}
              colorClass="text-gray-600"
              iconClass="text-gray-500"
              onComplete={handleComplete}
              onAssign={handleAssign}
              completing={completing}
            />
            <ActivityGroup
              title="Senza scadenza"
              activities={groups.noDeadline}
              count={groups.noDeadline.length}
              colorClass="text-gray-500"
              iconClass="text-gray-400"
              onComplete={handleComplete}
              onAssign={handleAssign}
              completing={completing}
            />
          </div>
        )}
      </div>
    </div>
  )
}
