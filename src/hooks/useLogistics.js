import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useLogisticsStore = create((set, get) => ({
  hotels: [],
  trasporti: [],
  loading: false,

  fetchEventHotels: async (eventId) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ hotels: data || [] })
    return { data, error }
  },

  fetchEventTrasporti: async (eventId) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ trasporti: data || [] })
    return { data, error }
  },

  fetchEventLogistics: async (eventId) => {
    set({ loading: true })
    await Promise.all([get().fetchEventHotels(eventId), get().fetchEventTrasporti(eventId)])
    set({ loading: false })
  },

  createHotel: async (payload) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .insert(payload)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ hotels: [...s.hotels, data] }))
    return { data, error }
  },

  updateHotel: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ hotels: s.hotels.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeHotel: async (id) => {
    const { error } = await supabase.from('event_hotel').delete().eq('id', id)
    if (!error) set(s => ({ hotels: s.hotels.filter(r => r.id !== id) }))
    return { error }
  },

  createTrasporto: async (payload) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .insert(payload)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ trasporti: [...s.trasporti, data] }))
    return { data, error }
  },

  updateTrasporto: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ trasporti: s.trasporti.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeTrasporto: async (id) => {
    const { error } = await supabase.from('event_trasporti').delete().eq('id', id)
    if (!error) set(s => ({ trasporti: s.trasporti.filter(r => r.id !== id) }))
    return { error }
  },

  copyTrasportoToMany: async (sourceId, targetPersons, eventId) => {
    // 1. Fetch source record from local state
    const source = get().trasporti.find(t => t.id === sourceId)
    if (!source) return { data: null, error: 'Record sorgente non trovato' }

    // 2. Build fresh payloads — respects XOR constraint (num_nonnulls(user_id, contact_id) = 1)
    const payloads = targetPersons.map(target => ({
      event_id: eventId,
      user_id: target.userId || null,
      contact_id: target.contactId || null,
      direzione: source.direzione,
      stato: source.stato,
      mezzo: source.mezzo,
      codice: source.codice,
      orario: source.orario,
      autista: source.autista,
      orario_pickup: source.orario_pickup,
      note: source.note,
    }))

    // 3. Batch insert
    const { data, error } = await supabase
      .from('event_trasporti')
      .insert(payloads)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
    if (!error && data) {
      // Append to local state — no refetch to avoid loading flash
      set(s => ({ trasporti: [...s.trasporti, ...data] }))
    }
    return { data, error: error?.message || null }
  },

  // Cross-event queries for /logistica page
  fetchAllPendingHotels: async () => {
    const { data, error } = await supabase
      .from('event_hotel')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome), evento:events(id, titolo, data_inizio)')
      .in('stato', ['da_prenotare', 'prenotato'])
      .order('created_at')
    return { data: data || [], error }
  },

  fetchAllPendingTrasporti: async () => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome), evento:events(id, titolo, data_inizio)')
      .in('stato', ['da_prenotare', 'prenotato'])
      .order('created_at')
    return { data: data || [], error }
  },
}))
