import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO, todayISO, toISO } from '../lib/date-utils'
import { calculateDeadline } from '../lib/date-utils'

export const useActivitiesStore = create((set, get) => ({
  // State — separate keys to avoid collisions between views
  eventActivities: [],     // activities for a single event (convergence dashboard)
  myActivities: [],        // activities assigned to current user (banner + "le mie attività")
  dashboardActivities: [], // cross-event activities by permission (dashboard operativa)
  unclaimedActivities: [], // unassigned activities in user's permission domain
  // Fix 6: scoped loading/error per fetch type
  eventLoading: false,
  myLoading: false,
  dashboardLoading: false,
  unclaimedLoading: false,
  eventError: null,
  myError: null,
  dashboardError: null,
  unclaimedError: null,
  completedTodayCount: 0,
  completedTodayTeamCount: 0,

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

  fetchCompletedToday: async (userId) => {
    const dayStart = todayISO() + 'T00:00:00'
    const dayEnd = todayISO() + 'T23:59:59'
    const [mine, team] = await Promise.all([
      userId
        ? supabase.from('event_activities').select('id', { count: 'exact', head: true })
            .eq('stato', 'completata').eq('completata_da', userId)
            .gte('completata_il', dayStart).lte('completata_il', dayEnd)
        : Promise.resolve({ count: 0 }),
      supabase.from('event_activities').select('id', { count: 'exact', head: true })
        .eq('stato', 'completata')
        .gte('completata_il', dayStart).lte('completata_il', dayEnd),
    ])
    set({
      completedTodayCount: userId ? (mine.count || 0) : (team.count || 0),
      completedTodayTeamCount: team.count || 0,
    })
  },

  fetchUnclaimedActivities: async (permissions) => {
    set({ unclaimedLoading: true, unclaimedError: null })
    let query = supabase
      .from('event_activities')
      .select(`
        *,
        evento:events!event_activities_event_id_fkey(id, titolo, data_inizio, data_fine, stato)
      `)
      .in('stato', ['da_fare', 'in_corso'])
      .is('assegnato_a', null)
      .order('deadline', { ascending: true, nullsFirst: false })

    if (permissions && permissions.length > 0) {
      query = query.in('permesso_responsabile', permissions)
    }

    const { data, error } = await query
    set({ unclaimedActivities: data || [], unclaimedLoading: false, unclaimedError: error?.message })
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
    // Clear existing activities before re-creating from template
    await supabase
      .from('event_activities')
      .delete()
      .eq('event_id', eventId)

    const { data: templates } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', tipoEvento)
      .eq('modalita', modalita)
      .limit(1)
    if (!templates?.length) return { data: null, error: `Nessun template per ${tipoEvento} ${modalita}. Crealo in Amministrazione → Template.` }

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
        unclaimedActivities: state.unclaimedActivities.filter(a => a.id !== id || !data.assegnato_a),
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

  revertActivity: async (id, currentStato) => {
    const prevStato = currentStato === 'completata' ? 'in_corso' : 'da_fare'
    const updates = { stato: prevStato }
    if (currentStato === 'completata') {
      updates.completata_il = null
      updates.completata_da = null
    }
    return get().updateActivity(id, updates)
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

  // Batch activity status for readiness cards (returns counts, not just semaphore color)
  fetchBatchActivityStatus: async (eventIds) => {
    if (!eventIds?.length) return {}
    const { data, error } = await supabase
      .from('event_activities')
      .select('event_id, stato, obbligatoria, deadline')
      .in('event_id', eventIds)
      .neq('stato', 'disattivata')
    if (error || !data) return {}
    const today = todayISO()
    const map = {}
    for (const a of data) {
      if (!map[a.event_id]) map[a.event_id] = { total: 0, completate: 0, inRitardo: 0 }
      map[a.event_id].total++
      if (a.stato === 'completata') map[a.event_id].completate++
      if (a.obbligatoria && a.deadline && a.deadline < today && a.stato !== 'completata') map[a.event_id].inRitardo++
    }
    return map
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

  createTemplate: async (tipoEvento, modalita) => {
    const nome = `${tipoEvento} ${modalita}`
    const { data, error } = await supabase
      .from('event_templates')
      .insert({ tipo_evento: tipoEvento, modalita, nome_template: nome })
      .select()
      .single()
    return { data, error }
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase
      .from('event_templates')
      .delete()
      .eq('id', id)
    return { error }
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

  // ── Program template items ──

  fetchProgramTemplateItems: async (templateId) => {
    const { data, error } = await supabase
      .from('template_items')
      .select('*, tipo_ref:sub_activity_types(id, nome)')
      .eq('template_id', templateId)
      .eq('tipo', 'sub_activity')
      .order('ordine')
    return { data: data || [], error }
  },

  createProgramTemplateItem: async (templateId, item) => {
    const { data, error } = await supabase
      .from('template_items')
      .insert({
        template_id: templateId,
        tipo: 'sub_activity',
        descrizione: item.descrizione || '',
        ...item,
      })
      .select('*, tipo_ref:sub_activity_types(id, nome)')
      .single()
    return { data, error }
  },

  updateProgramTemplateItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('template_items')
      .update(updates)
      .eq('id', id)
      .select('*, tipo_ref:sub_activity_types(id, nome)')
      .single()
    return { data, error }
  },

  deleteProgramTemplateItem: async (id) => {
    const { error } = await supabase
      .from('template_items')
      .delete()
      .eq('id', id)
    return { data: null, error }
  },

  instantiateProgramTemplate: async (eventId, tipoEvento, modalita, dataInizio) => {
    // Guard: prevent duplicate instantiation
    const { count } = await supabase
      .from('event_sub_activities')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
    if (count > 0) return { data: null, error: 'Programma già presente per questo evento' }

    // Find template (exact match first, then fallback to tipo_evento only)
    const { data: templates } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', tipoEvento)
      .eq('modalita', modalita)
      .limit(1)
    if (!templates?.length) return { data: null, error: `Nessun template per ${tipoEvento} ${modalita}. Crealo in Amministrazione → Template.` }

    // Fetch program items
    const { data: items } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templates[0].id)
      .eq('tipo', 'sub_activity')
      .order('ordine')
    if (!items?.length) return { data: null, error: 'Nessuna voce di programma nel template' }

    // Build sub-activities from template
    const subActivities = items.map(item => {
      let data_ora = null
      if (dataInizio && item.orario) {
        const dayOffset = (item.giorno || 1) - 1
        const timeStr = item.orario.length <= 5 ? item.orario + ':00' : item.orario
        const baseDate = new Date(dataInizio + 'T' + timeStr)
        baseDate.setDate(baseDate.getDate() + dayOffset)
        data_ora = toISO(baseDate)
      }
      return {
        event_id: eventId,
        tipo_id: item.tipo_sotto_attivita_id,
        data_ora,
        durata_minuti: item.durata_minuti || null,
        luogo: item.luogo || null,
        fornitore: item.fornitore || null,
        note: item.note || null,
        confermata: false,
      }
    })

    const { data, error } = await supabase
      .from('event_sub_activities')
      .insert(subActivities)
      .select('*, tipo_ref:sub_activity_types(id, nome)')
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  // ── Template materials ──

  searchProducts: async (term) => {
    let query = supabase
      .from('products')
      .select('id, nome, codice, tipo, foto_url, brand:brands(id, nome)')
      .eq('attivo', true)
      .order('nome')
      .limit(20)
    if (term) query = query.ilike('nome', `%${term}%`)
    const { data, error } = await query
    return { data: data || [], error }
  },

  fetchTemplateMaterials: async (templateId) => {
    const { data, error } = await supabase
      .from('template_materials')
      .select('*, product:products(id, nome, codice, tipo, foto_url, brand:brands(id, nome))')
      .eq('template_id', templateId)
      .order('ordine')
    return { data: data || [], error }
  },

  createTemplateMaterial: async (templateId, item) => {
    const { data, error } = await supabase
      .from('template_materials')
      .insert({ template_id: templateId, ...item })
      .select('*, product:products(id, nome, codice, tipo, foto_url, brand:brands(id, nome))')
      .single()
    return { data, error }
  },

  updateTemplateMaterial: async (id, updates) => {
    const { data, error } = await supabase
      .from('template_materials')
      .update(updates)
      .eq('id', id)
      .select('*, product:products(id, nome, codice, tipo, foto_url, brand:brands(id, nome))')
      .single()
    return { data, error }
  },

  deleteTemplateMaterial: async (id) => {
    const { error } = await supabase.from('template_materials').delete().eq('id', id)
    return { error }
  },

  instantiateMaterialTemplate: async (eventId, tipoEvento, modalita, userId) => {
    // Guard: prevent duplicate
    const { count } = await supabase
      .from('event_materials')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
    if (count > 0) return { data: null, error: 'Materiale già presente per questo evento' }

    const { data: templates } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', tipoEvento)
      .eq('modalita', modalita)
      .limit(1)
    if (!templates?.length) return { data: null, error: `Nessun template per ${tipoEvento} ${modalita}. Crealo in Amministrazione → Template.` }

    const { data: items } = await supabase
      .from('template_materials')
      .select('*')
      .eq('template_id', templates[0].id)
      .order('ordine')
    if (!items?.length) return { data: null, error: 'Nessun materiale nel template' }

    const rows = items.map(item => ({
      event_id: eventId,
      product_id: item.product_id,
      quantita: item.quantita,
      note_commerciale: item.note || null,
      stato: 'richiesto',
      richiesto_da: userId,
    }))

    const { data, error } = await supabase
      .from('event_materials')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },
}))
