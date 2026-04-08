import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useHotelTemplatesStore } from '../../hooks/useHotelTemplates'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { STATO_PRENOTAZIONE, INPUT_STYLE, SELECT_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'

export function HotelForm({ hotel, eventId, personId, personType, onSave, onCancel }) {
  const [nome, setNome] = useState(hotel?.nome_hotel ?? '')
  const [indirizzo, setIndirizzo] = useState(hotel?.indirizzo_hotel ?? '')
  const [checkIn, setCheckIn] = useState(hotel?.check_in ?? '')
  const [checkOut, setCheckOut] = useState(hotel?.check_out ?? '')
  const [stato, setStato] = useState(hotel?.stato ?? 'da_prenotare')
  const [note, setNote] = useState(hotel?.note ?? '')
  const [loading, setLoading] = useState(false)

  const createHotel = useLogisticsStore(s => s.createHotel)
  const updateHotel = useLogisticsStore(s => s.updateHotel)
  const templates = useHotelTemplatesStore(s => s.templates)
  const fetchTemplates = useHotelTemplatesStore(s => s.fetchTemplates)
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const isNN = stato === 'non_necessario'

  const handleApplyTemplate = (templateId) => {
    const tpl = templates.find(t => t.id === templateId)
    if (tpl) {
      setNome(tpl.nome_hotel || '')
      setIndirizzo(tpl.indirizzo_hotel || '')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      nome_hotel: isNN ? null : (nome.trim() || null),
      indirizzo_hotel: isNN ? null : (indirizzo.trim() || null),
      check_in: isNN ? null : (checkIn || null),
      check_out: isNN ? null : (checkOut || null),
      stato,
      note: isNN ? null : (note.trim() || null),
    }

    let result
    if (hotel) {
      result = await updateHotel(hotel.id, payload)
    } else {
      const personField = personType === 'staff' ? { user_id: personId } : { contact_id: personId }
      result = await createHotel({ ...payload, event_id: eventId, ...personField })
    }

    setLoading(false)
    if (result.error) {
      addToast('Errore nel salvataggio hotel. Riprova.', 'error')
    } else {
      addToast(hotel ? 'Hotel aggiornato.' : 'Hotel assegnato.', 'success')
      onSave?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_CONTAINER_STYLE}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
          <select value={stato} onChange={e => setStato(e.target.value)} className={SELECT_STYLE}>
            {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {!isNN && (
          <>
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select className={SELECT_STYLE} onChange={e => handleApplyTemplate(e.target.value)} defaultValue="">
                  <option value="">— Usa template —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nome_hotel}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome hotel</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="G Hotel Vicenza..." className={INPUT_STYLE} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
              <input type="text" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} placeholder="Via Roma 1, Monteviale" className={INPUT_STYLE} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
              <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className={INPUT_STYLE} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
              <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className={INPUT_STYLE} />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Note..." className={INPUT_STYLE} />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Annulla</Button>
        <Button type="submit" loading={loading}>
          {isNN ? 'Segna non necessario' : (hotel ? 'Aggiorna' : 'Assegna')}
        </Button>
      </div>
    </form>
  )
}
