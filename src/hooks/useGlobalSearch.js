import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { TIPO_EVENTO, STATO_EVENTO } from '../lib/constants'

export const useGlobalSearchStore = create((set) => ({
  results: [],
  loading: false,

  search: async (q) => {
    set({ loading: true })
    const searchPattern = `%${q}%`

    const [eventsRes, contactsRes, materialsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id, titolo, tipo_evento, stato, luogo')
        .or(`titolo.ilike.${searchPattern},luogo.ilike.${searchPattern}`)
        .order('data_inizio', { ascending: false })
        .limit(5),
      supabase
        .from('contacts')
        .select('id, nome, cognome, azienda, tipo_contatto')
        .eq('attivo', true)
        .or(`nome.ilike.${searchPattern},cognome.ilike.${searchPattern},azienda.ilike.${searchPattern}`)
        .order('cognome')
        .limit(5),
      supabase
        .from('materials')
        .select('id, nome, codice')
        .eq('attivo', true)
        .or(`nome.ilike.${searchPattern},codice.ilike.${searchPattern}`)
        .order('nome')
        .limit(5),
    ])

    const items = []

    for (const e of eventsRes.data || []) {
      items.push({
        id: e.id,
        category: 'evento',
        categoryLabel: 'Evento',
        title: e.titolo,
        subtitle: [TIPO_EVENTO[e.tipo_evento], STATO_EVENTO[e.stato], e.luogo].filter(Boolean).join(' · '),
        tipo: e.tipo_evento,
        path: `/eventi/${e.id}`,
      })
    }

    for (const c of contactsRes.data || []) {
      items.push({
        id: c.id,
        category: 'contatto',
        categoryLabel: 'Contatto',
        title: `${c.cognome} ${c.nome}`,
        subtitle: c.azienda || c.tipo_contatto,
        path: `/contatti/${c.id}`,
      })
    }

    for (const m of materialsRes.data || []) {
      items.push({
        id: m.id,
        category: 'materiale',
        categoryLabel: 'Materiale',
        title: m.nome,
        subtitle: m.codice,
        path: `/materiale/${m.id}`,
      })
    }

    set({ results: items, loading: false })
    return { data: items, error: null }
  },

  clearResults: () => set({ results: [], loading: false }),
}))
