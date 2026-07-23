import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO, todayISO, toISO, addDaysToToday, daysSince } from '../lib/date-utils'
import { friendlyStockError } from '../lib/stock-errors'

function buildMaterialQuery(filters, from, to) {
  let query = supabase.from('materials').select(`
      *,
      product:products(id, nome, codice, foto_url, brand:brands(id, nome)),
      magazzino:magazzini(id, nome),
      agente:users!materials_presso_utente_id_fkey(id, nome, cognome)
    `, { count: 'exact' }).eq('attivo', true).order('nome')

  const { search, tipo, posizione, brand } = filters
  if (search) query = query.ilike('nome', `%${search}%`)
  if (tipo) query = query.eq('tipo', tipo)
  if (posizione) query = query.eq('posizione_attuale', posizione)
  if (brand) query = query.eq('product.brand_id', brand)

  return query.range(from, to)
}

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
  // Inventario logistica: lista completa (non paginata), indipendente da `materials`
  inventory: [],          // esemplari serializzati (materials)
  inventoryStock: [],     // giacenze a quantità (product_stock_locations)
  inventoryLoading: false,
  inventoryError: null,
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

  // Inventario completo (senza paginazione) per la pagina Logistica → Inventario:
  // esemplari serializzati (materials) + giacenze a quantità (product_stock_locations)
  fetchInventory: async () => {
    set({ inventoryLoading: true, inventoryError: null })
    const [specRes, stockRes] = await Promise.all([
      supabase
        .from('materials')
        .select(`
          *,
          product:products(id, nome, codice, foto_url, brand:brands(id, nome)),
          magazzino:magazzini(id, nome),
          agente:users!materials_presso_utente_id_fkey(id, nome, cognome)
        `)
        .eq('attivo', true)
        .order('nome')
        .limit(5000),
      supabase
        .from('product_stock_locations')
        .select(`
          id, quantita, product_id, magazzino_id, user_id,
          product:products(id, nome, codice, tipo, serializzato),
          magazzino:magazzini(id, nome),
          agent:users(id, nome, cognome)
        `)
        .gt('quantita', 0)
        .limit(5000),
    ])
    set({
      inventory: specRes.data || [],
      inventoryStock: stockRes.data || [],
      inventoryLoading: false,
      inventoryError: specRes.error?.message || stockRes.error?.message || null,
    })
    return { error: specRes.error?.message || stockRes.error?.message || null }
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
        data_movimento: toISO(shippingData.spedizione_data) || nowISO(),
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
      .select('*, product:products(id, nome, codice, descrizione, foto_url, tipo, serializzato, quantita_disponibile, soglia_minima, brand:brands(id, nome, logo_url)), richiesto:users!event_materials_richiesto_da_fkey(nome, cognome), approvatore:users!event_materials_approvato_da_fkey(nome, cognome)')
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

  // Pick the location with the most stock for a product (used to decide where to draw from / return to).
  _topStockLocation: async (productId) => {
    const { data } = await supabase
      .from('product_stock_locations')
      .select('magazzino_id, user_id')
      .eq('product_id', productId)
      .order('quantita', { ascending: false })
      .limit(1)
    const loc = data?.[0] || null
    return { magazzinoId: loc?.magazzino_id || null, agentUserId: loc?.user_id || null }
  },

  confirmMaterialRow: async (id, quantitaApprovata, noteUfficio) => {
    // Pre-check: verify stock availability for gadgets before confirming
    const { data: row } = await supabase
      .from('event_materials')
      .select('product_id, event_id, product:products(id, tipo, quantita_disponibile, serializzato), event:events(id, titolo)')
      .eq('id', id)
      .single()

    if (row?.product && !row.product.serializzato && row.product.tipo === 'gadget' && row.product.quantita_disponibile != null) {
      if (quantitaApprovata > row.product.quantita_disponibile) {
        return { data: null, error: `Quantità disponibile insufficiente (disponibili: ${row.product.quantita_disponibile})` }
      }
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Decrement stock FIRST for gadgets — before changing stato. Capture the location so a
    // rollback hits the same one.
    const isGadget = row?.product?.tipo === 'gadget' && row?.product?.quantita_disponibile != null
    let drawMeta = null
    if (isGadget) {
      const loc = await get()._topStockLocation(row.product_id)
      drawMeta = { userId: currentUser?.id, eventId: row.event_id, ...loc }
      const motivo = row.event?.titolo ? `Consumo materiale — evento "${row.event.titolo}"` : 'Consumo materiale per evento'
      const stockError = await get()._adjustStock(row.product_id, -quantitaApprovata, { ...drawMeta, motivo })
      if (stockError) return { data: null, error: stockError }
    }

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
    if (error && drawMeta) {
      await get()._adjustStock(row.product_id, quantitaApprovata, { ...drawMeta, motivo: 'Annullamento consumo — errore salvataggio' })
      return { data: null, error: error.message }
    }

    return { data, error: error?.message || null }
  },

  rejectMaterialRow: async (id, motivo) => {
    // Fetch full row to restore stock if needed
    const { data: existing } = await supabase
      .from('event_materials')
      .select('*, product:products(id, tipo, quantita_disponibile), event:events(id, titolo)')
      .eq('id', id)
      .single()

    // Restore gadget stock before rejecting (only if was approved/in_preparazione)
    const restoring = !!(existing && ['approvato', 'in_preparazione'].includes(existing.stato) && existing.quantita_approvata && existing.product?.tipo === 'gadget')
    let restoreMeta = null
    if (restoring) {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const loc = await get()._topStockLocation(existing.product_id)
      restoreMeta = { userId: currentUser?.id, eventId: existing.event_id, ...loc }
      const m = existing.event?.titolo ? `Rientro stock — richiesta annullata, evento "${existing.event.titolo}"` : 'Rientro stock — richiesta materiale annullata'
      const stockError = await get()._adjustStock(existing.product_id, existing.quantita_approvata, { ...restoreMeta, motivo: m })
      if (stockError) return { data: null, error: `Errore ripristino stock: ${stockError}` }
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
    if (error && restoreMeta) {
      await get()._adjustStock(existing.product_id, -existing.quantita_approvata, { ...restoreMeta, motivo: 'Annullamento rientro — errore salvataggio' })
    }

    return { data, error: error?.message || null }
  },

  restoreGadgetStock: async (row) => {
    if ((row.stato === 'approvato' || row.stato === 'in_preparazione') && row.quantita_approvata && row.product?.tipo === 'gadget') {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const stockError = await get()._adjustStock(row.product_id, row.quantita_approvata, {
        userId: currentUser?.id,
        eventId: row.event_id,
        motivo: 'Rientro stock — richiesta materiale modificata',
      })
      if (stockError) return { error: stockError }
    }
    return { error: null }
  },

  // Internal best-effort audit log (the stock change itself already committed).
  _logStockAdj: async (productId, delta, prima, dopo, magazzinoId, agentUserId, meta) => {
    if (!meta?.userId || delta === 0) return
    await supabase.rpc('log_stock_adjustment', {
      p_product_id: productId,
      p_user_id: meta.userId,
      p_delta: delta,
      p_quantita_prima: prima,
      p_quantita_dopo: dopo,
      p_motivo: meta.motivo || null,
      p_magazzino_id: magazzinoId || null,
      p_agent_user_id: agentUserId || null,
      p_event_id: meta.eventId || null,
    })
  },

  // Internal: turn a Postgres check_violation (23514, concurrent confirmation dropped stock
  // below zero) or unique_violation (23505, concurrent insert on the same new stock location)
  // from the stock RPCs into a human Italian message instead of leaking raw constraint/exception
  // text to the toast. Shared with the admin store via src/lib/stock-errors.js — don't duplicate.
  _friendlyStockError: (error) => friendlyStockError(error),

  // Internal: adjust stock with location awareness. Returns error string or null.
  // meta (optional): { userId, motivo, eventId, magazzinoId, agentUserId } — if a location
  // is given it is used, otherwise the location with the most stock; when userId is set the
  // change is recorded in stock_adjustments.
  _adjustStock: async (productId, delta, meta = {}) => {
    const { data: before } = await supabase
      .from('products')
      .select('quantita_disponibile')
      .eq('id', productId)
      .single()
    const quantitaPrima = before?.quantita_disponibile ?? 0

    let magId = meta.magazzinoId || null
    let agId = meta.agentUserId || null
    if (!magId && !agId) {
      const top = await get()._topStockLocation(productId)
      magId = top.magazzinoId
      agId = top.agentUserId
    }

    let quantitaDopo
    if (magId || agId) {
      const { data: total, error } = await supabase.rpc('adjust_product_stock_location', {
        p_product_id: productId,
        p_magazzino_id: magId,
        p_user_id: agId,
        p_delta: delta,
      })
      if (error) return get()._friendlyStockError(error)
      quantitaDopo = total != null ? total : quantitaPrima + delta
    } else {
      const { data: qty, error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_delta: delta,
      })
      if (error) return get()._friendlyStockError(error)
      quantitaDopo = qty != null && qty >= 0 ? qty : quantitaPrima + delta
    }

    await get()._logStockAdj(productId, delta, quantitaPrima, quantitaDopo, magId, agId, meta)
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
    const { data: emRow, error: updateErr } = await supabase
      .from('event_materials')
      .update({
        quantita_consumata: quantitaConsumata,
        consumo_registrato_da: userId,
        consumo_registrato_at: nowISO(),
      })
      .eq('id', eventMaterialId)
      .select('event_id, event:events(titolo)')
      .single()
    if (updateErr) return { error: updateErr.message }

    const remainder = (quantitaApprovata || 0) - (quantitaConsumata || 0)
    if (remainder > 0 && userId) {
      const { data: before } = await supabase
        .from('products').select('quantita_disponibile').eq('id', productId).single()
      const quantitaPrima = before?.quantita_disponibile ?? 0
      const { data: total, error: rpcErr } = await supabase.rpc('adjust_product_stock_location', {
        p_product_id: productId,
        p_magazzino_id: null,
        p_user_id: userId,
        p_delta: remainder,
      })
      if (rpcErr) return { error: friendlyStockError(rpcErr) }
      await supabase.rpc('log_stock_adjustment', {
        p_product_id: productId,
        p_user_id: userId,
        p_delta: remainder,
        p_quantita_prima: quantitaPrima,
        p_quantita_dopo: total != null ? total : quantitaPrima + remainder,
        p_motivo: emRow?.event?.titolo ? `Rientro materiale non consumato — evento "${emRow.event.titolo}"` : 'Rientro materiale non consumato',
        p_magazzino_id: null,
        p_agent_user_id: userId,
        p_event_id: emRow?.event_id || null,
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

  // ── Magazzino Oggi (dashboard Ivan) ──

  // Materiali presso agenti, con ultimo movimento e dati per "fuori da X giorni"
  fetchMaterialsByAgent: async () => {
    const { data: materials, error } = await supabase
      .from('materials')
      .select(`
        id, nome, codice_inventario, tipo, posizione_attuale, presso_utente_id,
        agente:users!materials_presso_utente_id_fkey(id, nome, cognome, ruolo, zona),
        product:products(id, nome, codice, foto_url, brand:brands(id, nome))
      `)
      .eq('attivo', true)
      .eq('posizione_attuale', 'magazzino_agente')
      .not('presso_utente_id', 'is', null)
    if (error) return { data: [], error: error.message }

    const materialIds = (materials || []).map(m => m.id)
    if (materialIds.length === 0) return { data: [], error: null }

    // Ultimo movimento di tipo "uscita" per ogni materiale (per data e event_id collegato)
    const { data: movements } = await supabase
      .from('material_movements')
      .select('material_id, event_id, data_movimento, data_rientro_prevista, evento:events!material_movements_event_id_fkey(id, titolo, data_inizio, data_fine, stato)')
      .in('material_id', materialIds)
      .eq('tipo', 'uscita')
      .order('data_movimento', { ascending: false })

    const lastByMaterial = {}
    for (const m of (movements || [])) {
      if (!lastByMaterial[m.material_id]) lastByMaterial[m.material_id] = m
    }

    // Aggregazione per agente
    const grouped = {}
    for (const mat of materials) {
      const aid = mat.presso_utente_id
      if (!grouped[aid]) {
        grouped[aid] = {
          agente: mat.agente,
          materials: [],
        }
      }
      const lastMv = lastByMaterial[mat.id]
      const giorniFuori = daysSince(lastMv?.data_movimento)
      grouped[aid].materials.push({
        ...mat,
        last_movement: lastMv || null,
        evento_collegato: lastMv?.evento || null,
        giorni_fuori: giorniFuori,
      })
    }

    // Stats per agente
    const result = Object.values(grouped).map(g => {
      const giorniValidi = g.materials.map(m => m.giorni_fuori).filter(d => d != null)
      const giorniMedi = giorniValidi.length > 0
        ? Math.round(giorniValidi.reduce((a, b) => a + b, 0) / giorniValidi.length)
        : null
      const giorniMax = giorniValidi.length > 0 ? Math.max(...giorniValidi) : null
      return {
        ...g,
        kit_count: g.materials.length,
        giorni_medi: giorniMedi,
        giorni_max: giorniMax,
      }
    }).sort((a, b) => (b.giorni_max || 0) - (a.giorni_max || 0))

    return { data: result, error: null }
  },

  // Eventi conclusi con rientri ancora aperti.
  // Combina due sorgenti:
  //   - material_movements 'uscita' su asset serializzati con materials.posizione_attuale != 'in_magazzino'
  //   - event_materials in stato spedito/in_preparazione, senza data_rientro, con effective_rientro_richiesto=true
  fetchEventsPendingReturn: async () => {
    const [movRes, emRes] = await Promise.all([
      supabase
        .from('material_movements')
        .select(`
          id, material_id, event_id, data_movimento, data_rientro_prevista,
          material:materials!material_movements_material_id_fkey(id, nome, codice_inventario, posizione_attuale,
            product:products(id, nome, foto_url, brand:brands(id, nome))),
          evento:events!material_movements_event_id_fkey(id, titolo, data_inizio, data_fine, stato)
        `)
        .eq('tipo', 'uscita')
        .not('event_id', 'is', null),
      supabase
        .from('event_materials')
        .select(`
          id, material_id, product_id, event_id, stato, rientro_richiesto, data_rientro,
          product:products(id, nome, foto_url, serializzato, brand:brands(id, nome)),
          evento:events!event_materials_event_id_fkey(id, titolo, data_inizio, data_fine, stato)
        `)
        .in('stato', ['spedito', 'in_preparazione'])
        .is('data_rientro', null),
    ])

    if (movRes.error) return { data: [], error: movRes.error.message }
    if (emRes.error) return { data: [], error: emRes.error.message }

    const grouped = {}
    const seenSpecimenByEvent = new Set() // `${event_id}-${material_id}`

    for (const m of (movRes.data || [])) {
      if (m.evento?.stato !== 'concluso') continue
      if (m.material?.posizione_attuale === 'in_magazzino') continue
      const eid = m.event_id
      if (!grouped[eid]) grouped[eid] = { evento: m.evento, materials: [] }
      grouped[eid].materials.push(m)
      if (m.material_id) seenSpecimenByEvent.add(`${eid}-${m.material_id}`)
    }

    for (const em of (emRes.data || [])) {
      if (em.evento?.stato !== 'concluso') continue
      const needsReturn = em.rientro_richiesto !== null && em.rientro_richiesto !== undefined
        ? em.rientro_richiesto === true
        : !!em.product?.serializzato
      if (!needsReturn) continue
      if (em.material_id && seenSpecimenByEvent.has(`${em.event_id}-${em.material_id}`)) continue
      const eid = em.event_id
      if (!grouped[eid]) grouped[eid] = { evento: em.evento, materials: [] }
      grouped[eid].materials.push({
        id: `em-${em.id}`,
        event_material_id: em.id,
        material_id: em.material_id || null,
        material: em.product ? { id: em.product.id, nome: em.product.nome, product: em.product } : null,
      })
    }

    const result = Object.values(grouped).map(g => {
      const giorniDaConclusione = daysSince(g.evento?.data_fine)
      return { ...g, count: g.materials.length, giorni_da_conclusione: giorniDaConclusione }
    }).sort((a, b) => (b.giorni_da_conclusione || 0) - (a.giorni_da_conclusione || 0))

    return { data: result, error: null }
  },

  // Eventi confermati con materiale ancora richiesto/approvato — preparazione imminente
  fetchPreparazioniImminenti: async (giorniAvanti = 7) => {
    const today = todayISO()
    const limiteISO = addDaysToToday(giorniAvanti)

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id, titolo, data_inizio, data_fine, stato, modalita,
        materials:event_materials(id, stato, quantita, product:products(id, nome, foto_url, brand:brands(id, nome)))
      `)
      .gte('data_inizio', today)
      .lte('data_inizio', limiteISO)
      .in('stato', ['confermato', 'in_preparazione', 'pronto'])
      .order('data_inizio', { ascending: true })
    if (error) return { data: [], error: error.message }

    // Filtra: solo eventi con almeno un materiale non ancora preparato (richiesto o approvato)
    const result = (events || [])
      .map(ev => {
        const daPreparare = (ev.materials || []).filter(m => ['richiesto', 'approvato'].includes(m.stato))
        const totale = (ev.materials || []).filter(m => m.stato !== 'rifiutato').length
        const giorniMancanti = -daysSince(ev.data_inizio)
        return { ...ev, da_preparare: daPreparare, totale, giorni_mancanti: giorniMancanti }
      })
      .filter(ev => ev.da_preparare.length > 0)

    return { data: result, error: null }
  },

  // ── Bulk Return ──

  // Carica i material_movements 'uscita' di un evento per cui il materiale non è ancora rientrato
  fetchPendingReturnsForEvent: async (eventId) => {
    // 1) Pending uscite at the specimen level (legacy/serialized assets)
    const { data: movements, error } = await supabase
      .from('material_movements')
      .select(`
        id, material_id, event_id, modalita, data_movimento, data_rientro_prevista,
        material:materials!material_movements_material_id_fkey(
          id, nome, codice_inventario, posizione_attuale, presso_utente_id,
          product:products(id, nome, codice, foto_url, brand:brands(id, nome))
        )
      `)
      .eq('event_id', eventId)
      .eq('tipo', 'uscita')
      .order('data_movimento', { ascending: false })
    if (error) return { data: [], error: error.message }

    const result = []
    const seenMaterials = new Set()
    for (const m of (movements || [])) {
      if (!m.material || m.material.posizione_attuale === 'in_magazzino') continue
      if (seenMaterials.has(m.material_id)) continue
      seenMaterials.add(m.material_id)
      result.push({ ...m, source: 'movement' })
    }

    // 2) Quantity-based pending returns from event_materials (no specimen tracked).
    //    Includes items shipped (or in_preparazione for non-shipping events) that
    //    require return per effective_rientro_richiesto and haven't been returned yet.
    const { data: emRows } = await supabase
      .from('event_materials')
      .select(`
        id, material_id, product_id, stato, quantita, quantita_approvata,
        rientro_richiesto, data_rientro,
        product:products(id, nome, codice, foto_url, serializzato, brand:brands(id, nome))
      `)
      .eq('event_id', eventId)
      .in('stato', ['spedito', 'in_preparazione'])
      .is('data_rientro', null)

    for (const em of (emRows || [])) {
      // Skip if a specimen movement already covers this row
      if (em.material_id && seenMaterials.has(em.material_id)) continue
      // Apply effective_rientro_richiesto rule
      const needsReturn = em.rientro_richiesto !== null && em.rientro_richiesto !== undefined
        ? em.rientro_richiesto === true
        : !!em.product?.serializzato
      if (!needsReturn) continue
      result.push({
        id: `em-${em.id}`,
        event_material_id: em.id,
        material_id: em.material_id || null,
        modalita: 'spedizione',
        data_movimento: null,
        data_rientro_prevista: null,
        // Synthesize a 'material'-like shape so the modal renders consistently
        material: {
          id: em.product?.id || em.product_id,
          nome: em.product?.nome,
          codice_inventario: em.product?.codice,
          quantita_attesa: em.quantita_approvata ?? em.quantita ?? 1,
          product: em.product,
        },
        source: 'event_material',
      })
    }
    return { data: result, error: null }
  },

  // Registra in batch i rientri per N materiali di un evento.
  // Two paths per row:
  //   - row.material_id present → legacy specimen path: insert material_movements 'rientro'
  //     and update materials.posizione_attuale.
  //   - row.material_id null + row.event_material_id present → quantity-based path:
  //     write back to event_materials (data_rientro, stato_rientro, quantità, note, foto).
  // rows: [{ material_id?, event_material_id?, stato_rientro, quantita_rientrata?, note_danni?, foto_danno_url?, modalita?, destinazione? ('magazzino'|'agente'), agente_id? }]
  registerBulkReturn: async (eventId, rows, responsabileId) => {
    if (!rows?.length) return { error: 'Nessuna riga da registrare', insertedCount: 0 }
    if (!responsabileId) return { error: 'Responsabile mancante', insertedCount: 0 }

    const dataMovimento = nowISO()
    const specimenRows = rows.filter(r => r.material_id)
    const eventMatRows = rows.filter(r => !r.material_id && r.event_material_id)

    let insertedCount = 0

    // Path 1 — specimen movements
    if (specimenRows.length > 0) {
      const movements = specimenRows.map(r => ({
        material_id: r.material_id,
        event_id: eventId,
        tipo: 'rientro',
        modalita: r.modalita || 'mano',
        da_posizione: 'presso_evento',
        a_posizione: r.destinazione === 'agente' ? 'magazzino_agente' : 'in_magazzino',
        data_movimento: dataMovimento,
        responsabile_id: responsabileId,
        stato_rientro: r.stato_rientro || 'integro',
        quantita_rientrata: r.quantita_rientrata ?? null,
        note_danni: r.note_danni || null,
        foto_danno_url: r.foto_danno_url || null,
      }))

      const { data: inserted, error: mvError } = await supabase
        .from('material_movements')
        .insert(movements)
        .select('id, material_id')
      if (mvError) return { error: mvError.message, insertedCount: 0 }
      insertedCount += inserted.length

      const updates = specimenRows.map(r => {
        const newPos = r.destinazione === 'agente' ? 'magazzino_agente' : 'in_magazzino'
        const patch = { posizione_attuale: newPos }
        if (r.destinazione === 'agente' && r.agente_id) patch.presso_utente_id = r.agente_id
        else patch.presso_utente_id = null
        return supabase.from('materials').update(patch).eq('id', r.material_id)
      })
      const results = await Promise.all(updates)
      const updateError = results.find(res => res.error)
      if (updateError?.error) {
        return { error: `Movimenti inseriti ma errore aggiornamento posizione: ${updateError.error.message}`, insertedCount }
      }
    }

    // Path 2 — event_materials quantity-based return (no specimen tracked)
    for (const r of eventMatRows) {
      const { error: emError } = await supabase
        .from('event_materials')
        .update({
          data_rientro: dataMovimento,
          stato_rientro: r.stato_rientro || 'integro',
          quantita_rientrata: r.quantita_rientrata ?? null,
          note_rientro: r.note_danni || null,
          foto_rientro_url: r.foto_danno_url || null,
        })
        .eq('id', r.event_material_id)
      if (emError) return { error: `Errore registrazione rientro item: ${emError.message}`, insertedCount }
      insertedCount++
    }

    return { error: null, insertedCount }
  },

  // Manda una notifica all'agente per sollecitare il rientro dei kit
  solicitaRientroAgente: async (agenteId, kitCount, giorniMax) => {
    if (!agenteId) return { error: 'Agente mancante' }
    const giornoBucket = todayISO()
    const gruppo = `sollecito_rientro_${agenteId}_${giornoBucket}`

    // Dedup giornaliero
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('gruppo', gruppo)
    if (count && count > 0) return { error: 'Sollecito già inviato oggi a questo agente' }

    const messaggio = giorniMax >= 60
      ? `Hai ${kitCount} ${kitCount === 1 ? 'kit' : 'kit'} fuori da oltre ${giorniMax} giorni. Riportali quando puoi al magazzino.`
      : `Hai ${kitCount} ${kitCount === 1 ? 'kit' : 'kit'} fuori. Verifica se puoi riportarli al magazzino.`

    const { error } = await supabase.from('notifications').insert({
      tipo: 'sollecito_rientro',
      titolo: 'Riporta il materiale demo',
      messaggio,
      link: '/materiale',
      link_label: 'Vedi i tuoi kit',
      entity_type: 'user',
      entity_id: agenteId,
      gruppo,
      user_id: agenteId,
    })
    return { error: error?.message || null }
  },

  }
})
