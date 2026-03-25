import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { NOTIFICA_ICONS } from '../../lib/icons'
import { TIPO_NOTIFICA, TIPO_NOTIFICA_COLORE } from '../../lib/constants'
import { formatRelativeTime } from '../../lib/date-utils'
import { useNotificationsStore } from '../../hooks/useNotifications'

const COLOR_MAP = {
  yellow: 'text-yellow-600',
  green: 'text-green-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  mikai: 'text-mikai-500',
}

export function NotificationCard({ notification, compact = false, onNavigate }) {
  const navigate = useNavigate()
  const markAsRead = useNotificationsStore((s) => s.markAsRead)

  const unread = !notification.letta
  const tipo = notification.tipo
  const IconComp = NOTIFICA_ICONS[tipo] || NOTIFICA_ICONS.bell_ring
  const colorClass = COLOR_MAP[TIPO_NOTIFICA_COLORE[tipo]] || 'text-gray-500'

  function handleClick() {
    if (unread) markAsRead(notification.id)
    if (onNavigate) onNavigate()
    if (notification.link) navigate(notification.link)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        flex items-start gap-3 min-h-[48px] cursor-pointer
        transition-colors hover:bg-gray-100
        ${compact ? 'px-4 py-3' : 'px-4 py-4'}
        ${unread ? 'bg-white border-l-[3px] border-l-mikai-400' : 'bg-gray-50 border-l-[3px] border-l-transparent'}
      `}
    >
      {/* Icon */}
      <div className={`shrink-0 mt-0.5 ${colorClass}`}>
        <Icon icon={IconComp} size={compact ? 18 : 20} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${unread ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'}`}
        >
          {notification.titolo}
        </p>
        {notification.messaggio && (
          <p className={`text-gray-500 leading-snug mt-0.5 ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}>
            {notification.messaggio}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {unread && (
        <div className="shrink-0 mt-1.5">
          <div className="w-2 h-2 rounded-full bg-mikai-400" />
          <span className="sr-only">Non letta</span>
        </div>
      )}
    </div>
  )
}
