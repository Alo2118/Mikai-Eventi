import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useGadgetsStore = create((set, get) => ({
  gadgets: [],
  loading: false,
  error: null,

  fetchGadgets: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('gadgets').select('*').eq('attivo', true).order('nome')
    set({ gadgets: data || [], loading: false, error: error?.message || null })
  },

  fetchEventGadgets: async (eventId) => {
    const { data, error } = await supabase
      .from('event_gadgets')
      .select('*, gadget:gadgets(id, nome, quantita_disponibile, soglia_minima)')
      .eq('event_id', eventId)
    return { data: data || [], error: error?.message || null }
  },

  requestGadget: async (request) => {
    const { data, error } = await supabase
      .from('event_gadgets').insert(request).select().single()
    return { data, error: error?.message || null }
  },

  updateGadgetRequest: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_gadgets').update(updates).eq('id', id).select().single()
    return { data, error: error?.message || null }
  },
}))
