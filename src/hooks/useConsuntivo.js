import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { richiedeHotel, richiedeTrasporti } from '../lib/event-flow'

/**
 * Calcola scostamento e semaforo del consuntivo di un evento.
 * riferimento = costo effettivo se disponibile, altrimenti il preventivato approvato.
 * Il semaforo confronta il riferimento con il budget previsto:
 *   verde = entro budget, giallo = sforamento fino al 10%, rosso = oltre il 10%.
 * Senza budget previsto non c'è base di confronto → semaforo 'gray'.
 */
export function computeScostamento({ budget = 0, approvato = 0, effettivo = 0, hasEffettivo = false }) {
  const riferimento = hasEffettivo ? effettivo : approvato
  const base = budget > 0 ? budget : null
  if (base == null) {
    return { scostamento: null, scostamentoPct: null, semaforo: 'gray', riferimento }
  }
  const scostamento = riferimento - base
  const scostamentoPct = (scostamento / base) * 100
  let semaforo = 'green'
  if (scostamentoPct > 10) semaforo = 'red'
  else if (scostamentoPct > 0) semaforo = 'yellow'
  return { scostamento, scostamentoPct, semaforo, riferimento }
}

/**
 * Aggrega righe preventivo per evento: budget, approvato, effettivo + scostamento.
 * `trasferte` (opzionale) = { costs, hotels, trasporti, eventTypesByCodice } per includere
 * nel "costo effettivo" anche le voci manuali (event_costs) e le trasferte (hotel/trasporti),
 * coerentemente con la ripartizione del budget effettivo mostrata nel tab Costi.
 * Il branching per tipo evento (richiedeHotel/richiedeTrasporti) è applicato via eventTypesByCodice.
 */
export function aggregateByEvento(rows, trasferte = null) {
  const map = new Map()
  for (const r of rows) {
    const ev = r.evento
    if (!ev?.id) continue
    if (!map.has(ev.id)) {
      map.set(ev.id, {
        id: ev.id,
        titolo: ev.titolo,
        tipo_evento: ev.tipo_evento,
        data_inizio: ev.data_inizio,
        budget: ev.budget_previsto || 0,
        approvato: 0,
        effettivo: 0,
        filled: 0,
        count: 0,
      })
    }
    const agg = map.get(ev.id)
    agg.count += 1
    if (r.stato === 'approvato') {
      agg.approvato += r.importo || 0
      // "Effettivo" valorizza i preventivi approvati come il tab Costi (cost-breakdown.js):
      // consuntivo se presente, altrimenti l'importo approvato. Così un preventivo approvato
      // senza consuntivo pesa comunque nell'effettivo invece di valere 0.
      agg.effettivo += r.importo_effettivo != null ? r.importo_effettivo : (r.importo || 0)
      agg.filled += 1
    }
  }

  if (trasferte) {
    const { costs = [], hotels = [], trasporti = [], eventTypesByCodice = {} } = trasferte
    for (const c of costs) {
      const agg = map.get(c.event_id)
      if (!agg) continue
      const imp = c.importo_effettivo != null ? c.importo_effettivo : (c.importo_previsto || 0)
      if (imp) { agg.effettivo += imp; agg.filled += 1 }
    }
    for (const h of hotels) {
      const agg = map.get(h.event_id)
      if (!agg || h.stato === 'non_necessario' || !h.costo) continue
      if (richiedeHotel(eventTypesByCodice[agg.tipo_evento])) { agg.effettivo += h.costo; agg.filled += 1 }
    }
    for (const t of trasporti) {
      const agg = map.get(t.event_id)
      if (!agg || t.stato === 'non_necessario' || !t.costo) continue
      if (richiedeTrasporti(eventTypesByCodice[agg.tipo_evento])) { agg.effettivo += t.costo; agg.filled += 1 }
    }
  }

  return Array.from(map.values()).map(a => ({
    ...a,
    ...computeScostamento({
      budget: a.budget,
      approvato: a.approvato,
      effettivo: a.effettivo,
      hasEffettivo: a.filled > 0,
    }),
  }))
}

/** Aggrega righe preventivo approvate per fornitore: approvato, effettivo, delta. */
export function aggregateByFornitore(rows) {
  const map = new Map()
  for (const r of rows) {
    if (r.stato !== 'approvato') continue
    const nome = r.fornitore_ref?.nome
      ? `${r.fornitore_ref.nome} ${r.fornitore_ref.cognome || ''}`.trim()
      : (r.fornitore_nome || 'Senza fornitore')
    if (!map.has(nome)) map.set(nome, { fornitore: nome, approvato: 0, effettivo: 0, count: 0 })
    const agg = map.get(nome)
    agg.approvato += r.importo || 0
    agg.effettivo += r.importo_effettivo || 0
    agg.count += 1
  }
  return Array.from(map.values()).map(a => ({ ...a, delta: a.effettivo - a.approvato }))
}

export const useConsuntivoStore = create(() => ({
  /**
   * Righe preventivo (con evento + fornitore) nel periodo, per il report consuntivo.
   * PostgREST non filtra su colonne di tabelle in join → prima ricaviamo gli id degli
   * eventi nel periodo (filtro server-side su data_inizio), poi carichiamo solo i
   * preventivi collegati. Così scarichiamo il minimo indispensabile invece di tutti i
   * preventivi. Ritorna sempre { data, error } con error stringa umana (come useCosts).
   */
  fetchConsuntivoData: async (periodStart, periodEnd) => {
    let eventsQuery = supabase.from('events').select('id').not('data_inizio', 'is', null)
    if (periodStart) eventsQuery = eventsQuery.gte('data_inizio', periodStart)
    if (periodEnd) eventsQuery = eventsQuery.lte('data_inizio', periodEnd)
    const { data: eventRows, error: eventsError } = await eventsQuery
    if (eventsError) return { data: [], error: eventsError.message }
    const ids = (eventRows || []).map(e => e.id)
    if (ids.length === 0) return { data: [], trasferte: { costs: [], hotels: [], trasporti: [] }, error: null }
    // Preventivi + voci di costo manuali + trasferte (hotel/trasporti), tutti filtrati
    // server-side sugli id degli eventi nel periodo. Le trasferte alimentano il "costo
    // effettivo" del report, coerentemente col tab Costi.
    const [prevRes, costsRes, hotelRes, trasportiRes] = await Promise.all([
      supabase
        .from('event_preventivi')
        .select('importo, importo_effettivo, stato, fornitore_nome, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(nome, cognome), evento:events!event_preventivi_event_id_fkey(id, titolo, tipo_evento, data_inizio, budget_previsto)')
        .in('event_id', ids),
      supabase.from('event_costs').select('event_id, source_tipo, importo_previsto, importo_effettivo').in('event_id', ids),
      supabase.from('event_hotel').select('event_id, stato, costo').in('event_id', ids),
      supabase.from('event_trasporti').select('event_id, stato, costo').in('event_id', ids),
    ])
    const error = prevRes.error || costsRes.error || hotelRes.error || trasportiRes.error
    return {
      data: prevRes.data || [],
      trasferte: {
        costs: costsRes.data || [],
        hotels: hotelRes.data || [],
        trasporti: trasportiRes.data || [],
      },
      error: error?.message || null,
    }
  },
}))
