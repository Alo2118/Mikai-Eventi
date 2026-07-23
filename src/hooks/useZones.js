import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useZonesStore = create((set, get) => ({
  zones: [],
  zonesLoading: false,

  fetchZones: async () => {
    set({ zonesLoading: true })
    const { data, error } = await supabase.from('zones').select('*').order('nome')
    set({ zones: data || [], zonesLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createZone: async (zone) => {
    const { data, error } = await supabase.from('zones').insert(zone).select().single()
    if (!error) get().fetchZones()
    return { data, error: error?.message || null }
  },

  updateZone: async (id, updates) => {
    const { data, error } = await supabase.from('zones').update(updates).eq('id', id).select().single()
    if (!error) get().fetchZones()
    return { data, error: error?.message || null }
  },

  deleteZone: async (id) => {
    const { error } = await supabase.from('zones').delete().eq('id', id)
    if (!error) get().fetchZones()
    return { error: error?.message || null }
  },

  // Zone-Province mapping
  fetchZoneProvinces: async (zoneId) => {
    const { data, error } = await supabase.from('zone_provinces').select('*').eq('zone_id', zoneId)
    return { data: data || [], error: error?.message || null }
  },

  setZoneProvinces: async (zoneId, provinces) => {
    const { error: delError } = await supabase.from('zone_provinces').delete().eq('zone_id', zoneId)
    if (delError) return { error: delError.message }
    if (provinces.length > 0) {
      const { error: insError } = await supabase.from('zone_provinces').insert(
        provinces.map(p => ({ zone_id: zoneId, provincia: p }))
      )
      if (insError) return { error: insError.message }
    }
    return { error: null }
  },

  // Zone-Courier mapping
  fetchZoneCouriers: async (zoneId) => {
    const { data, error } = await supabase.from('zone_couriers').select('*, courier:couriers(id, nome)').eq('zone_id', zoneId)
    return { data: data || [], error: error?.message || null }
  },

  setZoneCourier: async (zoneId, courierId) => {
    const { error: delError } = await supabase.from('zone_couriers').delete().eq('zone_id', zoneId)
    if (delError) return { error: delError.message }
    if (courierId) {
      const { error: insError } = await supabase.from('zone_couriers').insert({ zone_id: zoneId, courier_id: courierId })
      if (insError) return { error: insError.message }
    }
    return { error: null }
  },
}))
