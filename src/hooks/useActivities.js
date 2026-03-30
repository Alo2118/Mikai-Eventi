import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO, todayISO } from '../lib/date-utils'
import { calculateDeadline } from '../lib/date-utils'

export const useActivitiesStore = create((set, get) => ({
  // State — separate keys to avoid collisions between views
  eventActivities: [],     // activities for a single event (convergence dashboard)
  myActivities: [],        // activities assigned to current user (banner + "le mie attività")
  dashboardActivities: [], // cross-event activities by permission (dashboard operativa)
  // Fix 6: scoped loading/error per fetch type
  eventLoading: false,
  myLoading: false,
  dashboardLoading: false,
  eventError: null,
  myError: null,
  dashboardError: null,

  fetchEventActivities: async (eventId) => {
    set({ eventLoading: true, eventError: null })
    const { data, error } = await supabase
      .from('event_activities')
      .select('id, event_id, descrizione, stato, deadline, obbligatoria, dipende_da, categoria, permesso_responsabile, assegnato_a, tipo_verifica, verifica_automatica, completata_il, completata_da, note, assegnato:users!event_activities_assegnato_a_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('deadline', { ascending: true, nullsFirst: false })
    // Resolve self-referential dependencies in-memory (PostgREST can't self-join)
    const activities = (data || []).map(a => {
      if (a.dipende_da) {
        const dep = (data || []).find(d => d.id === a.dipende_da)
        return { ...a, dipendenza: dep ? { id: dep.id, descrizione: dep.descrizione, stato: dep.stato } : null }
      }
      return { ...a, dipendenza: null }
    })
    set({ eventActivities: activities, eventLoading: false, eventError: error?.message })
    return { data: activities, error }
  },

  fetchMyActivities: async (userId) => {
    set({ myLoading: true, myError: null })
    const { data, error } = await supabase
      .from('event_activities')
      .select(`
        *,
        evento:events!event_activities_event_id_fkey(id, titolo, data_inizio, data_fine, stato)
      `)
      .eq('assegnato_a', userId)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })
    set({ myActivities: data || [], myLoading: false, myError: error?.message })
    return { data, error }
  },

  fetchDashboardActivities: async (permissions) => {
    set({ dashboardLoading: true, dashboardError: null })
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
    set({ dashboardActivities: data || [], dashboardLoading: false, dashboardError: error?.message })
    return { data, error }
  },

  // Batch fetchEventSemaphores — single query instead of N+1
  fetchEventSemaphores: async (eventIds) => {
    if (!eventIds?.length) return {}
    const { data } = await supabase
      .from('event_activities')
      .select('event_id, stato, obbligatoria, deadline')
      .in('event_id', eventIds)
      .neq('stato', 'disattivata')

    // Group by event_id
    const grouped = {}
    for (const row of (data || [])) {
      if (!grouped[row.event_id]) grouped[row.event_id] = []
      grouped[row.event_id].push(row)
    }

    const today = todayISO()
    const semaphores = {}
    for (const eid of eventIds) {
      const activities = grouped[eid] || []
      const mandatory = activities.filter(a => a.obbligatoria)
      if (mandatory.length === 0) { semaphores[eid] = 'yellow'; continue }
      const overdue = mandatory.some(a =>
        (a.stato === 'da_fare' || a.stato === 'in_corso') &&
        a.deadline && a.deadline < today
      )
      const allDone = mandatory.every(a => a.stato === 'completata')
      semaphores[eid] = overdue ? 'red' : allDone ? 'green' : 'yellow'
    }
    return semaphores
  },

  instantiateTemplate: async (eventId, tipoEvento, modalita, dataInizio) => {
    // Guard: prevent duplicate instantiation
    const { count } = await supabase
      .from('event_activities')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
    if (count > 0) return { data: null, error: 'Attività già create per questo evento' }

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
      // Wire dependencies in parallel
      const depUpdates = items
        .filter(item => item.dipende_da && templateIdMap[item.dipende_da] && templateIdMap[item.id])
        .map(item => supabase
          .from('event_activities')
          .update({ dipende_da: templateIdMap[item.dipende_da] })
          .eq('id', templateIdMap[item.id])
        )
      if (depUpdates.length > 0) {
        const results = await Promise.all(depUpdates)
        results.forEach((r, i) => {
          if (r.error) console.warn('Errore nel collegamento dipendenza:', r.error.message)
        })
      }
    }

    await get().fetchEventActivities(eventId)
    return { data: inserted, error: null }
  },

  // Fix 5: updateActivity refreshes local state
  updateActivity: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data && !error) {
      set(state => ({
        eventActivities: state.eventActivities.map(a => a.id === id ? { ...a, ...data } : a),
        myActivities: state.myActivities.map(a => a.id === id ? { ...a, ...data } : a),
      }))
    }
    return { data, error }
  },

  assignActivity: async (id, userId) => {
    return get().updateActivity(id, { assegnato_a: userId })
  },

  completeActivity: async (id, userId) => {
    return get().updateActivity(id, {
      stato: 'completata',
      completata_il: nowISO(),
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

  runAutoVerifications: async (eventId) => {
    const { data: autoActivities } = await supabase
      .from('event_activities')
      .select('id, verifica_automatica, stato')
      .eq('event_id', eventId)
      .eq('tipo_verifica', 'automatica')
      .in('stato', ['da_fare', 'in_corso'])

    if (!autoActivities?.length) return { verified: 0 }

    const { data: event } = await supabase
      .from('events')
      .select('titolo, data_inizio, data_fine, indirizzo_spedizione')
      .eq('id', eventId)
      .single()

    const { data: materials } = await supabase
      .from('event_materials')
      .select('id, material_id, stato')
      .eq('event_id', eventId)

    const matIds = (materials || []).filter(m => m.material_id).map(m => m.material_id)
    const { data: movements } = matIds.length > 0
      ? await supabase
          .from('material_movements')
          .select('id, material_id, tipo')
          .in('material_id', matIds)
      : { data: [] }

    const checks = {
      lista_materiale_compilata: () => (materials || []).length > 0,
      materiale_tutto_confermato: () =>
        (materials || []).length > 0 &&
        (materials || []).every(m => m.stato !== 'richiesto'),
      indirizzo_spedizione_specificato: () =>
        !!event?.indirizzo_spedizione?.trim(),
      titolo_orario_definitivi: () =>
        !!event?.titolo?.trim() && !!event?.data_inizio && !!event?.data_fine,
      materiale_tutto_preparato: () =>
        (materials || []).length > 0 &&
        (materials || []).every(m => !['richiesto', 'approvato'].includes(m.stato)),
      materiale_tutto_spedito: () => {
        if (!materials?.length) return false
        const reqMaterialIds = new Set(materials.filter(m => m.material_id).map(m => m.material_id))
        if (reqMaterialIds.size === 0) return false
        const shipped = new Set(
          (movements || []).filter(m => m.tipo === 'uscita').map(m => m.material_id)
        )
        return [...reqMaterialIds].every(id => shipped.has(id))
      },
    }

    let verified = 0
    for (const activity of autoActivities) {
      const checkFn = checks[activity.verifica_automatica]
      if (checkFn && checkFn()) {
        await supabase
          .from('event_activities')
          .update({
            stato: 'completata',
            completata_il: nowISO(),
            note: 'Verificata automaticamente',
          })
          .eq('id', activity.id)
        verified++
      }
    }

    if (verified > 0) await get().fetchEventActivities(eventId)
    return { verified }
  },

  // Template admin actions
  fetchTemplates: async () => {
    const { data, error } = await supabase
      .from('event_templates')
      .select(`
        *,
        items:template_items(*)
      `)
      .order('tipo_evento')
    return { data: data || [], error }
  },

  fetchTemplateItems: async (templateId) => {
    const { data, error } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templateId)
      .eq('tipo', 'checklist')
      .order('ordine')
    return { data: data || [], error }
  },

  createTemplateItem: async (templateId, item) => {
    const { data, error } = await supabase
      .from('template_items')
      .insert({
        template_id: templateId,
        tipo: 'checklist',
        ...item,
      })
      .select()
      .single()
    return { data, error }
  },

  updateTemplateItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('template_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  deleteTemplateItem: async (id) => {
    const { data: deps } = await supabase
      .from('template_items')
      .select('id')
      .eq('dipende_da', id)
    if (deps?.length > 0) {
      return { data: null, error: { message: 'Altre attività dipendono da questa. Rimuovi prima le dipendenze.' } }
    }
    const { error } = await supabase
      .from('template_items')
      .delete()
      .eq('id', id)
    return { data: null, error }
  },
}))
