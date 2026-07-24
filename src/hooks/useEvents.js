import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { monthFloorISO, todayISO } from '../lib/date-utils'
import { effectiveRientroRichiesto, richiedeSpedizione } from '../lib/event-flow'

const EVENTS_PAGE_SIZE = 25
const EVENTS_SELECT = 'id, titolo, data_inizio, data_fine, stato, tipo_evento, modalita, luogo, budget_previsto, promotore_id, promotore_contact_id, manager_user_id, spedizione_data, created_at, promotore:users!events_promotore_id_fkey(id, nome, cognome), promotore_agente:contacts!events_promotore_contact_id_fkey(id, nome, cognome), manager:users!events_manager_user_id_fkey(id, nome, cognome)'

// Strip characters that have special meaning inside a PostgREST `.or()` filter string.
function sanitizeSearch(value) {
  return (value || '').replace(/[,()*]/g, ' ').trim()
}

function buildEventQuery(filters, roleFilter, involvedIds, from, to) {
  const { search, stato, tipo, mese, periodo, promotore, onlyMine } = filters
  const { userId, ruolo, showAll } = roleFilter

  let query = supabase
    .from('events')
    .select(EVENTS_SELECT, { count: 'exact' })
    // For "Tutto" (no time window) show the most recent first; otherwise soonest first.
    .order('data_inizio', { ascending: periodo !== 'past' })

  // Role-based visibility (legacy)
  if (!showAll && userId && ruolo === 'commerciale') query = query.eq('promotore_id', userId)
  if (!showAll && userId && ruolo === 'area_manager') query = query.eq('manager_user_id', userId)

  // "I miei": promotore OR manager OR (assigned as staff / on an open activity)
  if (onlyMine && userId) {
    const ors = [`promotore_id.eq.${userId}`, `manager_user_id.eq.${userId}`]
    if (involvedIds && involvedIds.length) ors.push(`id.in.(${involvedIds.join(',')})`)
    query = query.or(ors.join(','))
  }

  if (stato) query = query.eq('stato', stato)
  if (tipo) query = query.eq('tipo_evento', tipo)
  const s = sanitizeSearch(search)
  if (s) query = query.or(`titolo.ilike.%${s}%,luogo.ilike.%${s}%`)
  if (promotore) {
    const [t, id] = promotore.split(':')
    query = t === 'contact' ? query.eq('promotore_contact_id', id) : query.eq('promotore_id', id)
  }

  // Time window — an explicit month (calendar) takes precedence over the list's period selector.
  if (mese) {
    const startDate = `${mese.year}-${String(mese.month).padStart(2, '0')}-01`
    const endMonth = mese.month === 12 ? 1 : mese.month + 1
    const endYear = mese.month === 12 ? mese.year + 1 : mese.year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    query = query.lt('data_inizio', endDate).gte('data_fine', startDate)
  } else if (periodo === '3months') {
    // Events not finished before this month, AND starting within ~3 months (or still awaiting approval).
    query = query.gte('data_fine', monthFloorISO(0)).or(`data_inizio.lt.${monthFloorISO(3)},stato.eq.proposto`)
  } else if (periodo === 'all') {
    query = query.gte('data_fine', monthFloorISO(0))
  }
  // periodo === 'past' → no time constraint

  return query.range(from, to)
}

// Gate UNICO in_preparazione → pronto — calcolo SINCRONO PURO sui dati già in
// memoria (nessuna query). Due requisiti:
//  1) nessuna attività obbligatoria pre-evento incompleta (le 'disattivata' non contano);
//  2) se il tipo evento richiede spedizione (e non è a contributo) e c'è materiale
//     non rifiutato, la spedizione dev'essere registrata.
// Ritorna hasActivities per gestire il caso "zero attività" (il chiamante chiede
// conferma esplicita invece di lasciar passare in silenzio) e blockerText, che è
// SEMPRE valorizzato quando canAdvance è false (mai un disabled senza spiegazione).
export function computeGatePronto({ event, activities, materials, eventType }) {
  const visible = (activities || []).filter(a => a.stato !== 'disattivata')
  const blocking = visible.filter(a => a.obbligatoria && !a.post_evento && a.stato !== 'completata')

  const shippingRequired = event?.modalita !== 'contributo' && richiedeSpedizione(eventType)
  const hasMaterial = (materials || []).some(m => m.stato !== 'rifiutato')
  const needsShipping = shippingRequired && !event?.spedizione_data && hasMaterial

  const nMand = blocking.length
  let blockerText = null
  if (nMand > 0 && needsShipping) blockerText = 'Completa le attività e registra la spedizione'
  else if (nMand > 0) blockerText = 'Completa le attività obbligatorie'
  else if (needsShipping) blockerText = 'Registra la spedizione del materiale'

  return {
    canAdvance: nMand === 0 && !needsShipping,
    blockerText,
    hasActivities: visible.length > 0,
  }
}

export const useEventsStore = create((set, get) => {
  let filterDebounceTimer = null
  return {
  events: [],
  loading: false,
  loadingMore: false,
  error: null,
  page: 0,
  pageSize: EVENTS_PAGE_SIZE,
  hasMore: true,
  totalCount: 0,
  filters: {
    search: '',
    stato: '',
    tipo: '',
    mese: null,
    periodo: '3months',
    promotore: '',
    onlyMine: false,
  },
  // Cache of event ids the current user is involved in (staff / open activity), for the "I miei" filter.
  myInvolvedIds: [],

  refreshMyInvolvedIds: async () => {
    const userId = get().roleFilter.userId
    if (!userId) { set({ myInvolvedIds: [] }); return [] }
    const [staffRes, actRes] = await Promise.all([
      supabase.from('event_staff').select('event_id').eq('user_id', userId),
      supabase.from('event_activities').select('event_id').eq('assegnato_a', userId).in('stato', ['da_fare', 'in_corso']),
    ])
    if (staffRes.error || actRes.error) {
      console.warn('refreshMyInvolvedIds:', staffRes.error?.message || actRes.error?.message)
    }
    const ids = [...new Set([
      ...(staffRes.data || []).map(r => r.event_id),
      ...(actRes.data || []).map(r => r.event_id),
    ])].filter(Boolean)
    set({ myInvolvedIds: ids })
    return ids
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value }, page: 0, events: [], hasMore: true }))
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = setTimeout(async () => {
      if (get().filters.onlyMine) await get().refreshMyInvolvedIds()
      get().fetchEvents()
    }, 300)
  },

  resetFilters: () => {
    set({ filters: { search: '', stato: '', tipo: '', mese: null, periodo: '3months', promotore: '', onlyMine: false }, page: 0, events: [], hasMore: true })
    clearTimeout(filterDebounceTimer)
    get().fetchEvents()
  },

  roleFilter: { userId: null, ruolo: null, showAll: false },

  setRoleFilter: (userId, ruolo) => {
    set((s) => ({ roleFilter: { ...s.roleFilter, userId, ruolo }, page: 0, events: [], hasMore: true }))
    get().fetchEvents()
  },

  setShowAll: (showAll) => {
    set((s) => ({ roleFilter: { ...s.roleFilter, showAll }, page: 0, events: [], hasMore: true }))
    get().fetchEvents()
  },

  fetchEvents: async () => {
    const { page, pageSize } = get()
    const from = page * pageSize
    const to = from + pageSize - 1

    set({ loading: true, error: null })
    const query = buildEventQuery(get().filters, get().roleFilter, get().myInvolvedIds, from, to)
    const { data, error, count } = await query
    const rows = data || []
    set({
      events: rows,
      loading: false,
      // Messaggio umano in italiano: mai esporre l'errore Postgres grezzo alla UI.
      error: error ? 'Non siamo riusciti a caricare gli eventi. Riprova.' : null,
      totalCount: count ?? 0,
      hasMore: rows.length === pageSize,
    })
  },

  loadMore: async () => {
    const { loadingMore, hasMore } = get()
    if (loadingMore || !hasMore) return
    const { page, pageSize } = get()
    const nextPage = page + 1
    const from = nextPage * pageSize
    const to = from + pageSize - 1

    set({ loadingMore: true })
    const query = buildEventQuery(get().filters, get().roleFilter, get().myInvolvedIds, from, to)
    const { data, error, count } = await query
    const rows = data || []
    set((s) => ({
      events: [...s.events, ...rows],
      loadingMore: false,
      error: error?.message || null,
      page: nextPage,
      totalCount: count ?? s.totalCount,
      hasMore: rows.length === pageSize,
    }))
  },

  fetchEvent: async (id) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, promotore:users!events_promotore_id_fkey(id, nome, cognome, ruolo), promotore_agente:contacts!events_promotore_contact_id_fkey(id, nome, cognome, azienda), manager:users!events_manager_user_id_fkey(id, nome, cognome)')
      .eq('id', id)
      .single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  createEvent: async (eventData) => {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()
    if (!error) get().fetchEvents()
    return { data, error: error?.message || null }
  },

  updateEvent: async (id, updates) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) get().fetchEvents()
    return { data, error: error?.message || null }
  },

  approveEvent: async (id) => {
    return get().updateEvent(id, { stato: 'confermato' })
  },

  canAreaManagerApprove: async (event) => {
    const { data: thresholds } = await supabase
      .from('approval_thresholds')
      .select('*')
      .or(`tipo_evento.eq.${event.tipo_evento},tipo_evento.is.null`)
      .order('tipo_evento', { ascending: false, nullsFirst: false })
    if (!thresholds?.length) return false
    const threshold = thresholds[0]
    if (!threshold.area_manager_can_approve) return false
    if (event.budget_previsto && Number(event.budget_previsto) > Number(threshold.soglia_importo)) return false
    return true
  },

  rejectEvent: async (id, motivo) => {
    return get().updateEvent(id, { stato: 'rifiutato', motivo_cancellazione: motivo })
  },

  cancelEvent: async (id, motivo) => {
    return get().updateEvent(id, { stato: 'cancellato', motivo_cancellazione: motivo })
  },

  // Eliminazione definitiva: la RPC verifica permessi/stato e cancella l'evento con
  // le sue dipendenze (FK cascade), restituendo i path Storage da purgare.
  deleteEvent: async (id) => {
    const { data: paths, error } = await supabase.rpc('delete_event_cascade', { p_event_id: id })
    if (error) return { error: error.message }
    // I file Storage non sono coperti dalle cascade DB: rimozione best-effort.
    if (Array.isArray(paths) && paths.length) {
      const { error: storageError } = await supabase.storage.from('event-documents').remove(paths)
      if (storageError) console.warn('deleteEvent: file Storage non rimossi:', storageError.message)
    }
    set((s) => ({
      events: s.events.filter(e => e.id !== id),
      totalCount: Math.max(0, s.totalCount - 1),
    }))
    return { error: null }
  },

  checkGateConcluded: async (eventId) => {
    // Fail-closed: qualsiasi errore di query blocca l'avanzamento (i "salti"
    // legittimi della biforcazione event-flow restano gestiti sotto).
    const failClosed = { canAdvance: false, unreturned: [], errore: 'Non siamo riusciti a verificare i requisiti. Riprova.' }
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('tipo_evento')
      .eq('id', eventId)
      .single()
    if (eventError) return failClosed
    if (event?.tipo_evento) {
      const { data: et, error: etError } = await supabase
        .from('event_types')
        .select('richiede_spedizione')
        .eq('codice', event.tipo_evento)
        .maybeSingle()
      if (etError) return failClosed
      // et null = tipo senza config (legittimo): si prosegue al check materiale.
      if (et && et.richiede_spedizione === false) {
        return { canAdvance: true, unreturned: [] }
      }
    }
    // Un item è "non rientrato" quando è uscito (spedito, o in_preparazione per
    // i tipi senza spedizione) e non ha ancora una data_rientro. Stesso filtro di
    // fetchPendingReturnsForEvent/fetchOverdueReturns: l'item resta in stato
    // 'spedito' dopo registerEventShipping, quindi 'approvato' non lo intercetta.
    const { data, error } = await supabase
      .from('event_materials')
      .select('id, stato, rientro_richiesto, data_rientro, product:products(serializzato)')
      .eq('event_id', eventId)
      .in('stato', ['spedito', 'in_preparazione'])
      .is('data_rientro', null)
    if (error) return failClosed
    const unreturned = (data || []).filter(m => effectiveRientroRichiesto(m))
    return { canAdvance: unreturned.length === 0, unreturned }
  },

  // Eventi con data_fine passata ma non ancora chiusi: finché restano aperti il
  // materiale spedito risulta "fuori"/in ritardo per sempre (fetchOverdueReturns e
  // la timeline logistica escludono solo gli eventi già conclusi). Questa lista sana
  // il circolo vizioso dei falsi solleciti. Esclude gli stati terminali.
  fetchEventsDaChiudere: async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, titolo, data_inizio, data_fine, stato, tipo_evento')
      .lt('data_fine', todayISO())
      .not('stato', 'in', '(concluso,cancellato,rifiutato)')
      .order('data_fine', { ascending: true })
      .limit(100)
    if (error) return { data: [], error: 'Non siamo riusciti a caricare gli eventi da chiudere. Riprova.' }
    return { data: data || [], error: null }
  },

  advanceEventState: async (eventId, newStato) => {
    const { data, error } = await supabase
      .from('events')
      .update({ stato: newStato })
      .eq('id', eventId)
      .select()
      .single()
    if (!error) await get().fetchEvents()
    return { data, error: error?.message || null }
  },

  // Batch fetch indicators (has materials, has people) for calendar display
  fetchEventIndicators: async (eventIds) => {
    if (!eventIds?.length) return {}
    const [matRes, staffRes, partRes] = await Promise.all([
      supabase.from('event_materials').select('event_id').in('event_id', eventIds),
      supabase.from('event_staff').select('event_id').in('event_id', eventIds),
      supabase.from('event_participants').select('event_id').in('event_id', eventIds),
    ])
    const indicators = {}
    for (const eid of eventIds) {
      indicators[eid] = {
        hasMaterials: (matRes.data || []).some(r => r.event_id === eid),
        hasPeople: (staffRes.data || []).some(r => r.event_id === eid) || (partRes.data || []).some(r => r.event_id === eid),
      }
    }
    return indicators
  },

  // Returns a map { eventId: { promotore, manager, staff, attivita } } for user involvement
  fetchMyInvolvement: async (userId, eventIds) => {
    if (!userId || !eventIds?.length) return {}
    const [staffRes, actRes] = await Promise.all([
      supabase.from('event_staff').select('event_id').eq('user_id', userId).in('event_id', eventIds),
      supabase.from('event_activities').select('event_id').eq('assegnato_a', userId).in('stato', ['da_fare', 'in_corso']).in('event_id', eventIds),
    ])
    const staffSet = new Set((staffRes.data || []).map(r => r.event_id))
    const actSet = new Set((actRes.data || []).map(r => r.event_id))
    const events = get().events
    const map = {}
    for (const eid of eventIds) {
      const ev = events.find(e => e.id === eid)
      const roles = {
        promotore: ev?.promotore_id === userId || ev?.promotore?.id === userId,
        manager: ev?.manager_user_id === userId || ev?.manager?.id === userId,
        staff: staffSet.has(eid),
        attivita: actSet.has(eid),
      }
      if (roles.promotore || roles.manager || roles.staff || roles.attivita) {
        map[eid] = roles
      }
    }
    return map
  },
  }
})
