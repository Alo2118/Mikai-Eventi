import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStaffStore = create((set, get) => ({
  staff: [],
  loading: false,
  error: null,

  fetchEventStaff: async (eventId) => {
    set({ staff: [], loading: true, error: null })
    const { data, error } = await supabase
      .from('event_staff')
      .select('*, user:users(id, nome, cognome, ruolo, email, esigenze_alimentari, esigenze_accessibilita)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ staff: data || [], loading: false, error: error?.message || null })
    return { data, error }
  },

  addStaff: async (eventId, userId, ruoloEvento) => {
    const { data, error } = await supabase
      .from('event_staff')
      .insert({ event_id: eventId, user_id: userId, ruolo_evento: ruoloEvento, confermato: false })
      .select('*, user:users(id, nome, cognome, ruolo, email, esigenze_alimentari, esigenze_accessibilita)')
      .single()
    if (!error) set(s => ({ staff: [...s.staff, data] }))
    return { data, error: error?.message || null }
  },

  updateStaff: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_staff')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome, ruolo, email, esigenze_alimentari, esigenze_accessibilita)')
      .single()
    if (!error) set(s => ({ staff: s.staff.map(r => r.id === id ? data : r) }))
    return { data, error: error?.message || null }
  },

  removeStaff: async (id) => {
    const { error } = await supabase.from('event_staff').delete().eq('id', id)
    if (!error) set(s => ({ staff: s.staff.filter(r => r.id !== id) }))
    return { error: error?.message || null }
  },

  // Doppia prenotazione staff: per una lista di utenti trova gli ALTRI eventi (non conclusi/
  // cancellati/rifiutati) con date sovrapposte alla finestra data, dove la stessa persona è
  // già staff. Simmetrico a fetchProductConflicts per il materiale. Sola lettura.
  // window: { start, end } (date evento corrente). Ritorna map user_id -> [{ id, titolo, data_inizio, data_fine }].
  fetchStaffConflicts: async (userIds, window, excludeEventId) => {
    const ids = [...new Set((userIds || []).filter(Boolean))]
    if (ids.length === 0) return { data: {}, error: null }

    const { data, error } = await supabase
      .from('event_staff')
      .select('user_id, event_id, evento:events!event_staff_event_id_fkey(id, titolo, data_inizio, data_fine, stato)')
      .in('user_id', ids)
    if (error) return { data: {}, error: error.message }

    const closed = ['concluso', 'cancellato', 'rifiutato']
    const winStart = window?.start || null
    const winEnd = window?.end || null
    const map = {}

    for (const r of (data || [])) {
      if (excludeEventId && r.event_id === excludeEventId) continue
      if (closed.includes(r.evento?.stato)) continue
      const rStart = r.evento?.data_inizio || null
      const rEnd = r.evento?.data_fine || r.evento?.data_inizio || null
      // Date mancanti su un lato: non possiamo escludere la sovrapposizione, avvisiamo (conservativo).
      const overlaps = (!winStart || !winEnd || !rStart || !rEnd)
        ? true
        : (winStart <= rEnd && rStart <= winEnd)
      if (!overlaps) continue
      if (!map[r.user_id]) map[r.user_id] = []
      map[r.user_id].push({ id: r.evento.id, titolo: r.evento?.titolo || 'Evento', data_inizio: r.evento?.data_inizio, data_fine: r.evento?.data_fine })
    }
    return { data: map, error: null }
  },

  // Gate non bloccante all'aggiunta di uno staff: verifica se la persona è già impegnata su un
  // altro evento sovrapposto. Il chiamante mostra un avviso e decide se procedere.
  checkStaffConflict: async (userId, { window, excludeEventId } = {}) => {
    if (!userId) return { data: { hasConflict: false, eventi: [] }, error: null }
    const { data: map, error } = await get().fetchStaffConflicts([userId], window, excludeEventId)
    if (error) return { data: { hasConflict: false, eventi: [] }, error }
    const eventi = map[userId] || []
    return { data: { hasConflict: eventi.length > 0, eventi }, error: null }
  },
}))
