import { daysFromToday, daysBetween, todayISO, formatDate } from './date-utils'

export const GROUP_MAIN = [
  { id: null, label: 'Tutti' },
  { id: 'tipo', label: 'Per ruolo' },
  { id: 'trasporto', label: 'Per trasporto' },
]

export const GROUP_MORE = [
  { id: 'tavolo', label: 'Per tavolo' },
  { id: 'zona', label: 'Per zona' },
]

export const ISCRIZIONE_CYCLE = {
  invitato: 'confermato',
  confermato: 'presente',
  presente: 'invitato',
  assente: 'invitato',
}

export const personKey = (p) => `${p.type}-${p.id}`

export function getPersonTavolo(person, tavoli) {
  for (const t of tavoli) {
    if (person.type === 'staff') {
      if ((t.formatori || []).some(f => f.staff?.user_id === person.id)) return t
    } else {
      if ((t.discenti || []).some(d => d.participant?.contact_id === person.id)) return t
    }
  }
  return null
}

export function sortLegs(legs) {
  return legs.sort((a, b) => {
    if (a.orario && b.orario) return a.orario < b.orario ? -1 : a.orario > b.orario ? 1 : 0
    if (a.orario) return -1
    if (b.orario) return 1
    return (a.ordine || 1) - (b.ordine || 1)
  })
}

// --- Raggruppamenti tab "Rientri" (Logistica) ---

export const GROUP_RIENTRI = [
  { id: 'urgenza', label: 'Per urgenza' },
  { id: 'evento', label: 'Per evento' },
  { id: 'responsabile', label: 'Per responsabile' },
  { id: 'flat', label: 'Lista piatta' },
]

function daysOverdue(item) {
  return item && item.data_rientro_prevista ? daysFromToday(item.data_rientro_prevista) : 0
}

function byDaysOverdueDesc(a, b) {
  return daysOverdue(b) - daysOverdue(a)
}

function compareIso(a, b) {
  const da = a || ''
  const db = b || ''
  return da < db ? -1 : da > db ? 1 : 0
}

// Trasforma l'array piatto di overdueReturns in gruppi { key, label, sublabel?, count, accent?, items }.
// Funzione pura: non muta `returns`. Con array vuoto/non-array → [].
export function groupReturns(returns, groupBy) {
  const items = Array.isArray(returns) ? returns.slice() : []
  if (items.length === 0) return []

  if (groupBy === 'urgenza') {
    const alta = items.filter(i => daysOverdue(i) >= 7).sort(byDaysOverdueDesc)
    const bassa = items.filter(i => daysOverdue(i) < 7).sort(byDaysOverdueDesc)
    const groups = []
    if (alta.length) groups.push({ key: '_urg_alta', label: 'Molto in ritardo (7+ giorni)', accent: 'red', count: alta.length, items: alta })
    if (bassa.length) groups.push({ key: '_urg_bassa', label: 'In ritardo (meno di 7 giorni)', accent: 'yellow', count: bassa.length, items: bassa })
    return groups
  }

  if (groupBy === 'evento') {
    const map = new Map()
    let senzaEvento = null
    for (const it of items) {
      const ev = it.evento
      if (!ev || !ev.id) {
        if (!senzaEvento) senzaEvento = { key: '_no_evento', label: 'Senza evento', sublabel: null, count: 0, items: [], _dataFine: null }
        senzaEvento.items.push(it)
        continue
      }
      let g = map.get(ev.id)
      if (!g) {
        g = {
          key: `ev-${ev.id}`,
          label: ev.titolo || 'Evento senza titolo',
          sublabel: ev.data_fine ? `Concluso il ${formatDate(ev.data_fine)}` : null,
          count: 0,
          items: [],
          _dataFine: ev.data_fine || null,
        }
        map.set(ev.id, g)
      }
      g.items.push(it)
    }
    const groups = Array.from(map.values()).sort((a, b) => compareIso(a._dataFine, b._dataFine))
    if (senzaEvento) groups.push(senzaEvento)
    for (const g of groups) { g.items.sort(byDaysOverdueDesc); g.count = g.items.length; delete g._dataFine }
    return groups
  }

  if (groupBy === 'responsabile') {
    const map = new Map()
    let senzaResp = null
    for (const it of items) {
      const r = it.responsabile
      if (!r || (r.id == null && !r.nome && !r.cognome)) {
        if (!senzaResp) senzaResp = { key: '_no_resp', label: 'Senza responsabile', count: 0, items: [] }
        senzaResp.items.push(it)
        continue
      }
      const mapKey = r.id != null ? `resp-${r.id}` : `resp-${r.nome || ''} ${r.cognome || ''}`
      let g = map.get(mapKey)
      if (!g) {
        g = { key: mapKey, label: `${r.nome || ''} ${r.cognome || ''}`.trim() || 'Responsabile', count: 0, items: [] }
        map.set(mapKey, g)
      }
      g.items.push(it)
    }
    const groups = Array.from(map.values()).sort((a, b) => (b.items.length - a.items.length) || a.label.localeCompare(b.label, 'it'))
    if (senzaResp) groups.push(senzaResp)
    for (const g of groups) { g.items.sort(byDaysOverdueDesc); g.count = g.items.length }
    return groups
  }

  // 'flat' e qualsiasi valore sconosciuto → gruppo unico senza header, ordinato per data rientro prevista ↑
  const sorted = items.sort((a, b) => compareIso(a.data_rientro_prevista, b.data_rientro_prevista))
  return [{ key: '_all', label: null, count: sorted.length, items: sorted }]
}

// --- Raggruppamenti tab "Hotel & Trasporti" (Logistica) ---

export const GROUP_PRENOTAZIONI = [
  { id: 'urgenza', label: 'Per urgenza' },
  { id: 'evento', label: 'Per evento' },
]

// Giorni che mancano all'inizio dell'evento: positivo = futuro, negativo = già iniziato.
// null quando non c'è una data evento associata.
function giorniAllEvento(item) {
  return item?.evento?.data_inizio ? daysBetween(item.evento.data_inizio, todayISO()) : null
}

function byGiorniAsc(a, b) {
  const ga = giorniAllEvento(a)
  const gb = giorniAllEvento(b)
  const va = ga == null ? Infinity : ga
  const vb = gb == null ? Infinity : gb
  return va - vb
}

// Trasforma l'array piatto di prenotazioni pendenti (hotel + trasporti) in gruppi
// { key, label, sublabel?, count, accent?, items }. Funzione pura: non muta `items`.
// Ogni item deve avere `evento` (con id, titolo, data_inizio). Con array vuoto → [].
export function groupPrenotazioni(items, groupBy) {
  const list = Array.isArray(items) ? items.slice() : []
  if (list.length === 0) return []

  if (groupBy === 'evento') {
    const map = new Map()
    let senzaEvento = null
    for (const it of list) {
      const ev = it.evento
      if (!ev || !ev.id) {
        if (!senzaEvento) senzaEvento = { key: '_no_evento', label: 'Senza evento', sublabel: null, count: 0, items: [], _dataInizio: null }
        senzaEvento.items.push(it)
        continue
      }
      let g = map.get(ev.id)
      if (!g) {
        g = {
          key: `ev-${ev.id}`,
          label: ev.titolo || 'Evento senza titolo',
          sublabel: ev.data_inizio ? `Inizio ${formatDate(ev.data_inizio)}` : null,
          count: 0,
          items: [],
          _dataInizio: ev.data_inizio || null,
        }
        map.set(ev.id, g)
      }
      g.items.push(it)
    }
    const groups = Array.from(map.values()).sort((a, b) => compareIso(a._dataInizio, b._dataInizio))
    if (senzaEvento) groups.push(senzaEvento)
    for (const g of groups) { g.items.sort(byGiorniAsc); g.count = g.items.length; delete g._dataInizio }
    return groups
  }

  // 'urgenza' (default): fasce sui giorni all'inizio evento
  const urgente = []
  const presto = []
  const dopo = []
  const senzaData = []
  for (const it of list) {
    const g = giorniAllEvento(it)
    if (g == null) senzaData.push(it)
    else if (g <= 3) urgente.push(it)
    else if (g <= 7) presto.push(it)
    else dopo.push(it)
  }
  const groups = []
  if (urgente.length) groups.push({ key: '_urg_alta', label: 'Molto urgente (entro 3 giorni)', accent: 'red', count: urgente.length, items: urgente.sort(byGiorniAsc) })
  if (presto.length) groups.push({ key: '_urg_media', label: 'Urgente (entro una settimana)', accent: 'yellow', count: presto.length, items: presto.sort(byGiorniAsc) })
  if (dopo.length) groups.push({ key: '_urg_bassa', label: 'In programma', accent: 'gray', count: dopo.length, items: dopo.sort(byGiorniAsc) })
  if (senzaData.length) groups.push({ key: '_urg_nodate', label: 'Senza data evento', accent: 'gray', count: senzaData.length, items: senzaData })
  return groups
}
