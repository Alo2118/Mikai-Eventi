import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { todayISO, subtractDays } from '../lib/date-utils'
import { computeMaterialMetrics } from '../lib/material-analytics'

export const useMaterialAnalyticsStore = create((set) => ({
  logisticsTimeline: [],
  overdueReturns: [],
  materialAnalytics: null,
  upcomingBookings: [],
  timelineLoading: false,
  overdueLoading: false,
  analyticsLoading: false,
  error: null,

  fetchLogisticsTimeline: async () => {
    set({ timelineLoading: true, error: null })
    const [emRes, etRes] = await Promise.all([
      supabase
        .from('event_materials')
        .select(`
          *,
          evento:events!event_materials_event_id_fkey(id, titolo, data_inizio, data_fine, stato, tipo_evento, indirizzo_spedizione, data_spedizione_prevista),
          materiale:materials!event_materials_material_id_fkey(id, nome, codice_inventario),
          product:products!event_materials_product_id_fkey(id, nome, codice, tipo, brand:brands(id, nome))
        `)
        .in('stato', ['approvato', 'in_preparazione'])
        .order('data_richiesta', { ascending: true })
        .limit(200),
      supabase.from('event_types').select('codice, richiede_spedizione'),
    ])

    if (emRes.error) {
      set({ logisticsTimeline: [], timelineLoading: false, error: emRes.error.message })
      return { data: [], error: emRes.error }
    }

    const noShipTypes = new Set(
      (etRes.data || []).filter(t => t.richiede_spedizione === false).map(t => t.codice)
    )
    const closedStates = new Set(['concluso', 'cancellato', 'rifiutato'])
    const filtered = (emRes.data || []).filter(em => {
      if (!em.evento) return false
      if (closedStates.has(em.evento.stato)) return false
      if (em.evento.tipo_evento && noShipTypes.has(em.evento.tipo_evento)) return false
      return true
    })

    set({ logisticsTimeline: filtered, timelineLoading: false, error: null })
    return { data: filtered, error: null }
  },

  fetchOverdueReturns: async () => {
    set({ overdueLoading: true, error: null })
    const today = todayISO()
    const [movRes, emRes] = await Promise.all([
      supabase
        .from('material_movements')
        .select(`
          *,
          materiale:materials!material_movements_material_id_fkey(id, nome, codice_inventario, posizione_attuale),
          evento:events!material_movements_event_id_fkey(id, titolo, data_fine),
          responsabile:users!material_movements_responsabile_id_fkey(id, nome, cognome)
        `)
        .eq('tipo', 'uscita')
        .not('data_rientro_prevista', 'is', null)
        .lt('data_rientro_prevista', today)
        .order('data_rientro_prevista', { ascending: true })
        .limit(200),
      // Quantity-based overdue: shipped item, no data_rientro yet, event already past data_fine
      supabase
        .from('event_materials')
        .select(`
          id, material_id, product_id, stato, rientro_richiesto, data_rientro,
          product:products!event_materials_product_id_fkey(id, nome, codice, serializzato),
          evento:events!event_materials_event_id_fkey(id, titolo, data_fine, stato)
        `)
        .in('stato', ['spedito', 'in_preparazione'])
        .is('data_rientro', null)
        .limit(200),
    ])

    if (movRes.error) {
      set({ overdueReturns: [], overdueLoading: false, error: movRes.error.message })
      return { data: [], error: movRes.error }
    }

    const overdue = []
    const seenMatByEvent = new Set()
    for (const m of (movRes.data || [])) {
      if (!m.materiale || m.materiale.posizione_attuale === 'in_magazzino') continue
      overdue.push(m)
      if (m.material_id && m.event_id) seenMatByEvent.add(`${m.event_id}-${m.material_id}`)
    }

    if (!emRes.error) {
      for (const em of (emRes.data || [])) {
        const dataFine = em.evento?.data_fine
        if (!dataFine || dataFine >= today) continue // not yet due
        const needsReturn = em.rientro_richiesto !== null && em.rientro_richiesto !== undefined
          ? em.rientro_richiesto === true
          : !!em.product?.serializzato
        if (!needsReturn) continue
        if (em.material_id && em.evento?.id && seenMatByEvent.has(`${em.evento.id}-${em.material_id}`)) continue
        overdue.push({
          id: `em-${em.id}`,
          event_material_id: em.id,
          materiale: em.product
            ? { id: em.product.id, nome: em.product.nome, codice_inventario: em.product.codice }
            : null,
          evento: em.evento,
          data_rientro_prevista: dataFine,
          source: 'event_material',
        })
      }
    }

    set({ overdueReturns: overdue, overdueLoading: false, error: null })
    return { data: overdue, error: null }
  },

  fetchMaterialAnalytics: async () => {
    set({ analyticsLoading: true, error: null })
    try {
      const oneYearAgo = subtractDays(todayISO(), 365)

      const [usage, movements, fuori] = await Promise.all([
        supabase.from('event_materials').select('material_id, product_id, data_richiesta')
          .gte('data_richiesta', oneYearAgo),
        supabase.from('material_movements')
          .select('material_id, tipo, data_movimento, data_rientro_prevista')
          .in('tipo', ['uscita', 'rientro'])
          .gte('data_movimento', oneYearAgo)
          .order('data_movimento'),
        supabase.from('materials')
          .select('id, nome, codice_inventario, posizione_attuale')
          .neq('posizione_attuale', 'in_magazzino').eq('attivo', true),
      ])

      if (usage.error || movements.error || fuori.error) {
        set({ analyticsLoading: false })
        return
      }

      const analytics = computeMaterialMetrics(
        usage.data || [], movements.data || [], fuori.data || []
      )
      set({ materialAnalytics: analytics, analyticsLoading: false })
      return analytics
    } catch (error) {
      set({ analyticsLoading: false, error: error?.message || 'Errore caricamento analytics' })
      return null
    }
  },

  fetchUpcomingBookings: async () => {
    const { data } = await supabase
      .from('event_materials')
      .select(`
        material_id, product_id, data_inizio_utilizzo, data_fine_utilizzo,
        material:materials(nome, codice_inventario),
        product:products(nome, codice),
        evento:events!event_materials_event_id_fkey(id, titolo)
      `)
      .gte('data_fine_utilizzo', todayISO())
      .neq('stato', 'rifiutato')
      .order('data_inizio_utilizzo')
      .limit(20)
    set({ upcomingBookings: data || [] })
    return data || []
  },

  // Fabbisogno: aggregate material demand across active events
  fabbisogno: [],
  fabbisognoLoading: false,

  fetchFabbisogno: async (filters = {}) => {
    set({ fabbisognoLoading: true })
    let query = supabase
      .from('event_materials')
      .select(`
        id, quantita, quantita_approvata, stato, data_inizio_utilizzo, data_fine_utilizzo,
        product:products!event_materials_product_id_fkey(id, nome, codice, tipo, quantita_disponibile, brand:brands(id, nome)),
        evento:events!event_materials_event_id_fkey(id, titolo, data_inizio, data_fine, stato, tipo_evento, modalita)
      `)
      .neq('stato', 'rifiutato')

    // Filter by event status: only active events by default
    const activeStati = ['confermato', 'in_preparazione', 'pronto', 'in_corso']
    if (filters.includiProposti) activeStati.push('proposto')

    // Date filter
    if (filters.da) {
      query = query.gte('data_inizio_utilizzo', filters.da)
    }
    if (filters.a) {
      query = query.lte('data_inizio_utilizzo', filters.a)
    }

    const { data, error } = await query.order('data_inizio_utilizzo')

    if (error) {
      set({ fabbisognoLoading: false })
      return { data: [], error: error.message }
    }

    // Filter by event stato in-memory (PostgREST can't filter on FK fields)
    const filtered = (data || []).filter(r => r.evento && activeStati.includes(r.evento.stato))

    // Aggregate by product
    const byProduct = {}
    for (const row of filtered) {
      const productId = row.product?.id
      if (!productId) continue

      if (!byProduct[productId]) {
        byProduct[productId] = {
          product: row.product,
          totaleRichiesto: 0,
          totaleApprovato: 0,
          richiesti: 0,
          approvati: 0,
          inPreparazione: 0,
          spediti: 0,
          eventi: new Set(),
          dettaglio: [],
        }
      }
      const agg = byProduct[productId]
      agg.totaleRichiesto += row.quantita || 1
      agg.totaleApprovato += row.quantita_approvata || 0
      if (row.stato === 'richiesto') agg.richiesti += row.quantita || 1
      if (row.stato === 'approvato') agg.approvati += row.quantita_approvata || row.quantita || 1
      if (row.stato === 'in_preparazione') agg.inPreparazione += row.quantita_approvata || row.quantita || 1
      if (row.stato === 'spedito') agg.spediti += row.quantita_approvata || row.quantita || 1
      agg.eventi.add(row.evento.id)
      agg.dettaglio.push({
        eventoId: row.evento.id,
        eventoTitolo: row.evento.titolo,
        eventoData: row.evento.data_inizio,
        quantita: row.quantita || 1,
        quantitaApprovata: row.quantita_approvata,
        stato: row.stato,
      })
    }

    // Convert Sets to counts and sort by total requested desc
    const result = Object.values(byProduct)
      .map(p => ({ ...p, eventiCount: p.eventi.size, eventi: undefined }))
      .sort((a, b) => b.totaleRichiesto - a.totaleRichiesto)

    set({ fabbisogno: result, fabbisognoLoading: false })
    return { data: result, error: null }
  },
}))
