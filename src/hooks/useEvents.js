import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const EVENTS_PAGE_SIZE = 25
const EVENTS_SELECT = 'id, titolo, data_inizio, data_fine, stato, tipo_evento, modalita, luogo, budget_previsto, promotore_id, promotore_contact_id, manager_user_id, created_at, promotore:users!events_promotore_id_fkey(id, nome, cognome), promotore_agente:contacts!events_promotore_contact_id_fkey(id, nome, cognome), manager:users!events_manager_user_id_fkey(id, nome, cognome)'

function buildEventQuery(filters, roleFilter, from, to) {
  let query = supabase
    .from('events')
    .select(EVENTS_SELECT, { count: 'exact' })
    .order('data_inizio', { ascending: true })

  const { search, stato, tipo, mese } = filters
  const { userId, ruolo, showAll } = roleFilter

  if (!showAll && userId && ruolo === 'commerciale') query = query.eq('promotore_id', userId)
  if (!showAll && userId && ruolo === 'area_manager') query = query.eq('manager_user_id', userId)

  if (stato) query = query.eq('stato', stato)
  if (tipo) query = query.eq('tipo_evento', tipo)
  if (search) query = query.ilike('titolo', `%${search}%`)
  if (mese) {
    const startDate = `${mese.year}-${String(mese.month).padStart(2, '0')}-01`
    const endMonth = mese.month === 12 ? 1 : mese.month + 1
    const endYear = mese.month === 12 ? mese.year + 1 : mese.year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    query = query.lt('data_inizio', endDate).gte('data_fine', startDate)
  }

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
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value }, page: 0, events: [], hasMore: true }))
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = setTimeout(() => get().fetchEvents(), 300)
  },

  resetFilters: () => {
    set({ filters: { search: '', stato: '', tipo: '', mese: null }, page: 0, events: [], hasMore: true })
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
    const query = buildEventQuery(get().filters, get().roleFilter, from, to)
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
    const query = buildEventQuery(get().filters, get().roleFilter, from, to)
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
    return get().updateEvent(id, { stato: 'cancellato', motivo_cancellazione: motivo })
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
    const { data } = await supabase
      .from('event_materials')
      .select('id, stato')
      .eq('event_id', eventId)
      .in('stato', ['approvato', 'in_preparazione'])
    const unreturned = data || []
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
