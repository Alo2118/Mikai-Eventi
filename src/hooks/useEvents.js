import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { monthFloorISO } from '../lib/date-utils'

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
      error: error?.message || null,
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

  checkGatePronto: async (eventId) => {
    const { data } = await supabase
      .from('event_activities')
      .select('id, descrizione, stato, obbligatoria')
      .eq('event_id', eventId)
      .eq('obbligatoria', true)
      .neq('stato', 'disattivata')
      .neq('stato', 'completata')
    const blocking = data || []
    return { canAdvance: blocking.length === 0, blocking }
  },

  checkGateConcluded: async (eventId) => {
    const { data: event } = await supabase
      .from('events')
      .select('tipo_evento')
      .eq('id', eventId)
      .single()
    if (event?.tipo_evento) {
      const { data: et } = await supabase
        .from('event_types')
        .select('richiede_spedizione')
        .eq('codice', event.tipo_evento)
        .maybeSingle()
      if (et && et.richiede_spedizione === false) {
        return { canAdvance: true, unreturned: [] }
      }
    }
    const { data } = await supabase
      .from('event_materials')
      .select('id, stato, rientro_richiesto, product:products(serializzato)')
      .eq('event_id', eventId)
      .in('stato', ['approvato', 'in_preparazione'])
    const unreturned = (data || []).filter(m => {
      if (m.rientro_richiesto !== null && m.rientro_richiesto !== undefined) return m.rientro_richiesto === true
      return !!m.product?.serializzato
    })
    return { canAdvance: unreturned.length === 0, unreturned }
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
