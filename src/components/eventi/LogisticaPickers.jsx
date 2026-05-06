import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { INPUT_STYLE, TAVOLO_COLORI } from '../../lib/constants'

export function MoreMenu({ items }) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-label="Altre azioni">
        <Icon icon={ACTION_ICONS.more} size={18} />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
            {items.map((item, i) => item.divider ? (
              <div key={i} className="border-t border-gray-100 my-1" />
            ) : (
              <button key={i} onClick={() => { item.onClick(); setOpen(false) }}
                disabled={item.disabled} className="w-full text-left px-3 py-2 text-sm min-h-[48px] md:min-h-[44px] hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                {item.icon && <Icon icon={item.icon} size={16} className="text-gray-400" />}
                <span>{item.label}</span>
                {item.active && <span className="ml-auto text-mikai-500">●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function StaffPicker({ users, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = users.find(u => u.id === value)
  const filtered = query
    ? users.filter(u => `${u.cognome} ${u.nome} ${u.ruolo}`.toLowerCase().includes(query.toLowerCase()))
    : users

  return (
    <div className="relative">
      <input
        className={INPUT_STYLE}
        value={selected ? `${selected.cognome} ${selected.nome}` : query}
        onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Cerca persona..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(u => (
            <button key={u.id} type="button"
              onClick={() => { onChange(u.id); setQuery(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 min-h-[48px]"
            >
              <span className="font-medium">{u.cognome} {u.nome}</span>
              <span className="text-gray-400 ml-1">({u.ruolo})</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}

export function TavoloBadge({ tavolo, compact }) {
  if (!tavolo) return <span className="text-gray-400">—</span>
  const colore = TAVOLO_COLORI[tavolo.colore]
  return (
    <span className="inline-flex items-center gap-1 font-medium"
      title={`Tavolo ${tavolo.numero}${colore ? ` (${colore.label})` : ''}${tavolo.nome ? ` — ${tavolo.nome}` : ''}`}>
      {colore && <span className={`w-2.5 h-2.5 rounded-full ${colore.dot} shrink-0`} aria-hidden="true" />}
      <span>T{tavolo.numero}</span>
      {!compact && colore && <span className="text-xs text-gray-500">{colore.label}</span>}
    </span>
  )
}
