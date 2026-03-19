import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { Icon } from '../ui/Icon'
import { NAV_ICONS } from '../../lib/icons'

const items = [
  { to: '/eventi', label: 'Eventi', icon: NAV_ICONS.eventi },
  { to: '/eventi/nuovo', label: 'Nuovo evento', icon: NAV_ICONS.nuovo },
  { to: '/notifiche', label: 'Notifiche', icon: NAV_ICONS.notifiche },
  { to: '/profilo', label: 'Profilo', icon: NAV_ICONS.profilo },
]

export function BottomBar() {
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)

  const canSee = (item) => {
    if (item.roles && !item.roles.includes(profile?.ruolo)) return false
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false
    return true
  }

  const visibleItems = items.filter(canSee)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-3 min-w-[64px] min-h-[56px] text-sm font-medium ${
                isActive ? 'text-mikai-400' : 'text-gray-500'
              }`
            }
          >
            <Icon icon={item.icon} size={24} className="mb-0.5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
