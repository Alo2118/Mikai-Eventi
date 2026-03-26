import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 50

export const useAuditLogStore = create((set, get) => ({
  logs: [],
  loading: false,
  error: null,
  totalCount: 0,
  page: 0,
  hasMore: true,

  fetchLogs: async (filters = {}, page = 0) => {
    set({ loading: true, error: null, page })

    let query = supabase
      .from('activity_log')
      .select(`
        *,
        utente:users!activity_log_eseguito_da_fkey(id, nome, cognome)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.entita_tipo) query = query.eq('entita_tipo', filters.entita_tipo)
    if (filters.azione) query = query.eq('azione', filters.azione)
    if (filters.eseguito_da) query = query.eq('eseguito_da', filters.eseguito_da)
    if (filters.da) query = query.gte('created_at', filters.da)
    if (filters.a) query = query.lte('created_at', filters.a)
    if (filters.entita_id) query = query.eq('entita_id', filters.entita_id)

    const { data, error, count } = await query

    set({
      logs: page === 0 ? (data || []) : [...get().logs, ...(data || [])],
      loading: false,
      error: error?.message,
      totalCount: count || 0,
      hasMore: (data || []).length === PAGE_SIZE,
    })
    return { data, error }
  },

  loadMore: async (filters = {}) => {
    const nextPage = get().page + 1
    return get().fetchLogs(filters, nextPage)
  },

  reset: () => set({ logs: [], page: 0, hasMore: true, totalCount: 0 }),
}))
