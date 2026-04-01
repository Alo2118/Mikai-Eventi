import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useTavoliStore } from '../../hooks/useTavoli'
import { useHotelTemplatesStore } from '../../hooks/useHotelTemplates'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { toISO } from '../../lib/date-utils'
import { Modal } from '../ui/Modal'
import { MEZZO_TRASPORTO, STATO_PRENOTAZIONE, INPUT_STYLE } from '../../lib/constants'

// ─── Tavolo Modal ───────────────────────────────────────────────
export function TavoloModal({ selectedPeople, eventId, tavoli, onDone, onClose }) {
  const [tavoloId, setTavoloId] = useState('')
  const [loading, setLoading] = useState(false)
  const addFormatore = useTavoliStore(s => s.addFormatore)
  const addDiscente = useTavoliStore(s => s.addDiscente)
  const removeFormatore = useTavoliStore(s => s.removeFormatore)
  const removeDiscente = useTavoliStore(s => s.removeDiscente)
  const addToast = useToastStore(s => s.add)

  const handleAssign = async () => {
    if (!tavoloId) return
    setLoading(true)
    let ok = 0
    for (const person of selectedPeople) {
      // Remove from current tavolo first (handled by the caller's getPersonTavoloAssignmentId if needed)
      // For simplicity, just add — unique constraint will prevent duplicates
      if (person.type === 'staff') {
        const { error } = await addFormatore(tavoloId, person.staffId, eventId)
        if (!error) ok++
      } else {
        const { error } = await addDiscente(tavoloId, person.participantId, eventId)
        if (!error) ok++
      }
    }
    setLoading(false)
    addToast(`${ok} persone assegnate al tavolo`, 'success')
    onDone()
  }

  return (
    <Modal open={true} onClose={onClose} size="md" title="Imposta tavolo" subtitle={`${selectedPeople.length} persone selezionate`}>
      <div className="space-y-4">
        <select className={INPUT_STYLE} value={tavoloId} onChange={e => setTavoloId(e.target.value)}>
          <option value="">— Seleziona tavolo —</option>
          {tavoli.map(t => <option key={t.id} value={t.id}>Tavolo {t.numero}{t.nome ? ` — ${t.nome}` : ''}</option>)}
        </select>
        <Button onClick={handleAssign} loading={loading} disabled={!tavoloId}>
          Assegna a {selectedPeople.length} persone
        </Button>
      </div>
    </Modal>
  )
}

// ─── Hotel Modal ────────────────────────────────────────────────
export function HotelModal({ selectedPeople, eventId, onDone, onClose }) {
  const [form, setForm] = useState({ nome_hotel: '', indirizzo_hotel: '', check_in: '', check_out: '', stato: 'da_prenotare', note: '' })
  const [loading, setLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const createHotel = useLogisticsStore(s => s.createHotel)
  const updateHotel = useLogisticsStore(s => s.updateHotel)
  const hotels = useLogisticsStore(s => s.hotels)
  const templates = useHotelTemplatesStore(s => s.templates)
  const fetchTemplates = useHotelTemplatesStore(s => s.fetchTemplates)
  const createTemplate = useHotelTemplatesStore(s => s.createTemplate)
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchTemplates() }, [])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleApplyTemplate = (templateId) => {
    const tpl = templates.find(t => t.id === templateId)
    if (tpl) setForm(f => ({ ...f, nome_hotel: tpl.nome_hotel || '', indirizzo_hotel: tpl.indirizzo_hotel || '' }))
  }

  const handleSaveTemplate = async () => {
    if (!form.nome_hotel.trim()) return
    setSavingTemplate(true)
    const { error } = await createTemplate({ nome_hotel: form.nome_hotel.trim(), indirizzo_hotel: form.indirizzo_hotel.trim() || null })
    setSavingTemplate(false)
    if (error) addToast('Errore salvataggio template', 'error')
    else addToast('Template salvato', 'success')
  }

  const handleAssign = async () => {
    setLoading(true)
    const updates = {
      nome_hotel: form.nome_hotel.trim() || null,
      indirizzo_hotel: form.indirizzo_hotel.trim() || null,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      stato: form.stato,
      note: form.note.trim() || null,
    }
    let ok = 0
    for (const person of selectedPeople) {
      const existing = hotels.find(h =>
        person.type === 'staff' ? h.user_id === person.id : h.contact_id === person.id
      )
      if (existing) {
        const { error } = await updateHotel(existing.id, updates)
        if (!error) ok++
      } else {
        const payload = { ...updates, event_id: eventId }
        if (person.type === 'staff') payload.user_id = person.id
        else payload.contact_id = person.id
        const { error } = await createHotel(payload)
        if (!error) ok++
      }
    }
    setLoading(false)
    addToast(`Hotel impostato per ${ok} persone`, 'success')
    onDone()
  }

  return (
    <Modal open={true} onClose={onClose} size="md" title="Imposta hotel" subtitle={`${selectedPeople.length} persone selezionate`}>
      <div className="space-y-3">
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usa template</label>
            <select className={INPUT_STYLE} onChange={e => handleApplyTemplate(e.target.value)} defaultValue="">
              <option value="">— Seleziona template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.nome_hotel}{t.indirizzo_hotel ? ` — ${t.indirizzo_hotel}` : ''}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome hotel</label>
          <input className={INPUT_STYLE} value={form.nome_hotel} onChange={e => set('nome_hotel', e.target.value)} placeholder="G Hotel Vicenza..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
          <input className={INPUT_STYLE} value={form.indirizzo_hotel} onChange={e => set('indirizzo_hotel', e.target.value)} placeholder="Via Roma 1, Monteviale (VI)" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
            <input type="date" className={INPUT_STYLE} value={form.check_in} onChange={e => set('check_in', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
            <input type="date" className={INPUT_STYLE} value={form.check_out} onChange={e => set('check_out', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stato prenotazione</label>
          <select className={INPUT_STYLE} value={form.stato} onChange={e => set('stato', e.target.value)}>
            {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea className={INPUT_STYLE + ' min-h-[64px]'} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Es: no hotel per Margherita Valerio" rows={2} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button onClick={handleAssign} loading={loading}>
            Assegna a {selectedPeople.length} persone
          </Button>
          {form.nome_hotel.trim() && (
            <button onClick={handleSaveTemplate} disabled={savingTemplate} className="text-sm text-mikai-500 hover:text-mikai-700">
              {savingTemplate ? 'Salvataggio...' : 'Salva come template'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Trasporto Modal ────────────────────────────────────────────

export function TrasportoModal({ selectedPeople, eventId, direzione, onDone, onClose }) {
  const [form, setForm] = useState({
    mezzo: '',
    codice: '',
    orario: '',
    autista: '',
    orario_pickup: '',
    stato: 'da_prenotare',
    note: '',
  })
  const [loading, setLoading] = useState(false)
  const createTrasporto = useLogisticsStore(s => s.createTrasporto)
  const updateTrasporto = useLogisticsStore(s => s.updateTrasporto)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const addToast = useToastStore(s => s.add)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const mezzo = form.mezzo
  const showCodice = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto'
  const showOrario = mezzo && mezzo !== 'indipendente'
  const showAutista = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto'

  const handleAssign = async () => {
    setLoading(true)
    const payload = {
      mezzo: form.mezzo || null,
      codice: form.codice.trim() || null,
      orario: toISO(form.orario),
      autista: form.autista.trim() || null,
      orario_pickup: toISO(form.orario_pickup),
      stato: form.stato,
      note: form.note.trim() || null,
    }

    let ok = 0
    for (const person of selectedPeople) {
      // Check if person already has transport for this direction
      const existing = trasporti.find(t =>
        t.direzione === direzione && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id)
      )
      if (existing) {
        const { error } = await updateTrasporto(existing.id, payload)
        if (!error) ok++
      } else {
        const newPayload = { ...payload, event_id: eventId, direzione }
        if (person.type === 'staff') newPayload.user_id = person.id
        else newPayload.contact_id = person.id
        const { error } = await createTrasporto(newPayload)
        if (!error) ok++
      }
    }
    setLoading(false)
    addToast(`${direzione === 'andata' ? 'Andata' : 'Ritorno'} impostato per ${ok} persone`, 'success')
    onDone()
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={`Imposta ${direzione === 'andata' ? 'andata' : 'ritorno'}`}
      subtitle={`${selectedPeople.length} persone selezionate`}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mezzo</label>
            <select className={INPUT_STYLE} value={form.mezzo} onChange={e => set('mezzo', e.target.value)}>
              <option value="">— Scegli —</option>
              {Object.entries(MEZZO_TRASPORTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {showCodice && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice treno/volo</label>
              <input className={INPUT_STYLE} value={form.codice} onChange={e => set('codice', e.target.value)} placeholder="FR9728, AZ1605..." />
            </div>
          )}

          {showOrario && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orario partenza</label>
              <input type="datetime-local" className={INPUT_STYLE} value={form.orario} onChange={e => set('orario', e.target.value)} />
            </div>
          )}

          {showAutista && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autista</label>
              <input className={INPUT_STYLE} value={form.autista} onChange={e => set('autista', e.target.value)} placeholder="Nome autista" />
            </div>
          )}

          {showAutista && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orario pickup</label>
              <input type="datetime-local" className={INPUT_STYLE} value={form.orario_pickup} onChange={e => set('orario_pickup', e.target.value)} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
            <select className={INPUT_STYLE} value={form.stato} onChange={e => set('stato', e.target.value)}>
              {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea className={INPUT_STYLE + ' min-h-[64px]'} value={form.note} onChange={e => set('note', e.target.value)} rows={2} />
        </div>

        <Button onClick={handleAssign} loading={loading} disabled={!form.mezzo}>
          Assegna a {selectedPeople.length} persone
        </Button>
      </div>
    </Modal>
  )
}
