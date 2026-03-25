import { Icon } from '../ui/Icon'
import { DASHBOARD_ICONS } from '../../lib/icons'
import { STATO_EVENTO } from '../../lib/constants'

export function ZoneSummary({ zoneSummary }) {
  if (!zoneSummary) return null

  const { eventiByStato, contattiNuovi } = zoneSummary
  const totalEventi = Object.values(eventiByStato).reduce((s, n) => s + n, 0)

  const statCards = [
    { label: 'Eventi nel trimestre', value: totalEventi, color: 'text-mikai-600' },
    { label: 'Nuovi contatti (mese)', value: contattiNuovi, color: 'text-green-600' },
  ]

  const statoEntries = Object.entries(eventiByStato).filter(([, count]) => count > 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon icon={DASHBOARD_ICONS.report} size={20} className="text-mikai-400" />
        <h3 className="font-semibold text-lg">Riepilogo zona</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
        {statoEntries.map(([stato, count]) => (
          <div key={stato} className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">{STATO_EVENTO[stato] || stato}</p>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
