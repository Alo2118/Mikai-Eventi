import { useState } from 'react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS, POSIZIONE_ICONS } from '../../lib/icons'
import {
  INPUT_STYLE,
  SELECT_STYLE,
  CARD_STYLE,
  FORM_CONTAINER_STYLE,
  SUMMARY_BAR_STYLE,
} from '../../lib/constants'
import { formatDateTime } from '../../lib/date-utils'

function LocationLabel({ loc }) {
  if (loc.magazzino) {
    return (
      <span className="flex items-center gap-1.5">
        <Icon icon={POSIZIONE_ICONS.in_magazzino || MATERIALE_ICONS.warehouse} size={14} className="text-gray-400" />
        {loc.magazzino.nome}
      </span>
    )
  }
  if (loc.agent) {
    return (
      <span className="flex items-center gap-1.5">
        <Icon icon={POSIZIONE_ICONS.magazzino_agente || ACTION_ICONS.user} size={14} className="text-gray-400" />
        {loc.agent.cognome} {loc.agent.nome}
      </span>
    )
  }
  return <span className="text-gray-400">Posizione sconosciuta</span>
}

export function AdminProdottiStock({
  editing,
  stock,
  setStock,
  stockSaving,
  stockUnderThreshold,
  lottoQty,
  setLottoQty,
  lottoMotivo,
  setLottoMotivo,
  lottoSaving,
  stockHistory,
  showHistory,
  setShowHistory,
  onSaveStock,
  onCaricaLotto,
  onUpdateAdjustment,
  onDeleteAdjustment,
  stockLocations = [],
  magazzini = [],
  agenti = [],
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [editingAdj, setEditingAdj] = useState(null)
  const [editDelta, setEditDelta] = useState('')
  const [editMotivo, setEditMotivo] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [deletingAdj, setDeletingAdj] = useState(null)
  const [lottoDest, setLottoDest] = useState('')

  if (editing.serializzato) return null

  if (!editing.id) {
    return (
      <div className={CARD_STYLE + ' md:p-6 space-y-4'}>
        <h3 className="font-semibold text-lg">Stock</h3>
        <div className="max-w-xs">
          <label htmlFor="stock-soglia" className="block text-sm font-medium text-gray-700 mb-1">Soglia minima alert (pz)</label>
          <input
            id="stock-soglia"
            type="number"
            min="0"
            className={INPUT_STYLE}
            value={stock.soglia_minima ?? ''}
            onChange={e => setStock(s => ({ ...s, soglia_minima: parseInt(e.target.value) || 0 }))}
          />
          <p className="text-sm text-gray-400 mt-1">Dopo aver creato il prodotto, usa "Carica lotto" per aggiungere la quantità.</p>
        </div>
      </div>
    )
  }

  const startEditAdj = (h) => {
    setEditingAdj(h.id)
    setEditDelta(String(h.delta))
    setEditMotivo(h.motivo || '')
  }

  const handleSaveAdj = async () => {
    const newDelta = parseInt(editDelta)
    if (!newDelta || !editingAdj) return
    setEditSaving(true)
    await onUpdateAdjustment(editingAdj, newDelta, editMotivo)
    setEditSaving(false)
    setEditingAdj(null)
  }

  const handleConfirmDelete = async () => {
    if (!deletingAdj) return
    setEditSaving(true)
    await onDeleteAdjustment(deletingAdj.id)
    setEditSaving(false)
    setDeletingAdj(null)
  }

  const lottoDisabledReason = !lottoQty ? 'Inserisci la quantità'
    : parseInt(lottoQty, 10) <= 0 ? 'La quantità deve essere maggiore di 0'
    : !lottoDest ? 'Seleziona la destinazione'
    : ''

  const handleLottoSubmit = () => {
    const [type, id] = (lottoDest || '').split(':')
    const magazzinoId = type === 'mag' ? id : null
    const agentUserId = type === 'agent' ? id : null
    onCaricaLotto(magazzinoId, agentUserId)
    setLottoDest('')
  }

  const adjDestLabel = (h) => {
    if (h.magazzino_id) {
      const m = magazzini.find(x => x.id === h.magazzino_id)
      return m ? m.nome : 'Magazzino'
    }
    if (h.agent_user_id) {
      const a = agenti.find(x => x.id === h.agent_user_id)
      return a ? `${a.cognome} ${a.nome}` : 'Agente'
    }
    return null
  }

  return (
    <div className={CARD_STYLE + ' md:p-6'}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between min-h-[48px]">
        <h3 className="font-semibold text-lg">Stock</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{stock.quantita_disponibile ?? 0} pz disponibili</span>
          <Icon icon={ACTION_ICONS.chevron_right} size={18} className={open ? 'rotate-90 transition-transform' : 'transition-transform'} />
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {stockUnderThreshold && stock.quantita_disponibile !== null && (
            <div className={SUMMARY_BAR_STYLE + ' flex items-center gap-2 bg-red-50 border-red-200'}>
              <Icon icon={MATERIALE_ICONS.package} size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-700">Sotto soglia minima — riordinare al più presto</span>
            </div>
          )}

          {/* Current stock (read-only) + threshold */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantità disponibile</label>
              <div className={`flex items-center min-h-[48px] px-4 py-3 text-base rounded-lg border ${stockUnderThreshold ? 'border-red-300 bg-red-50 text-red-700 font-semibold' : 'border-gray-200 bg-gray-50 text-gray-900'}`}>
                {stock.quantita_disponibile ?? 0} pz
              </div>
            </div>
            <div>
              <label htmlFor="stock-soglia-edit" className="block text-sm font-medium text-gray-700 mb-1">Soglia minima alert (pz)</label>
              <div className="flex items-center gap-2">
                <input
                  id="stock-soglia-edit"
                  type="number"
                  min="0"
                  className={INPUT_STYLE}
                  value={stock.soglia_minima ?? ''}
                  onChange={e => setStock(s => ({ ...s, soglia_minima: parseInt(e.target.value) || 0 }))}
                />
                <Button size="sm" onClick={onSaveStock} loading={stockSaving}>
                  Salva
                </Button>
              </div>
            </div>
          </div>

          {/* Stock per posizione */}
          {stockLocations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-500">Distribuzione per posizione</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {stockLocations.filter(l => l.quantita > 0).map(loc => (
                  <div key={loc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <LocationLabel loc={loc} />
                    <span className="font-medium text-gray-900">{loc.quantita} pz</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carica lotto */}
          <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
            <h4 className="font-medium text-base text-gray-800">Carica lotto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="lotto-qty" className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                <input
                  id="lotto-qty"
                  type="number"
                  min="1"
                  className={INPUT_STYLE}
                  value={lottoQty}
                  onChange={e => setLottoQty(e.target.value)}
                  placeholder="es. 50"
                />
              </div>
              <div>
                <label htmlFor="lotto-dest" className="block text-sm font-medium text-gray-700 mb-1">Destinazione <span className="text-red-500">*</span></label>
                <select
                  id="lotto-dest"
                  className={SELECT_STYLE}
                  value={lottoDest}
                  onChange={e => setLottoDest(e.target.value)}
                >
                  <option value="">-- Seleziona --</option>
                  {magazzini.length > 0 && (
                    <optgroup label="Magazzini">
                      {magazzini.map(m => <option key={m.id} value={`mag:${m.id}`}>{m.nome}</option>)}
                    </optgroup>
                  )}
                  {agenti.length > 0 && (
                    <optgroup label="Agenti">
                      {agenti.map(a => <option key={a.id} value={`agent:${a.id}`}>{a.cognome} {a.nome}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="lotto-motivo" className="block text-sm font-medium text-gray-700 mb-1">Motivo (opzionale)</label>
                <input
                  id="lotto-motivo"
                  className={INPUT_STYLE}
                  value={lottoMotivo}
                  onChange={e => setLottoMotivo(e.target.value)}
                  placeholder="es. Nuovo ordine"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleLottoSubmit}
                loading={lottoSaving}
                disabled={!lottoQty || parseInt(lottoQty) <= 0 || !lottoDest}
                title={lottoDisabledReason}
              >
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                Carica lotto
              </Button>
            </div>
          </div>

          {/* Stock history */}
          {stockHistory.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-mikai-600 hover:text-mikai-800 min-h-[48px]"
              >
                <Icon icon={ACTION_ICONS.chevron_right} size={16} className={showHistory ? 'rotate-90 transition-transform' : 'transition-transform'} />
                Storico movimenti ({stockHistory.length})
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1">
                  {stockHistory.map(h => (
                    <div key={h.id} className="rounded-lg border border-gray-100 px-3 py-2">
                      {editingAdj === h.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Quantità</label>
                              <input type="number" className={INPUT_STYLE} value={editDelta} onChange={e => setEditDelta(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Motivo</label>
                              <input className={INPUT_STYLE} value={editMotivo} onChange={e => setEditMotivo(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <Button size="sm" onClick={handleSaveAdj} loading={editSaving} disabled={!editDelta || parseInt(editDelta) === 0}>Salva</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingAdj(null)}>Annulla</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <span className={`font-mono font-medium ${h.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {h.delta > 0 ? '+' : ''}{h.delta}
                            </span>
                            <span className="text-gray-500">{h.quantita_prima} → {h.quantita_dopo} pz</span>
                            {adjDestLabel(h) && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{adjDestLabel(h)}</span>
                            )}
                            {h.motivo && <span className="text-gray-400 hidden md:inline">— {h.motivo}</span>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="text-right text-gray-400 text-xs mr-2 hidden md:block">
                              <div>{h.user?.nome} {h.user?.cognome}</div>
                              <div>{formatDateTime(h.created_at)}</div>
                            </div>
                            <button onClick={() => startEditAdj(h)} className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-mikai-500 rounded-lg" aria-label="Modifica movimento">
                              <Icon icon={ACTION_ICONS.edit} size={16} />
                            </button>
                            <button onClick={() => setDeletingAdj(h)} className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg" aria-label="Elimina movimento">
                              <Icon icon={ACTION_ICONS.close} size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingAdj}
        title="Elimina movimento"
        message={`Eliminare il movimento di ${deletingAdj?.delta > 0 ? '+' : ''}${deletingAdj?.delta} pz? La quantità verrà ripristinata automaticamente.`}
        confirmLabel="Elimina"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingAdj(null)}
        danger
      />
    </div>
  )
}
