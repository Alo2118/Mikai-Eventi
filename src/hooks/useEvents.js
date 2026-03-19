import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useEventsStore = create((set, get) => ({
  events: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    stato: '',
    tipo: '',
    mese: null,
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }))
    get().fetchEvents()
  },

  resetFilters: () => {
    set({ filters: { search: '', stato: '', tipo: '', mese: null } })
    get().fetchEvents()
  },

  roleFilter: { userId: null, ruolo: null, showAll: false },

  setRoleFilter: (userId, ruolo) => {
    set((s) => ({ roleFilter: { ...s.roleFilter, userId, ruolo } }))
    get().fetchEvents()
  },

  setShowAll: (showAll) => {
    set((s) => ({ roleFilter: { ...s.roleFilter, showAll } }))
    get().fetchEvents()
  },

  fetchEvents: async () => {
    set({ loading: true, error: null })
    let query = supabase
      .from('events')
      .select('*, promotore:users!events_promotore_id_fkey(nome, cognome), manager:users!events_manager_user_id_fkey(nome, cognome)')
      .order('data_inizio', { ascending: false })

    const { search, stato, tipo, mese } = get().filters
    const { userId, ruolo, showAll } = get().roleFilter

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
      query = query.or(`data_inizio.gte.${startDate},data_fine.gte.${startDate}`).lte('data_inizio', endDate)
    }

    const { data, error } = await query
    set({ events: data || [], loading: false, error: error?.message || null })
  },

  fetchEvent: async (id) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, promotore:users!events_promotore_id_fkey(id, nome, cognome, ruolo), manager:users!events_manager_user_id_fkey(id, nome, cognome)')
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
    return { data, error }
  },
}))
