import { useState, useEffect } from 'react'
import { useGadgetsStore } from '../../hooks/useGadgets'
import { Button } from '../ui/Button'
import { useToastStore } from '../ui/Toast'

export function GadgetRequestForm({ eventId, onDone }) {
  const [gadgetId, setGadgetId] = useState('')
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)

  const gadgets = useGadgetsStore(s => s.gadgets)
  const fetchGadgets = useGadgetsStore(s => s.fetchGadgets)
  const requestGadget = useGadgetsStore(s => s.requestGadget)
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchGadgets() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await requestGadget({
      event_id: eventId,
      gadget_id: gadgetId,
      quantita_richiesta: qty,
    })
    setLoading(false)
    if (error) addToast(error, 'error')
    else { addToast('Gadget richiesto!', 'success'); onDone?.() }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900">Richiedi gadget</h3>
      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">Gadget <span className="text-red-500">*</span></label>
        <select value={gadgetId} onChange={(e) => setGadgetId(e.target.value)} required
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400">
          <option value="">Seleziona...</option>
          {gadgets.map((g) => (
            <option key={g.id} value={g.id}>{g.nome} (disp: {g.quantita_disponibile})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">Quantit&agrave; <span className="text-red-500">*</span></label>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400" />
      </div>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>Annulla</Button>
        <Button type="submit" loading={loading} disabled={!gadgetId}>Richiedi</Button>
      </div>
    </form>
  )
}
