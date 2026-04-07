import { useState } from 'react'
import { Button } from '../ui/Button'
import { CARD_STYLE, INPUT_STYLE } from '../../lib/constants'

export function ConsumptionReport({ rows, eventId, onReport }) {
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState({})

  const gadgetRows = (rows || []).filter(r =>
    (r.product?.tipo === 'gadget' || r.product?.serializzato === false) &&
    (r.stato === 'approvato' || r.stato === 'in_preparazione')
  )

  if (gadgetRows.length === 0) return null

  const handleReport = async (row) => {
    const qty = values[row.id] ?? row.quantita_approvata ?? row.quantita ?? 0
    setSaving(s => ({ ...s, [row.id]: true }))
    await onReport(row.id, qty)
    setSaving(s => ({ ...s, [row.id]: false }))
  }

  return (
    <div className={CARD_STYLE + ' space-y-4'}>
      <h3 className="font-semibold text-lg">Consumo materiale</h3>
      <p className="text-sm text-gray-500">
        Indica quanti pezzi sono stati effettivamente utilizzati. I rimanenti torneranno nel tuo inventario.
      </p>
      <div className="space-y-3">
        {gadgetRows.map(row => (
          <div key={row.id} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium">{row.product?.nome}</p>
              <p className="text-sm text-gray-500">Approvati: {row.quantita_approvata ?? row.quantita} pz</p>
            </div>
            {row.quantita_consumata != null ? (
              <div className="text-right shrink-0">
                <span className="text-sm text-gray-500">Consumati: </span>
                <span className="font-semibold">{row.quantita_consumata} pz</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="0"
                  max={row.quantita_approvata ?? row.quantita ?? 0}
                  value={values[row.id] ?? (row.quantita_approvata ?? row.quantita ?? 0)}
                  onChange={e => setValues(v => ({ ...v, [row.id]: Math.max(0, Math.min(parseInt(e.target.value) || 0, row.quantita_approvata ?? row.quantita ?? 0)) }))}
                  className={INPUT_STYLE + ' !w-20 text-center'}
                  aria-label={`Quantita consumata per ${row.product?.nome}`}
                />
                <Button size="sm" onClick={() => handleReport(row)} loading={saving[row.id]}>
                  Registra
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
