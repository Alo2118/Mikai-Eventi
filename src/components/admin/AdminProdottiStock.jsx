import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { INPUT_STYLE, SELECT_STYLE, CARD_STYLE, FORM_CONTAINER_STYLE, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { AdminProdottiStockLocations } from './AdminProdottiStockLocations'
import { AdminProdottiStockHistory } from './AdminProdottiStockHistory'

// Sezione Stock della pagina prodotto (solo prodotti gestiti a quantità). Mostra
// disponibile / impegnato / totale a magazzino, distribuzione per posizione con
// rettifica inline, carico lotto e lo storico movimenti.
export function AdminProdottiStock({
  editing,
  stock,
  setStock,
  committed = 0,
  stockLocations = [],
  magazzini = [],
  agenti = [],
  stockHistory = [],
  historyHasMore = false,
  busy = false,
  loadingMore = false,
  onCaricaLotto,
  onRettificaPosizione,
  onReverseAdjustment,
  onLoadMoreHistory,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [lottoQty, setLottoQty] = useState('')
  const [lottoMotivo, setLottoMotivo] = useState('')
  const [lottoDest, setLottoDest] = useState('')

  if (editing.serializzato) return null

  const disponibile = stock.quantita_disponibile ?? 0
  const soglia = stock.soglia_minima ?? 0
  const underThreshold = soglia > 0 && disponibile <= soglia
  const isGadget = editing.tipo === 'gadget'
  const totaleMagazzino = disponibile + (isGadget ? committed : 0)
  const setSoglia = (e) => setStock(s => ({ ...s, soglia_minima: parseInt(e.target.value, 10) || 0 }))

  // Prodotto non ancora creato — solo la soglia (verrà salvata col prodotto)
  if (!editing.id) {
    return (
      <div className={CARD_STYLE + ' md:p-6 space-y-4'}>
        <h3 className="font-semibold text-lg">Stock</h3>
        <div className="max-w-xs">
          <label htmlFor="stock-soglia" className="block text-sm font-medium text-gray-700 mb-1">Soglia minima alert (pz)</label>
          <input id="stock-soglia" type="number" min="0" className={INPUT_STYLE} value={soglia || ''} onChange={setSoglia} />
          <p className="text-sm text-gray-400 mt-1">Dopo aver salvato il prodotto potrai caricare la quantità con "Carica lotto".</p>
        </div>
      </div>
    )
  }

  const lottoN = parseInt(lottoQty, 10)
  const submitCaricaLotto = async () => {
    if (!(lottoN > 0) || !lottoDest) return
    const [type, id] = lottoDest.split(':')
    const res = await onCaricaLotto(lottoN, lottoMotivo, type === 'mag' ? id : null, type === 'agent' ? id : null)
    if (!res?.error) { setLottoQty(''); setLottoMotivo(''); setLottoDest('') }
  }

  return (
    <div className={CARD_STYLE + ' md:p-6'}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between min-h-[48px]">
        <span className="font-semibold text-lg">Stock</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${underThreshold ? 'text-red-600' : 'text-gray-500'}`}>{disponibile} pz</span>
          <Icon icon={ACTION_ICONS.chevron_right} size={18} className={open ? 'rotate-90 transition-transform' : 'transition-transform'} />
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {underThreshold && (
            <div className={SUMMARY_BAR_STYLE + ' flex items-center gap-2 bg-red-50 border-red-200'}>
              <Icon icon={FEEDBACK_ICONS.warning} size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-700">Sotto la soglia minima ({soglia} pz) — riordinare al più presto</span>
            </div>
          )}

          {/* Riepilogo: disponibile / impegnato / totale + soglia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Quantità disponibile</span>
              <div className={`flex flex-col justify-center min-h-[48px] px-4 py-2 rounded-lg border ${underThreshold ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <span className={`text-base ${underThreshold ? 'text-red-700 font-semibold' : 'text-gray-900'}`}>{disponibile} pz</span>
                {isGadget && committed > 0 && (
                  <span className="text-xs text-gray-500">+ {committed} impegnati su eventi · totale a magazzino {totaleMagazzino} pz</span>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="stock-soglia-edit" className="block text-sm font-medium text-gray-700 mb-1">Soglia minima alert (pz)</label>
              <input id="stock-soglia-edit" type="number" min="0" className={INPUT_STYLE} value={soglia || ''} onChange={setSoglia} />
              <p className="text-xs text-gray-400 mt-1">Si salva insieme al prodotto.</p>
            </div>
          </div>

          {/* Distribuzione per posizione + rettifica inline */}
          <AdminProdottiStockLocations
            stockLocations={stockLocations}
            disponibile={disponibile}
            totaleMagazzino={totaleMagazzino}
            magazzini={magazzini}
            agenti={agenti}
            busy={busy}
            onRettificaPosizione={onRettificaPosizione}
          />

          {/* Carica lotto */}
          <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
            <h4 className="font-medium text-base text-gray-800">Carica lotto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="lotto-qty" className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                <input id="lotto-qty" type="number" min="1" className={INPUT_STYLE} value={lottoQty} onChange={e => setLottoQty(e.target.value)} placeholder="es. 50" />
              </div>
              <div>
                <label htmlFor="lotto-dest" className="block text-sm font-medium text-gray-700 mb-1">Destinazione <span className="text-red-500">*</span></label>
                <select id="lotto-dest" className={SELECT_STYLE} value={lottoDest} onChange={e => setLottoDest(e.target.value)}>
                  <option value="">— Seleziona posizione —</option>
                  {magazzini.length > 0 && <optgroup label="Magazzini">{magazzini.map(m => <option key={m.id} value={`mag:${m.id}`}>{m.nome}</option>)}</optgroup>}
                  {agenti.length > 0 && <optgroup label="Agenti">{agenti.map(a => <option key={a.id} value={`agent:${a.id}`}>{a.cognome} {a.nome}</option>)}</optgroup>}
                </select>
              </div>
              <div>
                <label htmlFor="lotto-motivo" className="block text-sm font-medium text-gray-700 mb-1">Motivo (opzionale)</label>
                <input id="lotto-motivo" className={INPUT_STYLE} value={lottoMotivo} onChange={e => setLottoMotivo(e.target.value)} placeholder="es. Nuovo ordine" />
              </div>
            </div>
            {lottoN > 0 && (
              <p className="text-sm text-gray-600">Quantità disponibile {disponibile} → <strong>{disponibile + lottoN} pz</strong></p>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={submitCaricaLotto}
                loading={busy}
                disabled={!(lottoN > 0) || !lottoDest}
                title={!(lottoN > 0) ? 'Inserisci una quantità maggiore di 0' : !lottoDest ? 'Seleziona la destinazione' : ''}
              >
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" /> Carica lotto
              </Button>
            </div>
          </div>

          {/* Storico movimenti */}
          <AdminProdottiStockHistory
            stockHistory={stockHistory}
            historyHasMore={historyHasMore}
            loadingMore={loadingMore}
            magazzini={magazzini}
            agenti={agenti}
            onReverseAdjustment={onReverseAdjustment}
            onLoadMoreHistory={onLoadMoreHistory}
          />
        </div>
      )}
    </div>
  )
}
