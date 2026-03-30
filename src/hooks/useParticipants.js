import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useParticipantsStore = create((set, get) => ({
  participants: [],
  loading: false,

  fetchEventParticipants: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, zona:zones!contacts_zone_id_fkey(id, nome))')
      .eq('event_id', eventId)
      .order('created_at')
    set({ participants: data || [], loading: false })
    return { data, error: error?.message || null }
  },

  addParticipant: async (eventId, contactId, tipo) => {
    const { data, error } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, contact_id: contactId, tipo, stato_iscrizione: 'invitato' })
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, zona:zones!contacts_zone_id_fkey(id, nome))')
      .single()
    if (!error) set(s => ({ participants: [...s.participants, data] }))
    return { data, error: error?.message || null }
  },

  updateParticipant: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_participants')
      .update(updates)
      .eq('id', id)
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, zona:zones!contacts_zone_id_fkey(id, nome))')
      .single()
    if (!error) set(s => ({ participants: s.participants.map(r => r.id === id ? data : r) }))
    return { data, error: error?.message || null }
  },

  removeParticipant: async (id) => {
    const { error } = await supabase.from('event_participants').delete().eq('id', id)
    if (!error) set(s => ({ participants: s.participants.filter(r => r.id !== id) }))
    return { error: error?.message || null }
  },

  bulkAddParticipants: async (eventId, participants) => {
    // Check which contacts are already assigned to this event
    const { data: existing } = await supabase
      .from('event_participants')
      .select('contact_id')
      .eq('event_id', eventId)
    const existingIds = new Set((existing || []).map(e => e.contact_id))
    const toInsert = participants.filter(p => !existingIds.has(p.contactId))
    const skipped = participants.length - toInsert.length

    if (toInsert.length === 0) return { data: { inserted: 0, skipped }, error: null }

    const rows = toInsert.map(p => ({
      event_id: eventId,
      contact_id: p.contactId,
      tipo: p.tipo,
      note: p.note || null,
      stato_iscrizione: 'invitato',
    }))
    const { data, error } = await supabase
      .from('event_participants')
      .insert(rows)
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono, citta, zona:zones!contacts_zone_id_fkey(id, nome))')
    if (!error) get().fetchEventParticipants(eventId)
    return { data: { inserted: toInsert.length, skipped }, error: error?.message || null }
  },
}))
