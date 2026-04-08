import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useTavoliStore } from '../../hooks/useTavoli'
import { useHotelTemplatesStore } from '../../hooks/useHotelTemplates'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { toISO, toLocalDateTime } from '../../lib/date-utils'
import { Modal } from '../ui/Modal'
import { MEZZO_TRASPORTO, STATO_PRENOTAZIONE, INPUT_STYLE, SELECT_STYLE } from '../../lib/constants'

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
    if (ok === 0) addToast('Nessuna persona assegnata al tavolo', 'error')
    else addToast(`${ok} persone assegnate al tavolo`, 'success')
    onDone()
  }

  return (
    <Modal open={true} onClose={onClose} size="md" title="Imposta tavolo" subtitle={`${selectedPeople.length} persone selezionate`}>
      <div className="space-y-4">
        <select className={SELECT_STYLE} value={tavoloId} onChange={e => setTavoloId(e.target.value)}>
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
export function HotelModal({ selectedPeople, eventId, initialData, onDone, onClose }) {
  const [form, setForm] = useState(initialData
    ? { nome_hotel: initialData.nome_hotel || '', indirizzo_hotel: initialData.indirizzo_hotel || '', check_in: initialData.check_in || '', check_out: initialData.check_out || '', stato: initialData.stato || 'da_prenotare', note: initialData.note || '' }
    : { nome_hotel: '', indirizzo_hotel: '', check_in: '', check_out: '', stato: 'da_prenotare', note: '' }
  )
  const [loading, setLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const createHotel = useLogisticsStore(s => s.createHotel)
  const updateHotel = useLogisticsStore(s => s.updateHotel)
  const hotels = useLogisticsStore(s => s.hotels)
  const templates = useHotelTemplatesStore(s => s.templates)
  const fetchTemplates = useHotelTemplatesStore(s => s.fetchTemplates)
  const createTemplate = useHotelTemplatesStore(s => s.createTemplate)
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

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
    const isNN = form.stato === 'non_necessario'
    const updates = {
      nome_hotel: isNN ? null : (form.nome_hotel.trim() || null),
      indirizzo_hotel: isNN ? null : (form.indirizzo_hotel.trim() || null),
      check_in: isNN ? null : (form.check_in || null),
      check_out: isNN ? null : (form.check_out || null),
      stato: form.stato,
      note: isNN ? null : (form.note.trim() || null),
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
    if (ok === 0) addToast('Nessun hotel assegnato', 'error')
    else addToast(`Hotel impostato per ${ok} persone`, 'success')
    onDone()
  }

  return (
    <Modal open={true} onClose={onClose} size="md" title="Imposta hotel" subtitle={selectedPeople.length === 1 ? `${selectedPeople[0].cognome} ${selectedPeople[0].nome}` : `${selectedPeople.length} persone selezionate`}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stato prenotazione</label>
          <select className={SELECT_STYLE} value={form.stato} onChange={e => set('stato', e.target.value)}>
            {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {form.stato !== 'non_necessario' && (
          <>
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usa template</label>
                <select className={SELECT_STYLE} onChange={e => handleApplyTemplate(e.target.value)} defaultValue="">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea className={INPUT_STYLE + ' min-h-[64px]'} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Es: no hotel per Margherita Valerio" rows={2} />
            </div>
          </>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button onClick={handleAssign} loading={loading}>
            {form.stato === 'non_necessario' ? `Segna ${selectedPeople.length} come non necessario` : `Assegna a ${selectedPeople.length} persone`}
          </Button>
          {form.stato !== 'non_necessario' && form.nome_hotel.trim() && (
            <button onClick={handleSaveTemplate} disabled={savingTemplate} className="text-sm text-mikai-500 hover:text-mikai-700 min-h-[48px]">
              {savingTemplate ? 'Salvataggio...' : 'Salva come template'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Trasporto Modal ────────────────────────────────────────────

export function TrasportoModal({ selectedPeople, eventId, direzione, initialData, newOrdine, existingLegCount = 0, onDone, onClose }) {
  const [form, setForm] = useState(initialData
    ? { mezzo: initialData.mezzo || '', codice: initialData.codice || '', luogo_partenza: initialData.luogo_partenza || '', luogo_arrivo: initialData.luogo_arrivo || '', orario: initialData.orario ? toLocalDateTime(initialData.orario) : '', orario_arrivo: initialData.orario_arrivo ? toLocalDateTime(initialData.orario_arrivo) : '', stato: initialData.stato || 'da_prenotare', note: initialData.note || '' }
    : { mezzo: '', codice: '', luogo_partenza: '', luogo_arrivo: '', orario: '', orario_arrivo: '', stato: 'da_prenotare', note: '' }
  )
  const [loading, setLoading] = useState(false)
  const [applyToAll, setApplyToAll] = useState(false)
  const createTrasporto = useLogisticsStore(s => s.createTrasporto)
  const updateTrasporto = useLogisticsStore(s => s.updateTrasporto)
  const removeTrasporto = useLogisticsStore(s => s.removeTrasporto)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const addToast = useToastStore(s => s.add)
  const isSinglePerson = selectedPeople.length === 1
  const canDeleteLeg = isSinglePerson && initialData?.id && existingLegCount > 1

  // Find how many people share this same leg (same codice+mezzo+direzione)
  const matchingLegs = (isSinglePerson && initialData?.codice) ? trasporti.filter(t =>
    t.event_id === eventId && t.direzione === direzione && t.codice === initialData.codice && t.mezzo === initialData.mezzo && t.id !== initialData.id
  ) : []

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const mezzo = form.mezzo
  const showCodice = mezzo && mezzo !== 'indipendente' && mezzo !== 'auto' && mezzo !== 'transfer'
  const showOrario = mezzo && mezzo !== 'indipendente'
  const showLuoghi = mezzo && mezzo !== 'indipendente'

  const handleAssign = async () => {
    setLoading(true)
    const isNN = form.stato === 'non_necessario'
    const payload = {
      mezzo: isNN ? null : (form.mezzo || null),
      codice: isNN ? null : (form.codice.trim() || null),
      luogo_partenza: isNN ? null : (form.luogo_partenza.trim() || null),
      luogo_arrivo: isNN ? null : (form.luogo_arrivo.trim() || null),
      orario: isNN ? null : toISO(form.orario),
      orario_arrivo: isNN ? null : toISO(form.orario_arrivo),
      autista: null,
      orario_pickup: null,
      stato: form.stato,
      note: isNN ? null : (form.note.trim() || null),
    }

    let ok = 0
    for (const person of selectedPeople) {
      if (isSinglePerson && initialData?.id) {
        // Update this leg
        const { error } = await updateTrasporto(initialData.id, payload)
        if (!error) ok++
        // Also update all matching legs if "applica a tutti" is on
        if (applyToAll && matchingLegs.length > 0) {
          for (const leg of matchingLegs) {
            const { error: e } = await updateTrasporto(leg.id, payload)
            if (!e) ok++
          }
        }
      } else if (isSinglePerson && !initialData) {
        // Single person adding new leg
        const newPayload = { ...payload, event_id: eventId, direzione, ordine: newOrdine || 1 }
        if (person.type === 'staff') newPayload.user_id = person.id
        else newPayload.contact_id = person.id
        const { error } = await createTrasporto(newPayload)
        if (!error) ok++
      } else {
        // Bulk: find-or-update first leg (ordine=1) only
        const existing = trasporti.find(t =>
          t.direzione === direzione && (t.ordine || 1) === 1 &&
          (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id)
        )
        if (existing) {
          const { error } = await updateTrasporto(existing.id, payload)
          if (!error) ok++
        } else {
          const newPayload = { ...payload, event_id: eventId, direzione, ordine: 1 }
          if (person.type === 'staff') newPayload.user_id = person.id
          else newPayload.contact_id = person.id
          const { error } = await createTrasporto(newPayload)
          if (!error) ok++
        }
      }
    }
    setLoading(false)
    if (ok === 0) addToast(`Nessun ${direzione === 'andata' ? 'andata' : 'ritorno'} assegnato`, 'error')
    else addToast(ok === 1 ? 'Tratta aggiornata' : `Tratta aggiornata per ${ok} persone`, 'success')
    onDone()
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={`Imposta ${direzione === 'andata' ? 'andata' : 'ritorno'}`}
      subtitle={selectedPeople.length === 1 ? `${selectedPeople[0].cognome} ${selectedPeople[0].nome}` : `${selectedPeople.length} persone selezionate`}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
          <select className={SELECT_STYLE} value={form.stato} onChange={e => set('stato', e.target.value)}>
            {Object.entries(STATO_PRENOTAZIONE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {form.stato !== 'non_necessario' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mezzo</label>
                <select className={SELECT_STYLE} value={form.mezzo} onChange={e => set('mezzo', e.target.value)}>
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

              {showLuoghi && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partenza da</label>
                    <input className={INPUT_STYLE} value={form.luogo_partenza} onChange={e => set('luogo_partenza', e.target.value)} placeholder="Es: Milano Centrale, Aeroporto Verona..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Arrivo a</label>
                    <input className={INPUT_STYLE} value={form.luogo_arrivo} onChange={e => set('luogo_arrivo', e.target.value)} placeholder="Es: Vicenza, Hotel G..." />
                  </div>
                </>
              )}

              {showOrario && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orario partenza</label>
                    <input type="datetime-local" className={INPUT_STYLE} value={form.orario} onChange={e => set('orario', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orario arrivo</label>
                    <input type="datetime-local" className={INPUT_STYLE} value={form.orario_arrivo} onChange={e => set('orario_arrivo', e.target.value)} />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea className={INPUT_STYLE + ' min-h-[64px]'} value={form.note} onChange={e => set('note', e.target.value)} rows={2} />
            </div>
          </>
        )}

        {matchingLegs.length > 0 && (
          <label className="flex items-center gap-2 px-3 py-2 bg-mikai-50 rounded-lg cursor-pointer min-h-[48px]">
            <input type="checkbox" checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
            <span className="text-sm text-mikai-700">Applica a tutti con stessa tratta ({matchingLegs.length + 1} persone)</span>
          </label>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button onClick={handleAssign} loading={loading} disabled={form.stato !== 'non_necessario' && !form.mezzo}>
            {isSinglePerson
              ? (initialData ? (applyToAll ? `Aggiorna ${matchingLegs.length + 1} persone` : 'Aggiorna') : (form.stato === 'non_necessario' ? 'Segna non necessario' : 'Aggiungi tratta'))
              : (form.stato === 'non_necessario' ? `Segna ${selectedPeople.length} come non necessario` : `Assegna a ${selectedPeople.length} persone`)
            }
          </Button>
          {canDeleteLeg && (
            <button type="button" onClick={async () => {
              setLoading(true)
              const { error } = await removeTrasporto(initialData.id)
              setLoading(false)
              if (error) addToast('Errore eliminazione tratta', 'error')
              else { addToast('Tratta eliminata', 'success'); onDone() }
            }} className="text-sm text-red-500 hover:text-red-700 min-h-[48px]">
              Elimina tratta
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
