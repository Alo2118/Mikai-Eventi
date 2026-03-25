import { useState } from 'react'
import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function DataTableMobileRow({
  row,
  columns,
  visibleColumns,
  hiddenColumns,
  rowKey,
  selectable,
  selected,
  onToggleSelect,
  onClick,
}) {
  const [expanded, setExpanded] = useState(false)
  const key = rowKey(row)
  const hasHidden = hiddenColumns.length > 0

  function handleToggle(e) {
    e.stopPropagation()
    setExpanded(prev => !prev)
  }

  function handleCheck(e) {
    e.stopPropagation()
    onToggleSelect?.(key)
  }

  function handleClick() {
    if (onClick) onClick(row)
  }

  return (
    <div
      className={`
        md:hidden border-b border-gray-100 px-4 py-3 min-h-[48px]
        ${selected ? 'bg-mikai-50' : 'bg-white'}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={handleClick}
    >
      {/* Primary row: checkbox + visible columns + chevron */}
      <div className="flex items-center gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheck}
            className="min-h-[20px] min-w-[20px] accent-mikai-400 shrink-0"
            aria-label={`Seleziona riga ${key}`}
          />
        )}

        <div className="flex-1 flex items-center gap-3 min-w-0">
          {visibleColumns.map(col => (
            <span key={col.id} className={`text-base text-gray-900 truncate ${col.className || ''}`}>
              {col.render ? col.render(row) : row[col.id]}
            </span>
          ))}
        </div>

        {hasHidden && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={expanded ? 'Comprimi dettagli' : 'Espandi dettagli'}
            className="
              shrink-0 flex items-center justify-center
              min-h-[48px] min-w-[48px] -mr-2
              text-gray-400 hover:text-gray-600
              rounded-lg focus:outline-none focus:ring-2 focus:ring-mikai-400
              transition-colors
            "
          >
            <Icon
              icon={ACTION_ICONS.chevronDown}
              size={20}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && hasHidden && (
        <dl className="mt-2 pl-1 space-y-1">
          {hiddenColumns.map(col => (
            <div key={col.id} className="flex items-baseline gap-2 text-sm">
              <dt className="text-gray-500 shrink-0">{col.label}:</dt>
              <dd className="text-gray-900 truncate">
                {col.render ? col.render(row) : row[col.id]}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
