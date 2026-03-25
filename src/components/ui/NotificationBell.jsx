import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { NAV_ICONS } from '../../lib/icons'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { NotificationDropdown } from './NotificationDropdown'

export function NotificationBell() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const unreadCount = useNotificationsStore((s) => s.unreadCount)

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount)
  const ariaLabel = unreadCount > 0
    ? `Notifiche — ${unreadCount} non ${unreadCount === 1 ? 'letta' : 'lette'}`
    : 'Notifiche — nessuna nuova'

  function handleDesktopClick() {
    setDropdownOpen((prev) => !prev)
  }

  function handleMobileClick() {
    navigate('/notifiche')
  }

  return (
    <div className="relative">
      {/* Desktop: toggle dropdown */}
      <button
        type="button"
        onClick={handleDesktopClick}
        aria-label={ariaLabel}
        className="hidden md:flex items-center justify-center min-h-[48px] min-w-[48px] rounded-lg text-gray-600 hover:text-mikai-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-mikai-400 focus:ring-offset-1"
      >
        <Icon icon={NAV_ICONS.notifiche} size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold leading-none text-white bg-red-500 rounded-full">
            {badgeText}
          </span>
        )}
      </button>

      {/* Mobile: navigate to /notifiche */}
      <button
        type="button"
        onClick={handleMobileClick}
        aria-label={ariaLabel}
        className="flex md:hidden items-center justify-center min-h-[48px] min-w-[48px] rounded-lg text-gray-600 hover:text-mikai-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-mikai-400 focus:ring-offset-1"
      >
        <Icon icon={NAV_ICONS.notifiche} size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold leading-none text-white bg-red-500 rounded-full">
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown (desktop only) */}
      <NotificationDropdown
        open={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
      />
    </div>
  )
}
