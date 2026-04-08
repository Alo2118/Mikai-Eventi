import { useState, useRef } from 'react'
import { Icon } from '../ui/Icon'
import { LOGISTICA_PERSONE_ICONS, ACTION_ICONS } from '../../lib/icons'
import { TEXTAREA_STYLE } from '../../lib/constants'

// ─── Inline note (expandable, for mobile cards) ──────────────
export function InlineNote({ note, onSave, canEdit }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note || '')

  if (!note && !canEdit) return null

  const handleSave = () => {
    if (draft !== note) onSave(draft.trim() || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-2 w-full">
        <textarea
          className={TEXTAREA_STYLE}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Scrivi una nota..."
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={() => { setEditing(false); setDraft(note || '') }} className="text-sm text-gray-500 hover:text-gray-700 min-h-[48px] px-3">Annulla</button>
          <button onClick={handleSave} className="text-sm text-mikai-600 font-medium hover:text-mikai-800 min-h-[48px] px-3">Salva</button>
        </div>
      </div>
    )
  }

  if (!note) {
    return (
      <button
        onClick={() => { setDraft(''); setEditing(true) }}
        className="p-1 rounded transition-colors text-gray-300 hover:text-gray-500"
        aria-label="Aggiungi nota"
      >
        <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={14} />
      </button>
    )
  }

  const truncated = note.length > 50 && !expanded
  return (
    <div className="flex items-start gap-1 min-w-0">
      <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={14} className="text-mikai-500 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-gray-600">
        {truncated ? note.slice(0, 50) + '...' : note}
        {note.length > 50 && (
          <button onClick={() => setExpanded(!expanded)} className="text-mikai-500 hover:text-mikai-700 ml-1 text-xs font-medium">
            {expanded ? 'meno' : 'tutto'}
          </button>
        )}
      </span>
      {canEdit && (
        <button onClick={() => { setDraft(note); setEditing(true) }} className="text-gray-400 hover:text-mikai-500 p-0.5 flex-shrink-0" aria-label="Modifica nota">
          <Icon icon={ACTION_ICONS.edit} size={12} />
        </button>
      )}
    </div>
  )
}

// ─── Note icon button (compact, for desktop table) ─────────────
export function NotePopover({ note, onSave, canEdit }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note || '')
  const ref = useRef(null)

  if (!note && !canEdit) return null

  const handleSave = () => {
    if (draft !== note) onSave(draft.trim() || null)
    setEditing(false)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setDraft(note || '') }}
        className={`p-1 rounded transition-colors ${note ? 'text-mikai-500 hover:text-mikai-700' : 'text-gray-300 hover:text-gray-500'}`}
        aria-label={note ? 'Vedi nota' : 'Aggiungi nota'}
      >
        <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={14} />
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-[220px]">
          {editing || !note ? (
            <div className="space-y-2">
              <textarea
                className={TEXTAREA_STYLE + ' !min-h-[60px]'}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Scrivi una nota..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setOpen(false); setEditing(false) }} className="text-sm text-gray-500 hover:text-gray-700 min-h-[48px] px-2">Annulla</button>
                <button onClick={handleSave} className="text-sm text-mikai-600 font-medium hover:text-mikai-800 min-h-[48px] px-2">Salva</button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="text-sm text-mikai-500 mt-2 hover:text-mikai-700 min-h-[48px]">Modifica</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
