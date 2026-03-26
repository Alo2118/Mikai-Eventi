import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { toISO } from '../lib/date-utils'

export const useDashboardCommercialeStore = create((set, get) => ({
  myEvents: [],
  myActivities: [],
  zoneSummary: null,
  recentContacts: [],
  loading: false,

  fetchAll: async (userId, ruolo, profile) => {
    set({ loading: true })
    const isManager = ruolo === 'area_manager'
    const [events, activities, zone, contacts] = await Promise.all([
      get().fetchMyEvents(userId, isManager),
      get().fetchMyActivities(userId),
      get().fetchZoneSummary(userId, isManager, profile),
      get().fetchRecentContacts(userId),
    ])
    set({ myEvents: events, myActivities: activities, zoneSummary: zone, recentContacts: contacts, loading: false })
  },

  fetchMyEvents: async (userId, isManager) => {
    const field = isManager ? 'manager_user_id' : 'promotore_id'
    const { data } = await supabase
      .from('events')
      .select('id, titolo, data_inizio, data_fine, stato, tipo_evento, created_at')
      .eq(field, userId)
      .in('stato', ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso'])
      .order('data_inizio')
      .limit(10)
    return data || []
  },

  fetchMyActivities: async (userId) => {
    const { data } = await supabase
      .from('event_activities')
      .select('*, evento:events!event_activities_event_id_fkey(id, titolo)')
      .eq('assegnato_a', userId)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(10)
    return data || []
  },

  fetchZoneSummary: async (userId, isManager, profile) => {
    const now = new Date()
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    let userIds = [userId]
    if (isManager && profile?.zone_id) {
      const { data: zoneUsers } = await supabase
        .from('users').select('id').eq('zone_id', profile.zone_id).eq('ruolo', 'commerciale')
      userIds = [userId, ...(zoneUsers || []).map(u => u.id)]
    }

    const [events, newContacts] = await Promise.all([
      supabase.from('events').select('stato')
        .in('promotore_id', userIds)
        .gte('data_inizio', toISO(qStart)),
      supabase.from('contacts').select('id', { count: 'exact', head: true })
        .eq('proprietario_id', userId)
        .gte('created_at', toISO(oneMonthAgo)),
    ])

    const eventiByStato = (events.data || []).reduce((acc, e) => {
      acc[e.stato] = (acc[e.stato] || 0) + 1; return acc
    }, {})

    return { eventiByStato, contattiNuovi: newContacts.count || 0 }
  },

  fetchRecentContacts: async (userId) => {
    const { data } = await supabase
      .from('contacts')
      .select('id, nome, cognome, tipo_contatto, created_at')
      .eq('proprietario_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    return data || []
  },
}))
