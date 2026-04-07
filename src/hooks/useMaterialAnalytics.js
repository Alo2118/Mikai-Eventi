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
    const { data, error } = await supabase
      .from('event_materials')
      .select(`
        *,
        evento:events!event_materials_event_id_fkey(id, titolo, data_inizio, data_fine, stato, indirizzo_spedizione, data_spedizione_prevista),
        materiale:materials!event_materials_material_id_fkey(id, nome, codice_inventario),
        product:products!event_materials_product_id_fkey(id, nome, codice, tipo, brand:brands(id, nome))
      `)
      .in('stato', ['approvato', 'in_preparazione'])
      .order('data_richiesta', { ascending: true })
      .limit(200)
    set({ logisticsTimeline: data || [], timelineLoading: false, error: error?.message || null })
    return { data: data || [], error }
  },

  fetchOverdueReturns: async () => {
    set({ overdueLoading: true, error: null })
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
      .lt('data_rientro_prevista', todayISO())
      .order('data_rientro_prevista', { ascending: true })
      .limit(200)
    const overdue = (data || []).filter(m =>
      m.materiale && m.materiale.posizione_attuale !== 'in_magazzino'
    )
    set({ overdueReturns: overdue, overdueLoading: false, error: error?.message || null })
    return { data: overdue, error }
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
}))
