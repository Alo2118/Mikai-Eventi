import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useBodySectionsStore = create((set, get) => ({
  bodySections: [],
  bodySectionsLoading: false,

  fetchBodySections: async () => {
    set({ bodySectionsLoading: true })
    const { data, error } = await supabase.from('body_sections').select('*').order('ordine')
    set({ bodySections: data || [], bodySectionsLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createBodySection: async (section) => {
    const { data, error } = await supabase.from('body_sections').insert(section).select().single()
    if (!error) get().fetchBodySections()
    return { data, error: error?.message || null }
  },

  updateBodySection: async (id, updates) => {
    const { data, error } = await supabase.from('body_sections').update(updates).eq('id', id).select().single()
    if (!error) get().fetchBodySections()
    return { data, error: error?.message || null }
  },

  deleteBodySection: async (id) => {
    const { error } = await supabase.from('body_sections').delete().eq('id', id)
    if (!error) get().fetchBodySections()
    return { error: error?.message || null }
  },
}))
