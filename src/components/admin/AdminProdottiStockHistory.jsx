import { useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { formatDateTime } from '../../lib/date-utils'
import { formatStockDelta } from '../../lib/format-utils'

// Storico movimenti stock (append-only): rettifiche manuali, carichi, consumi/rientri
// da eventi. Il singolo movimento si annulla con uno storno (movimento opposto), mai cancellando.
export function AdminProdottiStockHistory({
  stockHistory = [],
  historyHasMore = false,
  loadingMore = false,
  magazzini = [],
  agenti = [],
  onReverseAdjustment,
  onLoadMoreHistory,
}) {
  const [open, setOpen] = useState(false)
  const [stornoTarget, setStornoTarget] = useState(null)

  if (stockHistory.length === 0) return null

  const destLabel = (h) => {
    if (h.magazzino_id) return magazzini.find(m => m.id === h.magazzino_id)?.nome || 'Magazzino'
    if (h.agent_user_id) { const a = agenti.find(x => x.id === h.agent_user_id); return a ? `${a.cognome} ${a.nome}` : 'Agente' }
    return null
  }

  const confirmStorno = async () => {
    if (!stornoTarget) return
    await onReverseAdjustment(stornoTarget.id)
    setStornoTarget(null)
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 text-sm font-medium text-mikai-600 hover:text-mikai-800 min-h-[48px]">
        <Icon icon={ACTION_ICONS.chevron_right} size={16} className={open ? 'rotate-90 transition-transform' : 'transition-transform'} />
        Storico movimenti ({stockHistory.length}{historyHasMore ? '+' : ''})
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {stockHistory.map(h => (
            <div key={h.id} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className={`font-mono font-medium ${h.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatStockDelta(h.delta)}</span>
                    <span className="text-gray-500">{h.quantita_prima} → {h.quantita_dopo} pz</span>
                    {destLabel(h) && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{destLabel(h)}</span>}
                    {h.event?.titolo && <span className="text-xs bg-mikai-50 text-mikai-700 px-2 py-0.5 rounded-full">Evento: {h.event.titolo}</span>}
                  </div>
                  {h.motivo && <div className="text-sm text-gray-500">{h.motivo}</div>}
                  <div className="text-xs text-gray-400">{h.user?.nome} {h.user?.cognome} · {formatDateTime(h.created_at)}</div>
                </div>
                <button
                  onClick={() => setStornoTarget(h)}
                  className="shrink-0 min-h-[48px] px-2 text-sm font-medium text-gray-500 hover:text-mikai-700 flex items-center gap-1"
                  aria-label="Storna movimento"
                  title="Registra un movimento opposto per annullarne l'effetto"
                >
                  <Icon icon={MATERIALE_ICONS.storno} size={15} /> Storna
                </button>
              </div>
            </div>
          ))}
          {historyHasMore && (
            <button onClick={onLoadMoreHistory} disabled={loadingMore} className="min-h-[48px] text-sm font-medium text-mikai-600 hover:text-mikai-800 disabled:opacity-50">
              {loadingMore ? 'Caricamento…' : 'Carica altri'}
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!stornoTarget}
        title="Storna movimento"
        message={stornoTarget ? `Registrare un movimento opposto (${formatStockDelta(-stornoTarget.delta)} pz) per annullare "${stornoTarget.motivo || 'movimento'}"? Il movimento originale resta nello storico.` : ''}
        confirmLabel="Storna"
        onConfirm={confirmStorno}
        onCancel={() => setStornoTarget(null)}
      />
    </div>
  )
}
