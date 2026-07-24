import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Icon } from '../ui/Icon'
import { AgentMaterialCard, daysSinceUpdate } from './AgentMaterialCard'
import { CARD_STYLE } from '../../lib/constants'
import { MATERIALE_ICONS, FEEDBACK_ICONS } from '../../lib/icons'

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

      <p className="text-sm text-gray-500">
        Quando riporti un kit o non ce l'hai più, dillo qui: il magazzino viene avvisato subito.
      </p>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <Icon icon={FEEDBACK_ICONS.warning} size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {overdueCount} {overdueCount === 1 ? 'rientro scaduto' : 'rientri scaduti'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {agentMaterials.map(material => (
          <AgentMaterialCard key={material.id} material={material} />
        ))}
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
