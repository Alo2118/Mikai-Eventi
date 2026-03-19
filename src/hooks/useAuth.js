import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  permissions: [],
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await get().loadProfile(session.user.id)
    }
    set({ session, user: session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session) {
        await get().loadProfile(session.user.id)
      } else {
        set({ profile: null, permissions: [] })
      }
    })
  },

  loadProfile: async (userId) => {
    const [profileRes, permsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('user_permissions').select('permission').eq('user_id', userId),
    ])
    set({
      profile: profileRes.data,
      permissions: (permsRes.data || []).map(p => p.permission),
    })
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
