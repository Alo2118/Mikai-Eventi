import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { Icon } from '../ui/Icon'
import { NAV_ICONS } from '../../lib/icons'

const items = [
  { to: '/dashboard', label: 'Home', icon: NAV_ICONS.riepilogo },
  { to: '/eventi', label: 'Eventi', icon: NAV_ICONS.eventi },
  { to: '/contatti', label: 'Rubrica', icon: NAV_ICONS.contatti },
  { to: '/notifiche', label: 'Notifiche', icon: NAV_ICONS.notifiche },
  { to: '/altro', label: 'Altro', icon: NAV_ICONS.altro },
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
  const unreadCount = useNotificationsStore(s => s.unreadCount)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.to === '/notifiche' && unreadCount > 0 ? `Notifiche, ${unreadCount} non lette` : item.label}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center py-2 px-3 min-w-[64px] min-h-[56px] text-sm transition-colors ${
                isActive
                  ? 'text-mikai-700 bg-mikai-50 font-semibold'
                  : 'text-gray-500 font-medium'
              }`
            }
          >
            <Icon icon={item.icon} size={24} className="mb-0.5" />
            {item.to === '/notifiche' && unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
