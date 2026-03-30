import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  permissions: [],
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user })
        await get().loadProfile(session.user.id)
      }
      set({ session, user: session?.user ?? null, loading: false })
    } catch (err) {
      set({ loading: false, error: err?.message || 'Errore di autenticazione' })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user ?? null })
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Skip loadProfile if profile already loaded for this user (avoids duplicate on INITIAL_SESSION)
          if (get().profile?.id !== session.user.id) {
            await get().loadProfile(session.user.id)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        set({ profile: null, permissions: [] })
      }
    })
  },

  loadProfile: async (userId) => {
    try {
      const [profileRes, permsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('user_permissions').select('permission').eq('user_id', userId),
      ])
      set({
        profile: profileRes.data || null,
        permissions: (permsRes.data || []).map(p => p.permission),
      })
    } catch (err) {
      set({ profile: null, permissions: [] })
    }
  },

  hasPermission: (perm) => get().permissions.includes(perm),

  hasRole: (...roles) => roles.includes(get().profile?.ruolo),

  hasOperativeRole: (role) => (get().profile?.ruoli_operativi || []).includes(role),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, permissions: [] })
  },
}))
