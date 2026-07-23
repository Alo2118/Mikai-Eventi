import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useCouriersStore = create((set, get) => ({
  couriers: [],
  couriersLoading: false,

  fetchCouriers: async () => {
    set({ couriersLoading: true })
    const { data, error } = await supabase.from('couriers').select('*').order('nome')
    set({ couriers: data || [], couriersLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createCourier: async (courier) => {
    const { data, error } = await supabase.from('couriers').insert(courier).select().single()
    if (!error) get().fetchCouriers()
    return { data, error: error?.message || null }
  },

  updateCourier: async (id, updates) => {
    const { data, error } = await supabase.from('couriers').update(updates).eq('id', id).select().single()
    if (!error) get().fetchCouriers()
    return { data, error: error?.message || null }
  },

  deleteCourier: async (id) => {
    const { error } = await supabase.from('couriers').delete().eq('id', id)
    if (!error) get().fetchCouriers()
    return { error: error?.message || null }
  },
}))
