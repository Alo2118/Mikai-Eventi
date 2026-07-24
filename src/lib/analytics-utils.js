// Pure aggregation helpers for the analytics store (no Supabase, no side effects).

export function toMonthKey(dateStr) {
  if (!dateStr) return null
  return dateStr.slice(0, 7)
}

export function groupByMonth(items, dateExtractor, valueExtractor) {
  const result = {}
  for (const item of items) {
    const key = toMonthKey(dateExtractor(item))
    if (!key) continue
    result[key] = (result[key] || 0) + (valueExtractor(item) || 0)
  }
  return result
}

// Costo medio/evento, costo/partecipante e aggregazioni per zona e promotore.
// Preferisce il consuntivo (effettivo) quando presente, altrimenti il budget previsto.
export function aggregateEventCosts(events, effByEvent, partecipantiTotale) {
  const zonaMap = {}, promMap = {}
  let budgetTotale = 0, effettivoTotale = 0
  for (const e of events) {
    const budget = Number(e.budget_previsto) || 0
    const eff = effByEvent[e.id] || 0
    budgetTotale += budget
    effettivoTotale += eff

    const zona = e.promotore?.zone?.nome || e.promotore_agente?.zone?.nome || 'Senza zona'
    const zEntry = zonaMap[zona] || (zonaMap[zona] = { zona, eventi: 0, budget: 0, effettivo: 0 })
    zEntry.eventi += 1; zEntry.budget += budget; zEntry.effettivo += eff

    const prom = e.promotore ? `${e.promotore.nome} ${e.promotore.cognome}`
      : e.promotore_agente ? `${e.promotore_agente.nome} ${e.promotore_agente.cognome}` : 'Non assegnato'
    const pEntry = promMap[prom] || (promMap[prom] = { promotore: prom, eventi: 0, budget: 0, effettivo: 0 })
    pEntry.eventi += 1; pEntry.budget += budget; pEntry.effettivo += eff
  }

  const eventiCount = events.length
  const costoBase = effettivoTotale > 0 ? effettivoTotale : budgetTotale
  const costMetrics = {
    eventiCount,
    partecipantiTotale,
    budgetTotale,
    effettivoTotale,
    costoMedioEvento: eventiCount ? Math.round(costoBase / eventiCount) : 0,
    costoPerPartecipante: partecipantiTotale ? Math.round(costoBase / partecipantiTotale) : 0,
    baseCosto: effettivoTotale > 0 ? 'consuntivo' : 'previsto',
  }
  const byBudgetDesc = (a, b) => b.budget - a.budget
  return {
    costMetrics,
    perZona: Object.values(zonaMap).sort(byBudgetDesc),
    perPromotore: Object.values(promMap).sort(byBudgetDesc),
  }
}

// Variazione percentuale periodo-su-periodo (gestisce il divisore zero).
export function percentDelta(current, previous) {
  if (previous > 0) return Math.round(((current - previous) / previous) * 100)
  return current > 0 ? 100 : 0
}
