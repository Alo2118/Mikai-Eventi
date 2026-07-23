import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { friendlyStockError } from '../lib/stock-errors'

// Product catalog admin: products, kit contents, serialized specimens and the
// stock ledger. Kept as one store because these paths are tightly coupled
// (stock adjustments refetch products, specimens belong to products).
export const useProductsStore = create((set, get) => ({
  // === Products ===
  products: [],
  productsLoading: false,

  fetchProducts: async () => {
    set({ productsLoading: true })
    const { data, error } = await supabase
      .from('products')
      .select('*, brand:brands(id, nome), body_sections:product_body_sections(body_section:body_sections(id, nome))')
      .order('nome')
    set({ products: data || [], productsLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createProduct: async (product) => {
    const { data, error } = await supabase.from('products').insert(product).select().single()
    if (!error) get().fetchProducts()
    return { data, error: error?.message || null }
  },

  updateProduct: async (id, updates) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single()
    if (!error) get().fetchProducts()
    return { data, error: error?.message || null }
  },

  bulkUpdateProducts: async (ids, updates) => {
    const { error } = await supabase.from('products').update(updates).in('id', ids)
    if (!error) get().fetchProducts()
    return { count: ids.length, error: error?.message || null }
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) get().fetchProducts()
    return { error: error?.message || null }
  },

  // Product-BodySection links
  setProductBodySections: async (productId, sectionIds) => {
    const { error: delError } = await supabase.from('product_body_sections').delete().eq('product_id', productId)
    if (delError) return { error: delError.message }
    if (sectionIds.length > 0) {
      const { error: insError } = await supabase.from('product_body_sections').insert(
        sectionIds.map(sid => ({ product_id: productId, body_section_id: sid }))
      )
      if (insError) return { error: insError.message }
    }
    get().fetchProducts()
    return { error: null }
  },

  // === Kit Contents ===
  fetchKitContents: async (productId) => {
    const { data, error } = await supabase
      .from('kit_contents')
      .select('*, piece_product:products!kit_contents_piece_product_id_fkey(id, codice, nome, famiglia, tipo)')
      .eq('product_id', productId)
      .order('piece_name')
    return { data: data || [], error: error?.message || null }
  },

  createKitContent: async (content) => {
    const { data, error } = await supabase.from('kit_contents').insert(content).select().single()
    return { data, error: error?.message || null }
  },

  updateKitContent: async (id, updates) => {
    const { data, error } = await supabase.from('kit_contents').update(updates).eq('id', id).select().single()
    return { data, error: error?.message || null }
  },

  deleteKitContent: async (id) => {
    const { error } = await supabase.from('kit_contents').delete().eq('id', id)
    return { error: error?.message || null }
  },

  // === Materials (Specimens) ===
  specimens: [],
  specimensLoading: false,

  fetchSpecimens: async () => {
    set({ specimensLoading: true })
    const { data, error } = await supabase
      .from('materials')
      .select('*, product:products(id, nome, brand:brands(id, nome))')
      .order('nome')
    set({ specimens: data || [], specimensLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  // Fetches specimens for a specific product (serialized units)
  fetchProductSpecimens: async (productId) => {
    const { data, error } = await supabase
      .from('materials')
      .select('*, magazzino:magazzini(id, nome)')
      .eq('product_id', productId)
      .eq('attivo', true)
      .order('codice_inventario')
    return { data: data || [], error: error?.message || null }
  },

  // Accepts numero_serie for serialized products
  createSpecimen: async (specimen) => {
    const { data, error } = await supabase.from('materials').insert(specimen).select().single()
    if (!error) get().fetchSpecimens()
    return { data, error: error?.message || null }
  },

  // Accepts numero_serie for serialized products
  updateSpecimen: async (id, updates) => {
    const { data, error } = await supabase.from('materials').update(updates).eq('id', id).select().single()
    if (!error) get().fetchSpecimens()
    return { data, error: error?.message || null }
  },

  deleteSpecimen: async (id) => {
    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (!error) get().fetchSpecimens()
    return { error: error?.message || null }
  },

  // Fetches stock levels for quantity-tracked (non-serialized) products
  fetchProductStock: async (productId) => {
    const { data, error } = await supabase
      .from('products')
      .select('quantita_disponibile, soglia_minima')
      .eq('id', productId)
      .single()
    return { data, error: error?.message || null }
  },

  // Fetch stock breakdown by location for a product
  fetchStockLocations: async (productId) => {
    const { data, error } = await supabase
      .from('product_stock_locations')
      .select('*, magazzino:magazzini(id, nome), agent:users(id, nome, cognome)')
      .eq('product_id', productId)
      .gt('quantita', 0)
      .order('quantita', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  // Quantity reserved by events still in house (approved / in preparazione). For
  // gadgets this is the amount already deducted from quantita_disponibile, so
  // fisica a magazzino = quantita_disponibile + impegnato.
  fetchCommittedStock: async (productId) => {
    const { data, error } = await supabase
      .from('event_materials')
      .select('quantita_approvata')
      .eq('product_id', productId)
      .in('stato', ['approvato', 'in_preparazione'])
    if (error) return { data: 0, error: error.message }
    const total = (data || []).reduce((sum, r) => sum + (r.quantita_approvata || 0), 0)
    return { data: total, error: null }
  },

  // Adjust stock by delta at a specific location, with audit log
  adjustStock: async (productId, delta, motivo, userId, magazzinoId = null, agentUserId = null) => {
    // Get current stock first
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('quantita_disponibile')
      .eq('id', productId)
      .single()
    if (fetchErr) return { error: fetchErr.message }

    const quantitaPrima = product.quantita_disponibile ?? 0

    // Use location-aware RPC if location provided, otherwise legacy
    let quantitaDopo
    if (magazzinoId || agentUserId) {
      const { data: newTotal, error: rpcErr } = await supabase.rpc('adjust_product_stock_location', {
        p_product_id: productId,
        p_magazzino_id: magazzinoId || null,
        p_user_id: agentUserId || null,
        p_delta: delta,
      })
      if (rpcErr) return { error: friendlyStockError(rpcErr) }
      quantitaDopo = newTotal
    } else {
      quantitaDopo = quantitaPrima + delta
      if (quantitaDopo < 0) return { error: 'La quantità risultante non può essere negativa' }
      const { error: updateErr } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_delta: delta,
      })
      if (updateErr) return { error: friendlyStockError(updateErr) }
    }

    // Log the adjustment via the SECURITY DEFINER RPC (bypasses RLS so it works for
    // any caller; best-effort — the stock change above already committed).
    const { error: logErr } = await supabase.rpc('log_stock_adjustment', {
      p_product_id: productId,
      p_user_id: userId,
      p_delta: delta,
      p_quantita_prima: quantitaPrima,
      p_quantita_dopo: quantitaDopo,
      p_motivo: motivo || null,
      p_magazzino_id: magazzinoId || null,
      p_agent_user_id: agentUserId || null,
      p_event_id: null,
    })
    if (logErr) console.warn('stock_adjustments log failed:', logErr.message)

    get().fetchProducts()
    return { error: null, quantitaDopo }
  },

  // Set the stock of one location to an exact counted value (inventory reconciliation).
  // Computes the delta from the current location quantity and records it via adjustStock.
  setStockLocationQty: async (productId, magazzinoId, agentUserId, targetQty, userId, motivo) => {
    if (!magazzinoId && !agentUserId) return { error: 'Seleziona una posizione' }
    const target = Math.max(0, parseInt(targetQty, 10) || 0)
    let locQuery = supabase
      .from('product_stock_locations')
      .select('quantita')
      .eq('product_id', productId)
    locQuery = magazzinoId
      ? locQuery.eq('magazzino_id', magazzinoId).is('user_id', null)
      : locQuery.is('magazzino_id', null).eq('user_id', agentUserId)
    const { data: locRows, error: locErr } = await locQuery
    if (locErr) return { error: locErr.message }
    const current = (locRows || []).reduce((sum, r) => sum + (r.quantita || 0), 0)
    const delta = target - current
    if (delta === 0) return { error: null, quantitaDopo: null, delta: 0 }
    const result = await get().adjustStock(productId, delta, motivo || 'Rettifica inventario', userId, magazzinoId || null, agentUserId || null)
    return { ...result, delta }
  },

  // Reverse a past adjustment by recording a compensating one — the original row
  // stays in the history (the log is append-only).
  reverseStockAdjustment: async (adjustmentId, productId, userId) => {
    const { data: adj, error: fetchErr } = await supabase
      .from('stock_adjustments')
      .select('delta, magazzino_id, agent_user_id, motivo')
      .eq('id', adjustmentId)
      .single()
    if (fetchErr) return { error: fetchErr.message }
    const motivo = adj.motivo ? `Storno di: ${adj.motivo}` : 'Storno movimento'
    return get().adjustStock(productId, -adj.delta, motivo, userId, adj.magazzino_id || null, adj.agent_user_id || null)
  },

  fetchStockHistory: async (productId, limit = 50) => {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('*, user:users!stock_adjustments_user_id_fkey(id, nome, cognome), event:events(id, titolo)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)
    if (error) return { data: [], hasMore: false, error: error.message }
    const hasMore = (data || []).length > limit
    return { data: (data || []).slice(0, limit), hasMore, error: null }
  },
}))
