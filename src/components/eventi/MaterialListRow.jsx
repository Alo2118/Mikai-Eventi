import { useState, useEffect, memo } from 'react'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS, FEEDBACK_ICONS, POSIZIONE_ICONS, NAV_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE, INPUT_STYLE, CARD_ITEM_STYLE, CARD_STYLE } from '../../lib/constants'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { formatDateRange, formatDateShort } from '../../lib/date-utils'

// Compact action button — icon only, no label
const ACT_BTN = 'min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105'

// Color utilities for dynamic product types
const COLOR_BG = { blue: 'bg-blue-100', purple: 'bg-purple-100', orange: 'bg-orange-100', gray: 'bg-gray-100', pink: 'bg-pink-100', amber: 'bg-amber-100', emerald: 'bg-emerald-100', yellow: 'bg-yellow-100', red: 'bg-red-100', green: 'bg-green-100', mikai: 'bg-mikai-100' }
const COLOR_TEXT = { blue: 'text-blue-600', purple: 'text-purple-600', orange: 'text-orange-600', gray: 'text-gray-600', pink: 'text-pink-600', amber: 'text-amber-600', emerald: 'text-emerald-600', yellow: 'text-yellow-600', red: 'text-red-600', green: 'text-green-600', mikai: 'text-mikai-600' }

const STATE_BORDER = {
  spedito: 'border-emerald-300 bg-emerald-50/30',
  in_preparazione: 'border-mikai-300 bg-mikai-50/30',
  approvato: 'border-green-200 bg-green-50/30',
  rifiutato: 'border-red-200 bg-red-50/30',
}

// Compact quantity editor for pending rows
function QuantityEditor({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={(e) => { e.stopPropagation(); onChange(Math.max(1, value - 1)) }} className="w-7 h-7 md:w-6 md:h-6 rounded flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm" aria-label="Diminuisci">−</button>
      <input
        type="number" min={1} value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
        className="w-10 h-7 md:h-6 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-mikai-400 outline-none"
        aria-label="Quantità"
      />
      <button onClick={(e) => { e.stopPropagation(); onChange(value + 1) }} className="w-7 h-7 md:w-6 md:h-6 rounded flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm" aria-label="Aumenta">+</button>
    </div>
  )
}

export const MaterialListRow = memo(function MaterialListRow({
  row, availability, stockLocations = [], eventZoneId,
  canEdit, canApprove, onUpdate, onRemove, onConfirm, onReject, onStartPreparation, onRevert,
  tipoLabels, tipoColors, tipoIcons,
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = row.stato === 'richiesto'
  const isConfirmed = row.stato === 'approvato'
  const isRejected = row.stato === 'rifiutato'
  const isInPrep = row.stato === 'in_preparazione'
  const product = row.product
  const [localQty, setLocalQty] = useState(row.quantita || 1)
  useEffect(() => { setLocalQty(row.quantita || 1) }, [row.quantita])
  const [showConfirmForm, setShowConfirmForm] = useState(false)
  const [confirmQty, setConfirmQty] = useState(row.quantita || 1)
  const [confirmNote, setConfirmNote] = useState('')

  const tipoCode = product?.tipo || 'demo_kit'
  const tipoLabel = tipoLabels?.[tipoCode] || tipoCode
  const tipoColor = tipoColors?.[tipoCode] || 'gray'
  const tipoIcon = tipoIcons?.[tipoCode] || MATERIALE_ICONS.package

  const rowEditable = canEdit && isPending
  const rowRemovable = canEdit && isPending

  const qtyRequested = row.quantita || 1
  const avail = availability || null
  const inMagazzino = avail?.inMagazzino ?? null
  const hasAvailability = avail != null
  const isInsufficient = hasAvailability && inMagazzino < qtyRequested

  const richiedente = row.richiesto ? `${row.richiesto.nome || ''} ${row.richiesto.cognome || ''}`.trim() : null
  const approvatore = row.approvatore ? `${row.approvatore.nome || ''} ${row.approvatore.cognome || ''}`.trim() : null
  const isPartial = isConfirmed && row.quantita_approvata != null && row.quantita_approvata < (row.quantita || 1)

  const commitQty = (val) => {
    const qty = Math.max(1, parseInt(val) || 1)
    setLocalQty(qty)
    if (qty !== (row.quantita || 1)) onUpdate(row.id, { quantita: qty })
  }

  return (
    <div className={'rounded-xl border overflow-hidden transition-all ' + (STATE_BORDER[row.stato] || 'border-gray-200 bg-white')}>
      {/* ── SINGLE ROW — compact ── */}
      <div
        className="px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {/* Type icon — small */}
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${COLOR_BG[tipoColor] || 'bg-gray-100'}`}>
            <Icon icon={tipoIcon} size={14} className={COLOR_TEXT[tipoColor] || 'text-gray-600'} />
          </div>

          {/* Name + meta inline */}
          <div className="flex-1 min-w-0 flex items-center gap-x-3 gap-y-0.5 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate max-w-[200px] md:max-w-[280px]">{product?.nome}</span>
            <span className={`text-xs ${COLOR_TEXT[tipoColor] || 'text-gray-500'}`}>{tipoLabel}</span>
            {product?.brand?.nome && <span className="text-xs text-gray-400 hidden md:inline">· {product.brand.nome}</span>}
            {product?.codice && <span className="text-xs text-gray-400 font-mono hidden lg:inline">{product.codice}</span>}
            {hasAvailability && (
              isInsufficient
                ? <span className="text-xs font-medium text-red-600 flex items-center gap-0.5"><Icon icon={FEEDBACK_ICONS.warning} size={10} />{inMagazzino}/{qtyRequested}</span>
                : <span className="text-xs text-green-600 hidden md:flex items-center gap-0.5"><Icon icon={ACTION_ICONS.check} size={10} />{inMagazzino}</span>
            )}
            {/* Meta — inline on desktop */}
            {richiedente && <span className="text-xs text-gray-400 hidden lg:inline">{richiedente}</span>}
            {approvatore && (isConfirmed || isInPrep) && approvatore !== richiedente && (
              <span className="text-xs text-green-600 hidden lg:flex items-center gap-0.5"><Icon icon={ACTION_ICONS.check} size={10} />{approvatore}</span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex-shrink-0">
            {rowEditable ? (
              <QuantityEditor value={localQty} onChange={commitQty} />
            ) : isPartial ? (
              <span className="text-sm">
                <span className="text-gray-400 line-through">{row.quantita}</span>
                <span className="font-bold text-yellow-700 ml-1">{row.quantita_approvata}</span>
              </span>
            ) : (
              <span className="text-sm text-gray-600 font-medium">×{row.quantita_approvata || row.quantita || 1}</span>
            )}
          </div>

          {/* Badge */}
          <div className="flex-shrink-0 hidden md:block">
            {isPartial ? (
              <StatusBadge stato="parziale" labels={{ parziale: 'Parziale' }} colors={{ parziale: 'yellow' }} />
            ) : (
              <StatusBadge stato={row.stato} labels={STATO_MATERIALE_LISTA} colors={STATO_MATERIALE_LISTA_COLORE} />
            )}
          </div>

          {/* Actions — icon only */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {canApprove && isPending && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onConfirm(row.id, row.quantita || 1, '') }} className={ACT_BTN + ' bg-green-100 hover:bg-green-200'} aria-label={`Conferma ${product?.nome}`}>
                  <Icon icon={ACTION_ICONS.approve} size={16} className="text-green-700" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onReject(row.id, product?.nome) }} className={ACT_BTN + ' bg-red-100 hover:bg-red-200'} aria-label={`Rifiuta ${product?.nome}`}>
                  <Icon icon={ACTION_ICONS.reject} size={16} className="text-red-700" />
                </button>
              </>
            )}
            {canApprove && isConfirmed && onStartPreparation && (
              <button onClick={(e) => { e.stopPropagation(); onStartPreparation(row.id) }} className={ACT_BTN + ' bg-mikai-100 hover:bg-mikai-200'} aria-label="Avvia preparazione">
                <Icon icon={ACTION_ICONS.forward} size={16} className="text-mikai-700" />
              </button>
            )}
            {rowRemovable && (
              <button onClick={(e) => { e.stopPropagation(); onRemove(row.id) }} className={ACT_BTN + ' bg-gray-100 hover:bg-red-100'} aria-label={`Rimuovi ${product?.nome}`}>
                <Icon icon={ACTION_ICONS.close} size={16} className="text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile-only meta row */}
        <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap mt-1 ml-9 text-xs text-gray-500 md:hidden">
          <StatusBadge stato={isPartial ? 'parziale' : row.stato} labels={{ ...STATO_MATERIALE_LISTA, parziale: 'Parziale' }} colors={{ ...STATO_MATERIALE_LISTA_COLORE, parziale: 'yellow' }} />
          {richiedente && <span>{richiedente}</span>}
          {product?.brand?.nome && <span className="text-gray-400">· {product.brand.nome}</span>}
        </div>
      </div>

      {/* ── EXPANDED ── */}
      {expanded && (
        <MaterialRowDetails
          row={row} availability={avail} stockLocations={stockLocations} eventZoneId={eventZoneId}
          canEdit={canEdit} canApprove={canApprove} isPending={isPending} isConfirmed={isConfirmed}
          isRejected={isRejected} isInPrep={isInPrep} isInsufficient={isInsufficient}
          rowEditable={rowEditable} onUpdate={onUpdate} onConfirm={onConfirm} onRevert={onRevert}
          showConfirmForm={showConfirmForm} setShowConfirmForm={setShowConfirmForm}
          confirmQty={confirmQty} setConfirmQty={setConfirmQty}
          confirmNote={confirmNote} setConfirmNote={setConfirmNote}
          richiedente={richiedente} approvatore={approvatore}
        />
      )}
    </div>
  )
})

// ── Expanded details ──
function MaterialRowDetails({
  row, availability, stockLocations, eventZoneId,
  canEdit, canApprove, isPending, isConfirmed, isRejected, isInPrep,
  isInsufficient, rowEditable, onUpdate, onConfirm, onRevert,
  showConfirmForm, setShowConfirmForm, confirmQty, setConfirmQty, confirmNote, setConfirmNote,
  richiedente, approvatore,
}) {
  const qtyRequested = row.quantita || 1
  const inMagazzino = availability?.inMagazzino ?? null
  const pressoEvento = availability?.pressoEvento ?? 0
  const pressoAgente = availability?.pressoAgente ?? 0
  const totaleEsemplari = availability?.totale ?? null
  const hasAvailability = availability != null

  return (
    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
      {/* Full meta on expand */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {richiedente && (
          <span className="flex items-center gap-1">
            <Icon icon={NAV_ICONS.profilo} size={12} className="text-gray-400" />
            {richiedente}
          </span>
        )}
        {(row.data_inizio_utilizzo || row.data_fine_utilizzo) && (
          <span className="flex items-center gap-1">
            <Icon icon={NAV_ICONS.eventi} size={12} className="text-gray-400" />
            {row.data_inizio_utilizzo && row.data_fine_utilizzo
              ? formatDateRange(row.data_inizio_utilizzo, row.data_fine_utilizzo)
              : formatDateShort(row.data_inizio_utilizzo || row.data_fine_utilizzo)
            }
          </span>
        )}
        {approvatore && (isConfirmed || isInPrep) && (
          <span className="flex items-center gap-1 text-green-600">
            <Icon icon={ACTION_ICONS.check} size={12} />
            {approvatore}
            {row.data_approvazione && <span className="text-gray-400 ml-0.5">{formatDateShort(row.data_approvazione)}</span>}
          </span>
        )}
        {row.note_commerciale && (
          <span className="text-gray-400 truncate max-w-[250px]" title={row.note_commerciale}>{row.note_commerciale}</span>
        )}
      </div>

      {hasAvailability && (
        <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 ${isInsufficient ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <Icon icon={isInsufficient ? FEEDBACK_ICONS.warning : ACTION_ICONS.check} size={14} className="flex-shrink-0" />
          <span>
            <strong>{inMagazzino}</strong> in magazzino
            {pressoEvento > 0 && ` · ${pressoEvento} presso eventi`}
            {pressoAgente > 0 && ` · ${pressoAgente} presso agenti`}
            {` · ${totaleEsemplari} totali`}
            {isInsufficient && <strong> — insufficienti</strong>}
          </span>
        </div>
      )}

      {stockLocations.length > 0 && (isPending || isConfirmed) && (
        <div className="flex flex-wrap gap-1">
          {stockLocations.map(loc => {
            const isInZone = eventZoneId && loc.agent?.zone_id === eventZoneId
            const label = loc.magazzino ? loc.magazzino.nome : `${loc.agent?.cognome || ''} ${loc.agent?.nome || ''}`.trim()
            return (
              <span key={loc.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isInZone ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-gray-100 text-gray-600'}`}>
                <Icon icon={loc.magazzino ? POSIZIONE_ICONS.in_magazzino : POSIZIONE_ICONS.magazzino_agente} size={10} />
                {label}: {loc.quantita}
                {isInZone && <span className="text-[10px]">(zona)</span>}
              </span>
            )
          })}
        </div>
      )}

      {/* Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {rowEditable ? (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">Le tue note</label>
            <input type="text" defaultValue={row.note_commerciale || ''} onBlur={(e) => onUpdate(row.id, { note_commerciale: e.target.value })} onClick={(e) => e.stopPropagation()} className={INPUT_STYLE} placeholder="Es. richiesto specificamente..." />
          </div>
        ) : row.note_commerciale ? (
          <div><p className="text-xs font-medium text-gray-500">Note commerciale</p><p className="text-sm text-gray-700">{row.note_commerciale}</p></div>
        ) : null}
        {row.note_ufficio && (
          <div><p className="text-xs font-medium text-gray-500">Note ufficio</p><p className="text-sm text-gray-700">{row.note_ufficio}</p></div>
        )}
      </div>

      {isRejected && row.motivo_rifiuto && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          <Icon icon={FEEDBACK_ICONS.error} size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div><p className="text-xs font-semibold text-red-700">Motivo rifiuto</p><p className="text-sm text-red-800">{row.motivo_rifiuto}</p></div>
        </div>
      )}

      {/* Actions row */}
      {canApprove && (isPending || isConfirmed || isInPrep) && (
        <div className="flex flex-wrap gap-2">
          {isPending && !showConfirmForm && (
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setConfirmQty(row.quantita || 1); setConfirmNote(''); setShowConfirmForm(true) }}>
              Conferma con quantità diversa
            </Button>
          )}
          {(isConfirmed || isInPrep) && onRevert && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRevert(row.id) }}>
              <Icon icon={ACTION_ICONS.back} size={14} className="mr-1" />
              Riporta in attesa
            </Button>
          )}
        </div>
      )}

      {canApprove && isPending && showConfirmForm && (
        <div className="bg-green-50 rounded-lg p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs text-gray-600">Quantità</label>
            <QuantityEditor value={confirmQty} onChange={setConfirmQty} />
            <span className="text-xs text-gray-400">/ {row.quantita || 1}</span>
          </div>
          {confirmQty < (row.quantita || 1) && (
            <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">Parziale: {confirmQty} su {row.quantita || 1}</p>
          )}
          <input type="text" value={confirmNote} onChange={(e) => setConfirmNote(e.target.value)} placeholder="Nota ufficio (opzionale)" className={INPUT_STYLE} aria-label="Nota ufficio" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onConfirm(row.id, confirmQty, confirmNote); setShowConfirmForm(false) }}>Conferma {confirmQty}</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowConfirmForm(false)}>Annulla</Button>
          </div>
        </div>
      )}
    </div>
  )
}
