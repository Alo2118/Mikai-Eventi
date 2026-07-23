import { useState, useEffect, useMemo, memo } from 'react'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS, FEEDBACK_ICONS, POSIZIONE_ICONS, NAV_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE, INPUT_STYLE, SELECT_STYLE, COLOR_BG_100, COLOR_TEXT_600, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { formatDateRange, formatDateShort } from '../../lib/date-utils'
import { effectiveRientroRichiesto } from '../../lib/event-flow'

// Compact action button — icon only, no label
const ACT_BTN = 'min-h-[48px] min-w-[48px] md:min-h-[36px] md:min-w-[36px] rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105'

const STATE_BORDER = {
  spedito: 'border-emerald-300 bg-emerald-50/30',
  in_preparazione: 'border-mikai-300 bg-mikai-50/30',
  approvato: 'border-green-200 bg-green-50/30',
  rifiutato: 'border-red-200 bg-red-50/30',
}

// Pick the primary source location — prefers zone-matched agent, then first magazzino, then first any
function pickPrimaryLocation(stockLocations, eventZoneId) {
  if (!stockLocations || stockLocations.length === 0) return null
  const zoneMatch = stockLocations.find(l => eventZoneId && l.agent?.zone_id === eventZoneId)
  if (zoneMatch) return { ...zoneMatch, isZoneMatch: true }
  const magazzino = stockLocations.find(l => l.magazzino)
  return magazzino || stockLocations[0]
}

function locationLabel(loc) {
  if (!loc) return null
  return loc.magazzino ? loc.magazzino.nome : `${loc.agent?.cognome || ''} ${loc.agent?.nome || ''}`.trim()
}

// Compact quantity editor for pending rows — 48px touch on mobile, compact on desktop
function QuantityEditor({ value, onChange }) {
  const btnCls = 'min-h-[48px] min-w-[48px] md:w-6 md:h-6 md:min-h-0 md:min-w-0 rounded flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-base md:text-sm'
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={(e) => { e.stopPropagation(); onChange(Math.max(1, value - 1)) }} className={btnCls} aria-label="Diminuisci">−</button>
      <input
        type="number" min={1} value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
        className="w-12 min-h-[48px] md:w-10 md:h-6 md:min-h-0 text-center text-base md:text-sm font-bold text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-mikai-400 outline-none"
        aria-label="Quantità"
      />
      <button onClick={(e) => { e.stopPropagation(); onChange(value + 1) }} className={btnCls} aria-label="Aumenta">+</button>
    </div>
  )
}

// ── Stato-adaptive compact meta — shows only relevant info per stato ──
function CompactMeta({ stato, row, availability, collo, primaryLocation, richiedente, approvatore, eventSpedizioneData, eventTracking }) {
  const qtyRequested = row.quantita || 1
  const inMagazzino = availability?.inMagazzino ?? null
  const hasAvail = availability != null
  const insufficient = hasAvail && inMagazzino < qtyRequested
  const noteCommerciale = row.note_commerciale
  const noteUfficio = row.note_ufficio

  switch (stato) {
    case 'richiesto':
      return (
        <>
          {hasAvail && (
            insufficient
              ? <span className="text-xs font-medium text-red-600 flex items-center gap-0.5"><Icon icon={FEEDBACK_ICONS.warning} size={10} />{inMagazzino}/{qtyRequested}</span>
              : <span className="text-xs text-green-600 flex items-center gap-0.5"><Icon icon={ACTION_ICONS.check} size={10} />{inMagazzino} disp.</span>
          )}
          {richiedente && <span className="text-xs text-gray-400 hidden lg:inline">da {richiedente}</span>}
          {noteCommerciale && <span className="text-xs text-gray-400 italic truncate max-w-[200px] hidden md:inline" title={noteCommerciale}>"{noteCommerciale}"</span>}
        </>
      )

    case 'approvato':
      return (
        <>
          {primaryLocation && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${primaryLocation.isZoneMatch ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`} title={primaryLocation.isZoneMatch ? 'Stessa zona dell\'evento' : undefined}>
              <Icon icon={primaryLocation.magazzino ? POSIZIONE_ICONS.in_magazzino : POSIZIONE_ICONS.magazzino_agente} size={10} />
              {locationLabel(primaryLocation)}: {primaryLocation.quantita}
            </span>
          )}
          {approvatore && (
            <span className="text-xs text-gray-400 hidden lg:inline-flex items-center gap-0.5">
              <Icon icon={ACTION_ICONS.check} size={10} />
              {approvatore}
            </span>
          )}
          {noteUfficio && <span className="text-xs text-mikai-600 italic truncate max-w-[180px] hidden md:inline" title={noteUfficio}>"{noteUfficio}"</span>}
        </>
      )

    case 'in_preparazione':
      return (
        <>
          {collo && collo.numeri.length > 0 ? (
            <span className={`inline-flex items-center gap-1 ${BADGE_BASE} ${COLOR_BADGE.mikai}`} title={`Assegnato ${collo.numeri.length > 1 ? 'ai colli' : 'al collo'} ${collo.numeri.join(', ')}`}>
              <Icon icon={MATERIALE_ICONS.package} size={10} />
              Collo {collo.numeri.join(', ')}
              <Icon icon={ACTION_ICONS.check} size={10} className="text-emerald-600" />
            </span>
          ) : (
            <span className="text-xs text-yellow-600 flex items-center gap-0.5" title="Non ancora nella packing list">
              <Icon icon={FEEDBACK_ICONS.warning} size={10} />
              Non in packing list
            </span>
          )}
          {primaryLocation && (
            <span className="text-xs text-gray-500 flex items-center gap-0.5 hidden md:flex">
              <Icon icon={primaryLocation.magazzino ? POSIZIONE_ICONS.in_magazzino : POSIZIONE_ICONS.magazzino_agente} size={10} className="text-gray-400" />
              Preleva da: {locationLabel(primaryLocation)}
            </span>
          )}
          {noteUfficio && <span className="text-xs text-mikai-600 italic truncate max-w-[180px] hidden lg:inline" title={noteUfficio}>"{noteUfficio}"</span>}
        </>
      )

    case 'spedito':
      return (
        <>
          {collo && collo.numeri.length > 0 && (
            <span className={`inline-flex items-center gap-1 ${BADGE_BASE} ${COLOR_BADGE.emerald}`}>
              <Icon icon={MATERIALE_ICONS.package} size={10} />
              Collo {collo.numeri.join(', ')}
            </span>
          )}
          {eventTracking && <span className="text-xs text-gray-500 font-mono hidden md:inline" title={`Tracking: ${eventTracking}`}>#{eventTracking.slice(-8)}</span>}
          {eventSpedizioneData && <span className="text-xs text-gray-400 hidden md:inline">Spedito {formatDateShort(eventSpedizioneData)}</span>}
        </>
      )

    case 'rifiutato':
      return (
        <>
          {row.motivo_rifiuto && <span className="text-xs text-red-600 italic truncate max-w-[280px]" title={row.motivo_rifiuto}>"{row.motivo_rifiuto}"</span>}
          {approvatore && <span className="text-xs text-gray-400 hidden md:inline">— {approvatore}</span>}
          {row.data_approvazione && <span className="text-xs text-gray-400 hidden lg:inline">{formatDateShort(row.data_approvazione)}</span>}
        </>
      )

    default:
      return null
  }
}

// Mobile-only meta (simpler, below the compact row)
function MobileMeta({ stato, row, collo, primaryLocation, richiedente, approvatore }) {
  switch (stato) {
    case 'richiesto':
      return richiedente ? <span>da {richiedente}</span> : null
    case 'approvato':
      return primaryLocation
        ? <span className="inline-flex items-center gap-1"><Icon icon={primaryLocation.magazzino ? POSIZIONE_ICONS.in_magazzino : POSIZIONE_ICONS.magazzino_agente} size={12} className="text-gray-400" />{locationLabel(primaryLocation)}</span>
        : null
    case 'in_preparazione':
      if (collo && collo.numeri.length > 0) return <span>Collo {collo.numeri.join(', ')}</span>
      return <span className="text-yellow-600">Non in packing list</span>
    case 'spedito':
      if (collo && collo.numeri.length > 0) return <span>Collo {collo.numeri.join(', ')} · Spedito</span>
      return <span>Spedito</span>
    case 'rifiutato':
      return row.motivo_rifiuto ? <span className="text-red-600 truncate">"{row.motivo_rifiuto}"</span> : null
    default:
      return null
  }
}

export const MaterialListRow = memo(function MaterialListRow({
  row, availability, stockLocations = [], kitPieces = [], eventZoneId, collo, eventSpedizioneData, eventTracking,
  canEdit, canApprove, onUpdate, onRemove, onConfirm, onReject, onStartPreparation, onRevert,
  tipoLabels, tipoColors, tipoIcons, shippingEnabled = true,
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = row.stato === 'richiesto'
  const isConfirmed = row.stato === 'approvato'
  const isRejected = row.stato === 'rifiutato'
  const isInPrep = row.stato === 'in_preparazione'
  const isShipped = row.stato === 'spedito'
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

  const primaryLocation = useMemo(() => pickPrimaryLocation(stockLocations, eventZoneId), [stockLocations, eventZoneId])

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
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${COLOR_BG_100[tipoColor] || 'bg-gray-100'}`}>
            <Icon icon={tipoIcon} size={14} className={COLOR_TEXT_600[tipoColor] || 'text-gray-600'} />
          </div>

          {/* Name + meta inline */}
          <div className="flex-1 min-w-0 flex items-center gap-x-3 gap-y-0.5 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate max-w-[200px] md:max-w-[280px]">{product?.nome}</span>
            <span className={`text-xs ${COLOR_TEXT_600[tipoColor] || 'text-gray-500'}`}>{tipoLabel}</span>
            {product?.brand?.nome && <span className="text-xs text-gray-400 hidden md:inline">· {product.brand.nome}</span>}
            {product?.codice && <span className="text-xs text-gray-400 font-mono hidden lg:inline">{product.codice}</span>}
            {kitPieces.length > 0 && (
              <span className="text-xs text-mikai-600 inline-flex items-center gap-0.5" title={`${kitPieces.length} ${kitPieces.length === 1 ? 'pezzo' : 'pezzi'} nella distinta`}>
                <Icon icon={MATERIALE_ICONS.package} size={10} />
                {kitPieces.length} {kitPieces.length === 1 ? 'pezzo' : 'pezzi'}
              </span>
            )}
            {/* Stato-adaptive meta */}
            <CompactMeta
              stato={row.stato}
              row={row}
              availability={avail}
              collo={collo}
              primaryLocation={primaryLocation}
              richiedente={richiedente}
              approvatore={approvatore}
              eventSpedizioneData={eventSpedizioneData}
              eventTracking={eventTracking}
            />
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
          <MobileMeta
            stato={row.stato}
            row={row}
            collo={collo}
            primaryLocation={primaryLocation}
            richiedente={richiedente}
            approvatore={approvatore}
          />
        </div>
      </div>

      {/* ── EXPANDED ── */}
      {expanded && (
        <MaterialRowDetails
          row={row} availability={avail} stockLocations={stockLocations} kitPieces={kitPieces} eventZoneId={eventZoneId}
          collo={collo} eventSpedizioneData={eventSpedizioneData} eventTracking={eventTracking}
          canEdit={canEdit} canApprove={canApprove} isPending={isPending} isConfirmed={isConfirmed}
          isRejected={isRejected} isInPrep={isInPrep} isShipped={isShipped} isInsufficient={isInsufficient}
          rowEditable={rowEditable} onUpdate={onUpdate} onConfirm={onConfirm} onRevert={onRevert}
          showConfirmForm={showConfirmForm} setShowConfirmForm={setShowConfirmForm}
          confirmQty={confirmQty} setConfirmQty={setConfirmQty}
          confirmNote={confirmNote} setConfirmNote={setConfirmNote}
          richiedente={richiedente} approvatore={approvatore}
          shippingEnabled={shippingEnabled}
        />
      )}
    </div>
  )
})

// ── Expanded details ──
function MaterialRowDetails({
  row, availability, stockLocations, kitPieces = [], eventZoneId, collo, eventSpedizioneData, eventTracking,
  canEdit, canApprove, isPending, isConfirmed, isRejected, isInPrep, isShipped,
  isInsufficient, rowEditable, onUpdate, onConfirm, onRevert,
  showConfirmForm, setShowConfirmForm, confirmQty, setConfirmQty, confirmNote, setConfirmNote,
  richiedente, approvatore, shippingEnabled = true,
}) {
  const qtyRequested = row.quantita || 1
  const inMagazzino = availability?.inMagazzino ?? null
  const pressoEvento = availability?.pressoEvento ?? 0
  const pressoAgente = availability?.pressoAgente ?? 0
  const totaleEsemplari = availability?.totale ?? null
  const hasAvailability = availability != null

  // Visibility per stato
  const showAvailabilityBlock = hasAvailability && (isPending || isConfirmed)
  const showStockLocations = stockLocations.length > 0 && (isPending || isConfirmed || isInPrep)
  const showColloPanel = shippingEnabled && (isInPrep || isShipped)
  const showRichiedenteAudit = isShipped || isRejected || isPending
  const showApprovatoreAudit = approvatore && (isConfirmed || isInPrep || isShipped || isRejected)
  const showNoteCommerciale = row.note_commerciale && (isPending || isConfirmed || isRejected)
  const showNoteUfficio = row.note_ufficio && !isPending
  const showDateUtilizzo = (row.data_inizio_utilizzo || row.data_fine_utilizzo) && (isPending || isConfirmed)
  const showRientroToggle = canEdit && shippingEnabled && (isPending || isConfirmed || isInPrep)
  const rientroDefault = !!row.product?.serializzato
  const rientroEffective = effectiveRientroRichiesto(row)
  const rientroOverrideValue = row.rientro_richiesto === null || row.rientro_richiesto === undefined
    ? 'auto'
    : (row.rientro_richiesto ? 'si' : 'no')

  return (
    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
      {/* Meta audit on expand — adaptive */}
      {(showRichiedenteAudit || showApprovatoreAudit || showDateUtilizzo) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {showRichiedenteAudit && richiedente && (
            <span className="flex items-center gap-1">
              <Icon icon={NAV_ICONS.profilo} size={12} className="text-gray-400" />
              Richiesto da {richiedente}
            </span>
          )}
          {showDateUtilizzo && (
            <span className="flex items-center gap-1">
              <Icon icon={NAV_ICONS.eventi} size={12} className="text-gray-400" />
              {row.data_inizio_utilizzo && row.data_fine_utilizzo
                ? formatDateRange(row.data_inizio_utilizzo, row.data_fine_utilizzo)
                : formatDateShort(row.data_inizio_utilizzo || row.data_fine_utilizzo)
              }
            </span>
          )}
          {showApprovatoreAudit && (
            <span className="flex items-center gap-1 text-green-600">
              <Icon icon={ACTION_ICONS.check} size={12} />
              {isRejected ? 'Rifiutato' : 'Approvato'} da {approvatore}
              {row.data_approvazione && <span className="text-gray-400 ml-0.5">{formatDateShort(row.data_approvazione)}</span>}
            </span>
          )}
        </div>
      )}

      {/* Distinta (kit contents) */}
      {kitPieces.length > 0 && (
        <div className="rounded-lg border border-mikai-100 bg-mikai-50/40 px-3 py-2">
          <p className="text-xs font-semibold text-mikai-700 mb-1.5 flex items-center gap-1">
            <Icon icon={MATERIALE_ICONS.package} size={12} />
            Distinta ({kitPieces.length} {kitPieces.length === 1 ? 'pezzo' : 'pezzi'})
          </p>
          <ul className="space-y-0.5">
            {kitPieces.map(p => (
              <li key={p.id} className="text-xs text-gray-700 flex items-center gap-2">
                <span className="text-gray-400 font-mono shrink-0 min-w-[2rem]">×{p.quantity}</span>
                <span className="text-gray-400 font-mono shrink-0 min-w-[5rem]">{p.piece_code || '—'}</span>
                <span className="text-gray-700 truncate">{p.piece_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Availability — only when requesting/approving */}
      {showAvailabilityBlock && (
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

      {/* Stock locations — available in richiesto/approvato/in_preparazione */}
      {showStockLocations && (
        <div>
          {isInPrep && <p className="text-xs font-medium text-gray-500 mb-1">Preleva da una di queste posizioni:</p>}
          <div className="flex flex-wrap gap-1">
            {stockLocations.map(loc => {
              const isInZone = eventZoneId && loc.agent?.zone_id === eventZoneId
              const label = locationLabel(loc)
              return (
                <span key={loc.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isInZone ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-gray-100 text-gray-600'}`}>
                  <Icon icon={loc.magazzino ? POSIZIONE_ICONS.in_magazzino : POSIZIONE_ICONS.magazzino_agente} size={10} />
                  {label}: {loc.quantita}
                  {isInZone && <span className="text-[10px]">(zona)</span>}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Collo & Shipping panel — for in_preparazione and spedito */}
      {showColloPanel && (
        <div className={`rounded-lg px-3 py-2 text-xs space-y-1 ${isShipped ? 'bg-emerald-50 border border-emerald-200' : 'bg-mikai-50 border border-mikai-200'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <Icon icon={MATERIALE_ICONS.package} size={14} className={isShipped ? 'text-emerald-600' : 'text-mikai-600'} />
            {collo && collo.numeri.length > 0 ? (
              <>
                <span className={`font-medium ${isShipped ? 'text-emerald-700' : 'text-mikai-700'}`}>
                  {collo.numeri.length > 1 ? 'Colli' : 'Collo'} {collo.numeri.join(', ')}
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Imballato</span>
              </>
            ) : (
              <span className="text-yellow-700 flex items-center gap-1">
                <Icon icon={FEEDBACK_ICONS.warning} size={12} />
                Non ancora assegnato a un collo (vai nella Packing list)
              </span>
            )}
          </div>
          {isShipped && eventTracking && (
            <div className="flex items-center gap-2 text-emerald-700">
              <Icon icon={MATERIALE_ICONS.truck} size={12} />
              Tracking: <span className="font-mono">{eventTracking}</span>
            </div>
          )}
          {isShipped && eventSpedizioneData && (
            <div className="text-emerald-600">Spedito il {formatDateShort(eventSpedizioneData)}</div>
          )}
        </div>
      )}

      {/* Rientro override — only when shipping is in scope */}
      {showRientroToggle && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-medium text-gray-500">Rientro a fine evento:</span>
          <select
            className={SELECT_STYLE + ' max-w-[220px] text-xs py-1 px-2 min-h-0 h-8'}
            value={rientroOverrideValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value
              const next = v === 'auto' ? null : (v === 'si')
              onUpdate(row.id, { rientro_richiesto: next })
            }}
            aria-label="Rientro richiesto a fine evento"
          >
            <option value="auto">Default catalogo ({rientroDefault ? 'rientra' : 'consumabile'})</option>
            <option value="si">Forza rientro</option>
            <option value="no">Consumabile (non rientra)</option>
          </select>
          <span className={`inline-flex items-center gap-1 ${BADGE_BASE} ${COLOR_BADGE[rientroEffective ? 'mikai' : 'gray']}`}>
            <Icon icon={rientroEffective ? MATERIALE_ICONS.rientro : MATERIALE_ICONS.package} size={10} />
            {rientroEffective ? 'Rientra' : 'Non rientra'}
          </span>
        </div>
      )}

      {/* Notes — adaptive */}
      {(rowEditable || showNoteCommerciale || showNoteUfficio) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rowEditable ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">Le tue note</label>
              <input type="text" defaultValue={row.note_commerciale || ''} onBlur={(e) => onUpdate(row.id, { note_commerciale: e.target.value })} onClick={(e) => e.stopPropagation()} className={INPUT_STYLE} placeholder="Es. richiesto specificamente..." />
            </div>
          ) : showNoteCommerciale ? (
            <div><p className="text-xs font-medium text-gray-500">Note commerciale</p><p className="text-sm text-gray-700">{row.note_commerciale}</p></div>
          ) : null}
          {showNoteUfficio && (
            <div><p className="text-xs font-medium text-gray-500">Note ufficio</p><p className="text-sm text-gray-700">{row.note_ufficio}</p></div>
          )}
        </div>
      )}

      {/* Rejection reason */}
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
