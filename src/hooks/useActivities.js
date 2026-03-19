import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { calculateDeadline } from '../lib/date-utils'

export const useActivitiesStore = create((set, get) => ({
  // State — separate keys to avoid collisions between views
  eventActivities: [],     // activities for a single event (convergence dashboard)
  myActivities: [],        // activities assigned to current user (banner + "le mie attività")
  dashboardActivities: [], // cross-event activities by permission (dashboard operativa)
  loading: false,
  error: null,

  fetchEventActivities: async (eventId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_activities')
      .select(`
        *,
        assegnato:users!event_activities_assegnato_a_fkey(id, nome, cognome),
        dipendenza:event_activities!event_activities_dipende_da_fkey(id, descrizione, stato)
      `)
      .eq('event_id', eventId)
      .order('deadline', { ascending: true, nullsFirst: false })
    set({ eventActivities: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  fetchMyActivities: async (userId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('event_activities')
      .select(`
        *,
        evento:events!event_activities_event_id_fkey(id, titolo, data_inizio, data_fine, stato)
      `)
      .eq('assegnato_a', userId)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })
    set({ myActivities: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  fetchDashboardActivities: async (permissions) => {
    set({ loading: true, error: null })
    let query = supabase
      .from('event_activities')
      .select(`
        *,
        evento:events!event_activities_event_id_fkey(id, titolo, data_inizio, data_fine, stato),
        assegnato:users!event_activities_assegnato_a_fkey(id, nome, cognome)
      `)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })

    if (permissions && permissions.length > 0) {
      query = query.in('permesso_responsabile', permissions)
    }

    const { data, error } = await query
    set({ dashboardActivities: data || [], loading: false, error: error?.message })
    return { data, error }
  },

  instantiateTemplate: async (eventId, tipoEvento, modalita, dataInizio) => {
    const { data: templates } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', tipoEvento)
      .eq('modalita', modalita)
      .limit(1)

    if (!templates || templates.length === 0) return { data: null, error: 'Nessun template trovato' }

    const { data: items } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templates[0].id)
      .eq('tipo', 'checklist')
      .order('ordine')

    if (!items || items.length === 0) return { data: null, error: 'Template vuoto' }

    const eventDate = new Date(dataInizio)
    const templateIdMap = {}

    const activitiesToInsert = items.map(item => ({
      event_id: eventId,
      template_item_id: item.id,
      descrizione: item.descrizione,
      categoria: item.categoria,
      permesso_responsabile: item.permesso_responsabile,
      stato: 'da_fare',
      deadline: calculateDeadline(eventDate, item.giorni_prima_evento),
      obbligatoria: item.obbligatorio,
      tipo_verifica: item.tipo_verifica || 'manuale',
      verifica_automatica: item.verifica_automatica,
    }))

    const { data: inserted, error } = await supabase
      .from('event_activities')
      .insert(activitiesToInsert)
      .select()

    if (error) return { data: null, error: error.message }

    if (inserted) {
      for (const act of inserted) {
        if (act.template_item_id) templateIdMap[act.template_item_id] = act.id
      }
      for (const item of items) {
        if (item.dipende_da && templateIdMap[item.dipende_da]) {
          const activityId = templateIdMap[item.id]
          if (activityId) {
            await supabase
              .from('event_activities')
              .update({ dipende_da: templateIdMap[item.dipende_da] })
              .eq('id', activityId)
          }
        }
      }
    }

    await get().fetchEventActivities(eventId)
    return { data: inserted, error: null }
  },

  updateActivity: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  assignActivity: async (id, userId) => {
    return get().updateActivity(id, { assegnato_a: userId })
  },

  completeActivity: async (id, userId) => {
    return get().updateActivity(id, {
      stato: 'completata',
      completata_il: new Date().toISOString(),
      completata_da: userId,
    })
  },

  startActivity: async (id) => {
    return get().updateActivity(id, { stato: 'in_corso' })
  },

  disableActivity: async (id) => {
    return get().updateActivity(id, { stato: 'disattivata' })
  },

  addCustomActivity: async (eventId, activity) => {
    const { data, error } = await supabase
      .from('event_activities')
      .insert({ event_id: eventId, ...activity })
      .select()
      .single()
    if (!error) await get().fetchEventActivities(eventId)
    return { data, error }
  },
}))
