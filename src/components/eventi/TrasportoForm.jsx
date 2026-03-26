import { useState } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { MEZZO_TRASPORTO, STATO_PRENOTAZIONE, INPUT_STYLE, SELECT_STYLE } from '../../lib/constants'
import { toLocalDateTime, toISO } from '../../lib/date-utils'


export function TrasportoForm({ trasporto, eventId, personId, personType, direzione, onSave, onCancel }) {
  const [mezzo, setMezzo] = useState(trasporto?.mezzo ?? '')
  const [codice, setCodice] = useState(trasporto?.codice ?? '')
  const [orario, setOrario] = useState(toLocalDateTime(trasporto?.orario))
  const [autista, setAutista] = useState(trasporto?.autista ?? '')
  const [orarioPickup, setOrarioPickup] = useState(toLocalDateTime(trasporto?.orario_pickup))
  const [stato, setStato] = useState(trasporto?.stato ?? 'da_prenotare')
  const [note, setNote] = useState(trasporto?.note ?? '')
  const [loading, setLoading] = useState(false)

  const createTrasporto = useLogisticsStore(s => s.createTrasporto)
  const updateTrasporto = useLogisticsStore(s => s.updateTrasporto)
  const addToast = useToastStore(s => s.add)

  const showCodice = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto'
  const showOrario = mezzo && mezzo !== 'indipendente'
  const showAutista = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto'
  const showPickup = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      mezzo: mezzo || null,
      codice: codice || null,
      orario: toISO(orario),
      autista: autista || null,
      orario_pickup: toISO(orarioPickup),
      stato: stato || null,
      note: note || null,
    }

    let result
    if (trasporto) {
      result = await updateTrasporto(trasporto.id, payload)
    } else {
      const personField = personType === 'staff' ? { user_id: personId } : { contact_id: personId }
      result = await createTrasporto({ ...payload, event_id: eventId, direzione, ...personField })
    }

    setLoading(false)

    if (result.error) {
      addToast('Errore nel salvataggio del trasporto. Riprova.', 'error')
    } else {
      addToast(trasporto ? 'Trasporto aggiornato.' : 'Trasporto aggiunto.', 'success')
      onSave?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mezzo <span className="text-red-500">*</span>
          </label>
          <select
            value={mezzo}
            onChange={e => setMezzo(e.target.value)}
            required
            className={SELECT_STYLE}
          >
            <option value="">Seleziona...</option>
            {Object.entries(MEZZO_TRASPORTO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
          <select
            value={stato}
            onChange={e => setStato(e.target.value)}
            className={SELECT_STYLE}
          >
            {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {showCodice && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
            <input
              type="text"
              value={codice}
              onChange={e => setCodice(e.target.value)}
              placeholder="FR9728, AZ1605 AHO→LIN"
              className={INPUT_STYLE}
            />
          </div>
        )}

        {showOrario && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orario partenza</label>
            <input
              type="datetime-local"
              value={orario}
              onChange={e => setOrario(e.target.value)}
              className={INPUT_STYLE}
            />
          </div>
        )}

        {showAutista && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Autista / Accompagnatore</label>
            <input
              type="text"
              value={autista}
              onChange={e => setAutista(e.target.value)}
              placeholder="Nome autista"
              className={INPUT_STYLE}
            />
          </div>
        )}

        {showPickup && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orario pick-up</label>
            <input
              type="datetime-local"
              value={orarioPickup}
              onChange={e => setOrarioPickup(e.target.value)}
              className={INPUT_STYLE}
            />
          </div>
        )}

        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className={`${INPUT_STYLE} min-h-[80px] resize-none`}
            placeholder="Note aggiuntive..."
          />
        </div>

      </div>

      <div className="flex gap-3 justify-end mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" loading={loading} disabled={!mezzo}>
          Salva
        </Button>
      </div>
    </form>
  )
}
