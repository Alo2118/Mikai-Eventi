import { Button } from './Button'

export function ActionToolbar({ count, actions = [], onClear }) {
  if (count === 0) return null

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 bg-mikai-50 border border-mikai-200 rounded-xl px-4 py-3 flex-wrap">
      <span className="text-sm font-medium text-mikai-700">
        {count} {count === 1 ? 'selezionato' : 'selezionati'}
      </span>
      <div className="flex gap-2 ml-auto flex-wrap">
        {actions.map((action, i) => (
          <Button key={i} variant="secondary" size="sm" onClick={action.onClick} disabled={action.disabled}>
            {action.label}
          </Button>
        ))}
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Deseleziona
          </Button>
        )}
      </div>
    </div>
  )
}
