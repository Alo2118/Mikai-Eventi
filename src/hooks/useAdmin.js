import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
    await supabase.from('product_body_sections').delete().eq('product_id', productId)
    if (sectionIds.length > 0) {
      await supabase.from('product_body_sections').insert(
        sectionIds.map(sid => ({ product_id: productId, body_section_id: sid }))
      )
    }
    get().fetchProducts()
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

  createSpecimen: async (specimen) => {
    const { data, error } = await supabase.from('materials').insert(specimen).select().single()
    if (!error) get().fetchSpecimens()
    return { data, error: error?.message || null }
  },

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
    await supabase.from('zone_provinces').delete().eq('zone_id', zoneId)
    if (provinces.length > 0) {
      await supabase.from('zone_provinces').insert(
        provinces.map(p => ({ zone_id: zoneId, provincia: p }))
      )
    }
  },

  // Zone-Courier mapping
  fetchZoneCouriers: async (zoneId) => {
    const { data, error } = await supabase.from('zone_couriers').select('*, courier:couriers(id, nome)').eq('zone_id', zoneId)
    return { data: data || [], error: error?.message || null }
  },

  setZoneCourier: async (zoneId, courierId) => {
    await supabase.from('zone_couriers').delete().eq('zone_id', zoneId)
    if (courierId) {
      await supabase.from('zone_couriers').insert({ zone_id: zoneId, courier_id: courierId })
    }
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
    await supabase.from('user_permissions').delete().eq('user_id', userId)
    if (permissions.length > 0) {
      await supabase.from('user_permissions').insert(
        permissions.map(p => ({ user_id: userId, permission: p }))
      )
    }
  },

  createUser: async ({ email, password, nome, cognome, ruolo }) => {
    const { data, error } = await supabase.rpc('create_app_user', {
      p_email: email,
      p_password: password,
      p_nome: nome,
      p_cognome: cognome,
      p_ruolo: ruolo,
    })
    if (!error) get().fetchUsers()
    return { data, error: error?.message || null }
  },
}))
