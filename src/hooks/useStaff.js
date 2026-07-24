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

    // RPC SECURITY DEFINER: bypassa la RLS can_see_event così i conflitti vengono
    // rilevati anche su eventi di altri manager (altrimenti falsi negativi). L'esclusione
    // evento, gli stati chiusi e la sovrapposizione date sono già applicati lato DB.
    const { data, error } = await supabase.rpc('staff_conflicts', {
      p_user_ids: ids,
      p_win_start: window?.start || null,
      p_win_end: window?.end || null,
      p_exclude_event: excludeEventId || null,
    })
    if (error) return { data: {}, error: error.message }

    const map = {}
    for (const r of (data || [])) {
      if (!map[r.user_id]) map[r.user_id] = []
      map[r.user_id].push({ id: r.event_id, titolo: r.titolo || 'Evento', data_inizio: r.data_inizio, data_fine: r.data_fine })
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
