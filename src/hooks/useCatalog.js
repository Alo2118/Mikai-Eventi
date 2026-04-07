import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useCatalogStore = create((set, get) => ({
  stockProducts: [],
  stockLoading: false,

  fetchBrands: async () => {
    const { data, error } = await supabase
      .from('brands').select('*').eq('attivo', true).order('nome')
    return { data: data || [], error: error?.message || null }
  },

  fetchStockProducts: async () => {
    set({ stockLoading: true })
    const { data, error } = await supabase
      .from('products')
      .select('*, brand:brands(id, nome)')
      .eq('serializzato', false)
      .eq('attivo', true)
      .order('nome')
    set({ stockProducts: data || [], stockLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  fetchProductNames: async (ids) => {
    if (!ids?.length) return {}
    const { data } = await supabase
      .from('products').select('id, nome, codice').in('id', ids)
    const map = {}
    for (const p of (data || [])) {
      map[p.id] = p.nome + (p.codice ? ` (${p.codice})` : '')
    }
    return map
  },

  fetchCatalogProducts: async (filters) => {
    let query = supabase
      .from('products')
      .select('*, brand:brands(id, nome, logo_url), body_sections:product_body_sections(body_section:body_sections(id, nome))')
      .eq('attivo', true)
      .order('nome')

    // Multi-select brand filter
    if (filters.brandIds?.length > 0) query = query.in('brand_id', filters.brandIds)
    // Legacy single-select fallback
    else if (filters.brandId) query = query.eq('brand_id', filters.brandId)

    if (filters.search) query = query.or(`nome.ilike.%${filters.search}%,codice.ilike.%${filters.search}%`)

    const { data, error } = await query
    let products = data || []

    // Client-side: multi-select body section (OR within group)
    if (filters.sectionIds?.length > 0) {
      products = products.filter(p =>
        p.body_sections?.some(bs => filters.sectionIds.includes(bs.body_section?.id))
      )
    } else if (filters.sectionId) {
      products = products.filter(p =>
        p.body_sections?.some(bs => bs.body_section?.id === filters.sectionId)
      )
    }

    // Client-side: multi-select product type (OR within group)
    if (filters.tipi?.length > 0) {
      products = products.filter(p => filters.tipi.includes(p.tipo))
    } else if (filters.tipo) {
      products = products.filter(p => p.tipo === filters.tipo)
    }

    return { data: products, error: error?.message || null }
  },

  fetchAllBodySections: async () => {
    const { data, error } = await supabase
      .from('body_sections')
      .select('*')
      .eq('attivo', true)
      .order('ordine')
    return { data: data || [], error: error?.message || null }
  },

  fetchKitContents: async (productId) => {
    const { data, error } = await supabase
      .from('kit_contents')
      .select('*')
      .eq('product_id', productId)
      .order('piece_name')
    return { data: data || [], error: error?.message || null }
  },

  fetchProductAvailability: async (productId) => {
    const { data, error } = await supabase
      .from('materials')
      .select('id, nome, codice_inventario, posizione_attuale, magazzino_id')
      .eq('product_id', productId)
      .eq('attivo', true)
    return { data: data || [], error: error?.message || null }
  },

  // Old 3-step wizard methods (fetchBodySections, fetchProductsWithMaterials)
  // kept for potential future use

  fetchBodySections: async (brandId) => {
    const { data: brandProducts, error: prodError } = await supabase
      .from('products').select('id').eq('brand_id', brandId).eq('attivo', true)
    if (prodError) return { data: [], error: prodError.message }

    const productIds = (brandProducts || []).map(p => p.id)
    if (!productIds.length) return { data: [], error: null }

    const { data: links, error: linkError } = await supabase
      .from('product_body_sections')
      .select('body_section_id')
      .in('product_id', productIds)
    if (linkError) return { data: [], error: linkError.message }

    const sectionIds = [...new Set((links || []).map(l => l.body_section_id))]
    if (!sectionIds.length) return { data: [], error: null }

    const { data: sections, error: secError } = await supabase
      .from('body_sections')
      .select('*')
      .in('id', sectionIds)
      .eq('attivo', true)
      .order('ordine')

    return { data: sections || [], error: secError?.message || null }
  },

  fetchProductsWithMaterials: async (brandId, sectionId) => {
    const { data: links, error: linkError } = await supabase
      .from('product_body_sections')
      .select('product_id')
      .eq('body_section_id', sectionId)
    if (linkError) return { data: [], error: linkError.message }
    if (!links?.length) return { data: [], error: null }

    const productIds = links.map(l => l.product_id)
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('brand_id', brandId)
      .in('id', productIds)
      .eq('attivo', true)
      .order('nome')
    if (prodError) return { data: [], error: prodError.message }
    if (!products?.length) return { data: [], error: null }

    const { data: materials, error: matError } = await supabase
      .from('materials')
      .select('*')
      .in('product_id', products.map(p => p.id))
      .eq('attivo', true)
      .order('nome')
    if (matError) return { data: [], error: matError.message }

    const result = products.map(p => ({
      ...p,
      materials: (materials || []).filter(m => m.product_id === p.id),
    }))
    return { data: result, error: null }
  },
}))
