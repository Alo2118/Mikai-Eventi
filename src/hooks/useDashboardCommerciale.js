import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { todayISO, getQuarterRange, subtractDays } from '../lib/date-utils'

export const useDashboardCommercialeStore = create((set, get) => ({
  myEvents: [],
  myActivities: [],
  participantStats: null,
  zoneSummary: null,
  recentContacts: [],
  loading: false,
  error: null,

  fetchAll: async (userId, ruolo, profile) => {
    set({ loading: true, error: null })
    try {
      const isManager = ruolo === 'area_manager'
      const [events, activities, zone, contacts] = await Promise.all([
        get().fetchMyEvents(userId, isManager),
        get().fetchMyActivities(userId),
        get().fetchZoneSummary(userId, isManager, profile),
        get().fetchRecentContacts(userId),
      ])
      const upcomingEventIds = events
        .filter(e => e.data_inizio >= todayISO())
        .map(e => e.id)
      const participantStats = await get().fetchParticipantStats(upcomingEventIds)
      set({
        myEvents: events,
        myActivities: activities,
        participantStats,
        zoneSummary: zone,
        recentContacts: contacts,
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: 'Errore nel caricamento della dashboard.' })
    }
  },

  fetchMyEvents: async (userId, isManager) => {
    const field = isManager ? 'manager_user_id' : 'promotore_id'
    const { data, error } = await supabase
      .from('events')
      .select('id, titolo, data_inizio, data_fine, stato, tipo_evento, created_at')
      .eq(field, userId)
      .in('stato', ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso'])
      .order('data_inizio')
      .limit(10)
    if (error) throw error
    return data || []
  },

  fetchMyActivities: async (userId) => {
    const { data, error } = await supabase
      .from('event_activities')
      .select('*, evento:events!event_activities_event_id_fkey(id, titolo)')
      .eq('assegnato_a', userId)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(10)
    if (error) throw error
    return data || []
  },

  fetchParticipantStats: async (eventIds) => {
    if (!eventIds || eventIds.length === 0) return null
    const { data, error } = await supabase
      .from('event_participants')
      .select('stato_iscrizione')
      .in('event_id', eventIds)
    if (error) throw error
    if (!data || data.length === 0) return null
    const total = data.length
    const confermati = data.filter(p =>
      p.stato_iscrizione === 'confermato' || p.stato_iscrizione === 'presente'
    ).length
    return { total, confermati, percentuale: Math.round((confermati / total) * 100) }
  },

  fetchZoneSummary: async (userId, isManager, profile) => {
    const qRange = getQuarterRange()
    const oneMonthAgo = subtractDays(todayISO(), 30)

    let userIds = [userId]
    if (isManager && profile?.zone_id) {
      const { data: zoneUsers, error: zErr } = await supabase
        .from('users').select('id').eq('zone_id', profile.zone_id).eq('ruolo', 'commerciale')
      if (zErr) throw zErr
      userIds = [userId, ...(zoneUsers || []).map(u => u.id)]
    }

    const [events, newContacts] = await Promise.all([
      supabase.from('events').select('stato')
        .in('promotore_id', userIds)
        .gte('data_inizio', qRange.start),
      supabase.from('contacts').select('id', { count: 'exact', head: true })
        .eq('proprietario_id', userId)
        .gte('created_at', oneMonthAgo),
    ])
    if (events.error) throw events.error
    if (newContacts.error) throw newContacts.error

    const eventiByStato = (events.data || []).reduce((acc, e) => {
      acc[e.stato] = (acc[e.stato] || 0) + 1; return acc
    }, {})

    return { eventiByStato, contattiNuovi: newContacts.count || 0 }
  },

  fetchRecentContacts: async (userId) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, nome, cognome, tipo_contatto, created_at')
      .eq('proprietario_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    if (error) throw error
    return data || []
  },
}))
