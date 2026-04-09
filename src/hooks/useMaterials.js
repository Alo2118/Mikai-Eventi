import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO, todayISO } from '../lib/date-utils'
import { buildMaterialQuery } from '../lib/material-queries'

export const useMaterialsStore = create((set, get) => {
  let filterDebounceTimer = null
  return {
  materials: [],
  eventMaterials: [],
  agentMaterials: [],
  loading: false,
  loadingMore: false,
  error: null,
  page: 0,
  pageSize: 30,
  hasMore: true,
  totalCount: 0,
  positionCounts: {},
  filters: { search: '', tipo: '', posizione: '', brand: '' },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value }, page: 0, materials: [], hasMore: true }))
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = setTimeout(() => get().fetchMaterials(), 300)
  },

  resetFilters: () => {
    set({ filters: { search: '', tipo: '', posizione: '', brand: '' }, page: 0, materials: [], hasMore: true })
    clearTimeout(filterDebounceTimer)
    get().fetchMaterials()
  },

  fetchMaterials: async () => {
    const { page, pageSize, filters } = get()
    const from = page * pageSize
    const to = from + pageSize - 1

    set({ loading: true, error: null })
    const { data, error, count } = await buildMaterialQuery(filters, from, to)
    set({ materials: data || [], loading: false, error: error?.message || null, totalCount: count ?? 0, hasMore: (data || []).length === pageSize })
  },

  loadMore: async () => {
    const { loadingMore, hasMore } = get()
    if (loadingMore || !hasMore) return
    const { page, pageSize, filters } = get()
    const nextPage = page + 1
    const from = nextPage * pageSize
    const to = from + pageSize - 1

    set({ loadingMore: true })
    const { data, error, count } = await buildMaterialQuery(filters, from, to)
    set((s) => ({
      materials: [...s.materials, ...(data || [])],
      loadingMore: false,
      error: error?.message || null,
      page: nextPage,
      totalCount: count ?? s.totalCount,
      hasMore: (data || []).length === pageSize,
    }))
  },

  fetchMaterial: async (id) => {
    const { data, error } = await supabase
      .from('materials').select(`
        *,
        product:products(id, nome, codice, descrizione, brand:brands(id, nome, tipo)),
        magazzino:magazzini(id, nome),
        agente:users!materials_presso_utente_id_fkey(id, nome, cognome)
      `).eq('id', id).single()
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
      .update({ stato: 'approvato', approvato_da: userId, data_approvazione: nowISO() })
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

    if (data && data.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const conflictEvents = data.map(c => c.event?.titolo).filter(Boolean).join(', ')
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: user.id,
          tipo: 'conflitto_materiale',
          titolo: 'Conflitto materiale rilevato',
          messaggio: `Già assegnato a: ${conflictEvents}`,
          link: `/materiale/${materialId}`,
          link_label: 'Vai al materiale',
          entity_type: 'material',
          entity_id: materialId,
          gruppo: `conflict_${materialId}_${todayISO()}`,
        })
        if (notifError) console.error('Notification insert failed:', notifError)
      }
    }

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
      .select('*, material:materials(nome, codice_inventario), responsabile:users!material_movements_responsabile_id_fkey(nome, cognome), event:events(titolo)')
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

  // Register event-level shipping + create uscita movements + update material states
  registerEventShipping: async (eventId, shippingData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    // 1. Fetch materials that need shipping (approved or in_preparazione, with material_id)
    const { data: materials, error: matError } = await supabase
      .from('event_materials')
      .select('id, material_id, product_id, stato')
      .eq('event_id', eventId)
      .in('stato', ['approvato', 'in_preparazione'])

    if (matError) return { error: matError.message }

    const shippableMaterials = (materials || []).filter(m => m.material_id)

    // 2. Create uscita movements for each physical material
    if (shippableMaterials.length > 0) {
      const movements = shippableMaterials.map(m => ({
        material_id: m.material_id,
        event_id: eventId,
        tipo: 'uscita',
        modalita: 'spedizione',
        data_movimento: shippingData.spedizione_data ? new Date(shippingData.spedizione_data).toISOString() : nowISO(),
        responsabile_id: user.id,
        tracking_spedizione: shippingData.spedizione_tracking || null,
        data_rientro_prevista: shippingData.data_rientro_prevista || null,
        note: shippingData.spedizione_note || null,
      }))

      const { error: movError } = await supabase
        .from('material_movements')
        .insert(movements)

      if (movError) return { error: `Errore creazione movimenti: ${movError.message}` }
    }

    // 3. Update all shippable event_materials stato to 'spedito'
    const allShippableIds = (materials || []).filter(m => ['approvato', 'in_preparazione'].includes(m.stato)).map(m => m.id)
    if (allShippableIds.length > 0) {
      const { error: updError } = await supabase
        .from('event_materials')
        .update({ stato: 'spedito' })
        .in('id', allShippableIds)

      if (updError) return { error: `Errore aggiornamento stato materiali: ${updError.message}` }
    }

    return { error: null, movementsCreated: shippableMaterials.length, materialsUpdated: allShippableIds.length }
  },

  fetchEventMaterialList: async (eventId) => {
    const { data, error } = await supabase
      .from('event_materials')
      .select('*, product:products(id, nome, codice, descrizione, foto_url, tipo, quantita_disponibile, soglia_minima, brand:brands(id, nome, logo_url)), richiesto:users!event_materials_richiesto_da_fkey(nome, cognome), approvatore:users!event_materials_approvato_da_fkey(nome, cognome)')
      .eq('event_id', eventId)
      .order('data_richiesta', { ascending: true })
    set({ eventMaterials: data || [] })
    return { data: data || [], error: error?.message || null }
  },

  addToMaterialList: async (eventId, productId, userId, note, quantita = 1) => {
    const { data, error } = await supabase
      .from('event_materials')
      .insert({
        event_id: eventId,
        product_id: productId,
        quantita,
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

  confirmMaterialRow: async (id, quantitaApprovata, noteUfficio) => {
    // Pre-check: verify stock availability for gadgets before confirming
    const { data: row } = await supabase
      .from('event_materials')
      .select('product_id, product:products(id, tipo, quantita_disponibile, serializzato)')
      .eq('id', id)
      .single()

    if (row?.product && !row.product.serializzato && row.product.tipo === 'gadget' && row.product.quantita_disponibile != null) {
      if (quantitaApprovata > row.product.quantita_disponibile) {
        return { data: null, error: `Quantità disponibile insufficiente (disponibili: ${row.product.quantita_disponibile})` }
      }
    }

    // Decrement stock FIRST for gadgets — before changing stato
    const isGadget = row?.product?.tipo === 'gadget' && row?.product?.quantita_disponibile != null
    if (isGadget) {
      const stockError = await get()._adjustStock(row.product_id, -quantitaApprovata)
      if (stockError) return { data: null, error: stockError }
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('event_materials')
      .update({
        stato: 'approvato',
        quantita_approvata: quantitaApprovata,
        note_ufficio: noteUfficio || null,
        approvato_da: currentUser?.id || null,
        data_approvazione: nowISO(),
      })
      .eq('id', id)
      .select('*, product:products(id, tipo, quantita_disponibile)')
      .single()

    // Rollback stock if status update failed
    if (error && isGadget) {
      await get()._adjustStock(row.product_id, quantitaApprovata)
      return { data: null, error: error.message }
    }

    return { data, error: error?.message || null }
  },

  rejectMaterialRow: async (id, motivo) => {
    // Fetch full row to restore stock if needed
    const { data: existing } = await supabase
      .from('event_materials')
      .select('*, product:products(id, tipo, quantita_disponibile)')
      .eq('id', id)
      .single()

    // Restore gadget stock before rejecting (only if was approved/in_preparazione)
    if (existing && ['approvato', 'in_preparazione'].includes(existing.stato) && existing.quantita_approvata) {
      if (existing.product?.tipo === 'gadget') {
        const stockError = await get()._adjustStock(existing.product_id, existing.quantita_approvata)
        if (stockError) return { data: null, error: `Errore ripristino stock: ${stockError}` }
      }
    }

    const { data, error } = await supabase
      .from('event_materials')
      .update({
        stato: 'rifiutato',
        motivo_rifiuto: motivo,
      })
      .eq('id', id)
      .select()
      .single()

    // Rollback stock restore if reject failed
    if (error && existing && ['approvato', 'in_preparazione'].includes(existing.stato) && existing.quantita_approvata && existing.product?.tipo === 'gadget') {
      await get()._adjustStock(existing.product_id, -existing.quantita_approvata)
    }

    return { data, error: error?.message || null }
  },

  restoreGadgetStock: async (row) => {
    if ((row.stato === 'approvato' || row.stato === 'in_preparazione') && row.quantita_approvata && row.product?.tipo === 'gadget') {
      const stockError = await get()._adjustStock(row.product_id, row.quantita_approvata)
      if (stockError) return { error: stockError }
    }
    return { error: null }
  },

  // Internal: adjust stock with location awareness. Returns error string or null.
  _adjustStock: async (productId, delta) => {
    const { data: locs } = await supabase
      .from('product_stock_locations')
      .select('magazzino_id, user_id, quantita')
      .eq('product_id', productId)
      .order('quantita', { ascending: false })
      .limit(1)

    if (locs && locs.length > 0) {
      const { error } = await supabase.rpc('adjust_product_stock_location', {
        p_product_id: productId,
        p_magazzino_id: locs[0].magazzino_id,
        p_user_id: locs[0].user_id,
        p_delta: delta,
      })
      if (error) return error.message
    } else {
      const { error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_delta: delta,
      })
      if (error) return error.message
    }
    return null
  },

  fetchBatchMaterialStatus: async (eventIds) => {
    if (!eventIds?.length) return {}
    const { data, error } = await supabase
      .from('event_materials')
      .select('event_id, stato')
      .in('event_id', eventIds)
    if (error || !data) return {}
    const map = {}
    for (const row of data) {
      if (!map[row.event_id]) map[row.event_id] = { total: 0, approvato: 0, in_preparazione: 0, richiesto: 0, rifiutato: 0, spedito: 0 }
      map[row.event_id].total++
      if (map[row.event_id][row.stato] !== undefined) map[row.event_id][row.stato]++
    }
    return map
  },

  fetchBatchAvailability: async (productIds) => {
    if (!productIds?.length) return {}
    const { data, error } = await supabase
      .from('materials')
      .select('id, product_id, posizione_attuale, presso_utente_id')
      .in('product_id', productIds)
      .eq('attivo', true)
    if (error) return {}
    const map = {}
    for (const m of (data || [])) {
      if (!map[m.product_id]) map[m.product_id] = { inMagazzino: 0, pressoEvento: 0, pressoAgente: 0, totale: 0 }
      const entry = map[m.product_id]
      entry.totale++
      if (m.posizione_attuale === 'in_magazzino') entry.inMagazzino++
      else if (m.posizione_attuale === 'magazzino_agente') entry.pressoAgente++
      else entry.pressoEvento++
    }
    return map
  },

  fetchPositionCounts: async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('posizione_attuale')
      .eq('attivo', true)
    if (error) return
    const counts = {}
    data.forEach(m => { counts[m.posizione_attuale] = (counts[m.posizione_attuale] || 0) + 1 })
    set({ positionCounts: counts })
  },

  fetchMagazzini: async () => {
    const { data, error } = await supabase
      .from('magazzini')
      .select('*')
      .eq('attivo', true)
      .order('nome')
    return { data: data || [], error: error?.message || null }
  },

  fetchAgenti: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, cognome, ruolo')
      .in('ruolo', ['commerciale', 'area_manager'])
      .eq('attivo', true)
      .order('cognome')
    return { data: data || [], error: error?.message || null }
  },

  fetchVenueZone: async (venueId) => {
    if (!venueId) return null
    const { data } = await supabase
      .from('venues')
      .select('zone_id')
      .eq('id', venueId)
      .single()
    return data?.zone_id || null
  },

  fetchStockByLocation: async (productIds) => {
    if (!productIds.length) return { data: {} }
    const { data, error } = await supabase
      .from('product_stock_locations')
      .select('*, magazzino:magazzini(id, nome), agent:users(id, nome, cognome, zone_id)')
      .in('product_id', productIds)
      .gt('quantita', 0)
      .order('quantita', { ascending: false })
    if (error) return { data: {} }
    const map = {}
    for (const row of (data || [])) {
      if (!map[row.product_id]) map[row.product_id] = []
      map[row.product_id].push(row)
    }
    return { data: map }
  },

  fetchAgentInventory: async (userId) => {
    const { data, error } = await supabase
      .from('product_stock_locations')
      .select('*, product:products(id, nome, tipo, codice, brand:brands(id, nome))')
      .eq('user_id', userId)
      .gt('quantita', 0)
      .order('quantita', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  reportConsumption: async (eventMaterialId, quantitaConsumata, userId, productId, quantitaApprovata) => {
    const { error: updateErr } = await supabase
      .from('event_materials')
      .update({
        quantita_consumata: quantitaConsumata,
        consumo_registrato_da: userId,
        consumo_registrato_at: nowISO(),
      })
      .eq('id', eventMaterialId)
    if (updateErr) return { error: updateErr.message }

    const remainder = (quantitaApprovata || 0) - (quantitaConsumata || 0)
    if (remainder > 0 && userId) {
      await supabase.rpc('adjust_product_stock_location', {
        p_product_id: productId,
        p_magazzino_id: null,
        p_user_id: userId,
        p_delta: remainder,
      })
    }
    return { error: null }
  },

  fetchAgentMaterials: async (userId) => {
    const { data, error } = await supabase
      .from('materials')
      .select('*, product:products(id, nome, codice, tipo, brand:brands(id, nome, logo_url))')
      .eq('presso_utente_id', userId)
      .eq('attivo', true)
      .eq('posizione_attuale', 'magazzino_agente')
    if (!error) set({ agentMaterials: data || [] })
    return { data: data || [], error: error?.message || null }
  },

  }
})
