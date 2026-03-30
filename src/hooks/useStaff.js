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
      .select('*, user:users(id, nome, cognome, ruolo, email)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ staff: data || [], loading: false, error: error?.message || null })
    return { data, error }
  },

  addStaff: async (eventId, userId, ruoloEvento) => {
    const { data, error } = await supabase
      .from('event_staff')
      .insert({ event_id: eventId, user_id: userId, ruolo_evento: ruoloEvento, confermato: false })
      .select('*, user:users(id, nome, cognome, ruolo, email)')
      .single()
    if (!error) set(s => ({ staff: [...s.staff, data] }))
    return { data, error: error?.message || null }
  },

  updateStaff: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_staff')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome, ruolo, email)')
      .single()
    if (!error) set(s => ({ staff: s.staff.map(r => r.id === id ? data : r) }))
    return { data, error: error?.message || null }
  },

  removeStaff: async (id) => {
    const { error } = await supabase.from('event_staff').delete().eq('id', id)
    if (!error) set(s => ({ staff: s.staff.filter(r => r.id !== id) }))
    return { error: error?.message || null }
  },
}))
