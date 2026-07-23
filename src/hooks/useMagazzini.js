import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useMagazziniStore = create((set, get) => ({
  magazzini: [],
  magazziniLoading: false,

  fetchMagazzini: async () => {
    set({ magazziniLoading: true })
    const { data, error } = await supabase.from('magazzini').select('*').order('nome')
    set({ magazzini: data || [], magazziniLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createMagazzino: async (magazzino) => {
    const { data, error } = await supabase.from('magazzini').insert(magazzino).select().single()
    if (!error) get().fetchMagazzini()
    return { data, error: error?.message || null }
  },

  updateMagazzino: async (id, updates) => {
    const { data, error } = await supabase.from('magazzini').update(updates).eq('id', id).select().single()
    if (!error) get().fetchMagazzini()
    return { data, error: error?.message || null }
  },

  deleteMagazzino: async (id) => {
    const { error } = await supabase.from('magazzini').delete().eq('id', id)
    if (!error) get().fetchMagazzini()
    return { error: error?.message || null }
  },
}))
