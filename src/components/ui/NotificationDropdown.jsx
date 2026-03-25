import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { NOTIFICA_ICONS, NAV_ICONS } from '../../lib/icons'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { NotificationCard } from './NotificationCard'

export function NotificationDropdown({ open, onClose }) {
  const ref = useRef(null)
  const notifications = useNotificationsStore((s) => s.notifications)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead)

  const visible = notifications.slice(0, 10)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    // Delay to avoid closing immediately on the triggering click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[340px] max-h-[480px] flex flex-col bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-base font-semibold text-gray-900">Notifiche</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-sm text-mikai-500 hover:text-mikai-600 font-medium min-h-[48px] flex items-center focus:outline-none focus:ring-2 focus:ring-mikai-400 rounded-lg px-2"
          >
            Segna tutte come lette
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Icon icon={NOTIFICA_ICONS.bell_off} size={32} className="mb-2" />
            <p className="text-sm">Nessuna notifica</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visible.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                compact
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100">
        <NavLink
          to="/notifiche"
          onClick={onClose}
          className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] text-sm font-medium text-mikai-500 hover:bg-gray-50 transition-colors"
        >
          <Icon icon={NAV_ICONS.notifiche} size={16} />
          Vedi tutte le notifiche
        </NavLink>
      </div>
    </div>
  )
}
