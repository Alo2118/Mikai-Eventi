import { Icon } from './Icon'

/**
 * BulkActionBar — sticky bottom bar for bulk selection actions.
 * Appears above BottomBar on mobile (bottom-20) and bottom-4 on desktop.
 *
 * Props:
 *   selectedCount  number       — items currently selected
 *   onDeselectAll  () => void   — clear all selections
 *   actions        Array<{
 *     label: string,
 *     icon: LucideComponent,
 *     onClick: () => void,
 *     variant?: 'primary'|'danger'|'secondary',
 *     loading?: bool,
 *   }>
 */
export function BulkActionBar({ selectedCount, onDeselectAll, actions = [] }) {
  if (selectedCount === 0) return null

  return (
    <div
      role="toolbar"
      aria-label="Azioni sui selezionati"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-68 z-40
                 bg-white border border-mikai-200 rounded-xl px-4 py-3 shadow-lg
                 flex items-center gap-3 flex-wrap
                 animate-in slide-in-from-bottom-4 duration-200"
    >
      {/* Count badge */}
      <span className="text-sm font-semibold text-mikai-700 shrink-0">
        {selectedCount} {selectedCount === 1 ? 'selezionato' : 'selezionati'}
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {actions.map((action) => (
          <ActionButton key={action.label} action={action} />
        ))}
      </div>

      {/* Deselect */}
      <button
        onClick={onDeselectAll}
        className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 shrink-0 min-h-[48px] px-1"
        aria-label="Deseleziona tutto"
      >
        Deseleziona
      </button>
    </div>
  )
}

function ActionButton({ action }) {
  const { label, icon, onClick, variant = 'secondary', loading = false } = action

  const variantClasses = {
    primary: 'bg-mikai-400 hover:bg-mikai-500 text-white border-mikai-400',
    danger: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200',
    secondary: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200',
    success: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
  }

  const classes = variantClasses[variant] || variantClasses.secondary

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed ${classes}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      ) : icon ? (
        <Icon icon={icon} size={16} />
      ) : null}
      {label}
    </button>
  )
}
