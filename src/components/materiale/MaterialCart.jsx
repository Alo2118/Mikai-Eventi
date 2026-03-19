import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { ConflictAlert } from './ConflictAlert'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { useToastStore } from '../ui/Toast'

export function MaterialCart({ eventId, event, cart, onRemove, onDone }) {
  const [startDate, setStartDate] = useState(event?.data_inizio || '')
  const [endDate, setEndDate] = useState(event?.data_fine || event?.data_inizio || '')
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(false)

  const checkConflict = useMaterialsStore(s => s.checkConflict)
  const requestMaterial = useMaterialsStore(s => s.requestMaterial)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    if (!startDate || !endDate || cart.length === 0) {
      setConflicts([])
      return
    }
    Promise.all(
      cart.map(mat => checkConflict(mat.id, startDate, endDate))
    ).then(results => {
      setConflicts(results.flatMap(r => r.data))
    })
  }, [startDate, endDate, cart.length])

  const handleSubmit = async () => {
    if (conflicts.length > 0 || cart.length === 0 || !startDate || !endDate) return
    setLoading(true)
    const results = await Promise.all(
      cart.map(mat =>
        requestMaterial({
          event_id: eventId,
          material_id: mat.id,
          quantita_richiesta: 1,
          data_inizio_utilizzo: startDate,
          data_fine_utilizzo: endDate,
          richiesto_da: user.id,
        })
      )
    )
    setLoading(false)
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      addToast(`Errore: ${errors[0].error}`, 'error')
    } else {
      addToast(`${cart.length} materiali richiesti!`, 'success')
      onDone?.()
    }
  }

  if (cart.length === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center text-base text-gray-400">
        Aggiungi almeno un materiale al carrello.
      </div>
    )
  }

  return (
    <div className="mt-6 sticky bottom-0 z-10 bg-white border-t border-gray-200 p-4 md:static md:border-t-0 md:border-0 md:p-5 md:bg-gray-50 md:rounded-xl space-y-4">
      <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Icon icon={MATERIALE_ICONS.package_open} size={20} />
        Carrello ({cart.length} {cart.length === 1 ? 'articolo' : 'articoli'})
      </h4>

      <div className="space-y-2">
        {cart.map((mat) => (
          <div key={mat.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-200">
            <div>
              <span className="text-base text-gray-900">{mat.nome}</span>
              <span className="text-sm text-gray-400 ml-2">{mat.codice_inventario}</span>
            </div>
            <button
              onClick={() => onRemove(mat.id)}
              className="text-red-500 hover:text-red-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label={`Rimuovi ${mat.nome}`}
            >
              <Icon icon={ACTION_ICONS.close} size={20} />
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DatePicker label="Data inizio utilizzo" value={startDate} onChange={setStartDate} required />
        <DatePicker label="Data fine utilizzo" value={endDate} onChange={setEndDate} min={startDate} required />
      </div>

      <ConflictAlert conflicts={conflicts} />

      <Button
        onClick={handleSubmit}
        loading={loading}
        disabled={cart.length === 0 || !startDate || !endDate || conflicts.length > 0}
        size="lg"
        className="w-full"
      >
        Invia richiesta ({cart.length} materiali)
      </Button>
      {(!startDate || !endDate) && (
        <p className="text-sm text-gray-500 text-center">Seleziona le date di utilizzo per procedere.</p>
      )}
      {conflicts.length > 0 && (
        <p className="text-sm text-red-600 text-center">Risolvi i conflitti prima di inviare la richiesta.</p>
      )}
    </div>
  )
}
