import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useHotelTemplatesStore = create((set) => ({
  templates: [],
  loading: false,

  fetchTemplates: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('hotel_templates')
      .select('*')
      .order('nome_hotel')
    set({ templates: data || [], loading: false })
    return { data, error: error?.message || null }
  },

  createTemplate: async (payload) => {
    const { data, error } = await supabase
      .from('hotel_templates')
      .insert(payload)
      .select('*')
      .single()
    if (!error) set(s => ({ templates: [...s.templates, data] }))
    return { data, error: error?.message || null }
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase.from('hotel_templates').delete().eq('id', id)
    if (!error) set(s => ({ templates: s.templates.filter(t => t.id !== id) }))
    return { error: error?.message || null }
  },
}))
