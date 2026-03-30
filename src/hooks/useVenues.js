import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useVenuesStore = create((set, get) => ({
  venues: [],
  loading: false,

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

  createVenue: async (venue) => {
    const { data, error } = await supabase
      .from('venues')
      .insert(venue)
      .select()
      .single()
    return { data, error: error?.message || null }
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
