import { useState } from 'react'
import { SearchInput } from './SearchInput'
import { Button } from './Button'
import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { CARD_HOVER_STYLE } from '../../lib/constants'
import { EmptyState } from './EmptyState'

export function AdminTable({ columns, rows, searchField, onAdd, onEdit, onDelete, addLabel = 'Nuovo' }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)

  let filtered = rows
  if (search && searchField) {
    const q = search.toLowerCase()
    filtered = filtered.filter(r => String(r[searchField] || '').toLowerCase().includes(q))
  }

  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? ''
      const vb = b[sortCol] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'it')
      return sortAsc ? cmp : -cmp
    })
  }

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Cerca..." />
        </div>
        {onAdd && (
          <Button onClick={onAdd}>
            <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
            {addLabel}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nessun risultato" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortCol === col.key && (
                        <span className="ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>
                      )}
                    </th>
                  ))}
                  {onDelete && <th className="px-4 py-3 w-16" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onEdit?.(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-base text-gray-900 min-h-[48px]">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                    {onDelete && (
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(row) }}
                          className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                          aria-label="Elimina"
                        >
                          <Icon icon={ACTION_ICONS.close} size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((row) => (
              <div
                key={row.id}
                className={CARD_HOVER_STYLE + ' cursor-pointer'}
                onClick={() => onEdit?.(row)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onEdit?.(row) }}
              >
                <div className="space-y-1">
                  {columns.map((col, i) => (
                    <div key={col.key} className={i === 0 ? 'font-semibold text-gray-900' : 'text-sm text-gray-600'}>
                      {i > 0 && <span className="text-gray-400">{col.label}: </span>}
                      {col.render ? col.render(row) : row[col.key]}
                    </div>
                  ))}
                </div>
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(row) }}
                    className="mt-2 text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                    aria-label="Elimina"
                  >
                    <Icon icon={ACTION_ICONS.close} size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
