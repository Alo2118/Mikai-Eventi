import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Icon } from '../ui/Icon'
import { CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { MATERIALE_ICONS, FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { daysFromToday } from '../../lib/date-utils'

function daysSinceUpdate(updatedAt) {
  if (!updatedAt) return 0
  return Math.max(0, daysFromToday(updatedAt))
}

function getDaysColor(days) {
  if (days > 30) return 'text-red-600'
  if (days >= 7) return 'text-yellow-600'
  return 'text-green-600'
}

function getDaysBg(days) {
  if (days > 30) return 'bg-red-50'
  if (days >= 7) return 'bg-yellow-50'
  return 'bg-green-50'
}

export function AgentInventorySection() {
  const profile = useAuthStore(s => s.profile)
  const agentMaterials = useMaterialsStore(s => s.agentMaterials)
  const fetchAgentMaterials = useMaterialsStore(s => s.fetchAgentMaterials)

  useEffect(() => {
    if (profile?.id) fetchAgentMaterials(profile.id)
  }, [profile?.id])

  const overdueCount = agentMaterials.filter(m => daysSinceUpdate(m.updated_at) > 30).length

  if (agentMaterials.length === 0) {
    return (
      <div className={CARD_STYLE + ' space-y-3'}>
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon icon={MATERIALE_ICONS.package} size={20} className="text-mikai-500" />
          Il mio materiale
        </h3>
        <div className="flex items-center gap-3 py-4 justify-center text-green-600">
          <Icon icon={FEEDBACK_ICONS.success} size={24} />
          <p className="text-base font-medium">Nessun materiale presso di te</p>
        </div>
      </div>
    )
  }

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon icon={MATERIALE_ICONS.package} size={20} className="text-mikai-500" />
          Il mio materiale
        </h3>
        <span className="text-sm text-gray-500">
          {agentMaterials.length} {agentMaterials.length === 1 ? 'esemplare' : 'esemplari'} presso di te
        </span>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <Icon icon={FEEDBACK_ICONS.warning} size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {overdueCount} {overdueCount === 1 ? 'rientro scaduto' : 'rientri scaduti'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {agentMaterials.map(material => {
          const days = daysSinceUpdate(material.updated_at)
          const productName = material.product?.nome || material.nome || 'Materiale'
          const brandName = material.product?.brand?.nome
          return (
            <Link
              key={material.id}
              to={`/materiale/${material.id}`}
              className={CARD_HOVER_STYLE + ' flex items-center gap-3 cursor-pointer !p-3'}
            >
              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getDaysBg(days)}`}>
                <Icon icon={MATERIALE_ICONS.package} size={18} className={getDaysColor(days)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{productName}</p>
                {brandName && (
                  <p className="text-xs text-gray-500 truncate">{brandName}</p>
                )}
              </div>
              <div className="shrink-0 text-right flex items-center gap-2">
                <span className={`text-xs font-medium ${getDaysColor(days)}`}>
                  {days === 0 ? 'Oggi' : `${days}gg`}
                </span>
                <Icon icon={ACTION_ICONS.forward} size={14} className="text-gray-400" />
              </div>
            </Link>
          )
        })}
      </div>

      <Link
        to="/materiale"
        className="block text-center text-sm text-mikai-600 font-medium hover:text-mikai-700 py-2"
      >
        Vedi tutto il materiale
      </Link>
    </div>
  )
}
