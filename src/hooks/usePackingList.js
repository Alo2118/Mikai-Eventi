import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO } from '../lib/date-utils'

export const usePackingListStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchPackingList: async (eventId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('packing_list_items')
      .select('*, event_material:event_materials(*, product:products(id, nome, codice, brand:brands(id, nome)))')
      .eq('event_id', eventId)
      .order('ordine', { ascending: true })
      .order('created_at', { ascending: true })
    set({ items: data || [], loading: false, error: error?.message || null })
    return { data: data || [], error: error?.message || null }
  },

  generatePackingList: async (eventId) => {
    // Fetch approved/in_preparazione event materials
    const { data: materials, error: matError } = await supabase
      .from('event_materials')
      .select('*, product:products(id, nome, codice, brand:brands(id, nome))')
      .eq('event_id', eventId)
      .in('stato', ['approvato', 'in_preparazione'])

    if (matError) return { added: 0, error: matError.message }

    // Fetch existing packing list items to avoid duplicates
    const { data: existing } = await supabase
      .from('packing_list_items')
      .select('event_material_id')
      .eq('event_id', eventId)

    const existingIds = new Set((existing || []).map(e => e.event_material_id).filter(Boolean))
    const newMaterials = (materials || []).filter(m => !existingIds.has(m.id))

    if (newMaterials.length === 0) return { added: 0, error: null }

    const rows = newMaterials.map((m, idx) => {
      const productName = m.product?.nome || 'Prodotto'
      const brandName = m.product?.brand?.nome || ''
      const descrizione = brandName ? `${productName} (${brandName})` : productName
      return {
        event_id: eventId,
        event_material_id: m.id,
        descrizione,
        quantita: m.quantita_approvata || m.quantita || 1,
        imballato: false,
        ordine: (existing?.length || 0) + idx,
      }
    })

    const { error: insertError } = await supabase
      .from('packing_list_items')
      .insert(rows)

    if (insertError) return { added: 0, error: insertError.message }

    await get().fetchPackingList(eventId)
    return { added: newMaterials.length, error: null }
  },

  togglePacked: async (id, packed, userId) => {
    const updates = {
      imballato: packed,
      imballato_da: packed ? userId : null,
      imballato_at: packed ? nowISO() : null,
    }
    const { data, error } = await supabase
      .from('packing_list_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      set(s => ({ items: s.items.map(item => item.id === id ? { ...item, ...data } : item) }))
    }
    return { data, error: error?.message || null }
  },

  addManualItem: async (eventId, descrizione, quantita, note) => {
    const currentItems = get().items
    const { data, error } = await supabase
      .from('packing_list_items')
      .insert({
        event_id: eventId,
        event_material_id: null,
        descrizione,
        quantita: quantita || 1,
        imballato: false,
        note: note || null,
        ordine: currentItems.length,
      })
      .select()
      .single()

    if (!error) {
      set(s => ({ items: [...s.items, data] }))
    }
    return { data, error: error?.message || null }
  },

  assignToCollo: async (id, colloNumero) => {
    const { data, error } = await supabase
      .from('packing_list_items')
      .update({ collo_numero: colloNumero || null })
      .eq('id', id)
      .select()
      .single()
    if (!error) {
      set(s => ({ items: s.items.map(item => item.id === id ? { ...item, ...data } : item) }))
    }
    return { error: error?.message || null }
  },

  // Split a row: move `qty` units to `colloNumero`, reduce original by `qty`
  splitToCollo: async (id, colloNumero, qty) => {
    const item = get().items.find(i => i.id === id)
    if (!item || qty <= 0 || qty > item.quantita) return { error: 'Quantità non valida' }

    if (qty === item.quantita) {
      // Move entire row — just update collo_numero
      return get().assignToCollo(id, colloNumero)
    }

    // Reduce original row quantity
    const { error: updateErr } = await supabase
      .from('packing_list_items')
      .update({ quantita: item.quantita - qty })
      .eq('id', id)

    if (updateErr) return { error: updateErr.message }

    // Create new row in target collo with split quantity
    const { error: insertErr } = await supabase
      .from('packing_list_items')
      .insert({
        event_id: item.event_id,
        event_material_id: item.event_material_id,
        descrizione: item.descrizione,
        quantita: qty,
        collo_numero: colloNumero,
        imballato: false,
        note: item.note,
        ordine: item.ordine,
      })

    if (insertErr) return { error: insertErr.message }

    // Refresh full list
    await get().fetchPackingList(item.event_id)
    return { error: null }
  },

  bulkAssignToCollo: async (ids, colloNumero) => {
    const { error } = await supabase
      .from('packing_list_items')
      .update({ collo_numero: colloNumero || null })
      .in('id', ids)
    if (!error) {
      set(s => ({
        items: s.items.map(item => ids.includes(item.id) ? { ...item, collo_numero: colloNumero || null } : item)
      }))
    }
    return { error: error?.message || null }
  },

  removeItem: async (id) => {
    const item = get().items.find(i => i.id === id)
    if (item?.event_material_id) {
      return { error: 'Le voci collegate al materiale non possono essere eliminate. Rimuovi il materiale dalla lista materiale.' }
    }
    const { error } = await supabase
      .from('packing_list_items')
      .delete()
      .eq('id', id)

    if (!error) {
      set(s => ({ items: s.items.filter(i => i.id !== id) }))
    }
    return { error: error?.message || null }
  },
}))
