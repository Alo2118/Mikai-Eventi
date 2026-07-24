import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useLogisticsStore = create((set, get) => ({
  hotels: [],
  trasporti: [],
  loading: false,
  error: null,

  fetchEventHotels: async (eventId) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ hotels: data || [], error: error?.message || null })
    return { data, error }
  },

  fetchEventTrasporti: async (eventId) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('ordine')
      .order('orario', { ascending: true, nullsFirst: false })
      .order('created_at')
    set({ trasporti: data || [], error: error?.message || null })
    return { data, error }
  },

  fetchEventLogistics: async (eventId) => {
    set({ loading: true, error: null })
    try {
      const [hotelsRes, trasportiRes] = await Promise.all([
        get().fetchEventHotels(eventId),
        get().fetchEventTrasporti(eventId),
      ])
      const errors = [hotelsRes?.error, trasportiRes?.error].filter(Boolean)
      if (errors.length > 0) {
        set({ error: errors.map(e => e.message || e).join(' · ') })
      } else {
        set({ error: null })
      }
    } catch (err) {
      set({ error: err?.message || 'Errore caricamento logistica' })
    } finally {
      set({ loading: false })
    }
  },

  createHotel: async (payload) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .insert(payload)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ hotels: [...s.hotels, data] }))
    return { data, error: error?.message || null }
  },

  updateHotel: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_hotel')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ hotels: s.hotels.map(r => r.id === id ? data : r) }))
    return { data, error: error?.message || null }
  },

  removeHotel: async (id) => {
    const { error } = await supabase.from('event_hotel').delete().eq('id', id)
    if (!error) set(s => ({ hotels: s.hotels.filter(r => r.id !== id) }))
    return { error: error?.message || null }
  },

  createTrasporto: async (payload) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .insert(payload)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ trasporti: [...s.trasporti, data] }))
    return { data, error: error?.message || null }
  },

  updateTrasporto: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .update(updates)
      .eq('id', id)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ trasporti: s.trasporti.map(r => r.id === id ? data : r) }))
    return { data, error: error?.message || null }
  },

  removeTrasporto: async (id) => {
    const { error } = await supabase.from('event_trasporti').delete().eq('id', id)
    if (!error) set(s => ({ trasporti: s.trasporti.filter(r => r.id !== id) }))
    return { error: error?.message || null }
  },

  copyTrasportoToMany: async (sourceId, targetPersons, eventId) => {
    const source = get().trasporti.find(t => t.id === sourceId)
    if (!source) return { data: null, error: 'Record sorgente non trovato' }

    // Find ALL legs for this person+direction (multi-leg support)
    const sourceKey = source.user_id || source.contact_id
    const allLegs = get().trasporti.filter(t =>
      t.direzione === source.direzione && (t.user_id === sourceKey || t.contact_id === sourceKey)
    )

    // For each target, skip legs they already have (by ordine) to avoid duplicates
    const allTrasporti = get().trasporti
    const payloads = targetPersons.flatMap(target => {
      const targetKey = target.userId || target.contactId
      const existingOrdini = new Set(
        allTrasporti.filter(t =>
          t.direzione === source.direzione && (t.user_id === targetKey || t.contact_id === targetKey)
        ).map(t => t.ordine || 1)
      )
      return allLegs
        .filter(leg => !existingOrdini.has(leg.ordine || 1))
        .map(leg => ({
          event_id: eventId,
          user_id: target.userId || null,
          contact_id: target.contactId || null,
          direzione: leg.direzione,
          ordine: leg.ordine,
          stato: leg.stato,
          mezzo: leg.mezzo,
          codice: leg.codice,
          luogo_partenza: leg.luogo_partenza,
          luogo_arrivo: leg.luogo_arrivo,
          orario: leg.orario,
          orario_arrivo: leg.orario_arrivo,
          note: leg.note,
        }))
    })

    const { data, error } = await supabase
      .from('event_trasporti')
      .insert(payloads)
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome)')
    if (!error && data) {
      set(s => ({ trasporti: [...s.trasporti, ...data] }))
    }
    return { data, error: error?.message || null }
  },

  // Batch: fetch logistics status for multiple events in ONE query
  fetchBatchLogisticsStatus: async (eventIds) => {
    if (!eventIds?.length) return {}
    const [hotelRes, transportRes] = await Promise.all([
      supabase.from('event_hotel').select('event_id, stato').in('event_id', eventIds),
      supabase.from('event_trasporti').select('event_id, stato, direzione, user_id, contact_id').in('event_id', eventIds),
    ])
    const map = {}
    for (const h of (hotelRes.data || [])) {
      if (!map[h.event_id]) map[h.event_id] = { hotelTotal: 0, hotelConfermato: 0, trasportoTotal: 0, trasportoConfermato: 0 }
      map[h.event_id].hotelTotal++
      if (h.stato === 'confermato' || h.stato === 'non_necessario') map[h.event_id].hotelConfermato++
    }
    // Count unique person+direction combos (not raw records, to handle multi-leg)
    const seenTransport = new Set()
    const seenTransportOk = new Set()
    for (const t of (transportRes.data || [])) {
      if (!map[t.event_id]) map[t.event_id] = { hotelTotal: 0, hotelConfermato: 0, trasportoTotal: 0, trasportoConfermato: 0 }
      const personKey = `${t.event_id}-${t.user_id || t.contact_id}-${t.direzione}`
      if (!seenTransport.has(personKey)) {
        seenTransport.add(personKey)
        map[t.event_id].trasportoTotal++
      }
      if ((t.stato === 'confermato' || t.stato === 'non_necessario') && !seenTransportOk.has(personKey)) {
        seenTransportOk.add(personKey)
        map[t.event_id].trasportoConfermato++
      }
    }
    return map
  },

  // Cross-event queries for /logistica page
  fetchAllPendingHotels: async () => {
    const { data, error } = await supabase
      .from('event_hotel')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome), evento:events(id, titolo, data_inizio, tipo_evento)')
      .in('stato', ['da_prenotare', 'prenotato'])
      .order('created_at')
    return { data: data || [], error }
  },

  fetchAllPendingTrasporti: async () => {
    const { data, error } = await supabase
      .from('event_trasporti')
      .select('*, user:users(id, nome, cognome), contact:contacts(id, nome, cognome), evento:events(id, titolo, data_inizio, tipo_evento)')
      .in('stato', ['da_prenotare', 'prenotato'])
      .order('ordine')
      .order('created_at')
    return { data: data || [], error }
  },
}))
