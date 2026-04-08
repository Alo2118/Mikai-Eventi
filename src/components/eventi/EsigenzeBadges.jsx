import { useState, useRef } from 'react'
import { Icon } from '../ui/Icon'
import { LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import { INPUT_STYLE } from '../../lib/constants'

export function EsigenzeBadges({ person, compact = false, canEdit = false, onSave }) {
  const alimentari = person.esigenze_alimentari
  const accessibilita = person.esigenze_accessibilita
  const [open, setOpen] = useState(false)
  const [draftAlim, setDraftAlim] = useState(alimentari || '')
  const [draftAcc, setDraftAcc] = useState(accessibilita || '')
  const ref = useRef(null)

  if (!alimentari && !accessibilita && !canEdit) return null

  const handleOpen = () => {
    if (!canEdit) return
    setDraftAlim(alimentari || '')
    setDraftAcc(accessibilita || '')
    setOpen(true)
  }

  const handleSave = () => {
    const newAlim = draftAlim.trim() || null
    const newAcc = draftAcc.trim() || null
    if (newAlim !== (alimentari || null) || newAcc !== (accessibilita || null)) {
      onSave({ esigenze_alimentari: newAlim, esigenze_accessibilita: newAcc })
    }
    setOpen(false)
  }

  const editForm = open && (
    <div className={compact ? 'absolute z-20 left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-[280px]' : 'space-y-2 w-full'}>
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esigenze alimentari</label>
          <input className={INPUT_STYLE}
            value={draftAlim} onChange={e => setDraftAlim(e.target.value)} placeholder="Es: vegetariano, celiaco..." autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esigenze accessibilità</label>
          <input className={INPUT_STYLE}
            value={draftAcc} onChange={e => setDraftAcc(e.target.value)} placeholder="Es: sedia a rotelle..." />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 min-h-[48px] px-3">Annulla</button>
          <button onClick={handleSave} className="text-sm text-mikai-600 font-medium hover:text-mikai-800 min-h-[48px] px-3">Salva</button>
        </div>
      </div>
    </div>
  )

  if (compact) {
    const hasBadges = alimentari || accessibilita
    return (
      <div className="relative inline-flex" ref={ref}>
        {hasBadges ? (
          <button onClick={handleOpen} className={`inline-flex gap-1 ${canEdit ? 'cursor-pointer hover:opacity-80' : ''}`} aria-label="Esigenze" type="button">
            {alimentari && (
              <span title={`Alimentari: ${alimentari}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={12} />
              </span>
            )}
            {accessibilita && (
              <span title={`Accessibilità: ${accessibilita}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={12} />
              </span>
            )}
          </button>
        ) : canEdit ? (
          <button onClick={handleOpen} className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors" aria-label="Aggiungi esigenze" type="button">
            <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={14} />
          </button>
        ) : null}
        {editForm}
      </div>
    )
  }

  // Full mode for mobile cards
  const hasBadges = alimentari || accessibilita
  return (
    <div>
      {hasBadges ? (
        <button onClick={handleOpen} className={`flex flex-wrap gap-1 ${canEdit ? 'cursor-pointer hover:opacity-80' : ''}`} type="button">
          {alimentari && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={12} />
              {alimentari}
            </span>
          )}
          {accessibilita && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={12} />
              {accessibilita}
            </span>
          )}
        </button>
      ) : canEdit ? (
        <button onClick={handleOpen} className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors" aria-label="Aggiungi esigenze" type="button">
          <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={14} />
        </button>
      ) : null}
      {editForm}
    </div>
  )
}
