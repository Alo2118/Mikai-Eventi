import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { DASHBOARD_ICONS, NAV_ICONS, ACTION_ICONS, MATERIALE_ICONS, COSTI_ICONS } from '../../lib/icons'

const DEFAULT_ITEMS = [
  { to: '/eventi/nuovo', label: 'Proponi nuovo evento', icon: DASHBOARD_ICONS.newEvent, primary: true, title: 'Crea un nuovo evento' },
  { to: '/contatti', label: 'I miei contatti', icon: DASHBOARD_ICONS.newContact, title: 'Vai alla rubrica contatti' },
  { to: '/mie-attivita', label: 'Le mie attività', icon: NAV_ICONS.attivita, title: 'Vedi le attività assegnate a te' },
]

export const QUICK_ACTIONS_STRATEGICA = [
  { to: '/eventi?stato=proposto', label: 'Approva eventi', icon: ACTION_ICONS.approve, primary: true, title: 'Vedi gli eventi in attesa di approvazione' },
  { to: '/calendario', label: 'Calendario', icon: NAV_ICONS.calendario, title: 'Visualizza il calendario eventi' },
  { to: '/costi', label: 'Analisi costi', icon: COSTI_ICONS.costo, title: 'Analizza i costi degli eventi' },
]

export const QUICK_ACTIONS_OPERATIVA = [
  { to: '/mie-attivita', label: 'Le mie attività', icon: NAV_ICONS.attivita, primary: true, title: 'Vedi le attività assegnate a te' },
  { to: '/materiale', label: 'Materiale', icon: MATERIALE_ICONS.package, title: 'Gestisci il materiale demo' },
  { to: '/logistica', label: 'Logistica', icon: MATERIALE_ICONS.truck, title: 'Gestisci la logistica eventi' },
]

export function QuickActions({ items }) {
  const actions = items || DEFAULT_ITEMS
  const primary = actions.find(a => a.primary)
  const secondary = actions.filter(a => !a.primary)

  return (
    <div className="grid grid-cols-1 gap-3">
      {primary && (
        <Link
          to={primary.to}
          title={primary.title}
          className="flex items-center justify-center gap-2 min-h-[56px] px-4 rounded-xl bg-mikai-400 text-white font-semibold text-base hover:bg-mikai-500 transition-colors"
        >
          <Icon icon={primary.icon} size={20} />
          {primary.label}
        </Link>
      )}
      {secondary.length > 0 && (
        <div className={`grid gap-3 ${secondary.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {secondary.map(action => (
            <Link
              key={action.to}
              to={action.to}
              title={action.title}
              className="flex items-center justify-center gap-2 min-h-[56px] px-4 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold text-base hover:bg-gray-50 transition-colors"
            >
              <Icon icon={action.icon} size={20} />
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
