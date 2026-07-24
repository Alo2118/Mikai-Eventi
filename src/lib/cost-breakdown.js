// Ripartizione dei costi effettivi di un evento per categoria.
//
// Il "budget effettivo" non è più solo la somma dei preventivi approvati: aggrega
// a read-time (senza persistere doppioni in event_costs) tutte le fonti reali:
//   - preventivi approvati (importo_effettivo se presente, altrimenti importo)
//   - voci manuali event_costs (raggruppate per source_tipo)
//   - ospitalità derivata da event_hotel.costo
//   - trasporti derivati da event_trasporti.costo
//
// Il branching per tipo evento (richiedeHotel / richiedeTrasporti) è applicato dal
// chiamante passando hotelTracked / trasportiTracked: se il tipo non prevede
// ospitalità/trasporti quei costi non entrano nel totale.

// cost_source enum (event_costs.source_tipo) → chiave categoria di visualizzazione.
const SOURCE_TO_CATEGORY = {
  sub_activity: 'catering',
  materiale: 'materiale',
  logistics: 'ospitalita',
  sponsorizzazione: 'altro',
  iscrizioni: 'altro',
  desk: 'altro',
  gadget: 'altro',
  altro: 'altro',
}

// Ordine fisso delle righe del riepilogo.
export const COST_CATEGORY_ORDER = ['preventivi', 'ospitalita', 'trasporti', 'materiale', 'catering', 'altro']

function importoEffettivoCost(c) {
  if (c.importo_effettivo != null) return c.importo_effettivo
  if (c.importo_previsto != null) return c.importo_previsto
  return 0
}

/**
 * @returns { categorie: {preventivi, ospitalita, trasporti, materiale, catering, altro}, totale }
 */
export function computeCostBreakdown({
  preventivi = [],
  costs = [],
  hotels = [],
  trasporti = [],
  hotelTracked = true,
  trasportiTracked = true,
} = {}) {
  const categorie = { preventivi: 0, ospitalita: 0, trasporti: 0, materiale: 0, catering: 0, altro: 0 }

  for (const p of preventivi) {
    if (p.stato !== 'approvato') continue
    categorie.preventivi += p.importo_effettivo != null ? p.importo_effettivo : (p.importo || 0)
  }

  for (const c of costs) {
    const key = SOURCE_TO_CATEGORY[c.source_tipo] || 'altro'
    categorie[key] += importoEffettivoCost(c)
  }

  if (hotelTracked) {
    for (const h of hotels) {
      if (h.stato === 'non_necessario') continue
      categorie.ospitalita += h.costo || 0
    }
  }

  if (trasportiTracked) {
    for (const t of trasporti) {
      if (t.stato === 'non_necessario') continue
      categorie.trasporti += t.costo || 0
    }
  }

  const totale = COST_CATEGORY_ORDER.reduce((s, k) => s + categorie[k], 0)
  return { categorie, totale }
}
