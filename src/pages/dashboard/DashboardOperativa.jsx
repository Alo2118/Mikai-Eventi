import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { CATEGORIA_ATTIVITA } from '../../lib/constants'
import { CATEGORIA_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'

function urgencyGroup(activities) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in3 = new Date(today); in3.setDate(today.getDate() + 3)
  const in7 = new Date(today); in7.setDate(today.getDate() + 7)

  const groups = { overdue: [], today: [], in3days: [], in7days: [], noDeadline: [] }
  for (const act of activities) {
    if (!act.deadline) { groups.noDeadline.push(act); continue }
    const d = new Date(act.deadline)
    if (d < today) groups.overdue.push(act)
    else if (d <= today) groups.today.push(act)
    else if (d.toDateString() === today.toDateString()) groups.today.push(act)
    else if (d <= in3) groups.in3days.push(act)
    else if (d <= in7) groups.in7days.push(act)
    else groups.noDeadline.push(act)
  }
  return groups
}

function ActivityGroup({ title, activities, colorClass, iconClass }) {
  if (activities.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${colorClass}`}>{title}</h3>
      <div className="space-y-2">
        {activities.map(act => (
          <Link
            key={act.id}
            to={`/eventi/${act.evento?.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <Icon icon={CATEGORIA_ICONS[act.categoria] || FEEDBACK_ICONS.info} size={20} className={`mt-0.5 shrink-0 ${iconClass}`} />
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900 truncate">{act.descrizione}</p>
                <p className="text-sm text-gray-500 truncate">{act.evento?.titolo}</p>
                {act.deadline && (
                  <p className={`text-xs mt-1 ${colorClass}`}>Scadenza: {formatDate(act.deadline)}</p>
                )}
              </div>
              {act.assegnato && (
                <span className="text-xs text-gray-400 shrink-0">
                  {act.assegnato.nome} {act.assegnato.cognome}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function DashboardOperativa({ warehouseOnly = false }) {
  const dashboardActivities = useActivitiesStore(s => s.dashboardActivities)
  const loading = useActivitiesStore(s => s.loading)
  const fetchDashboardActivities = useActivitiesStore(s => s.fetchDashboardActivities)
  const permissions = useAuthStore(s => s.permissions)

  const [activeCategory, setActiveCategory] = useState('tutte')

  useEffect(() => {
    if (!permissions || permissions.length === 0) return
    const perms = warehouseOnly
      ? permissions.filter(p => p === 'gestione_spedizioni' || p === 'gestione_magazzino')
      : permissions
    fetchDashboardActivities(perms)
  }, [warehouseOnly, permissions])

  const filtered = activeCategory === 'tutte'
    ? dashboardActivities
    : dashboardActivities.filter(a => a.categoria === activeCategory)

  const groups = urgencyGroup(filtered)

  const categories = Object.entries(CATEGORIA_ATTIVITA)

  const title = warehouseOnly ? 'Dashboard Logistica' : 'Dashboard Operativa'

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: title }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title={title} />
      </div>
      <PageHeader title={title} subtitle="Attività in corso su tutti gli eventi" />

      <div className="px-6 md:px-8">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
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

        {loading ? (
          <LoadingSkeleton lines={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nessuna attività"
            description="Non ci sono attività in corso per la tua area."
          />
        ) : (
          <div>
            <ActivityGroup
              title="In ritardo"
              activities={groups.overdue}
              colorClass="text-red-600"
              iconClass="text-red-500"
            />
            <ActivityGroup
              title="Oggi"
              activities={groups.today}
              colorClass="text-yellow-600"
              iconClass="text-yellow-500"
            />
            <ActivityGroup
              title="Entro 3 giorni"
              activities={groups.in3days}
              colorClass="text-mikai-600"
              iconClass="text-mikai-500"
            />
            <ActivityGroup
              title="Entro 7 giorni"
              activities={groups.in7days}
              colorClass="text-gray-600"
              iconClass="text-gray-500"
            />
            <ActivityGroup
              title="Senza scadenza"
              activities={groups.noDeadline}
              colorClass="text-gray-500"
              iconClass="text-gray-400"
            />
          </div>
        )}
      </div>
    </div>
  )
}
