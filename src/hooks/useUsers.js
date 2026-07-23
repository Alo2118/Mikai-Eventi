import { create } from 'zustand'
import { supabase, supabaseAdmin } from '../lib/supabase'

export const useUsersStore = create((set, get) => ({
  users: [],
  usersLoading: false,

  fetchUsers: async () => {
    set({ usersLoading: true })
    const { data, error } = await supabase.from('users').select('*').order('cognome')
    set({ users: data || [], usersLoading: false })
    return { data: data || [], error: error?.message || null }
  },

  updateUser: async (id, updates) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
    if (!error) get().fetchUsers()
    return { data, error: error?.message || null }
  },

  fetchUserPermissions: async (userId) => {
    const { data, error } = await supabase.from('user_permissions').select('*').eq('user_id', userId)
    return { data: data || [], error: error?.message || null }
  },

  setUserPermissions: async (userId, permissions) => {
    // Use SECURITY DEFINER RPC to avoid self-lockout:
    // separate DELETE+INSERT calls would fail RLS when editing own permissions
    const { error } = await supabase.rpc('set_user_permissions', {
      target_user_id: userId,
      new_permissions: permissions,
    })
    return { error: error?.message || null }
  },

  resetUserPassword: async (userId, newPassword) => {
    const { error } = await supabase.rpc('reset_user_password', {
      target_user_id: userId,
      new_password: newPassword,
    })
    return { error: error?.message || null }
  },

  createUser: async ({ email, password, nome, cognome, ruolo }) => {
    // Use separate client to avoid logging out current admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: { nome, cognome, ruolo },
        emailRedirectTo: undefined,
      },
    })
    if (authError) return { data: null, error: authError.message }

    const userId = authData.user?.id
    if (!userId) return { data: null, error: 'Utente creato ma ID non disponibile' }

    // Trigger handle_new_auth_user creates public.users synchronously.
    // Confirm email immediately so user can log in without verification.
    const { error: confirmError } = await supabase.rpc('confirm_user_email', { user_id: userId })
    if (confirmError) return { data: { id: userId }, error: 'Utente creato ma conferma email fallita: ' + confirmError.message }

    get().fetchUsers()
    return { data: { id: userId }, error: null }
  },
}))
