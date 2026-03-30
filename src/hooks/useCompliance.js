import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO } from '../lib/date-utils'

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
      hcpCoinvolti,
      hcpTotali: hcpTotali || 0,
      tovCount: (tovData || []).length,
      perTipo,
    }

    set({ stats, statsLoading: false })
    return { data: stats }
  },
}))
