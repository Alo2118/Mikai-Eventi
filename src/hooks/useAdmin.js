import { create } from 'zustand'
import { supabase, supabaseAdmin } from '../lib/supabase'

export const useAdminStore = create((set, get) => ({
  // === Brands ===
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

  // === Body Sections (Distretti) ===
  bodySections: [],
  bodySectionsLoading: false,

  fetchBodySections: async () => {
    set({ bodySectionsLoading: true })
    const { data, error } = await supabase.from('body_sections').select('*').order('ordine')
    set({ bodySections: data || [], bodySectionsLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createBodySection: async (section) => {
    const { data, error } = await supabase.from('body_sections').insert(section).select().single()
    if (!error) get().fetchBodySections()
    return { data, error: error?.message || null }
  },

  updateBodySection: async (id, updates) => {
    const { data, error } = await supabase.from('body_sections').update(updates).eq('id', id).select().single()
    if (!error) get().fetchBodySections()
    return { data, error: error?.message || null }
  },

  deleteBodySection: async (id) => {
    const { error } = await supabase.from('body_sections').delete().eq('id', id)
    if (!error) get().fetchBodySections()
    return { error: error?.message || null }
  },

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
    const { data, error } = await supabase.from('kit_contents').select('*').eq('product_id', productId).order('piece_name')
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

  // Updates stock levels for quantity-tracked products
  updateProductStock: async (productId, quantita_disponibile, soglia_minima) => {
    const { data, error } = await supabase
      .from('products')
      .update({ quantita_disponibile, soglia_minima })
      .eq('id', productId)
      .select()
      .single()
    if (!error) get().fetchProducts()
    return { data, error: error?.message || null }
  },

  // Fetch stock breakdown by location for a product
  fetchStockLocations: async (productId) => {
    const { data, error } = await supabase
      .from('product_stock_locations')
      .select('*, magazzino:magazzini(id, nome), agent:users(id, nome, cognome)')
      .eq('product_id', productId)
      .order('quantita', { ascending: false })
    return { data: data || [], error: error?.message || null }
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
      if (rpcErr) return { error: rpcErr.message }
      quantitaDopo = newTotal
    } else {
      quantitaDopo = quantitaPrima + delta
      if (quantitaDopo < 0) return { error: 'La quantità risultante non può essere negativa' }
      const { error: updateErr } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_delta: delta,
      })
      if (updateErr) return { error: updateErr.message }
    }

    // Log the adjustment
    const { error: logErr } = await supabase.from('stock_adjustments').insert({
      product_id: productId,
      user_id: userId,
      delta,
      quantita_prima: quantitaPrima,
      quantita_dopo: quantitaDopo,
      motivo: motivo || null,
      magazzino_id: magazzinoId || null,
      agent_user_id: agentUserId || null,
    })
    if (logErr) return { error: logErr.message }

    get().fetchProducts()
    return { error: null, quantitaDopo }
  },

  updateStockAdjustment: async (adjustmentId, productId, newDelta, newMotivo) => {
    const { data: adj, error: fetchErr } = await supabase
      .from('stock_adjustments')
      .select('delta, magazzino_id, agent_user_id')
      .eq('id', adjustmentId)
      .single()
    if (fetchErr) return { error: fetchErr.message }

    const diff = newDelta - adj.delta
    if (diff !== 0) {
      const hasLocation = adj.magazzino_id || adj.agent_user_id
      if (hasLocation) {
        const { error: stockErr } = await supabase.rpc('adjust_product_stock_location', {
          p_product_id: productId,
          p_magazzino_id: adj.magazzino_id || null,
          p_user_id: adj.agent_user_id || null,
          p_delta: diff,
        })
        if (stockErr) return { error: stockErr.message }
      } else {
        const { error: stockErr } = await supabase.rpc('adjust_product_stock', {
          p_product_id: productId,
          p_delta: diff,
        })
        if (stockErr) return { error: stockErr.message }
      }
    }

    const { data: product } = await supabase
      .from('products')
      .select('quantita_disponibile')
      .eq('id', productId)
      .single()

    const newQty = product?.quantita_disponibile ?? 0
    const { error: updateErr } = await supabase
      .from('stock_adjustments')
      .update({
        delta: newDelta,
        quantita_dopo: newQty,
        motivo: newMotivo || null,
      })
      .eq('id', adjustmentId)
    if (updateErr) return { error: updateErr.message }

    get().fetchProducts()
    return { error: null, quantitaDopo: newQty }
  },

  deleteStockAdjustment: async (adjustmentId, productId) => {
    const { data: adj, error: fetchErr } = await supabase
      .from('stock_adjustments')
      .select('delta, magazzino_id, agent_user_id')
      .eq('id', adjustmentId)
      .single()
    if (fetchErr) return { error: fetchErr.message }

    const reverseDelta = -adj.delta
    const hasLocation = adj.magazzino_id || adj.agent_user_id
    if (hasLocation) {
      const { error: stockErr } = await supabase.rpc('adjust_product_stock_location', {
        p_product_id: productId,
        p_magazzino_id: adj.magazzino_id || null,
        p_user_id: adj.agent_user_id || null,
        p_delta: reverseDelta,
      })
      if (stockErr) return { error: stockErr.message }
    } else {
      const { error: stockErr } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_delta: reverseDelta,
      })
      if (stockErr) return { error: stockErr.message }
    }

    const { error: delErr } = await supabase
      .from('stock_adjustments')
      .delete()
      .eq('id', adjustmentId)
    if (delErr) return { error: delErr.message }

    const { data: product } = await supabase
      .from('products')
      .select('quantita_disponibile')
      .eq('id', productId)
      .single()

    get().fetchProducts()
    return { error: null, quantitaDopo: product?.quantita_disponibile ?? 0 }
  },

  fetchStockHistory: async (productId) => {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('*, user:users(id, nome, cognome)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50)
    return { data: data || [], error: error?.message || null }
  },

  // === Venues ===
  venues: [],
  venuesLoading: false,

  fetchVenues: async () => {
    set({ venuesLoading: true })
    const { data, error } = await supabase.from('venues').select('*, zone:zones(id, nome)').order('nome')
    set({ venues: data || [], venuesLoading: false })
    return { data: data || [], error: error?.message || null }
  },

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

  // === Couriers ===
  couriers: [],
  couriersLoading: false,

  fetchCouriers: async () => {
    set({ couriersLoading: true })
    const { data, error } = await supabase.from('couriers').select('*').order('nome')
    set({ couriers: data || [], couriersLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createCourier: async (courier) => {
    const { data, error } = await supabase.from('couriers').insert(courier).select().single()
    if (!error) get().fetchCouriers()
    return { data, error: error?.message || null }
  },

  updateCourier: async (id, updates) => {
    const { data, error } = await supabase.from('couriers').update(updates).eq('id', id).select().single()
    if (!error) get().fetchCouriers()
    return { data, error: error?.message || null }
  },

  deleteCourier: async (id) => {
    const { error } = await supabase.from('couriers').delete().eq('id', id)
    if (!error) get().fetchCouriers()
    return { error: error?.message || null }
  },

  // === Zones ===
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

  // === Product Types ===
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

  // === Event Types ===
  eventTypes: [],
  eventTypesLoading: false,

  fetchEventTypes: async () => {
    set({ eventTypesLoading: true })
    const { data, error } = await supabase.from('event_types').select('*').order('ordine')
    set({ eventTypes: data || [], eventTypesLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createEventType: async (et) => {
    const { data, error } = await supabase.from('event_types').insert(et).select().single()
    if (!error) get().fetchEventTypes()
    return { data, error: error?.message || null }
  },

  updateEventType: async (id, updates) => {
    const { data, error } = await supabase.from('event_types').update(updates).eq('id', id).select().single()
    if (!error) get().fetchEventTypes()
    return { data, error: error?.message || null }
  },

  deleteEventType: async (id) => {
    const { error } = await supabase.from('event_types').delete().eq('id', id)
    if (!error) get().fetchEventTypes()
    return { error: error?.message || null }
  },

  // === Users (for admin) ===
  users: [],
  usersLoading: false,

  fetchUsers: async () => {
    set({ usersLoading: true })
    const { data, error } = await supabase.from('users').select('*').order('cognome')
    set({ users: data || [], usersLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  updateUser: async (id, updates) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
    if (!error) get().fetchUsers()
    return { data, error: error?.message || null }
  },

  fetchUserPermissions: async (userId) => {
    const { data, error } = await supabase.from('user_permissions').select('*').eq('user_id', userId)
    return { data: data || [], error: error?.message || null }
  },

  setUserPermissions: async (userId, permissions) => {
    // Use SECURITY DEFINER RPC to avoid self-lockout:
    // separate DELETE+INSERT calls would fail RLS when editing own permissions
    const { error } = await supabase.rpc('set_user_permissions', {
      target_user_id: userId,
      new_permissions: permissions,
    })
    return { error: error?.message || null }
  },

  resetUserPassword: async (userId, newPassword) => {
    const { error } = await supabase.rpc('reset_user_password', {
      target_user_id: userId,
      new_password: newPassword,
    })
    return { error: error?.message || null }
  },

  createUser: async ({ email, password, nome, cognome, ruolo }) => {
    // Use separate client to avoid logging out current admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: { nome, cognome, ruolo },
        emailRedirectTo: undefined,
      },
    })
    if (authError) return { data: null, error: authError.message }

    const userId = authData.user?.id
    if (!userId) return { data: null, error: 'Utente creato ma ID non disponibile' }

    // Trigger handle_new_auth_user creates public.users synchronously.
    // Confirm email immediately so user can log in without verification.
    const { error: confirmError } = await supabase.rpc('confirm_user_email', { user_id: userId })
    if (confirmError) return { data: { id: userId }, error: 'Utente creato ma conferma email fallita: ' + confirmError.message }

    get().fetchUsers()
    return { data: { id: userId }, error: null }
  },

  // === Magazzini ===
  magazzini: [],
  magazziniLoading: false,

  fetchMagazzini: async () => {
    set({ magazziniLoading: true })
    const { data, error } = await supabase.from('magazzini').select('*').order('nome')
    set({ magazzini: data || [], magazziniLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  createMagazzino: async (magazzino) => {
    const { data, error } = await supabase.from('magazzini').insert(magazzino).select().single()
    if (!error) get().fetchMagazzini()
    return { data, error: error?.message || null }
  },

  updateMagazzino: async (id, updates) => {
    const { data, error } = await supabase.from('magazzini').update(updates).eq('id', id).select().single()
    if (!error) get().fetchMagazzini()
    return { data, error: error?.message || null }
  },

  deleteMagazzino: async (id) => {
    const { error } = await supabase.from('magazzini').delete().eq('id', id)
    if (!error) get().fetchMagazzini()
    return { error: error?.message || null }
  },
}))
