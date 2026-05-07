import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS, FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { CARD_STYLE, INPUT_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

// Step status indicator
function StepStatus({ done, active, label, detail, action }) {
  return (
    <div className={`flex items-start gap-3 py-3 ${done ? '' : active ? '' : 'opacity-50'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        done ? 'bg-emerald-100' : active ? 'bg-yellow-100' : 'bg-gray-100'
      }`}>
        <Icon
          icon={done ? ACTION_ICONS.check : active ? FEEDBACK_ICONS.warning : FEEDBACK_ICONS.info}
          size={14}
          className={done ? 'text-emerald-600' : active ? 'text-yellow-600' : 'text-gray-400'}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-emerald-700' : active ? 'text-gray-900' : 'text-gray-400'}`}>
          {label}
        </p>
        {detail && (
          <p className={`text-xs mt-0.5 ${done ? 'text-emerald-600' : active ? 'text-yellow-700' : 'text-gray-400'}`}>
            {detail}
          </p>
        )}
      </div>
      {action && (active || done) && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function EventMaterialShipping({ event, packingItems, readyToShip, canApprove, onSaveShipping, onShowPackingList, allPrepared, pendingCount, confirmedCount, inPrepCount, speditoCount }) {
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shippingForm, setShippingForm] = useState({
    corriere: event.spedizione_corriere || '',
    tracking: event.spedizione_tracking || '',
    colli: event.spedizione_colli || '',
    data: event.spedizione_data || '',
    note: event.spedizione_note || '',
  })

  const packingColliNumbers = [...new Set(packingItems.map(i => i.collo_numero).filter(n => n != null))]
  const packingTotalItems = packingItems.length
  const packingPackedCount = packingItems.filter(i => i.collo_numero != null).length
  const allPacked = packingTotalItems > 0 && packingPackedCount === packingTotalItems
  const hasColli = packingColliNumbers.length > 0
  const isShipped = !!event.spedizione_data

  // Step states
  const step1Done = allPrepared || isShipped
  const step2Done = (allPacked && hasColli) || isShipped
  const step3Done = isShipped

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Icon icon={MATERIALE_ICONS.truck} size={20} className="text-gray-400" />
        Spedizione
      </h3>

      {/* ── Already shipped: success summary ── */}
      {isShipped && !showShippingForm && (
        <div className={CARD_STYLE + ' border-emerald-200 bg-emerald-50/50 space-y-3'}>
          <div className="flex items-center gap-2">
            <Icon icon={ACTION_ICONS.check} size={18} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Materiale spedito</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Corriere</p>
              <p className="font-medium">{event.spedizione_corriere || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Tracking</p>
              <p className="font-medium font-mono">{event.spedizione_tracking || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Colli</p>
              <p className="font-medium">{event.spedizione_colli ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Data</p>
              <p className="font-medium">{formatDate(event.spedizione_data)}</p>
            </div>
          </div>
          {event.spedizione_note && (
            <p className="text-sm text-gray-600 bg-white/60 rounded-lg px-3 py-2">{event.spedizione_note}</p>
          )}
          {canApprove && (
            <Button variant="ghost" size="sm" onClick={() => setShowShippingForm(true)}>Modifica dati spedizione</Button>
          )}
        </div>
      )}

      {/* ── Not shipped yet: show progress steps ── */}
      {!isShipped && !showShippingForm && (
        <div className={CARD_STYLE + ' divide-y divide-gray-100'}>
          <StepStatus
            done={step1Done}
            active={!step1Done}
            label="Materiale confermato e in preparazione"
            detail={step1Done
              ? `${inPrepCount + speditoCount} materiali pronti`
              : `${pendingCount > 0 ? `${pendingCount} da confermare` : ''}${pendingCount > 0 && confirmedCount > 0 ? ', ' : ''}${confirmedCount > 0 ? `${confirmedCount} da avviare in preparazione` : ''}`
            }
          />
          <StepStatus
            done={step2Done}
            active={step1Done && !step2Done}
            label="Packing list completata"
            detail={step2Done
              ? `${packingColliNumbers.length} colli — ${packingTotalItems} voci imballate`
              : packingTotalItems === 0
                ? 'Genera la packing list per iniziare'
                : !allPacked
                  ? `${packingPackedCount}/${packingTotalItems} imballati`
                  : 'Assegna le voci ai colli'
            }
            action={step1Done && onShowPackingList ? (
              <Button variant="secondary" size="sm" onClick={onShowPackingList}>
                {packingTotalItems === 0 ? 'Apri packing list' : step2Done ? 'Modifica packing' : 'Gestisci packing'}
              </Button>
            ) : null}
          />
          <StepStatus
            done={step3Done}
            active={step1Done && step2Done && !step3Done}
            label="Registra spedizione"
            detail={readyToShip ? 'Tutto pronto — registra i dati di spedizione' : null}
            action={canApprove && readyToShip ? (
              <Button size="sm" onClick={() => {
                setShippingForm(f => ({ ...f, colli: packingColliNumbers.length }))
                setShowShippingForm(true)
              }}>
                <Icon icon={MATERIALE_ICONS.truck} size={16} className="mr-1" />
                Spedisci
              </Button>
            ) : null}
          />
        </div>
      )}

      {/* ── Shipping form ── */}
      {showShippingForm && (
        <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
          <p className="text-sm font-medium text-gray-700">
            {isShipped ? 'Modifica dati spedizione' : 'Registra i dati della spedizione'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ship-corriere" className="block text-sm font-medium text-gray-700 mb-1">Corriere</label>
              <input
                id="ship-corriere"
                value={shippingForm.corriere}
                onChange={e => setShippingForm(f => ({ ...f, corriere: e.target.value }))}
                placeholder="Es. BRT, DHL, GLS..."
                className={INPUT_STYLE}
              />
            </div>
            <div>
              <label htmlFor="ship-tracking" className="block text-sm font-medium text-gray-700 mb-1">Numero tracking</label>
              <input
                id="ship-tracking"
                value={shippingForm.tracking}
                onChange={e => setShippingForm(f => ({ ...f, tracking: e.target.value }))}
                placeholder="Codice spedizione"
                className={INPUT_STYLE}
              />
            </div>
            <div>
              <label htmlFor="ship-colli" className="block text-sm font-medium text-gray-700 mb-1">Numero colli</label>
              <input
                id="ship-colli"
                type="number"
                min={1}
                value={shippingForm.colli}
                onChange={e => setShippingForm(f => ({ ...f, colli: e.target.value }))}
                className={INPUT_STYLE}
              />
              {packingColliNumbers.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">Dalla packing list: {packingColliNumbers.length} colli</p>
              )}
            </div>
            <div>
              <label htmlFor="ship-data" className="block text-sm font-medium text-gray-700 mb-1">Data spedizione</label>
              <input
                id="ship-data"
                type="date"
                value={shippingForm.data}
                onChange={e => setShippingForm(f => ({ ...f, data: e.target.value }))}
                className={INPUT_STYLE}
              />
            </div>
          </div>
          <div>
            <label htmlFor="ship-note" className="block text-sm font-medium text-gray-700 mb-1">Note spedizione</label>
            <input
              id="ship-note"
              value={shippingForm.note}
              onChange={e => setShippingForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Es. Fermo deposito, chiamare prima..."
              className={INPUT_STYLE}
            />
          </div>
          <div className="flex gap-3">
            <Button loading={saving} onClick={async () => {
              setSaving(true)
              const result = await onSaveShipping({
                spedizione_corriere: shippingForm.corriere || null,
                spedizione_tracking: shippingForm.tracking || null,
                spedizione_colli: shippingForm.colli ? parseInt(shippingForm.colli) : packingColliNumbers.length || null,
                spedizione_data: shippingForm.data || null,
                spedizione_note: shippingForm.note || null,
              })
              setSaving(false)
              if (result?.ok) setShowShippingForm(false)
            }}>
              <Icon icon={MATERIALE_ICONS.truck} size={16} className="mr-1" />
              {isShipped ? 'Aggiorna spedizione' : 'Conferma spedizione'}
            </Button>
            <Button variant="secondary" onClick={() => setShowShippingForm(false)}>Annulla</Button>
          </div>
        </div>
      )}
    </section>
  )
}
