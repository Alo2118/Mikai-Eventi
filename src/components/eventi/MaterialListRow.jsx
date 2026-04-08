import { useState, useEffect, memo } from 'react'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS, TIPO_PRODOTTO_ICONS, FEEDBACK_ICONS, POSIZIONE_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE, INPUT_STYLE, CARD_ITEM_STYLE, CARD_STYLE } from '../../lib/constants'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'

const TIPO_ICON = {
  demo_kit: { icon: TIPO_PRODOTTO_ICONS.demo_kit, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Kit' },
  strumentario: { icon: TIPO_PRODOTTO_ICONS.strumentario, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Strum.' },
  montaggio: { icon: TIPO_PRODOTTO_ICONS.montaggio, bg: 'bg-orange-100', text: 'text-orange-600', label: 'Mont.' },
  pezzo_sfuso: { icon: TIPO_PRODOTTO_ICONS.pezzo_sfuso, bg: 'bg-gray-100', text: 'text-gray-600', label: 'Sfuso' },
  gadget: { icon: TIPO_PRODOTTO_ICONS.gadget, bg: 'bg-pink-100', text: 'text-pink-600', label: 'Gadget' },
  ossa: { icon: TIPO_PRODOTTO_ICONS.ossa, bg: 'bg-amber-100', text: 'text-amber-600', label: 'Ossa' },
}

// Uniform action button style — same for all states
const ACTION_BTN = 'min-h-[48px] min-w-[48px] rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105'

// Action button with optional label on desktop
function ActionButton({ onClick, className, ariaLabel, icon, iconClass, label }) {
  return (
    <button
      onClick={onClick}
      className={ACTION_BTN + ' flex-col gap-0.5 md:min-w-[52px] ' + className}
      aria-label={ariaLabel}
    >
      <Icon icon={icon} size={18} className={iconClass} />
      {label && <span className="hidden md:block text-[10px] font-medium leading-tight">{label}</span>}
    </button>
  )
}

export const MaterialListRow = memo(function MaterialListRow({ row, availability, stockLocations = [], eventZoneId, canEdit, canApprove, onUpdate, onRemove, onConfirm, onReject, onStartPreparation }) {
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

  // Editable in ALL states except rejected (including in_preparazione)
  const closedStates = ['rifiutato']
  const rowEditable = canEdit && !closedStates.includes(row.stato)
  const rowRemovable = canEdit && isPending

  const tipo = TIPO_ICON[product?.tipo] || TIPO_ICON.demo_kit

  // Availability
  const qtyRequested = row.quantita || 1
  const avail = availability || null
  const inMagazzino = avail?.inMagazzino ?? null
  const pressoEvento = avail?.pressoEvento ?? 0
  const pressoAgente = avail?.pressoAgente ?? 0
  const totaleEsemplari = avail?.totale ?? null
  const hasAvailability = avail != null
  const isInsufficient = hasAvailability && inMagazzino < qtyRequested

  // Commit quantity to server (on blur, Enter, or +/- buttons)
  const commitQty = (val) => {
    const qty = Math.max(1, parseInt(val) || 1)
    setLocalQty(qty)
    if (qty !== (row.quantita || 1)) onUpdate(row.id, { quantita: qty })
  }

  return (
    <div className={CARD_ITEM_STYLE + ' overflow-hidden transition-all ' + (
      isInPrep ? 'border-mikai-300 bg-mikai-50/30' :
      isConfirmed ? 'border-green-200 bg-green-50/30' :
      isRejected ? 'border-red-200 bg-red-50/30' :
      'bg-white'
    )}>
      <div
        className="p-3 md:p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          {/* Type icon */}
          <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tipo.bg}`}>
            <Icon icon={tipo.icon} size={18} className={tipo.text} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-medium text-gray-900 truncate">{product?.nome}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-xs font-medium ${tipo.text}`}>{tipo.label}</span>
              {product?.brand?.nome && <span className="text-xs text-gray-400">· {product.brand.nome}</span>}
              <span className="md:hidden">
                {isConfirmed && row.quantita_approvata != null && row.quantita_approvata < (row.quantita || 1) ? (
                  <span className="px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">Parziale</span>
                ) : (
                  <StatusBadge stato={row.stato} labels={STATO_MATERIALE_LISTA} colors={STATO_MATERIALE_LISTA_COLORE} />
                )}
              </span>
              {hasAvailability && (
                isInsufficient ? (
                  <span className="text-xs font-medium text-red-600 flex items-center gap-0.5">
                    <Icon icon={FEEDBACK_ICONS.warning} size={12} />
                    {inMagazzino}/{qtyRequested}
                  </span>
                ) : (
                  <span className="text-xs text-green-600">{inMagazzino} disp.</span>
                )
              )}
            </div>
          </div>

          {/* Quantity + actions + badge — inline on desktop */}
          <div className="flex items-center gap-2 flex-shrink-0">
          {rowEditable ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); commitQty(localQty - 1) }}
                className={ACTION_BTN + ' bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold'}
                aria-label="Diminuisci"
              >−</button>
              <input
                type="number"
                min={1}
                value={localQty}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setLocalQty(e.target.value)}
                onBlur={(e) => commitQty(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur() } }}
                className="w-14 h-9 text-center text-base font-bold text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mikai-400 outline-none"
              />
              <button
                onClick={(e) => { e.stopPropagation(); commitQty(localQty + 1) }}
                className={ACTION_BTN + ' bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold'}
                aria-label="Aumenta"
              >+</button>
            </div>
          ) : (
            <div>
              {isConfirmed && row.quantita_approvata != null && row.quantita_approvata < (row.quantita || 1) ? (
                <span>
                  <span className="text-sm text-gray-400 line-through">{row.quantita}</span>
                  <span className="text-base font-bold text-yellow-700 ml-1">{row.quantita_approvata}</span>
                </span>
              ) : (
                <span className="text-base text-gray-600 font-medium">×{row.quantita_approvata || row.quantita || 1}</span>
              )}
            </div>
          )}

          {/* Status badge */}
          <div className="flex-shrink-0 hidden md:block">
            {isConfirmed && row.quantita_approvata != null && row.quantita_approvata < (row.quantita || 1) ? (
              <span className="px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">Parziale</span>
            ) : (
              <StatusBadge stato={row.stato} labels={STATO_MATERIALE_LISTA} colors={STATO_MATERIALE_LISTA_COLORE} />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {canApprove && isPending && (
              <>
                <ActionButton
                  onClick={(e) => { e.stopPropagation(); onConfirm(row.id, row.quantita || 1, '') }}
                  className="bg-green-100 hover:bg-green-200"
                  ariaLabel={`Conferma ${product?.nome}`}
                  icon={ACTION_ICONS.approve}
                  iconClass="text-green-700"
                  label="Conferma"
                />
                <ActionButton
                  onClick={(e) => { e.stopPropagation(); onReject(row.id, product?.nome) }}
                  className="bg-red-100 hover:bg-red-200"
                  ariaLabel={`Rifiuta ${product?.nome}`}
                  icon={ACTION_ICONS.reject}
                  iconClass="text-red-700"
                  label="Rifiuta"
                />
              </>
            )}
            {canApprove && isConfirmed && onStartPreparation && (
              <ActionButton
                onClick={(e) => { e.stopPropagation(); onStartPreparation(row.id) }}
                className="bg-mikai-100 hover:bg-mikai-200"
                ariaLabel="Avvia preparazione"
                icon={ACTION_ICONS.forward}
                iconClass="text-mikai-700"
                label="Prepara"
              />
            )}
            {rowRemovable && (
              <ActionButton
                onClick={(e) => { e.stopPropagation(); onRemove(row.id) }}
                className="bg-gray-100 hover:bg-red-100"
                ariaLabel={`Rimuovi ${product?.nome}`}
                icon={ACTION_ICONS.close}
                iconClass="text-gray-400"
              />
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {hasAvailability && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
              isInsufficient ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              <Icon icon={isInsufficient ? FEEDBACK_ICONS.warning : ACTION_ICONS.check} size={16} className="flex-shrink-0" />
              <span>
                <strong>{inMagazzino}</strong> in magazzino
                {pressoEvento > 0 && ` · ${pressoEvento} presso eventi`}
                {pressoAgente > 0 && ` · ${pressoAgente} presso agenti`}
                {` · ${totaleEsemplari} totali`}
                {isInsufficient && <strong> — richiesti {qtyRequested}, insufficienti</strong>}
              </span>
            </div>
          )}

          {stockLocations.length > 0 && (isPending || isConfirmed) && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1.5">Disponibilità per posizione</p>
              <div className="flex flex-wrap gap-1.5">
                {stockLocations.map(loc => {
                  const isInZone = eventZoneId && loc.agent?.zone_id === eventZoneId
                  const label = loc.magazzino
                    ? loc.magazzino.nome
                    : `${loc.agent?.cognome || ''} ${loc.agent?.nome || ''}`.trim()
                  return (
                    <span
                      key={loc.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isInZone
                          ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon
                        icon={loc.magazzino ? POSIZIONE_ICONS.in_magazzino : POSIZIONE_ICONS.magazzino_agente}
                        size={12}
                      />
                      {label}: {loc.quantita} pz
                      {isInZone && <span className="text-green-600 text-[10px]">(stessa zona)</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {(isConfirmed || isInPrep) && canEdit && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5" role="alert">
              <Icon icon={FEEDBACK_ICONS.warning} size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-yellow-800">
                Se modifichi la quantita, la riga tornera in attesa di conferma.
              </p>
            </div>
          )}

          {/* Notes — side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rowEditable && (isPending || isInPrep) ? (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Le tue note</label>
                <input
                  type="text"
                  defaultValue={row.note_commerciale || ''}
                  onBlur={(e) => onUpdate(row.id, { note_commerciale: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className={INPUT_STYLE}
                  placeholder="Es. Il chirurgo lo richiede specificamente..."
                />
              </div>
            ) : row.note_commerciale ? (
              <div>
                <p className="text-sm font-medium text-gray-500">Note commerciale</p>
                <p className="text-base text-gray-700">{row.note_commerciale}</p>
              </div>
            ) : null}

            {row.note_ufficio && (
              <div>
                <p className="text-sm font-medium text-gray-500">Note ufficio</p>
                <p className="text-base text-gray-700">{row.note_ufficio}</p>
              </div>
            )}
          </div>

          {isRejected && row.motivo_rifiuto && (
            <div className={CARD_STYLE + ' bg-red-50 border-red-200'} role="alert">
              <div className="flex items-start gap-2">
                <Icon icon={FEEDBACK_ICONS.error} size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Motivo rifiuto</p>
                  <p className="text-base text-red-800 mt-0.5">{row.motivo_rifiuto}</p>
                </div>
              </div>
            </div>
          )}

          {/* Approval with different quantity */}
          {canApprove && isPending && !showConfirmForm && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setConfirmQty(row.quantita || 1); setConfirmNote(''); setShowConfirmForm(true) }}
            >
              Conferma con quantità diversa
            </Button>
          )}

          {canApprove && isPending && showConfirmForm && (
            <div className="bg-green-50 rounded-xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-gray-600">Quantità</label>
                <div className="flex items-center gap-1">
                  <button onClick={() => setConfirmQty(q => Math.max(1, q - 1))} className={ACTION_BTN + ' bg-white border border-gray-200 hover:bg-gray-100 font-bold text-gray-600'} aria-label="Diminuisci">−</button>
                  <input
                    type="number"
                    min={1}
                    max={row.quantita || 999}
                    value={confirmQty}
                    onChange={(e) => setConfirmQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 h-9 text-center text-base font-bold text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mikai-400 outline-none"
                  />
                  <button onClick={() => setConfirmQty(q => Math.min(row.quantita || 999, q + 1))} className={ACTION_BTN + ' bg-white border border-gray-200 hover:bg-gray-100 font-bold text-gray-600'} aria-label="Aumenta">+</button>
                </div>
                <span className="text-sm text-gray-400">/ {row.quantita || 1} richiesti</span>
              </div>
              {confirmQty < (row.quantita || 1) && (
                <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
                  Approvazione parziale: {confirmQty} su {row.quantita || 1}
                </p>
              )}
              <input
                type="text"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder="Nota ufficio (opzionale)"
                className={INPUT_STYLE}
              />
              <div className="flex gap-3">
                <Button onClick={() => { onConfirm(row.id, confirmQty, confirmNote); setShowConfirmForm(false) }}>
                  Conferma {confirmQty}
                </Button>
                <Button variant="secondary" onClick={() => setShowConfirmForm(false)}>Annulla</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
