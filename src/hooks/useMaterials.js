import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useMaterialsStore = create((set, get) => ({
  materials: [],
  logisticsTimeline: [],
  overdueReturns: [],
  loading: false,
  error: null,
  filters: { search: '', tipo: '', posizione: '', brand: '', section: '' },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }))
    get().fetchMaterials()
  },

  resetFilters: () => {
    set({ filters: { search: '', tipo: '', posizione: '', brand: '', section: '' } })
    get().fetchMaterials()
  },

  fetchMaterials: async () => {
    set({ loading: true, error: null })
    let query = supabase.from('materials').select('*, product:products(id, nome, codice, brand:brands(id, nome))').eq('attivo', true).order('nome')

    const { search, tipo, posizione } = get().filters
    if (search) query = query.ilike('nome', `%${search}%`)
    if (tipo) query = query.eq('tipo', tipo)
    if (posizione) query = query.eq('posizione_attuale', posizione)

    const { data, error } = await query
    set({ materials: data || [], loading: false, error: error?.message || null })
  },

  fetchMaterial: async (id) => {
    const { data, error } = await supabase
      .from('materials').select('*, product:products(id, nome, codice, descrizione, brand:brands(id, nome, tipo))').eq('id', id).single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  fetchEventMaterials: async (eventId) => {
    const { data, error } = await supabase
      .from('event_materials')
      .select('*, material:materials(id, nome, tipo, codice_inventario, posizione_attuale), richiesto:users!event_materials_richiesto_da_fkey(nome, cognome)')
      .eq('event_id', eventId)
      .order('data_richiesta', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  requestMaterial: async (request) => {
    const { data, error } = await supabase
      .from('event_materials').insert(request).select().single()
    return { data, error: error?.message || null }
  },

  approveMaterial: async (id, userId) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update({ stato: 'approvato', approvato_da: userId, data_approvazione: new Date().toISOString() })
      .eq('id', id).select().single()
    return { data, error: error?.message || null }
  },

  rejectMaterial: async (id) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update({ stato: 'rifiutato' })
      .eq('id', id).select().single()
    return { data, error: error?.message || null }
  },

  checkConflict: async (materialId, startDate, endDate, excludeRequestId) => {
    let query = supabase
      .from('event_materials')
      .select('*, event:events(titolo, data_inizio, data_fine)')
      .eq('material_id', materialId)
      .neq('stato', 'rifiutato')
      .lte('data_inizio_utilizzo', endDate)
      .gte('data_fine_utilizzo', startDate)

    if (excludeRequestId) query = query.neq('id', excludeRequestId)

    const { data, error } = await query
    return { data: data || [], error: error?.message || null }
  },

  fetchMovements: async (materialId) => {
    const { data, error } = await supabase
      .from('material_movements')
      .select('*, responsabile:users!material_movements_responsabile_id_fkey(nome, cognome), event:events(titolo)')
      .eq('material_id', materialId)
      .order('data_movimento', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  fetchEventMovements: async (eventId) => {
    const { data, error } = await supabase
      .from('material_movements')
      .select('*, material:materials(nome, codice_inventario), responsabile:users!material_movements_responsabile_id_fkey(nome, cognome)')
      .eq('event_id', eventId)
      .order('data_movimento', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  createMovement: async (movement) => {
    const { data, error } = await supabase
      .from('material_movements').insert(movement).select().single()
    if (!error) get().fetchMaterials()
    return { data, error: error?.message || null }
  },

  // Catalog queries
  fetchBrands: async () => {
    const { data, error } = await supabase
      .from('brands').select('*').eq('attivo', true).order('nome')
    return { data: data || [], error: error?.message || null }
  },

  fetchBodySections: async (brandId) => {
    // Get products for this brand to filter sections
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

  // === Event Material List (product-based, replaces individual requests) ===

  fetchEventMaterialList: async (eventId) => {
    const { data, error } = await supabase
      .from('event_materials')
      .select('*, product:products(id, nome, codice, descrizione, foto_url, brand:brands(id, nome, logo_url)), richiesto:users!event_materials_richiesto_da_fkey(nome, cognome)')
      .eq('event_id', eventId)
      .order('data_richiesta', { ascending: true })
    return { data: data || [], error: error?.message || null }
  },

  addToMaterialList: async (eventId, productId, userId, note) => {
    const { data, error } = await supabase
      .from('event_materials')
      .insert({
        event_id: eventId,
        product_id: productId,
        quantita: 1,
        stato: 'richiesto',
        richiesto_da: userId,
        note_commerciale: note || null,
      })
      .select()
      .single()
    return { data, error: error?.message || null }
  },

  updateMaterialListRow: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error: error?.message || null }
  },

  removeMaterialListRow: async (id) => {
    const { data, error } = await supabase
      .from('event_materials')
      .delete()
      .eq('id', id)
    return { data, error: error?.message || null }
  },

  confirmMaterialRow: async (id, noteUfficio) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update({
        stato: 'approvato',
        note_ufficio: noteUfficio || null,
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error: error?.message || null }
  },

  rejectMaterialRow: async (id, motivo) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update({
        stato: 'rifiutato',
        motivo_rifiuto: motivo,
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error: error?.message || null }
  },

  // === Catalog Browsing (replaces 3-step wizard) ===

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

    if (filters.search) query = query.ilike('nome', `%${filters.search}%`)

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

  fetchLogisticsTimeline: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_materials')
      .select(`
        *,
        evento:events!event_materials_event_id_fkey(id, titolo, data_inizio, data_fine, stato, indirizzo_spedizione),
        materiale:materials!event_materials_material_id_fkey(id, nome, codice_inventario)
      `)
      .in('stato', ['approvato', 'in_preparazione'])
      .order('created_at', { ascending: true })
    set({ logisticsTimeline: data || [], loading: false, error: error?.message || null })
    return { data: data || [], error }
  },

  fetchOverdueReturns: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('material_movements')
      .select(`
        *,
        materiale:materials!material_movements_material_id_fkey(id, nome, codice_inventario, posizione_attuale),
        evento:events!material_movements_event_id_fkey(id, titolo, data_fine),
        responsabile:users!material_movements_responsabile_id_fkey(id, nome, cognome)
      `)
      .eq('tipo', 'uscita')
      .not('data_rientro_prevista', 'is', null)
      .lt('data_rientro_prevista', new Date().toISOString())
      .order('data_rientro_prevista', { ascending: true })
    const overdue = (data || []).filter(m =>
      m.materiale && m.materiale.posizione_attuale !== 'in_magazzino'
    )
    set({ overdueReturns: overdue, loading: false, error: error?.message || null })
    return { data: overdue, error }
  },
}))
