import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO, todayISO, calculateDeadline } from '../lib/date-utils'

// Presentazione toast condivisa per l'esito di instantiateTemplate (stesso contratto
// di ritorno: { noTemplate } / { tmplError } / { added }). Colocata col contratto per
// non duplicare le copy tra EventApprovalBar e DashboardStrategica.
export function notifyTemplateInstantiation(addToast, { noTemplate, tmplError, added } = {}) {
  if (noTemplate) {
    addToast('Nessun modello attività per questo tipo: crea le attività manualmente.', 'info')
  } else if (tmplError) {
    addToast('Attività dal modello non create. Puoi crearle dalla tab Preparazione.', 'warning')
  } else if (added > 0) {
    addToast(`${added} attività create dal modello.`, 'success')
  }
}

export const useActivitiesStore = create((set, get) => ({
  // State — separate keys to avoid collisions between views
  eventActivities: [],     // activities for a single event (convergence dashboard)
  myActivities: [],        // activities assigned to current user (banner + "le mie attività")
  dashboardActivities: [], // cross-event activities by permission (dashboard operativa)
  unclaimedActivities: [], // unassigned activities in user's permission domain
  // Scoped loading/error per fetch type
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
      .select('id, event_id, descrizione, stato, deadline, ordine, obbligatoria, post_evento, dipende_da, categoria, permesso_responsabile, assegnato_a, tipo_verifica, verifica_automatica, completata_il, completata_da, note, assegnato:users!event_activities_assegnato_a_fkey(id, nome, cognome)')
      .eq('event_id', eventId)
      .order('ordine', { ascending: true, nullsFirst: false })
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

  fetchEventSemaphores: async (eventIds) => {
    if (!eventIds?.length) return {}
    const { data } = await supabase
      .from('event_activities')
      .select('event_id, stato, obbligatoria, post_evento, deadline')
      .in('event_id', eventIds)
      .neq('stato', 'disattivata')

    const grouped = {}
    for (const row of (data || [])) {
      if (!grouped[row.event_id]) grouped[row.event_id] = []
      grouped[row.event_id].push(row)
    }

    const today = todayISO()
    const semaphores = {}
    for (const eid of eventIds) {
      const activities = grouped[eid] || []
      const mandatory = activities.filter(a => a.obbligatoria && !a.post_evento)
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

  fetchBatchActivityStatus: async (eventIds) => {
    if (!eventIds?.length) return {}
    const { data, error } = await supabase
      .from('event_activities')
      .select('event_id, stato, obbligatoria, post_evento, deadline')
      .in('event_id', eventIds)
      .neq('stato', 'disattivata')
    if (error || !data) return {}
    const today = todayISO()
    const map = {}
    for (const a of data) {
      if (a.post_evento) continue
      if (!map[a.event_id]) map[a.event_id] = { total: 0, completate: 0, inRitardo: 0 }
      map[a.event_id].total++
      if (a.stato === 'completata') map[a.event_id].completate++
      if (a.obbligatoria && a.deadline && a.deadline < today && a.stato !== 'completata') map[a.event_id].inRitardo++
    }
    return map
  },

  // Istanzia la checklist dal modello per (tipo_evento, modalità).
  // ADDITIVA e IDEMPOTENTE: non cancella nulla (le attività custom restano),
  // inserisce solo gli item del template non ancora presenti per l'evento.
  // Contratto di ritorno:
  //  - { data, error: null, added }        → ok (added può essere 0 se già tutto presente)
  //  - { data: null, error: null, noTemplate: true } → nessun modello (non-bloccante)
  //  - { data: null, error: '…' }          → errore di query (bloccante per il chiamante)
  instantiateTemplate: async (eventId, tipoEvento, modalita, dataInizio) => {
    const { data: templates, error: tmplError } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', tipoEvento)
      .eq('modalita', modalita)
      .limit(1)
    if (tmplError) return { data: null, error: tmplError.message }
    // Nessun modello per questa combinazione: non è un errore, il chiamante crea a mano.
    if (!templates?.length) return { data: null, error: null, noTemplate: true }

    const { data: items, error: itemsError } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templates[0].id)
      .eq('tipo', 'checklist')
      .order('ordine')
    if (itemsError) return { data: null, error: itemsError.message }
    if (!items || items.length === 0) {
      await get().fetchEventActivities(eventId)
      return { data: [], error: null, added: 0 }
    }

    // Attività già presenti: base per idempotenza (niente doppioni) e per il seeding
    // di ordine (append in coda alla categoria) e dipendenze (link verso item esistenti).
    // template_item_id è il link robusto; il match (categoria, descrizione) è una guardia
    // anti-doppione SOLO tra righe esse stesse template-originate — un'attività custom con
    // lo stesso testo NON deve mascherare l'item del modello (perderebbe obbligatoria/
    // deadline/tipo_verifica). dipende_da serve per il ricollegamento delle dipendenze.
    const { data: existing, error: existingError } = await supabase
      .from('event_activities')
      .select('id, template_item_id, categoria, descrizione, ordine, dipende_da')
      .eq('event_id', eventId)
    if (existingError) return { data: null, error: existingError.message }

    const existingByTemplateItem = {}
    const existingKeys = new Set()
    const maxOrdineByCat = {}
    const currentDepByActivity = {}
    for (const a of (existing || [])) {
      currentDepByActivity[a.id] = a.dipende_da ?? null
      // Solo le righe template-originate contano per l'idempotenza logica.
      if (a.template_item_id) {
        existingByTemplateItem[a.template_item_id] = a.id
        existingKeys.add(`${a.categoria || 'organizzazione'}||${a.descrizione}`)
      }
      const cat = a.categoria || 'organizzazione'
      if (a.ordine != null) maxOrdineByCat[cat] = Math.max(maxOrdineByCat[cat] ?? -1, a.ordine)
    }

    // Solo gli item non ancora presenti (per link o per categoria+descrizione).
    const newItems = items.filter(item =>
      !existingByTemplateItem[item.id] &&
      !existingKeys.has(`${item.categoria || 'organizzazione'}||${item.descrizione}`)
    )
    if (newItems.length === 0) {
      await get().fetchEventActivities(eventId)
      return { data: [], error: null, added: 0 }
    }

    const eventDate = new Date(dataInizio)
    const today = todayISO()

    // Semina l'ordine manuale appendendo in coda alla categoria: parte da
    // max(ordine esistente)+1, poi numera progressivamente i nuovi item.
    const ordineByCat = {}
    const activitiesToInsert = newItems.map(item => {
      const categoria = item.categoria || 'organizzazione'
      const base = (maxOrdineByCat[categoria] ?? -1) + 1
      const offset = ordineByCat[categoria] ?? 0
      ordineByCat[categoria] = offset + 1
      // Clamp lead-time: per eventi proposti all'ultimo, le deadline calcolate che
      // cadrebbero già nel passato vengono portate a oggi, così le attività risultano
      // "urgenti/oggi" invece che nate già in ritardo (semaforo rosso demoralizzante).
      const rawDeadline = calculateDeadline(eventDate, item.giorni_prima_evento)
      const deadline = rawDeadline && rawDeadline < today ? today : rawDeadline
      return {
        event_id: eventId,
        template_item_id: item.id,
        descrizione: item.descrizione,
        categoria: item.categoria,
        permesso_responsabile: item.permesso_responsabile,
        stato: 'da_fare',
        deadline,
        obbligatoria: item.obbligatorio,
        post_evento: item.post_evento || false,
        tipo_verifica: item.tipo_verifica || 'manuale',
        verifica_automatica: item.verifica_automatica,
        ordine: base + offset,
      }
    })

    const { data: inserted, error } = await supabase
      .from('event_activities')
      .insert(activitiesToInsert)
      .select()
    if (error) return { data: null, error: error.message }

    // Mappa template_item_id → activity id combinando esistenti + nuovi, così le
    // dipendenze si ricostruiscono anche verso item già presenti nell'evento.
    const templateIdMap = { ...existingByTemplateItem }
    for (const act of (inserted || [])) {
      if (act.template_item_id) templateIdMap[act.template_item_id] = act.id
      currentDepByActivity[act.id] = act.dipende_da ?? null
    }
    // Indice item modello per id, per risalire alla dipendenza dichiarata.
    const itemById = {}
    for (const item of items) itemById[item.id] = item
    // Collega le dipendenze per OGNI attività template-originata (nuova o già presente)
    // il cui item modello dichiara un dipende_da ora risolvibile nell'evento: copre anche
    // il caso di un'attività preesistente che dipende da un item appena inserito. Salta se
    // il link corrente è già quello giusto (niente update ridondanti).
    const depUpdates = []
    for (const [templateItemId, activityId] of Object.entries(templateIdMap)) {
      const item = itemById[templateItemId]
      if (!item?.dipende_da) continue
      const targetId = templateIdMap[item.dipende_da]
      if (!targetId || currentDepByActivity[activityId] === targetId) continue
      depUpdates.push(
        supabase
          .from('event_activities')
          .update({ dipende_da: targetId })
          .eq('id', activityId)
      )
    }
    if (depUpdates.length > 0) {
      const results = await Promise.all(depUpdates)
      results.forEach(r => {
        if (r.error) console.warn('Errore nel collegamento dipendenza:', r.error.message)
      })
    }

    await get().fetchEventActivities(eventId)
    return { data: inserted, error: null, added: inserted?.length || 0 }
  },

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

  assignActivity: async (id, userId) => get().updateActivity(id, { assegnato_a: userId }),

  completeActivity: async (id, userId) => get().updateActivity(id, {
    stato: 'completata',
    completata_il: nowISO(),
    completata_da: userId,
  }),

  startActivity: async (id) => get().updateActivity(id, { stato: 'in_corso' }),

  revertActivity: async (id, currentStato) => {
    const prevStato = currentStato === 'completata' ? 'in_corso' : 'da_fare'
    const updates = { stato: prevStato }
    if (currentStato === 'completata') {
      updates.completata_il = null
      updates.completata_da = null
    }
    return get().updateActivity(id, updates)
  },

  disableActivity: async (id) => get().updateActivity(id, { stato: 'disattivata' }),

  // Riordino manuale dentro una categoria: riceve gli id già nell'ordine voluto e
  // riassegna ordine = 0..n. Update ottimistico + batch DB, rollback via refetch.
  reorderCategory: async (orderedIds) => {
    if (!orderedIds?.length) return { error: null }
    const eventId = get().eventActivities.find(a => a.id === orderedIds[0])?.event_id
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]))
    set(state => ({
      eventActivities: state.eventActivities.map(a =>
        orderMap.has(a.id) ? { ...a, ordine: orderMap.get(a.id) } : a
      ),
    }))
    const results = await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from('event_activities').update({ ordine: idx }).eq('id', id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed) {
      if (eventId) await get().fetchEventActivities(eventId)
      return { error: failed.error.message }
    }
    return { error: null }
  },

  addCustomActivity: async (eventId, activity) => {
    // In coda alla sua categoria: ordine = max(ordine della categoria) + 1
    const categoria = activity.categoria || 'organizzazione'
    const sameCat = get().eventActivities.filter(a => (a.categoria || 'organizzazione') === categoria)
    const nextOrdine = sameCat.reduce((max, a) => Math.max(max, a.ordine ?? -1), -1) + 1
    const { data, error } = await supabase
      .from('event_activities')
      .insert({ event_id: eventId, ordine: nextOrdine, ...activity })
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
      .select('titolo, data_inizio, data_fine, indirizzo_spedizione, spedizione_data, modalita')
      .eq('id', eventId)
      .single()

    const { data: materials } = await supabase
      .from('event_materials')
      .select('id, stato')
      .eq('event_id', eventId)

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
        if (event?.modalita === 'contributo') return true
        return !!event?.spedizione_data
      },
    }

    const idsToComplete = autoActivities
      .filter(a => {
        const checkFn = checks[a.verifica_automatica]
        return checkFn && checkFn()
      })
      .map(a => a.id)

    if (idsToComplete.length === 0) return { verified: 0 }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('event_activities')
      .update({
        stato: 'completata',
        completata_il: nowISO(),
        completata_da: user?.id || null,
        note: 'Verificata automaticamente',
      })
      .in('id', idsToComplete)

    await get().fetchEventActivities(eventId)
    return { verified: idsToComplete.length }
  },
}))
