import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function MobileHeader({ title, subtitle, showBack = true, backTo }) {
  const navigate = useNavigate()

  return (
    <header className="md:hidden sticky top-0 bg-white border-b border-gray-200 z-30 px-4 py-3">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(backTo ?? -1)}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-600 hover:text-gray-900 -ml-2"
            aria-label="Torna indietro"
          >
            <Icon icon={ACTION_ICONS.back} size={24} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
        </div>
      </div>
    </header>
  )
}
