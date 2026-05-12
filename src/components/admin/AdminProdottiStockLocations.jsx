import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS, POSIZIONE_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { INPUT_STYLE, SELECT_STYLE } from '../../lib/constants'
import { formatStockDelta } from '../../lib/format-utils'

function LocationLabel({ magazzino, agent }) {
  if (magazzino) {
    return <span className="flex items-center gap-1.5"><Icon icon={POSIZIONE_ICONS.in_magazzino} size={14} className="text-gray-400" />{magazzino.nome}</span>
  }
  if (agent) {
    return <span className="flex items-center gap-1.5"><Icon icon={POSIZIONE_ICONS.magazzino_agente} size={14} className="text-gray-400" />{agent.cognome} {agent.nome}</span>
  }
  return <span className="text-gray-400">Posizione sconosciuta</span>
}

// Distribuzione dello stock per posizione (magazzino / agente) con rettifica inline
// per "far quadrare" il conteggio: inserisci la quantità contata, l'app calcola il delta.
export function AdminProdottiStockLocations({
  stockLocations = [],
  disponibile = 0,
  totaleMagazzino = 0,
  magazzini = [],
  agenti = [],
  busy = false,
  onRettificaPosizione,
}) {
  // chiave riga in modifica: loc.id oppure 'unassigned'
  const [editKey, setEditKey] = useState(null)
  const [contata, setContata] = useState('')
  const [motivo, setMotivo] = useState('')
  const [dest, setDest] = useState('')

  const visible = stockLocations.filter(l => (l.quantita || 0) > 0)
  const locTotal = visible.reduce((s, l) => s + (l.quantita || 0), 0)
  const unassigned = Math.max(0, disponibile - locTotal)

  const close = () => { setEditKey(null); setContata(''); setMotivo(''); setDest('') }

  const destSelect = () => (
    <select className={SELECT_STYLE} value={dest} onChange={e => setDest(e.target.value)} aria-label="Posizione di destinazione">
      <option value="">— Seleziona posizione —</option>
      {magazzini.length > 0 && <optgroup label="Magazzini">{magazzini.map(m => <option key={m.id} value={`mag:${m.id}`}>{m.nome}</option>)}</optgroup>}
      {agenti.length > 0 && <optgroup label="Agenti">{agenti.map(a => <option key={a.id} value={`agent:${a.id}`}>{a.cognome} {a.nome}</option>)}</optgroup>}
    </select>
  )

  const submitRettifica = async (loc) => {
    const target = parseInt(contata, 10)
    if (isNaN(target) || target < 0) return
    const res = await onRettificaPosizione(loc.magazzino_id || null, loc.user_id || null, target, motivo.trim() || 'Rettifica inventario')
    if (!res?.error) close()
  }

  const submitAssegna = async () => {
    if (!dest || unassigned <= 0) return
    const [type, id] = dest.split(':')
    const magazzinoId = type === 'mag' ? id : null
    const agentUserId = type === 'agent' ? id : null
    const existing = stockLocations.find(l => (magazzinoId && l.magazzino_id === magazzinoId) || (agentUserId && l.user_id === agentUserId))
    const target = (existing?.quantita || 0) + unassigned
    const res = await onRettificaPosizione(magazzinoId, agentUserId, target, 'Assegnazione stock non localizzato')
    if (!res?.error) close()
  }

  const renderRettificaForm = (loc) => {
    const target = contata === '' ? null : parseInt(contata, 10)
    const delta = target == null || isNaN(target) ? null : target - loc.quantita
    const disabledReason = delta == null || isNaN(delta) ? 'Inserisci la quantità contata' : delta === 0 ? 'La quantità è uguale a quella attuale — niente da registrare' : ''
    return (
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label htmlFor={`rett-qty-${loc.id}`} className="block text-sm font-medium text-gray-700 mb-1">Quantità contata</label>
            <input id={`rett-qty-${loc.id}`} type="number" min="0" autoFocus className={INPUT_STYLE} value={contata} onChange={e => setContata(e.target.value)} placeholder={`era ${loc.quantita}`} />
          </div>
          <div>
            <label htmlFor={`rett-motivo-${loc.id}`} className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <input id={`rett-motivo-${loc.id}`} className={INPUT_STYLE} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="es. Conteggio inventario" />
          </div>
        </div>
        {delta != null && !isNaN(delta) && (
          <p className="text-sm text-gray-600">
            {delta === 0
              ? 'Nessuna variazione.'
              : <>Verrà registrato uno <strong>{delta > 0 ? 'carico' : 'scarico'} di {formatStockDelta(delta)} pz</strong> · posizione {loc.quantita} → {target} · totale a magazzino {totaleMagazzino} → {totaleMagazzino + delta}</>}
          </p>
        )}
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" onClick={() => submitRettifica(loc)} loading={busy} disabled={!!disabledReason} title={disabledReason}>Conferma</Button>
          <Button size="sm" variant="secondary" onClick={close}>Annulla</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-base text-gray-800">Distribuzione per posizione</h4>
      {visible.length === 0 && unassigned <= 0 && <p className="text-sm text-gray-400">Nessuna giacenza in magazzino o presso agenti.</p>}
      <div className="space-y-2">
        {visible.map(loc => {
          const locName = loc.magazzino?.nome || (loc.agent ? `${loc.agent.cognome} ${loc.agent.nome}` : 'questa posizione')
          return (
            <div key={loc.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <LocationLabel magazzino={loc.magazzino} agent={loc.agent} />
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{loc.quantita} pz</span>
                  {editKey !== loc.id && (
                    <button onClick={() => { setEditKey(loc.id); setContata(''); setMotivo('') }} aria-label={`Rettifica giacenza — ${locName}`} className="min-h-[48px] min-w-[48px] px-2 text-sm font-medium text-mikai-600 hover:text-mikai-800 flex items-center gap-1">
                      <Icon icon={MATERIALE_ICONS.rettifica} size={15} /> Rettifica
                    </button>
                  )}
                </div>
              </div>
              {editKey === loc.id && renderRettificaForm(loc)}
            </div>
          )
        })}

        {unassigned > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-amber-800">
                <Icon icon={FEEDBACK_ICONS.warning} size={14} className="text-amber-500" /> Non assegnato a una posizione
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-900">{unassigned} pz</span>
                {editKey !== 'unassigned' && (
                  <button onClick={() => { setEditKey('unassigned'); setDest('') }} className="min-h-[48px] min-w-[48px] px-2 text-sm font-medium text-amber-700 hover:text-amber-900">Assegna a…</button>
                )}
              </div>
            </div>
            {editKey === 'unassigned' && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-amber-700">Queste {unassigned} pz risultano in giacenza ma non in una posizione precisa. Assegnale per tenere i conti in ordine.</p>
                {destSelect()}
                <div className="flex items-center gap-2 justify-end">
                  <Button size="sm" onClick={submitAssegna} loading={busy} disabled={!dest} title={!dest ? 'Seleziona una posizione prima di assegnare' : ''}>Assegna {unassigned} pz</Button>
                  <Button size="sm" variant="secondary" onClick={close}>Annulla</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
