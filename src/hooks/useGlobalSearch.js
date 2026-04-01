import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { TIPO_EVENTO, STATO_EVENTO } from '../lib/constants'

export const useGlobalSearchStore = create((set) => ({
  results: [],
  counts: { evento: 0, contatto: 0, materiale: 0 },
  loading: false,

  search: async (q) => {
    set({ loading: true })
    const searchPattern = `%${q}%`

    const [eventsRes, contactsRes, materialsRes, eventsCount, contactsCount, materialsCount] = await Promise.all([
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
        .select('id, nome, codice_inventario')
        .eq('attivo', true)
        .or(`nome.ilike.${searchPattern},codice_inventario.ilike.${searchPattern}`)
        .order('nome')
        .limit(5),
      // Count queries (head: true returns only count, no rows)
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .or(`titolo.ilike.${searchPattern},luogo.ilike.${searchPattern}`),
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('attivo', true)
        .or(`nome.ilike.${searchPattern},cognome.ilike.${searchPattern},azienda.ilike.${searchPattern}`),
      supabase
        .from('materials')
        .select('*', { count: 'exact', head: true })
        .eq('attivo', true)
        .or(`nome.ilike.${searchPattern},codice_inventario.ilike.${searchPattern}`),
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
        subtitle: m.codice_inventario,
        path: `/materiale/${m.id}`,
      })
    }

    set({
      results: items,
      counts: {
        evento: eventsCount.count ?? 0,
        contatto: contactsCount.count ?? 0,
        materiale: materialsCount.count ?? 0,
      },
      loading: false,
    })
    return { data: items, error: null }
  },

  clearResults: () => set({ results: [], counts: { evento: 0, contatto: 0, materiale: 0 }, loading: false }),
}))
