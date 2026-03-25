import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useCostsStore = create((set, get) => ({
  preventivi: [],
  costs: [],
  loading: false,

  fetchEventPreventivi: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_preventivi')
      .select('*, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome), approvatore:users!event_preventivi_approvato_da_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ preventivi: data || [], loading: false })
    return { data, error }
  },

  fetchEventCosts: async (eventId) => {
    const { data, error } = await supabase
      .from('event_costs')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at')
    set({ costs: data || [] })
    return { data, error }
  },

  createPreventivo: async (payload) => {
    const { data, error } = await supabase
      .from('event_preventivi')
      .insert(payload)
      .select('*, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ preventivi: [...s.preventivi, data] }))
    return { data, error }
  },

  updatePreventivo: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_preventivi')
      .update(updates)
      .eq('id', id)
      .select('*, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome), approvatore:users!event_preventivi_approvato_da_fkey(id, nome, cognome)')
      .single()
    if (!error) set(s => ({ preventivi: s.preventivi.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  approvePreventivo: async (id, userId, nota) => {
    return get().updatePreventivo(id, {
      stato: 'approvato',
      approvato_da: userId,
      data_approvazione: new Date().toISOString(),
      nota_approvazione: nota || null,
    })
  },

  rejectPreventivo: async (id, userId, nota) => {
    return get().updatePreventivo(id, {
      stato: 'rifiutato',
      approvato_da: userId,
      data_approvazione: new Date().toISOString(),
      nota_approvazione: nota,
    })
  },

  requestRevision: async (id, nota) => {
    return get().updatePreventivo(id, { stato: 'in_revisione', nota_approvazione: nota })
  },

  removePreventivo: async (id) => {
    const { error } = await supabase.from('event_preventivi').delete().eq('id', id)
    if (!error) set(s => ({ preventivi: s.preventivi.filter(r => r.id !== id) }))
    return { error }
  },

  // Cross-event
  fetchPendingPreventivi: async () => {
    const { data, error } = await supabase
      .from('event_preventivi')
      .select('*, evento:events(id, titolo, data_inizio), fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(id, nome, cognome)')
      .eq('stato', 'in_attesa')
      .order('created_at')
    return { data: data || [], error }
  },

  updateConsuntivo: async (preventivoId, { importo_effettivo, n_fattura, data_fattura, note_consuntivo }) => {
    return get().updatePreventivo(preventivoId, {
      importo_effettivo,
      n_fattura,
      data_fattura,
      note_consuntivo,
    })
  },

  fetchCostiAnalysis: async (periodStart, periodEnd) => {
    // PostgREST cannot filter on joined table columns with .gte/.lte — filter client-side
    const { data, error } = await supabase
      .from('event_preventivi')
      .select('fornitore_nome, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(nome, cognome), importo, importo_effettivo, stato, evento:events!event_preventivi_event_id_fkey(tipo_evento, data_inizio)')
      .eq('stato', 'approvato')
    const filtered = (data || []).filter(p => {
      const d = p.evento?.data_inizio
      if (!d) return false
      if (periodStart && d < periodStart) return false
      if (periodEnd && d > periodEnd) return false
      return true
    })
    return { data: filtered, error }
  },

  createCost: async (payload) => {
    const { data, error } = await supabase
      .from('event_costs')
      .insert(payload)
      .select()
      .single()
    if (!error) set(s => ({ costs: [...s.costs, data] }))
    return { data, error }
  },
}))
