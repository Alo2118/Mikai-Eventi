import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO, todayISO } from '../lib/date-utils'

// Deriva il periodo di riferimento (semestre) da una data ISO (YYYY-MM-DD).
// Sunshine Act: la reportistica ToV è tipicamente semestrale.
function periodoFromDate(dataISO) {
  const iso = dataISO || todayISO()
  const anno = iso.slice(0, 4)
  const mese = Number(iso.slice(5, 7))
  return `${anno}-S${mese <= 6 ? 1 : 2}`
}

export const useComplianceStore = create((set, get) => ({
  // HCP
  hcpList: [],
  hcpDetail: null,
  hcpLoading: false,

  // ToV
  tovList: [],
  tovDetail: null,
  tovLoading: false,

  // Interazioni
  interazioni: [],
  interazioniLoading: false,

  // Dashboard stats
  stats: null,
  statsLoading: false,

  error: null,

  // ═══════════════════════════════════════════
  // HCP Actions
  // ═══════════════════════════════════════════

  fetchHcpList: async (filters = {}) => {
    set({ hcpLoading: true, error: null })
    let query = supabase
      .from('hcp_professionisti')
      .select(`
        *,
        contatto:contacts!hcp_professionisti_contatto_id_fkey(id, nome, cognome, email, telefono, azienda, specializzazione)
      `)
      .order('created_at', { ascending: false })

    if (filters.categoria) query = query.eq('categoria', filters.categoria)

    let { data, error } = await query.limit(200)

    // Client-side search on joined contact fields (PostgREST doesn't support .or() on joined columns)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      data = (data || []).filter(h =>
        h.contatto?.nome?.toLowerCase().includes(s) ||
        h.contatto?.cognome?.toLowerCase().includes(s) ||
        h.contatto?.azienda?.toLowerCase().includes(s)
      )
    }

    set({ hcpList: data || [], hcpLoading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  fetchHcpDetail: async (id) => {
    set({ hcpLoading: true, error: null })
    const { data, error } = await supabase
      .from('hcp_professionisti')
      .select(`
        *,
        contatto:contacts!hcp_professionisti_contatto_id_fkey(id, nome, cognome, email, telefono, azienda, specializzazione, ruolo_medico)
      `)
      .eq('id', id)
      .single()

    set({ hcpDetail: data, hcpLoading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  createHcp: async (hcpData) => {
    const { data, error } = await supabase
      .from('hcp_professionisti')
      .insert(hcpData)
      .select()
      .single()

    if (!error) {
      const list = get().hcpList
      set({ hcpList: [data, ...list] })
    }
    return { data, error: error?.message || null }
  },

  updateHcp: async (id, updates) => {
    const { data, error } = await supabase
      .from('hcp_professionisti')
      .update({ ...updates, updated_at: nowISO() })
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      set({
        hcpList: get().hcpList.map(h => h.id === id ? { ...h, ...data } : h),
        hcpDetail: get().hcpDetail?.id === id ? { ...get().hcpDetail, ...data } : get().hcpDetail,
      })
    }
    return { data, error: error?.message || null }
  },

  deleteHcp: async (id) => {
    const { error } = await supabase
      .from('hcp_professionisti')
      .delete()
      .eq('id', id)

    if (!error) {
      set({ hcpList: get().hcpList.filter(h => h.id !== id) })
    }
    return { error: error?.message || null }
  },

  // ═══════════════════════════════════════════
  // ToV Actions
  // ═══════════════════════════════════════════

  fetchTovList: async (filters = {}) => {
    set({ tovLoading: true, error: null })
    let query = supabase
      .from('trasferimenti_valore')
      .select(`
        *,
        hcp:hcp_professionisti!trasferimenti_valore_hcp_id_fkey(
          id,
          contatto:contacts!hcp_professionisti_contatto_id_fkey(id, nome, cognome, azienda)
        ),
        evento:events!trasferimenti_valore_evento_id_fkey(id, titolo),
        autore:users!trasferimenti_valore_created_by_fkey(id, nome, cognome),
        verificatore:users!trasferimenti_valore_verified_by_fkey(id, nome, cognome)
      `)
      .order('data_trasferimento', { ascending: false })

    if (filters.stato) query = query.eq('stato', filters.stato)
    if (filters.tipo) query = query.eq('tipo', filters.tipo)
    if (filters.hcp_id) query = query.eq('hcp_id', filters.hcp_id)
    if (filters.evento_id) query = query.eq('evento_id', filters.evento_id)
    if (filters.periodo) query = query.eq('periodo_riferimento', filters.periodo)
    if (filters.da) query = query.gte('data_trasferimento', filters.da)
    if (filters.a) query = query.lte('data_trasferimento', filters.a)

    const { data, error } = await query.limit(500)
    set({ tovList: data || [], tovLoading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  fetchTovDetail: async (id) => {
    set({ tovLoading: true, error: null })
    const { data, error } = await supabase
      .from('trasferimenti_valore')
      .select(`
        *,
        hcp:hcp_professionisti!trasferimenti_valore_hcp_id_fkey(
          id, categoria, specializzazione,
          contatto:contacts!hcp_professionisti_contatto_id_fkey(id, nome, cognome, email, azienda)
        ),
        evento:events!trasferimenti_valore_evento_id_fkey(id, titolo, data_inizio),
        autore:users!trasferimenti_valore_created_by_fkey(id, nome, cognome),
        verificatore:users!trasferimenti_valore_verified_by_fkey(id, nome, cognome)
      `)
      .eq('id', id)
      .single()

    set({ tovDetail: data, tovLoading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  createTov: async (tovData) => {
    const { data, error } = await supabase
      .from('trasferimenti_valore')
      .insert(tovData)
      .select()
      .single()

    if (!error) {
      // Refresh list to get joined data
      get().fetchTovList()
    }
    return { data, error: error?.message || null }
  },

  updateTov: async (id, updates) => {
    const { data, error } = await supabase
      .from('trasferimenti_valore')
      .update({ ...updates, updated_at: nowISO() })
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      get().fetchTovList()
      if (get().tovDetail?.id === id) get().fetchTovDetail(id)
    }
    return { data, error: error?.message || null }
  },

  verifyTov: async (id) => {
    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    const { data, error } = await supabase
      .from('trasferimenti_valore')
      .update({
        stato: 'verificato',
        verified_by: userId,
        verified_at: nowISO(),
        updated_at: nowISO(),
      })
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      get().fetchTovList()
      if (get().tovDetail?.id === id) get().fetchTovDetail(id)
    }
    return { data, error: error?.message || null }
  },

  flagTov: async (id) => {
    const { data, error } = await supabase
      .from('trasferimenti_valore')
      .update({
        stato: 'segnalato',
        updated_at: nowISO(),
      })
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      get().fetchTovList()
      if (get().tovDetail?.id === id) get().fetchTovDetail(id)
    }
    return { data, error: error?.message || null }
  },

  // ═══════════════════════════════════════════
  // Interazioni Actions
  // ═══════════════════════════════════════════

  fetchInterazioni: async (filters = {}) => {
    set({ interazioniLoading: true, error: null })
    let query = supabase
      .from('interazioni_hcp')
      .select(`
        *,
        hcp:hcp_professionisti!interazioni_hcp_hcp_id_fkey(
          id,
          contatto:contacts!hcp_professionisti_contatto_id_fkey(id, nome, cognome)
        ),
        evento:events!interazioni_hcp_evento_id_fkey(id, titolo),
        utente:users!interazioni_hcp_user_id_fkey(id, nome, cognome)
      `)
      .order('data_interazione', { ascending: false })

    if (filters.hcp_id) query = query.eq('hcp_id', filters.hcp_id)
    if (filters.evento_id) query = query.eq('evento_id', filters.evento_id)
    if (filters.tipo) query = query.eq('tipo', filters.tipo)

    const { data, error } = await query.limit(500)
    set({ interazioni: data || [], interazioniLoading: false, error: error?.message || null })
    return { data, error: error?.message || null }
  },

  createInterazione: async (interazioneData) => {
    const { data, error } = await supabase
      .from('interazioni_hcp')
      .insert(interazioneData)
      .select()
      .single()

    if (!error) {
      get().fetchInterazioni(interazioneData.hcp_id ? { hcp_id: interazioneData.hcp_id } : {})
    }
    return { data, error: error?.message || null }
  },

  // ═══════════════════════════════════════════
  // Dashboard Stats
  // ═══════════════════════════════════════════

  fetchDashboardStats: async (periodo) => {
    set({ statsLoading: true, error: null })

    // Fetch ToV totals
    let tovQuery = supabase
      .from('trasferimenti_valore')
      .select('tipo, importo, stato, hcp_id')

    if (periodo) tovQuery = tovQuery.eq('periodo_riferimento', periodo)

    const { data: tovData, error: tovError } = await tovQuery

    if (tovError) {
      set({ statsLoading: false, error: tovError.message || null })
      return { error: tovError.message || null }
    }

    // Compute stats
    const totaleImporto = (tovData || []).reduce((sum, t) => sum + Number(t.importo), 0)
    const daVerificare = (tovData || []).filter(t => t.stato === 'registrato').length
    // Verificati non ancora rendicontati (pubblicati alla disclosure) vs già rendicontati
    const daRendicontare = (tovData || []).filter(t => t.stato === 'verificato').length
    const rendicontati = (tovData || []).filter(t => t.stato === 'rendicontato').length
    const hcpCoinvolti = new Set((tovData || []).map(t => t.hcp_id)).size

    const perTipo = {}
    for (const t of (tovData || [])) {
      perTipo[t.tipo] = (perTipo[t.tipo] || 0) + Number(t.importo)
    }

    // Fetch HCP count
    const { count: hcpTotali } = await supabase
      .from('hcp_professionisti')
      .select('id', { count: 'exact', head: true })

    const stats = {
      totaleImporto,
      daVerificare,
      daRendicontare,
      rendicontati,
      hcpCoinvolti,
      hcpTotali: hcpTotali || 0,
      tovCount: (tovData || []).length,
      perTipo,
    }

    set({ stats, statsLoading: false })
    return { data: stats }
  },

  // Chiude un periodo di disclosure: marca in blocco i ToV 'verificato' del periodo
  // come 'rendicontato', così alla prossima disclosure si distingue cosa è già stato
  // pubblicato. Richiede un periodo specifico (non "tutti"). Non tocca gli altri stati.
  closePeriod: async (periodo) => {
    if (!periodo) return { data: null, error: 'Seleziona un periodo specifico prima di chiuderlo.' }
    const { data, error } = await supabase
      .from('trasferimenti_valore')
      .update({ stato: 'rendicontato', updated_at: nowISO() })
      .eq('periodo_riferimento', periodo)
      .eq('stato', 'verificato')
      .select('id')

    if (!error) {
      get().fetchDashboardStats(periodo)
      if (get().tovList.length) get().fetchTovList()
    }
    return { data: data || [], error: error?.message || null }
  },

  // ═══════════════════════════════════════════
  // Ponte ospitalità HCP → ToV (bozze suggerite)
  // ═══════════════════════════════════════════

  // Sola lettura: incrocia i partecipanti HCP dell'evento con hotel/trasporti
  // (e relativi costi) e propone bozze di trasferimenti di valore precompilate.
  // NON registra nulla in autonomia: l'utente conferma/modifica nel form ToV.
  // Materia legale → nessuna auto-registrazione silenziosa.
  suggestTovFromEvent: async (event) => {
    const eventId = event?.id
    if (!eventId) return { data: [], error: null }

    const [partRes, hotelRes, transpRes, existingRes] = await Promise.all([
      supabase
        .from('event_participants')
        .select('contact_id, tipo, costo_pasti, contatto:contacts!event_participants_contact_id_fkey(id, nome, cognome, azienda)')
        .eq('event_id', eventId),
      supabase
        .from('event_hotel')
        .select('contact_id, costo, numero_notti, stato')
        .eq('event_id', eventId)
        .not('contact_id', 'is', null),
      supabase
        .from('event_trasporti')
        .select('contact_id, costo, direzione, stato')
        .eq('event_id', eventId)
        .not('contact_id', 'is', null),
      supabase
        .from('trasferimenti_valore')
        .select('hcp_id, tipo')
        .eq('evento_id', eventId),
    ])

    const err = partRes.error || hotelRes.error || transpRes.error || existingRes.error
    if (err) return { data: null, error: err.message || null }

    const participants = partRes.data || []
    const contactIds = participants.map(p => p.contact_id)
    if (contactIds.length === 0) return { data: [], error: null }

    const { data: hcps, error: hcpErr } = await supabase
      .from('hcp_professionisti')
      .select('id, contatto_id, categoria, consenso_privacy')
      .in('contatto_id', contactIds)
    if (hcpErr) return { data: null, error: hcpErr.message || null }

    const hcpByContact = new Map((hcps || []).map(h => [h.contatto_id, h]))
    // ToV già registrati per questo evento: chiave hcp_id|tipo per evitare duplicati
    const existing = new Set((existingRes.data || []).map(t => `${t.hcp_id}|${t.tipo}`))

    // Aggrega i costi per contatto (un HCP può avere più righe hotel/trasporto)
    const sumByContact = (rows) => {
      const m = new Map()
      for (const r of (rows || [])) {
        if (r.costo == null) continue
        m.set(r.contact_id, (m.get(r.contact_id) || 0) + Number(r.costo))
      }
      return m
    }
    const hotelByContact = sumByContact(hotelRes.data)
    const transpByContact = sumByContact(transpRes.data)

    const dataInizio = event.data_inizio || todayISO()
    const periodo = periodoFromDate(dataInizio)
    const titolo = event.titolo || 'evento'

    const suggestions = []
    for (const p of participants) {
      const hcp = hcpByContact.get(p.contact_id)
      if (!hcp) continue
      const nome = `${p.contatto?.cognome || ''} ${p.contatto?.nome || ''}`.trim()
      const base = {
        hcp_id: hcp.id,
        hcp_nome: nome,
        hcp_azienda: p.contatto?.azienda || null,
        categoria: hcp.categoria,
        consenso_privacy: !!hcp.consenso_privacy,
        evento_id: eventId,
        data_trasferimento: dataInizio,
        periodo_riferimento: periodo,
      }

      // Ospitalità = hotel + pasti (entrambi sotto lo stesso tipo ToV 'ospitalita',
      // aggregati in un'unica voce per rispettare l'anti-duplicati hcp_id|tipo).
      const hotelCosto = hotelByContact.get(p.contact_id) || 0
      const pastiCosto = p.costo_pasti != null ? Number(p.costo_pasti) || 0 : 0
      const ospitalitaCosto = hotelCosto + pastiCosto
      if (ospitalitaCosto > 0) {
        const voci = []
        if (hotelCosto > 0) voci.push('hotel')
        if (pastiCosto > 0) voci.push('pasti')
        const vociLabel = voci.join(' + ')
        suggestions.push({
          ...base,
          key: `${hcp.id}-ospitalita`,
          tipo: 'ospitalita',
          dettaglio: vociLabel,
          importo: ospitalitaCosto,
          descrizione: `Ospitalità (${vociLabel}) — ${titolo}`,
          giustificazione: `Ospitalità (${vociLabel}) per la partecipazione all'evento "${titolo}"`,
          giaRegistrato: existing.has(`${hcp.id}|ospitalita`),
        })
      }

      const transpCosto = transpByContact.get(p.contact_id)
      if (transpCosto != null && transpCosto > 0) {
        suggestions.push({
          ...base,
          key: `${hcp.id}-viaggio`,
          tipo: 'viaggio',
          dettaglio: 'trasporti',
          importo: transpCosto,
          descrizione: `Viaggio/trasferimento — ${titolo}`,
          giustificazione: `Trasporto per partecipazione all'evento "${titolo}"`,
          giaRegistrato: existing.has(`${hcp.id}|viaggio`),
        })
      }
    }

    return { data: suggestions, error: null }
  },

  // Sola lettura: righe ToV con consenso HCP, per la reportistica disclosure.
  fetchDisclosureRows: async (periodo) => {
    let query = supabase
      .from('trasferimenti_valore')
      .select(`
        tipo, importo, periodo_riferimento, data_trasferimento, stato,
        hcp:hcp_professionisti!trasferimenti_valore_hcp_id_fkey(
          id, categoria, consenso_privacy,
          contatto:contacts!hcp_professionisti_contatto_id_fkey(nome, cognome, azienda)
        )
      `)
      .order('data_trasferimento', { ascending: false })

    if (periodo) query = query.eq('periodo_riferimento', periodo)

    const { data, error } = await query.limit(2000)
    return { data: data || [], error: error?.message || null }
  },
}))
