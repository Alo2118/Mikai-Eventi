import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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

/** Aggrega righe preventivo per evento: budget, approvato, effettivo + scostamento. */
export function aggregateByEvento(rows) {
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
      if (r.importo_effettivo != null) {
        agg.effettivo += r.importo_effettivo || 0
        agg.filled += 1
      }
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
    if (ids.length === 0) return { data: [], error: null }
    const { data, error } = await supabase
      .from('event_preventivi')
      .select('importo, importo_effettivo, stato, fornitore_nome, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(nome, cognome), evento:events!event_preventivi_event_id_fkey(id, titolo, tipo_evento, data_inizio, budget_previsto)')
      .in('event_id', ids)
    return { data: data || [], error: error?.message || null }
  },
}))
