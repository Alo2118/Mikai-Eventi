import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { TIPO_PRODOTTO_ICONS } from '../lib/icons'

// Default icon fallback for codici not in TIPO_PRODOTTO_ICONS
const DEFAULT_ICON = 'package'

export const useProductTypesStore = create((set, get) => ({
  productTypes: [],
  productTypesLoading: false,

  fetchProductTypes: async () => {
    set({ productTypesLoading: true })
    const { data, error } = await supabase.from('product_types').select('*').order('ordine')
    set({ productTypes: data || [], productTypesLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createProductType: async (pt) => {
    const { data, error } = await supabase.from('product_types').insert(pt).select().single()
    if (!error) get().fetchProductTypes()
    return { data, error: error?.message || null }
  },

  updateProductType: async (id, updates) => {
    const { data, error } = await supabase.from('product_types').update(updates).eq('id', id).select().single()
    if (!error) get().fetchProductTypes()
    return { data, error: error?.message || null }
  },

  deleteProductType: async (id) => {
    const { error } = await supabase.from('product_types').delete().eq('id', id)
    if (!error) get().fetchProductTypes()
    return { error: error?.message || null }
  },
}))

/**
 * Hook that loads product types and provides label/color/icon maps.
 * Replaces hardcoded TIPO_PRODOTTO / TIPO_PRODOTTO_COLORE constants.
 */
export function useProductTypes() {
  const productTypes = useProductTypesStore(s => s.productTypes)
  const fetchProductTypes = useProductTypesStore(s => s.fetchProductTypes)

  useEffect(() => {
    if (productTypes.length === 0) fetchProductTypes()
  }, [])

  const maps = useMemo(() => {
    const labels = {}
    const colors = {}
    const icons = {}
    for (const pt of productTypes) {
      labels[pt.codice] = pt.nome
      colors[pt.codice] = pt.colore
      icons[pt.codice] = TIPO_PRODOTTO_ICONS[pt.codice] || null
    }
    return { labels, colors, icons }
  }, [productTypes])

  return {
    productTypes,
    labels: maps.labels,
    colors: maps.colors,
    icons: maps.icons,
  }
}

/**
 * Build label/color maps from productTypes array (for non-hook contexts).
 */
export function buildProductTypeMaps(productTypes) {
  const labels = {}
  const colors = {}
  for (const pt of productTypes) {
    labels[pt.codice] = pt.nome
    colors[pt.codice] = pt.colore
  }
  return { labels, colors }
}
