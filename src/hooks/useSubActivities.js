import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSubActivitiesStore = create((set, get) => ({
  subActivities: [],
  types: [],
  loading: false,

  fetchTypes: async () => {
    const { data, error } = await supabase
      .from('sub_activity_types')
      .select('*')
      .eq('attivo', true)
      .order('nome')
    set({ types: data || [] })
    return { data, error }
  },

  // Admin CRUD for types
  createType: async (nome) => {
    const { data, error } = await supabase
      .from('sub_activity_types')
      .insert({ nome })
      .select()
      .single()
    if (!error) get().fetchTypes()
    return { data, error }
  },

  updateType: async (id, updates) => {
    const { data, error } = await supabase
      .from('sub_activity_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) get().fetchTypes()
    return { data, error }
  },

  deleteType: async (id) => {
    const { error } = await supabase
      .from('sub_activity_types')
      .update({ attivo: false })
      .eq('id', id)
    if (!error) get().fetchTypes()
    return { error }
  },

  // Event sub-activities
  fetchEventSubActivities: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_sub_activities')
      .select('*, tipo_ref:sub_activity_types(id, nome), fornitore_ref:contacts!event_sub_activities_fornitore_id_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('data_ora', { ascending: true })
    set({ subActivities: data || [], loading: false })
    return { data, error }
  },

  createSubActivity: async (payload) => {
    const { data, error } = await supabase
      .from('event_sub_activities')
      .insert(payload)
      .select()
      .single()
    if (!error && data) {
      // Refetch to get joined data (PostgREST doesn't support embedded resources on INSERT)
      await get().fetchEventSubActivities(data.event_id)
    }
    return { data, error: error?.message || null }
  },

  updateSubActivity: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_sub_activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      await get().fetchEventSubActivities(data.event_id)
    }
    return { data, error: error?.message || null }
  },

  removeSubActivity: async (id) => {
    const { error } = await supabase.from('event_sub_activities').delete().eq('id', id)
    if (!error) set(s => ({ subActivities: s.subActivities.filter(r => r.id !== id) }))
    return { error }
  },
}))
