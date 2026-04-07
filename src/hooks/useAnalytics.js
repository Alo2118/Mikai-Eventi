import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { formatDateShort, nowISO, daysFromToday } from '../lib/date-utils'

function toMonthKey(dateStr) {
  if (!dateStr) return null
  return dateStr.slice(0, 7)
}

function groupByMonth(items, dateExtractor, valueExtractor) {
  const result = {}
  for (const item of items) {
    const key = toMonthKey(dateExtractor(item))
    if (!key) continue
    result[key] = (result[key] || 0) + (valueExtractor(item) || 0)
  }
  return result
}

export const useAnalyticsStore = create((set, get) => ({
  eventiPerStato: {},
  eventiPerTipo: {},
  budgetBreakdown: [],
  confermaRate: { confermati: 0, totale: 0 },
  attivitaInRitardo: { count: 0, trend: 0 },
  materialeFuori: { count: 0, items: [] },
  loading: false,
  error: null,

  fetchKpiData: async (periodStart, periodEnd) => {
    set({ loading: true, error: null })
    try {
      const [stati, tipi, budgets, conferme, ritardi, materiali] = await Promise.all([
        get().queryEventiPerStato(periodStart, periodEnd),
        get().queryEventiPerTipo(periodStart, periodEnd),
        get().queryBudgetBreakdown(periodStart, periodEnd),
        get().queryConfermaRate(periodStart, periodEnd),
        get().queryAttivitaInRitardo(),
        get().queryMaterialeFuori(),
      ])
      set({
        eventiPerStato: stati,
        eventiPerTipo: tipi,
        budgetBreakdown: budgets,
        confermaRate: conferme,
        attivitaInRitardo: ritardi,
        materialeFuori: materiali,
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: 'Errore nel caricamento dei dati analytics.' })
    }
  },

  queryEventiPerStato: async (start, end) => {
    const { data, error } = await supabase
      .from('events').select('stato')
      .gte('data_inizio', start).lte('data_inizio', end)
    if (error) throw error
    return (data || []).reduce((acc, e) => {
      acc[e.stato] = (acc[e.stato] || 0) + 1
      return acc
    }, {})
  },

  queryEventiPerTipo: async (start, end) => {
    const { data, error } = await supabase
      .from('events').select('tipo_evento')
      .gte('data_inizio', start).lte('data_inizio', end)
    if (error) throw error
    return (data || []).reduce((acc, e) => {
      acc[e.tipo_evento] = (acc[e.tipo_evento] || 0) + 1
      return acc
    }, {})
  },

  queryBudgetBreakdown: async (start, end) => {
    const [eventsRes, prevRes, effRes] = await Promise.all([
      supabase.from('events')
        .select('data_inizio, budget_previsto')
        .gte('data_inizio', start).lte('data_inizio', end),
      supabase.from('event_preventivi')
        .select('importo, evento:events!event_preventivi_event_id_fkey(data_inizio)')
        .eq('stato', 'approvato')
        .limit(2000),
      supabase.from('event_preventivi')
        .select('importo_effettivo, evento:events!event_preventivi_event_id_fkey(data_inizio)')
        .not('importo_effettivo', 'is', null)
        .limit(2000),
    ])
    if (eventsRes.error) throw eventsRes.error
    if (prevRes.error) throw prevRes.error
    if (effRes.error) throw effRes.error

    const previstoByMonth = groupByMonth(
      eventsRes.data || [], e => e.data_inizio, e => e.budget_previsto
    )

    const approvatoRaw = (prevRes.data || []).filter(
      p => p.evento?.data_inizio && p.evento.data_inizio >= start && p.evento.data_inizio <= end
    )
    const approvatoByMonth = groupByMonth(
      approvatoRaw, p => p.evento?.data_inizio, p => p.importo
    )

    const effettivoRaw = (effRes.data || []).filter(
      p => p.evento?.data_inizio && p.evento.data_inizio >= start && p.evento.data_inizio <= end
    )
    const effettivoByMonth = groupByMonth(
      effettivoRaw, p => p.evento?.data_inizio, p => p.importo_effettivo
    )

    const allMonths = new Set([
      ...Object.keys(previstoByMonth),
      ...Object.keys(approvatoByMonth),
      ...Object.keys(effettivoByMonth),
    ])

    return [...allMonths].sort().map(mese => ({
      mese,
      meseLabel: formatDateShort(`${mese}-01`),
      previsto: previstoByMonth[mese] || 0,
      approvato: approvatoByMonth[mese] || 0,
      effettivo: effettivoByMonth[mese] || 0,
    }))
  },

  queryConfermaRate: async (start, end) => {
    const { data, error } = await supabase
      .from('event_participants')
      .select('stato_iscrizione, evento:events!event_participants_event_id_fkey(data_inizio)')
      .limit(5000)
    if (error) throw error
    const filtered = (data || []).filter(
      p => p.evento?.data_inizio && p.evento.data_inizio >= start && p.evento.data_inizio <= end
    )
    const confermati = filtered.filter(
      p => ['confermato', 'presente'].includes(p.stato_iscrizione)
    ).length
    return { confermati, totale: filtered.length }
  },

  queryAttivitaInRitardo: async () => {
    const { data, error } = await supabase
      .from('event_activities')
      .select('id')
      .in('stato', ['da_fare', 'in_corso'])
      .eq('obbligatoria', true)
      .lt('deadline', nowISO())
    if (error) throw error
    return { count: (data || []).length, trend: 0 }
  },

  queryMaterialeFuori: async () => {
    const { data: fuori, error: fuoriErr } = await supabase
      .from('materials')
      .select('id, nome, codice_inventario, posizione_attuale')
      .neq('posizione_attuale', 'in_magazzino')
      .eq('attivo', true)
    if (fuoriErr) throw fuoriErr
    if (!fuori?.length) return { count: 0, items: [] }

    const ids = fuori.map(m => m.id)
    const { data: movements, error: movErr } = await supabase
      .from('material_movements')
      .select('material_id, data_movimento')
      .in('material_id', ids)
      .eq('tipo', 'uscita')
      .order('data_movimento', { ascending: false })
    if (movErr) throw movErr

    const lastOut = {}
    for (const m of (movements || [])) {
      if (!lastOut[m.material_id]) lastOut[m.material_id] = m.data_movimento
    }

    const items = fuori.map(m => ({
      ...m,
      giorniFuori: lastOut[m.id] ? daysFromToday(lastOut[m.id]) : null,
    }))
      .sort((a, b) => (b.giorniFuori || 0) - (a.giorniFuori || 0))
      .slice(0, 5)

    return { count: fuori.length, items }
  },
}))
