import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useBrandsStore = create((set, get) => ({
  brands: [],
  brandsLoading: false,

  fetchBrands: async () => {
    set({ brandsLoading: true })
    const { data, error } = await supabase.from('brands').select('*').order('nome')
    set({ brands: data || [], brandsLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createBrand: async (brand) => {
    const { data, error } = await supabase.from('brands').insert(brand).select().single()
    if (!error) get().fetchBrands()
    return { data, error: error?.message || null }
  },

  updateBrand: async (id, updates) => {
    const { data, error } = await supabase.from('brands').update(updates).eq('id', id).select().single()
    if (!error) get().fetchBrands()
    return { data, error: error?.message || null }
  },

  deleteBrand: async (id) => {
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (!error) get().fetchBrands()
    return { error: error?.message || null }
  },
}))
