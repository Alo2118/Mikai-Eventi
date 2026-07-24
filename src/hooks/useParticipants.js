import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useParticipantsStore = create((set, get) => ({
  participants: [],
  loading: false,

  fetchEventParticipants: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, esigenze_alimentari, esigenze_accessibilita, zona:zones!contacts_zone_id_fkey(id, nome))')
      .eq('event_id', eventId)
      .order('created_at')
    set({ participants: data || [], loading: false })
    return { data, error: error?.message || null }
  },

  addParticipant: async (eventId, contactId, tipo) => {
    const { data, error } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, contact_id: contactId, tipo, stato_iscrizione: 'invitato' })
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, esigenze_alimentari, esigenze_accessibilita, zona:zones!contacts_zone_id_fkey(id, nome))')
      .single()
    if (!error) set(s => ({ participants: [...s.participants, data] }))
    return { data, error: error?.message || null }
  },

  updateParticipant: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_participants')
      .update(updates)
      .eq('id', id)
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, esigenze_alimentari, esigenze_accessibilita, zona:zones!contacts_zone_id_fkey(id, nome))')
      .single()
    if (!error) set(s => ({ participants: s.participants.map(r => r.id === id ? data : r) }))
    return { data, error: error?.message || null }
  },

  removeParticipant: async (id) => {
    const { error } = await supabase.from('event_participants').delete().eq('id', id)
    if (!error) set(s => ({ participants: s.participants.filter(r => r.id !== id) }))
    return { error: error?.message || null }
  },

  bulkUpdateStatoIscrizione: async (ids, nuovoStato) => {
    if (!ids?.length) return { data: [], error: null, updated: 0, requested: 0 }
    const { data, error } = await supabase
      .from('event_participants')
      .update({ stato_iscrizione: nuovoStato })
      .in('id', ids)
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, esigenze_alimentari, esigenze_accessibilita, zona:zones!contacts_zone_id_fkey(id, nome))')
    if (error) return { data: null, error: error.message, updated: 0, requested: ids.length }
    const rows = data || []
    const byId = new Map(rows.map(r => [r.id, r]))
    set(s => ({ participants: s.participants.map(r => byId.get(r.id) || r) }))
    return { data: rows, error: null, updated: rows.length, requested: ids.length }
  },

  bulkAddParticipants: async (eventId, participants) => {
    if (!participants?.length) return { data: { inserted: 0, skipped: 0 }, error: null }

    const rows = participants.map(p => ({
      event_id: eventId,
      contact_id: p.contactId,
      tipo: p.tipo,
      note: p.note || null,
      stato_iscrizione: 'invitato',
    }))
    // Upsert con ignoreDuplicates: i contatti già presenti (UNIQUE event_id,contact_id)
    // vengono saltati atomicamente dal DB. Un solo conflitto non fa più fallire l'intero
    // batch (prima il select→filter→insert perdeva la corsa con import concorrenti).
    const { data, error } = await supabase
      .from('event_participants')
      .upsert(rows, { onConflict: 'event_id,contact_id', ignoreDuplicates: true })
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, esigenze_alimentari, esigenze_accessibilita, zona:zones!contacts_zone_id_fkey(id, nome))')
    if (error) return { data: null, error: error.message }
    const inserted = (data || []).length
    get().fetchEventParticipants(eventId)
    return { data: { inserted, skipped: participants.length - inserted }, error: null }
  },
}))
