import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { Icon } from '../ui/Icon'
import { NAV_ICONS, ADMIN_ICONS, ACTION_ICONS } from '../../lib/icons'

const navItems = [
  { to: '/', label: 'Riepilogo', icon: NAV_ICONS.riepilogo, roles: ['admin', 'direzione', 'ufficio'] },
  { to: '/eventi', label: 'Eventi', icon: NAV_ICONS.eventi },
  { to: '/eventi/calendario', label: 'Calendario', icon: NAV_ICONS.calendario },
  { to: '/materiale', label: 'Magazzino', icon: NAV_ICONS.materiale, permissions: ['gestione_magazzino', 'gestione_spedizioni'] },
  { to: '/logistica', label: 'Logistica', icon: NAV_ICONS.logistica, permissions: ['gestione_spedizioni', 'gestione_magazzino'] },
  { to: '/contatti', label: 'Contatti', icon: NAV_ICONS.contatti },
  { to: '/costi', label: 'Costi', icon: NAV_ICONS.costi, permissions: ['gestione_costi', 'approva_preventivi'] },
  { to: '/documenti', label: 'Documenti', icon: NAV_ICONS.documenti, roles: ['admin', 'direzione', 'ufficio'] },
  { to: '/notifiche', label: 'Notifiche', icon: NAV_ICONS.notifiche },
  { to: '/impostazioni', label: 'Impostazioni', icon: NAV_ICONS.impostazioni, roles: ['admin'] },
]

const adminItems = [
  { to: '/admin/brand', label: 'Brand', icon: ADMIN_ICONS.brand },
  { to: '/admin/distretti', label: 'Distretti', icon: ADMIN_ICONS.distretti },
  { to: '/admin/prodotti', label: 'Prodotti & Kit', icon: ADMIN_ICONS.prodotti },
  { to: '/admin/materiali', label: 'Materiali', icon: ADMIN_ICONS.materiali },
  { to: '/admin/sedi', label: 'Sedi & Corrieri', icon: ADMIN_ICONS.sedi },
  { to: '/admin/zone', label: 'Zone', icon: ADMIN_ICONS.zone },
  { to: '/admin/sotto-attivita', label: 'Sotto-attività', icon: ADMIN_ICONS.sottoattivita },
  { to: '/admin/template', label: 'Template attività', icon: NAV_ICONS.checklist },
  { to: '/admin/utenti', label: 'Utenti', icon: ADMIN_ICONS.utenti, permissions: ['gestione_utenti'] },
]

export function Sidebar() {
  const profile = useAuthStore(s => s.profile)
  const signOut = useAuthStore(s => s.signOut)
  const hasPermission = useAuthStore(s => s.hasPermission)

  const canSee = (item) => {
    if (item.roles && !item.roles.includes(profile?.ruolo)) return false
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false
    return true
  }

  const visibleItems = navItems.filter(canSee)
  const showAdmin = hasPermission('gestione_catalogo')
  const visibleAdminItems = showAdmin ? adminItems.filter(canSee) : []

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-mikai-400">Mikai Eventi</h1>
      </div>
      <div className="px-3 pt-3">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors min-h-[44px]"
          aria-label="Ricerca globale"
        >
          <Icon icon={ACTION_ICONS.search} size={18} />
          <span className="flex-1 text-left">Cerca...</span>
          <kbd className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Ctrl+K</kbd>
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium min-h-[48px] transition-colors ${
                isActive
                  ? 'bg-mikai-50 text-mikai-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Icon icon={item.icon} size={22} />
            {item.label}
          </NavLink>
        ))}
        {showAdmin && visibleAdminItems.length > 0 && (
          <>
            <div className="border-t border-gray-200 my-3" />
            <p className="px-4 text-sm font-medium text-gray-400 mb-2">Amministrazione</p>
            {visibleAdminItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium min-h-[48px] transition-colors ${
                    isActive
                      ? 'bg-mikai-50 text-mikai-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <Icon icon={item.icon} size={22} />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-2">
          {profile?.nome} {profile?.cognome}
        </p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 min-h-[48px] px-2"
        >
          <Icon icon={NAV_ICONS.logout} size={18} />
          Esci
        </button>
      </div>
    </aside>
  )
}
