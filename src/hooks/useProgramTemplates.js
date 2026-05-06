import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { toISO } from '../lib/date-utils'

export const useProgramTemplatesStore = create(() => ({
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
    const { count } = await supabase
      .from('event_sub_activities')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
    if (count > 0) return { data: null, error: 'Programma già presente per questo evento' }

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
      .eq('tipo', 'sub_activity')
      .order('ordine')
    if (!items?.length) return { data: null, error: 'Nessuna voce di programma nel template' }

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
}))
