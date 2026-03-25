import { useState, useMemo, useCallback } from 'react'
import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { DataTableMobileRow } from './DataTableMobileRow'

function nextSortDirection(current) {
  if (!current) return 'asc'
  if (current === 'asc') return 'desc'
  return null
}

function SortIcon({ direction }) {
  if (direction === 'asc') return <Icon icon={ACTION_ICONS.sortAsc} size={14} />
  if (direction === 'desc') return <Icon icon={ACTION_ICONS.sortDesc} size={14} />
  return <Icon icon={ACTION_ICONS.sortAsc} size={14} className="opacity-0 group-hover:opacity-40" />
}

export function DataTable({
  columns,
  rows,
  rowKey,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  groupBy,
  groupLabel,
  emptyMessage = 'Nessun risultato',
  onRowClick,
  renderExpandedRow,
}) {
  const [sort, setSort] = useState({ columnId: null, direction: null })
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set())
  const [expandedRowKey, setExpandedRowKey] = useState(null)

  const visibleColumns = useMemo(() => columns.filter(c => (c.priority || 1) <= 1), [columns])
  const hiddenColumns = useMemo(() => columns.filter(c => c.priority === 2), [columns])

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sort.columnId || !sort.direction) return rows
    const col = columns.find(c => c.id === sort.columnId)
    if (!col) return rows
    const getValue = col.sortValue || (r => r[col.id])
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = getValue(a) ?? ''
      const vb = getValue(b) ?? ''
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [rows, sort, columns])

  // Grouping
  const groups = useMemo(() => {
    if (!groupBy) return null
    const map = new Map()
    for (const row of sortedRows) {
      const key = groupBy(row) ?? '__ungrouped__'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(row)
    }
    return map
  }, [sortedRows, groupBy])

  const handleSort = useCallback((colId) => {
    setSort(prev => ({
      columnId: colId,
      direction: prev.columnId === colId ? nextSortDirection(prev.direction) : 'asc',
    }))
  }, [])

  const toggleGroup = useCallback((key) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const toggleRow = useCallback((key) => {
    setExpandedRowKey(prev => prev === key ? null : key)
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (!onSelectionChange) return
    const allKeys = rows.map(r => rowKey(r))
    const allSelected = allKeys.every(k => selectedKeys?.has(k))
    onSelectionChange(allSelected ? new Set() : new Set(allKeys))
  }, [rows, rowKey, selectedKeys, onSelectionChange])

  const toggleSelectRow = useCallback((key) => {
    if (!onSelectionChange || !selectedKeys) return
    const next = new Set(selectedKeys)
    next.has(key) ? next.delete(key) : next.add(key)
    onSelectionChange(next)
  }, [selectedKeys, onSelectionChange])

  const toggleSelectGroup = useCallback((groupRows) => {
    if (!onSelectionChange || !selectedKeys) return
    const keys = groupRows.map(r => rowKey(r))
    const allSelected = keys.every(k => selectedKeys.has(k))
    const next = new Set(selectedKeys)
    keys.forEach(k => allSelected ? next.delete(k) : next.add(k))
    onSelectionChange(next)
  }, [rowKey, selectedKeys, onSelectionChange])

  const colSpan = columns.length + (selectable ? 1 : 0)
  const allSelected = rows.length > 0 && rows.every(r => selectedKeys?.has(rowKey(r)))

  function renderHeaderRow() {
    return (
      <tr>
        {selectable && (
          <th className="w-12 px-3 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="min-h-[20px] min-w-[20px] accent-mikai-400"
              aria-label="Seleziona tutto"
            />
          </th>
        )}
        {columns.map(col => {
          const hiddenOnMobile = col.priority === 2 ? 'hidden md:table-cell' : ''
          return (
            <th
              key={col.id}
              className={`
                px-4 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wide
                ${hiddenOnMobile} ${col.className || ''}
                ${col.sortable ? 'cursor-pointer select-none group' : ''}
              `}
              onClick={col.sortable ? () => handleSort(col.id) : undefined}
            >
              <span className="flex items-center gap-1.5">
                {col.label}
                {col.sortable && <SortIcon direction={sort.columnId === col.id ? sort.direction : null} />}
              </span>
            </th>
          )
        })}
      </tr>
    )
  }

  function renderDataRow(row) {
    const key = rowKey(row)
    const selected = selectedKeys?.has(key)
    const isExpanded = expandedRowKey === key

    return [
      <tr
        key={key}
        className={`
          min-h-[48px] border-b border-gray-100 transition-colors
          ${selected ? 'bg-mikai-50' : 'hover:bg-gray-50'}
          ${onRowClick || renderExpandedRow ? 'cursor-pointer' : ''}
        `}
        onClick={() => {
          if (onRowClick) onRowClick(row)
          if (renderExpandedRow) toggleRow(key)
        }}
      >
        {selectable && (
          <td className="w-12 px-3 py-3" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => toggleSelectRow(key)}
              className="min-h-[20px] min-w-[20px] accent-mikai-400"
              aria-label={`Seleziona riga ${key}`}
            />
          </td>
        )}
        {columns.map(col => {
          const hiddenOnMobile = col.priority === 2 ? 'hidden md:table-cell' : ''
          return (
            <td
              key={col.id}
              className={`px-4 py-3 text-base text-gray-900 ${hiddenOnMobile} ${col.className || ''}`}
            >
              {col.render ? col.render(row) : row[col.id]}
            </td>
          )
        })}
      </tr>,
      isExpanded && renderExpandedRow && (
        <tr key={`${key}-expanded`} className="bg-gray-50">
          <td colSpan={colSpan} className="px-4 py-3">
            {renderExpandedRow(row)}
          </td>
        </tr>
      ),
    ]
  }

  function renderGroupRows() {
    if (!groups) return sortedRows.map(renderDataRow)

    return Array.from(groups.entries()).map(([groupKey, groupRows]) => {
      const collapsed = collapsedGroups.has(groupKey)
      const label = groupLabel ? groupLabel(groupKey) : groupKey
      const groupAllSelected = groupRows.every(r => selectedKeys?.has(rowKey(r)))

      return [
        <tr
          key={`group-${groupKey}`}
          className="bg-gray-100 cursor-pointer"
          onClick={() => toggleGroup(groupKey)}
        >
          {selectable && (
            <td className="w-12 px-3 py-2" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={groupAllSelected}
                onChange={() => toggleSelectGroup(groupRows)}
                className="min-h-[20px] min-w-[20px] accent-mikai-400"
                aria-label={`Seleziona gruppo ${label}`}
              />
            </td>
          )}
          <td colSpan={selectable ? columns.length : colSpan} className="px-4 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Icon
                icon={ACTION_ICONS.chevronDown}
                size={16}
                className={`transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
              />
              {label}
              <span className="text-gray-400 font-normal">({groupRows.length})</span>
            </span>
          </td>
        </tr>,
        ...(!collapsed ? groupRows.map(renderDataRow) : []),
      ]
    })
  }

  // Mobile rows
  function renderMobileRows() {
    const rowsToRender = groups
      ? Array.from(groups.values()).flat()
      : sortedRows

    return rowsToRender.map(row => (
      <DataTableMobileRow
        key={rowKey(row)}
        row={row}
        columns={columns}
        visibleColumns={visibleColumns}
        hiddenColumns={hiddenColumns}
        rowKey={rowKey}
        selectable={selectable}
        selected={!!selectedKeys?.has(rowKey(row))}
        onToggleSelect={toggleSelectRow}
        onClick={onRowClick}
      />
    ))
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">{renderHeaderRow()}</thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-500 text-base">
                  {emptyMessage}
                </td>
              </tr>
            ) : renderGroupRows()}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 text-base">{emptyMessage}</div>
        ) : renderMobileRows()}
      </div>
    </>
  )
}
