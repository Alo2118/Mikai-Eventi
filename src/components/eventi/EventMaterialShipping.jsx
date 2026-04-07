import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'
import { SUMMARY_BAR_STYLE, CARD_STYLE, INPUT_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

export function EventMaterialShipping({ event, packingItems, readyToShip, canApprove, onSaveShipping }) {
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [shippingForm, setShippingForm] = useState({
    corriere: event.spedizione_corriere || '',
    tracking: event.spedizione_tracking || '',
    colli: event.spedizione_colli || '',
    data: event.spedizione_data || '',
    note: event.spedizione_note || '',
  })

  const packingColliNumbers = [...new Set(packingItems.map(i => i.collo_numero).filter(n => n != null))]
  const packingTotalItems = packingItems.length
  const packingPackedCount = packingItems.filter(i => i.imballato).length
  const allPacked = packingTotalItems > 0 && packingPackedCount === packingTotalItems

  return (
    <section className="pt-6 border-t border-gray-200 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon icon={MATERIALE_ICONS.truck} size={20} className="text-gray-400" />
          Spedizione
        </h3>
        {canApprove && !event.spedizione_data && !showShippingForm && readyToShip && (
          <Button size="sm" onClick={() => {
            setShippingForm(f => ({ ...f, colli: packingColliNumbers.length }))
            setShowShippingForm(true)
          }}>
            <Icon icon={MATERIALE_ICONS.truck} size={16} className="mr-1" />
            Registra spedizione
          </Button>
        )}
      </div>

      {/* Packing status summary */}
      {!event.spedizione_data && packingTotalItems > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' flex flex-wrap gap-x-4 gap-y-1 text-sm'}>
          <span className="text-mikai-700 font-medium">
            {packingColliNumbers.length > 0 ? `${packingColliNumbers.length} colli` : 'Nessun collo creato'}
          </span>
          <span className="text-mikai-600">{packingPackedCount}/{packingTotalItems} imballati</span>
          {!allPacked && <span className="text-yellow-600 font-medium">Completa l'imballaggio per spedire</span>}
          {allPacked && packingColliNumbers.length === 0 && <span className="text-yellow-600 font-medium">Assegna le voci ai colli</span>}
          {readyToShip && <span className="text-green-600 font-medium">Pronto per la spedizione</span>}
        </div>
      )}
      {!event.spedizione_data && packingTotalItems === 0 && (
        <p className="text-sm text-gray-400">Apri la packing list per preparare i colli</p>
      )}

      {/* Already shipped — display */}
      {event.spedizione_data && !showShippingForm && (
        <div className={CARD_STYLE + ' space-y-2'}>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {event.spedizione_corriere && (
              <div><span className="text-gray-500">Corriere:</span> <span className="font-medium">{event.spedizione_corriere}</span></div>
            )}
            {event.spedizione_tracking && (
              <div><span className="text-gray-500">Tracking:</span> <span className="font-medium font-mono">{event.spedizione_tracking}</span></div>
            )}
            {event.spedizione_colli != null && (
              <div><span className="text-gray-500">Colli:</span> <span className="font-medium">{event.spedizione_colli}</span></div>
            )}
            <div><span className="text-gray-500">Data:</span> <span className="font-medium">{formatDate(event.spedizione_data)}</span></div>
          </div>
          {event.spedizione_note && <p className="text-sm text-gray-600">{event.spedizione_note}</p>}
          {canApprove && (
            <Button variant="ghost" size="sm" onClick={() => setShowShippingForm(true)}>Modifica</Button>
          )}
        </div>
      )}

      {/* Shipping form */}
      {showShippingForm && (
        <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corriere</label>
              <input
                value={shippingForm.corriere}
                onChange={e => setShippingForm(f => ({ ...f, corriere: e.target.value }))}
                placeholder="Es. BRT, DHL, GLS..."
                className={INPUT_STYLE}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero tracking</label>
              <input
                value={shippingForm.tracking}
                onChange={e => setShippingForm(f => ({ ...f, tracking: e.target.value }))}
                placeholder="Codice spedizione"
                className={INPUT_STYLE}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero colli</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Data spedizione</label>
              <input
                type="date"
                value={shippingForm.data}
                onChange={e => setShippingForm(f => ({ ...f, data: e.target.value }))}
                className={INPUT_STYLE}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note spedizione</label>
            <input
              value={shippingForm.note}
              onChange={e => setShippingForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Es. Fermo deposito, chiamare prima..."
              className={INPUT_STYLE}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const result = await onSaveShipping({
                spedizione_corriere: shippingForm.corriere || null,
                spedizione_tracking: shippingForm.tracking || null,
                spedizione_colli: shippingForm.colli ? parseInt(shippingForm.colli) : packingColliNumbers.length || null,
                spedizione_data: shippingForm.data || null,
                spedizione_note: shippingForm.note || null,
              })
              if (result?.ok) setShowShippingForm(false)
            }}>
              <Icon icon={MATERIALE_ICONS.truck} size={16} className="mr-1" />
              {event.spedizione_data ? 'Aggiorna spedizione' : 'Registra spedizione'}
            </Button>
            <Button variant="secondary" onClick={() => setShowShippingForm(false)}>Annulla</Button>
          </div>
        </div>
      )}
    </section>
  )
}
