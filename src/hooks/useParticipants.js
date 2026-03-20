import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useParticipantsStore = create((set, get) => ({
  participants: [],
  loading: false,

  fetchEventParticipants: async (eventId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('event_participants')
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono)')
      .eq('event_id', eventId)
      .order('created_at')
    set({ participants: data || [], loading: false })
    return { data, error }
  },

  addParticipant: async (eventId, contactId, tipo) => {
    const { data, error } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, contact_id: contactId, tipo, stato_iscrizione: 'invitato' })
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono)')
      .single()
    if (!error) set(s => ({ participants: [...s.participants, data] }))
    return { data, error }
  },

  updateParticipant: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_participants')
      .update(updates)
      .eq('id', id)
      .select('*, contact:contacts(id, nome, cognome, tipo_contatto, azienda, email, telefono)')
      .single()
    if (!error) set(s => ({ participants: s.participants.map(r => r.id === id ? data : r) }))
    return { data, error }
  },

  removeParticipant: async (id) => {
    const { error } = await supabase.from('event_participants').delete().eq('id', id)
    if (!error) set(s => ({ participants: s.participants.filter(r => r.id !== id) }))
    return { error }
  },
}))
