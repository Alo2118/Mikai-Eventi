import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null

  return (
    <nav aria-label="Percorso" className="hidden md:block text-sm text-gray-500 mb-4">
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <Icon icon={ACTION_ICONS.chevron_right} size={14} />}
            {item.to ? (
              <Link to={item.to} className="hover:text-mikai-400 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
