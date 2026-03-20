import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useContactsStore = create((set, get) => ({
  contacts: [],
  contact: null,
  loading: false,
  error: null,
  filters: { search: '', tipo: '', zoneId: '' },

  setFilter: (key, value) => set(s => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { search: '', tipo: '', zoneId: '' } }),

  fetchContacts: async () => {
    set({ loading: true, error: null })
    let query = supabase
      .from('contacts')
      .select('*, proprietario:users!contacts_proprietario_id_fkey(id, nome, cognome), zona:zones!contacts_zone_id_fkey(id, nome)')
      .eq('attivo', true)
      .order('cognome')

    const { filters } = get()
    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,cognome.ilike.%${filters.search}%,azienda.ilike.%${filters.search}%`)
    }
    if (filters.tipo) query = query.eq('tipo_contatto', filters.tipo)
    if (filters.zoneId) query = query.eq('zone_id', filters.zoneId)

    const { data, error } = await query
    set({ contacts: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  fetchContact: async (id) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('contacts')
      .select('*, proprietario:users!contacts_proprietario_id_fkey(id, nome, cognome), zona:zones!contacts_zone_id_fkey(id, nome)')
      .eq('id', id)
      .single()
    set({ contact: data, loading: false, error: error?.message })
    return { data, error }
  },

  fetchContactHistory: async (contactId) => {
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, evento:events(id, titolo, data_inizio, stato)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  },

  createContact: async (payload) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(payload)
      .select()
      .single()
    if (!error) get().fetchContacts()
    return { data, error }
  },

  updateContact: async (id, updates) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) get().fetchContacts()
    return { data, error }
  },

  searchContacts: async (term) => {
    if (!term || term.length < 2) return { data: [] }
    const { data, error } = await supabase
      .from('contacts')
      .select('id, nome, cognome, tipo_contatto, azienda')
      .eq('attivo', true)
      .or(`nome.ilike.%${term}%,cognome.ilike.%${term}%`)
      .order('cognome')
      .limit(10)
    return { data: data || [], error }
  },
}))
