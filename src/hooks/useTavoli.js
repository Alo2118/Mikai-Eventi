import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useTavoliStore = create((set, get) => ({
  tavoli: [],
  loading: false,

  fetchEventTavoli: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_tavoli')
      .select(`
        *,
        formatori:event_tavoli_formatori(*, staff:event_staff(*, user:users(id, nome, cognome))),
        discenti:event_tavoli_discenti(*, participant:event_participants(*, contact:contacts(id, nome, cognome, azienda))),
        materiale:event_tavoli_materiale(*, product:products(id, nome, codice))
      `)
      .eq('event_id', eventId)
      .order('numero')
    set({ tavoli: data || [], loading: false })
    return { data, error }
  },

  createTavoli: async (eventId, count) => {
    const existing = get().tavoli.filter(t => t.event_id === eventId)
    const maxNumero = existing.length > 0 ? Math.max(...existing.map(t => t.numero)) : 0
    const rows = Array.from({ length: count }, (_, i) => ({
      event_id: eventId,
      numero: maxNumero + i + 1,
    }))
    const { data, error } = await supabase
      .from('event_tavoli')
      .insert(rows)
      .select()
    if (!error) get().fetchEventTavoli(eventId)
    return { data, error: error?.message || null }
  },

  updateTavolo: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_tavoli')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) set(s => ({ tavoli: s.tavoli.map(t => t.id === id ? { ...t, ...data } : t) }))
    return { data, error: error?.message || null }
  },

  removeTavolo: async (id) => {
    const { error } = await supabase.from('event_tavoli').delete().eq('id', id)
    if (!error) set(s => ({ tavoli: s.tavoli.filter(t => t.id !== id) }))
    return { error: error?.message || null }
  },

  addFormatore: async (tavoloId, staffId, eventId) => {
    const { error } = await supabase
      .from('event_tavoli_formatori')
      .insert({ tavolo_id: tavoloId, staff_id: staffId })
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  removeFormatore: async (id, eventId) => {
    const { error } = await supabase.from('event_tavoli_formatori').delete().eq('id', id)
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  addDiscente: async (tavoloId, participantId, eventId) => {
    const { error } = await supabase
      .from('event_tavoli_discenti')
      .insert({ tavolo_id: tavoloId, participant_id: participantId })
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  removeDiscente: async (id, eventId) => {
    const { error } = await supabase.from('event_tavoli_discenti').delete().eq('id', id)
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  addProduct: async (tavoloId, productId, eventId) => {
    const { error } = await supabase
      .from('event_tavoli_materiale')
      .insert({ tavolo_id: tavoloId, product_id: productId })
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  assignProductToAllTavoli: async (eventId, productIds) => {
    const tavoli = get().tavoli.filter(t => t.event_id === eventId)
    const rows = []
    for (const tavolo of tavoli) {
      const existingProductIds = new Set((tavolo.materiale || []).map(m => m.product_id))
      for (const pid of productIds) {
        if (!existingProductIds.has(pid)) {
          rows.push({ tavolo_id: tavolo.id, product_id: pid })
        }
      }
    }
    if (rows.length === 0) return { data: null, error: null }
    const { data, error } = await supabase
      .from('event_tavoli_materiale')
      .insert(rows)
      .select()
    if (!error) get().fetchEventTavoli(eventId)
    return { data, error: error?.message || null }
  },

  removeProduct: async (id, eventId) => {
    const { error } = await supabase.from('event_tavoli_materiale').delete().eq('id', id)
    if (!error) get().fetchEventTavoli(eventId)
    return { error: error?.message || null }
  },

  distributeDiscenti: async (eventId) => {
    const tavoli = get().tavoli.filter(t => t.event_id === eventId)
    if (tavoli.length === 0) return { error: 'Nessun tavolo presente' }

    // Find already-assigned participant IDs
    const assignedIds = new Set()
    for (const t of tavoli) {
      for (const d of (t.discenti || [])) {
        assignedIds.add(d.participant_id)
      }
    }

    // Fetch all discenti for this event
    const { data: allParticipants, error: fetchError } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('tipo', 'discente')
    if (fetchError) return { error: fetchError.message }

    const unassigned = (allParticipants || []).filter(p => !assignedIds.has(p.id))
    if (unassigned.length === 0) return { data: null, error: null }

    // Round-robin: assign to tavolo with fewest discenti
    const counts = tavoli.map(t => ({ id: t.id, count: (t.discenti || []).length }))
    const rows = []
    for (const participant of unassigned) {
      counts.sort((a, b) => a.count - b.count)
      rows.push({ tavolo_id: counts[0].id, participant_id: participant.id })
      counts[0].count++
    }

    const { data, error } = await supabase
      .from('event_tavoli_discenti')
      .insert(rows)
      .select()
    if (!error) get().fetchEventTavoli(eventId)
    return { data, error: error?.message || null }
  },

  fetchProducts: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, nome, codice')
      .eq('attivo', true)
      .order('nome')
    return { data: data || [], error }
  },
}))
