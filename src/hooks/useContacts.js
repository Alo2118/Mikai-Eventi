import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const CONTACTS_PAGE_SIZE = 25

export const useContactsStore = create((set, get) => {
  let filterDebounceTimer = null
  return {
  contacts: [],
  contact: null,
  agents: [],
  loading: false,
  loadingMore: false,
  error: null,
  page: 0,
  pageSize: CONTACTS_PAGE_SIZE,
  hasMore: true,
  totalCount: 0,
  filters: { search: '', tipo: '', zoneId: '' },

  setFilter: (key, value) => {
    set(s => ({ filters: { ...s.filters, [key]: value }, page: 0, contacts: [], hasMore: true }))
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = setTimeout(() => get().fetchContacts(), 300)
  },
  resetFilters: () => {
    set({ filters: { search: '', tipo: '', zoneId: '' }, page: 0, contacts: [], hasMore: true })
    clearTimeout(filterDebounceTimer)
    get().fetchContacts()
  },

  fetchContacts: async () => {
    const { page, pageSize } = get()
    const from = page * pageSize
    const to = from + pageSize - 1

    set({ loading: true, error: null })
    let query = supabase
      .from('contacts')
      .select('*, proprietario:users!contacts_proprietario_id_fkey(id, nome, cognome), zona:zones!contacts_zone_id_fkey(id, nome)', { count: 'exact' })
      .eq('attivo', true)
      .order('cognome')

    const { filters } = get()
    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,cognome.ilike.%${filters.search}%,azienda.ilike.%${filters.search}%`)
    }
    if (filters.tipo) query = query.eq('tipo_contatto', filters.tipo)
    if (filters.zoneId) query = query.eq('zone_id', filters.zoneId)

    query = query.range(from, to)

    const { data, error, count } = await query
    const rows = data || []
    set({ contacts: rows, loading: false, error: error?.message || null, totalCount: count ?? 0, hasMore: rows.length === pageSize })
    return { data: rows, error: error?.message || null }
  },

  loadMore: async () => {
    const { loadingMore, hasMore } = get()
    if (loadingMore || !hasMore) return
    const { page, pageSize } = get()
    const nextPage = page + 1
    const from = nextPage * pageSize
    const to = from + pageSize - 1

    set({ loadingMore: true })
    let query = supabase
      .from('contacts')
      .select('*, proprietario:users!contacts_proprietario_id_fkey(id, nome, cognome), zona:zones!contacts_zone_id_fkey(id, nome)', { count: 'exact' })
      .eq('attivo', true)
      .order('cognome')

    const { filters } = get()
    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,cognome.ilike.%${filters.search}%,azienda.ilike.%${filters.search}%`)
    }
    if (filters.tipo) query = query.eq('tipo_contatto', filters.tipo)
    if (filters.zoneId) query = query.eq('zone_id', filters.zoneId)

    query = query.range(from, to)

    const { data, error, count } = await query
    const rows = data || []
    set((s) => ({
      contacts: [...s.contacts, ...rows],
      loadingMore: false,
      error: error?.message || null,
      page: nextPage,
      totalCount: count ?? s.totalCount,
      hasMore: rows.length === pageSize,
    }))
    return { data: rows, error: error?.message || null }
  },

  fetchContact: async (id) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('contacts')
      .select('*, proprietario:users!contacts_proprietario_id_fkey(id, nome, cognome), zona:zones!contacts_zone_id_fkey(id, nome)')
      .eq('id', id)
      .single()
    set({ contact: data, loading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  fetchContactHistory: async (contactId) => {
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, evento:events(id, titolo, data_inizio, stato)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  createContact: async (payload) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(payload)
      .select()
      .single()
    if (!error) get().fetchContacts()
    return { data, error: error?.message || null }
  },

  updateContact: async (id, updates) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) get().fetchContacts()
    return { data, error: error?.message || null }
  },

  fetchRecentContacts: async (limit = 5) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, nome, cognome, tipo_contatto, azienda')
      .eq('attivo', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: data || [], error: error?.message || null }
  },

  fetchAgents: async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, nome, cognome, azienda, zone_id')
      .eq('tipo_contatto', 'agente')
      .eq('attivo', true)
      .order('cognome')
    set({ agents: data || [] })
    return { data: data || [], error: error?.message || null }
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
    return { data: data || [], error: error?.message || null }
  },

  findDuplicates: async (rows) => {
    const pairs = rows.map(r => ({ nome: r.nome?.trim(), cognome: r.cognome?.trim() }))
    const { data, error } = await supabase.rpc('find_contact_duplicates', { pairs })
    if (error) return { data: null, error: error.message }
    // Group matches by pair_index (1-based from SQL ORDINALITY)
    const grouped = rows.map((row, i) => ({
      row,
      matches: (data || []).filter(m => m.pair_index === i + 1),
    }))
    return { data: grouped, error: null }
  },

  bulkCreateContacts: async (contacts) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contacts)
      .select()
    if (!error) get().fetchContacts()
    return { data: data || [], error: error?.message || null }
  },

  reactivateContacts: async (ids) => {
    const { data, error } = await supabase
      .from('contacts')
      .update({ attivo: true })
      .in('id', ids)
      .select()
    if (!error) get().fetchContacts()
    return { data, error: error?.message || null }
  },
  }
})
