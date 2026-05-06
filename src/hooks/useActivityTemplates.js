import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useActivityTemplatesStore = create(() => ({
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

  fetchTemplatePreview: async (tipoEvento, modalita) => {
    const { data: templates, error: tplError } = await supabase
      .from('event_templates')
      .select('id')
      .eq('tipo_evento', tipoEvento)
      .eq('modalita', modalita)
      .limit(1)
    if (tplError) return { data: null, error: tplError.message }
    if (!templates?.length) return { data: null, error: `Nessun template per ${tipoEvento} ${modalita}. Crealo in Amministrazione → Template.` }

    const { data: items, error } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templates[0].id)
      .eq('tipo', 'checklist')
      .order('ordine')
    if (error) return { data: null, error: error.message }
    return { data: items || [], error: null }
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
