import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE } from '../../lib/constants'
import { StatusBadge } from '../ui/StatusBadge'

export function MaterialListRow({ row, canEdit, canApprove, onUpdate, onRemove, onConfirm, onReject, onStartPreparation }) {
  const [expanded, setExpanded] = useState(false)
  const isPending = row.stato === 'richiesto'
  const isConfirmed = row.stato === 'approvato'
  const isRejected = row.stato === 'rifiutato'
  const isInPrep = row.stato === 'in_preparazione'
  const product = row.product

  // Per-row editability: editable if pending or confirmed (not in_preparazione)
  const rowEditable = canEdit && (isPending || isConfirmed) && !isInPrep
  // Removable only if pending
  const rowRemovable = canEdit && isPending

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isInPrep ? 'border-mikai-300 bg-mikai-50/30' :
      isConfirmed ? 'border-green-200 bg-green-50/30' :
      isRejected ? 'border-red-200 bg-red-50/30' :
      'border-gray-200 bg-white'
    }`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
      >
        {/* Status indicator bar */}
        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
          isInPrep ? 'bg-mikai-400' :
          isConfirmed ? 'bg-green-400' :
          isRejected ? 'bg-red-400' :
          'bg-gray-300'
        }`} />

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900 truncate">{product?.nome}</p>
          <p className="text-sm text-gray-500">{product?.brand?.nome}</p>
        </div>

        {/* Quantity — editable with +/- if row is editable */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {rowEditable ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate(row.id, { quantita: Math.max(1, (row.quantita || 1) - 1) }) }}
                className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 transition-colors"
                aria-label="Diminuisci"
              >
                −
              </button>
              <span className="w-8 text-center text-base font-bold text-gray-900">{row.quantita || 1}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate(row.id, { quantita: (row.quantita || 1) + 1 }) }}
                className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 transition-colors"
                aria-label="Aumenta"
              >
                +
              </button>
            </>
          ) : (
            <span className="text-base text-gray-600 font-medium">×{row.quantita || 1}</span>
          )}
        </div>

        {/* Status badge */}
        <StatusBadge
          stato={row.stato}
          labels={STATO_MATERIALE_LISTA}
          colors={STATO_MATERIALE_LISTA_COLORE}
        />

        {/* Remove button — only pending rows */}
        {rowRemovable && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(row.id) }}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-500"
            aria-label={`Rimuovi ${product?.nome}`}
          >
            <Icon icon={ACTION_ICONS.close} size={20} />
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Info: if confirmed row is modified, it goes back to pending */}
          {isConfirmed && canEdit && (
            <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
              Se modifichi la quantità, la riga tornerà in attesa di conferma.
            </p>
          )}

          {/* Commerciale notes */}
          {rowEditable && isPending ? (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Le tue note</label>
              <input
                type="text"
                value={row.note_commerciale || ''}
                onChange={(e) => onUpdate(row.id, { note_commerciale: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
                placeholder="Es. Il chirurgo lo richiede specificamente..."
              />
            </div>
          ) : row.note_commerciale ? (
            <div>
              <p className="text-sm font-medium text-gray-500">Note commerciale</p>
              <p className="text-base text-gray-700">{row.note_commerciale}</p>
            </div>
          ) : null}

          {/* Office notes */}
          {row.note_ufficio && (
            <div>
              <p className="text-sm font-medium text-gray-500">Note ufficio</p>
              <p className="text-base text-gray-700">{row.note_ufficio}</p>
            </div>
          )}

          {/* Rejection reason */}
          {isRejected && row.motivo_rifiuto && (
            <div className="bg-red-50 rounded-lg p-3" role="alert">
              <p className="text-sm font-medium text-red-600">Motivo rifiuto</p>
              <p className="text-base text-red-800">{row.motivo_rifiuto}</p>
            </div>
          )}

          {/* In preparazione notice */}
          {isInPrep && (
            <div className="bg-mikai-50 rounded-lg p-3">
              <p className="text-base font-medium text-mikai-700">Materiale in preparazione — non modificabile</p>
            </div>
          )}

          {/* Approval actions for ufficio */}
          {canApprove && isPending && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => onConfirm(row.id)}
                className="flex items-center gap-2 px-5 py-3 bg-green-100 hover:bg-green-200 rounded-xl text-base font-medium text-green-800 min-h-[48px] transition-colors"
                aria-label="Conferma"
              >
                <Icon icon={ACTION_ICONS.approve} size={18} /> Conferma
              </button>
              <button
                onClick={() => onReject(row.id, product?.nome)}
                className="flex items-center gap-2 px-5 py-3 bg-red-100 hover:bg-red-200 rounded-xl text-base font-medium text-red-800 min-h-[48px] transition-colors"
                aria-label="Rifiuta"
              >
                <Icon icon={ACTION_ICONS.reject} size={18} /> Rifiuta
              </button>
            </div>
          )}

          {/* Start preparation button for ufficio on confirmed rows */}
          {canApprove && isConfirmed && onStartPreparation && (
            <button
              onClick={() => onStartPreparation(row.id)}
              className="flex items-center gap-2 px-5 py-3 bg-mikai-100 hover:bg-mikai-200 rounded-xl text-base font-medium text-mikai-700 min-h-[48px] transition-colors"
            >
              <Icon icon={ACTION_ICONS.forward} size={18} /> Avvia preparazione
            </button>
          )}
        </div>
      )}
    </div>
  )
}
