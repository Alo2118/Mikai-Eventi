import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useVenuesStore = create((set, get) => ({
  venues: [],
  venuesLoading: false,

  // === Admin CRUD ===
  fetchVenues: async () => {
    set({ venuesLoading: true })
    const { data, error } = await supabase.from('venues').select('*, zone:zones(id, nome)').order('nome')
    set({ venues: data || [], venuesLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  // Insert + refetch. Also used by the venue autocomplete (which ignores the
  // refreshed list) — the return shape { data, error } is unchanged.
  createVenue: async (venue) => {
    const { data, error } = await supabase.from('venues').insert(venue).select().single()
    if (!error) get().fetchVenues()
    return { data, error: error?.message || null }
  },

  updateVenue: async (id, updates) => {
    const { data, error } = await supabase.from('venues').update(updates).eq('id', id).select().single()
    if (!error) get().fetchVenues()
    return { data, error: error?.message || null }
  },

  deleteVenue: async (id) => {
    const { error } = await supabase.from('venues').delete().eq('id', id)
    if (!error) get().fetchVenues()
    return { error: error?.message || null }
  },

  // === Autocomplete helpers ===
  searchVenues: async (query) => {
    if (!query || query.length < 2) return { data: [], error: null }
    const { data, error } = await supabase
      .from('venues')
      .select('*, zone:zones(id, nome)')
      .ilike('nome', `%${query}%`)
      .order('nome')
      .limit(5)
    return { data: data || [], error: error?.message || null }
  },

  getDefaultCourier: async (provincia) => {
    if (!provincia) return { data: null, error: null }
    const { data: zp } = await supabase
      .from('zone_provinces')
      .select('zone_id')
      .eq('provincia', provincia.toUpperCase())
      .single()
    if (!zp) return { data: null, error: null }

    const { data: zc } = await supabase
      .from('zone_couriers')
      .select('courier:couriers(id, nome)')
      .eq('zone_id', zp.zone_id)
      .single()
    return { data: zc?.courier || null, error: null }
  },
}))
