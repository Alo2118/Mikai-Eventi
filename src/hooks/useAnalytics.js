import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { formatDateShort, nowISO, daysFromToday, subtractYearsISO } from '../lib/date-utils'
import { groupByMonth, aggregateEventCosts, percentDelta } from '../lib/analytics-utils'

export const useAnalyticsStore = create((set, get) => ({
  eventiPerStato: {},
  eventiPerTipo: {},
  budgetBreakdown: [],
  confermaRate: { confermati: 0, totale: 0 },
  attivitaInRitardo: { count: 0, trend: 0 },
  materialeFuori: { count: 0, items: [] },
  costMetrics: {
    eventiCount: 0, partecipantiTotale: 0, budgetTotale: 0, effettivoTotale: 0,
    costoMedioEvento: 0, costoPerPartecipante: 0, baseCosto: 'previsto',
  },
  perZona: [],
  perPromotore: [],
  confrontoYoY: null,
  loading: false,
  error: null,

  fetchKpiData: async (periodStart, periodEnd) => {
    set({ loading: true, error: null })
    try {
      const [stati, tipi, budgets, conferme, ritardi, materiali, aggregazioni, yoy] = await Promise.all([
        get().queryEventiPerStato(periodStart, periodEnd),
        get().queryEventiPerTipo(periodStart, periodEnd),
        get().queryBudgetBreakdown(periodStart, periodEnd),
        get().queryConfermaRate(periodStart, periodEnd),
        get().queryAttivitaInRitardo(periodStart, periodEnd),
        get().queryMaterialeFuori(),
        get().queryEventAggregations(periodStart, periodEnd),
        get().queryConfrontoYoY(periodStart, periodEnd),
      ])
      set({
        eventiPerStato: stati,
        eventiPerTipo: tipi,
        budgetBreakdown: budgets,
        confermaRate: conferme,
        attivitaInRitardo: ritardi,
        materialeFuori: materiali,
        costMetrics: aggregazioni.costMetrics,
        perZona: aggregazioni.perZona,
        perPromotore: aggregazioni.perPromotore,
        confrontoYoY: yoy,
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

  // Attività obbligatorie scadute nel periodo vs stesso periodo anno precedente (trend reale).
  queryAttivitaInRitardo: async (start, end) => {
    const now = nowISO()
    const countOverdueInWindow = async (from, to) => {
      if (!from || !to) return 0
      const { data, error } = await supabase
        .from('event_activities')
        .select('id')
        .in('stato', ['da_fare', 'in_corso'])
        .eq('obbligatoria', true)
        .gte('deadline', from).lte('deadline', to)
        .lt('deadline', now)
      if (error) throw error
      return (data || []).length
    }
    const [current, previous] = await Promise.all([
      countOverdueInWindow(start, end),
      countOverdueInWindow(subtractYearsISO(start, 1), subtractYearsISO(end, 1)),
    ])
    return { count: current, trend: current - previous }
  },

  // Costo medio/evento, costo/partecipante, aggregazioni per zona e promotore.
  queryEventAggregations: async (start, end) => {
    // Prima gli eventi del periodo (filtro server-side su data_inizio), poi i preventivi
    // limitati a quegli eventi: PostgREST non filtra su colonne in join, quindi scopare per
    // event_id evita il cap arbitrario (.limit(2000)) che con l'accumulo pluriennale poteva
    // sotto-contare i consuntivi. Sequenziale perché la seconda query dipende dagli eventIds.
    const evRes = await supabase.from('events')
      .select('id, budget_previsto, promotore:users!events_promotore_id_fkey(nome, cognome, zone:zones(nome)), promotore_agente:contacts!events_promotore_contact_id_fkey(nome, cognome, zone:zones(nome))')
      .gte('data_inizio', start).lte('data_inizio', end)
    if (evRes.error) throw evRes.error

    const events = evRes.data || []
    const eventIds = events.map(e => e.id)

    const effByEvent = {}
    if (eventIds.length) {
      const { data: effRows, error: effErr } = await supabase.from('event_preventivi')
        .select('importo_effettivo, event_id')
        .not('importo_effettivo', 'is', null)
        .in('event_id', eventIds)
      if (effErr) throw effErr
      for (const p of (effRows || [])) {
        effByEvent[p.event_id] = (effByEvent[p.event_id] || 0) + (Number(p.importo_effettivo) || 0)
      }
    }

    let partecipantiTotale = 0
    if (eventIds.length) {
      const { data: parts, error: pErr } = await supabase
        .from('event_participants').select('event_id').in('event_id', eventIds).limit(10000)
      if (pErr) throw pErr
      partecipantiTotale = (parts || []).length
    }
    return aggregateEventCosts(events, effByEvent, partecipantiTotale)
  },

  // Confronto eventi e budget del periodo vs stesso periodo anno precedente.
  queryConfrontoYoY: async (start, end) => {
    const prevStart = subtractYearsISO(start, 1)
    const prevEnd = subtractYearsISO(end, 1)
    const [curr, prev] = await Promise.all([
      supabase.from('events').select('budget_previsto').gte('data_inizio', start).lte('data_inizio', end),
      supabase.from('events').select('budget_previsto').gte('data_inizio', prevStart).lte('data_inizio', prevEnd),
    ])
    if (curr.error) throw curr.error
    if (prev.error) throw prev.error
    const sumBudget = rows => (rows || []).reduce((s, r) => s + (Number(r.budget_previsto) || 0), 0)
    const eventiCorrente = (curr.data || []).length
    const eventiPrecedente = (prev.data || []).length
    const budgetCorrente = sumBudget(curr.data)
    const budgetPrecedente = sumBudget(prev.data)
    return {
      prevStart, prevEnd,
      eventiCorrente, eventiPrecedente,
      deltaEventi: eventiCorrente - eventiPrecedente,
      deltaEventiPct: percentDelta(eventiCorrente, eventiPrecedente),
      budgetCorrente, budgetPrecedente,
      deltaBudget: budgetCorrente - budgetPrecedente,
      deltaBudgetPct: percentDelta(budgetCorrente, budgetPrecedente),
    }
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
