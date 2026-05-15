import { useState } from 'react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { INPUT_STYLE, CARD_STYLE } from '../../lib/constants'
import { KitPiecePicker } from './KitPiecePicker'

export function AdminProdottiKit({
  editing,
  kitContents,
  newPiece,
  setNewPiece,
  editingPiece,
  editingPieceData,
  setEditingPieceData,
  onAddPiece,
  onDeletePiece,
  onStartEditPiece,
  onSavePiece,
  onCancelEditPiece,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [deletingPiece, setDeletingPiece] = useState(null)

  if (!editing.id) return null

  return (
    <div className={CARD_STYLE + ' md:p-6'}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between min-h-[48px]">
        <span className="font-semibold text-lg">Contenuto kit (distinta)</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{kitContents.length} pezzi</span>
          <Icon icon={ACTION_ICONS.chevron_right} size={18} className={open ? 'rotate-90 transition-transform' : 'transition-transform'} />
        </div>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          {kitContents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 w-40">Codice</th>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500">Descrizione</th>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 w-20">Quantità</th>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 w-28">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {kitContents.map(kc => (
                    <tr key={kc.id} className="border-b border-gray-100 align-top">
                      {editingPiece === kc.id ? (
                        <>
                          <td className="px-3 py-2" colSpan={2}>
                            <KitPiecePicker
                              value={editingPieceData}
                              onChange={(next) => setEditingPieceData(d => ({ ...d, ...next }))}
                              excludeProductId={editing.id}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" className={INPUT_STYLE + ' w-20'} value={editingPieceData.quantity}
                              onChange={e => setEditingPieceData(d => ({ ...d, quantity: e.target.value }))} />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={onSavePiece} className="text-green-600 hover:text-green-700 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Salva">
                                <Icon icon={ACTION_ICONS.check} size={16} />
                              </button>
                              <button onClick={onCancelEditPiece} className="text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Annulla">
                                <Icon icon={ACTION_ICONS.close} size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-base text-gray-500 font-mono cursor-pointer hover:text-mikai-500 align-top" onClick={() => onStartEditPiece(kc)}>{kc.piece_code || '—'}</td>
                          <td className="px-3 py-2 text-base cursor-pointer hover:text-mikai-500 align-top" onClick={() => onStartEditPiece(kc)}>
                            <span className={kc.piece_product_id ? '' : 'text-gray-700'}>{kc.piece_name}</span>
                            {kc.piece_product_id && (
                              <span className="ml-2 inline-flex items-center text-[10px] uppercase tracking-wide text-mikai-600 bg-mikai-50 border border-mikai-200 rounded px-1.5 py-0.5" title="Collegato al catalogo">
                                catalogo
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-base cursor-pointer hover:text-mikai-500 align-top" onClick={() => onStartEditPiece(kc)}>{kc.quantity}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => onStartEditPiece(kc)} className="text-gray-400 hover:text-mikai-500 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Modifica">
                                <Icon icon={ACTION_ICONS.edit} size={16} />
                              </button>
                              <button onClick={() => setDeletingPiece(kc)} className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Rimuovi pezzo">
                                <Icon icon={ACTION_ICONS.close} size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-2">Nessun pezzo nel kit. Aggiungi i componenti qui sotto.</p>
          )}
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Aggiungi pezzo dal catalogo</label>
              <KitPiecePicker
                value={newPiece}
                onChange={(next) => setNewPiece({ ...newPiece, ...next })}
                excludeProductId={editing.id}
              />
            </div>
            <div className="w-full md:w-24">
              <label htmlFor="kit-piece-qty" className="block text-sm font-medium text-gray-700 mb-1">Qtà</label>
              <input id="kit-piece-qty" type="number" min="1" className={INPUT_STYLE} value={newPiece.quantity} onChange={e => setNewPiece({ ...newPiece, quantity: e.target.value })} />
            </div>
            <Button size="sm" onClick={onAddPiece} disabled={!newPiece.piece_name?.trim()} title={!newPiece.piece_name?.trim() ? 'Seleziona un prodotto o inserisci un nome' : ''}>
              <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />Aggiungi
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingPiece}
        title="Rimuovi pezzo dal kit"
        message={deletingPiece ? `Rimuovere "${deletingPiece.piece_name}" dal contenuto del kit?` : ''}
        confirmLabel="Rimuovi"
        onConfirm={() => { onDeletePiece(deletingPiece.id); setDeletingPiece(null) }}
        onCancel={() => setDeletingPiece(null)}
        danger
      />
    </div>
  )
}
