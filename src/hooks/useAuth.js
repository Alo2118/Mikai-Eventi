import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  permissions: [],
  loading: true,
  error: null,
  profileError: null,
  _authSubscription: null,

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

    // Idempotent: unsubscribe any prior listener before re-attaching (StrictMode + hot reload safe)
    get()._authSubscription?.unsubscribe?.()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user ?? null })
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          if (get().profile?.id !== session.user.id) {
            await get().loadProfile(session.user.id)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        set({ profile: null, permissions: [] })
      }
    })
    set({ _authSubscription: subscription })
  },

  loadProfile: async (userId) => {
    try {
      const [profileRes, permsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('user_permissions').select('permission').eq('user_id', userId),
      ])
      // Non ingoiare l'errore: se il profilo non si carica l'utente resterebbe
      // autenticato ma "invisibile" (nessun ruolo/permesso) senza spiegazione.
      if (profileRes.error || !profileRes.data) {
        set({ profile: null, permissions: [], profileError: 'Non siamo riusciti a caricare il tuo profilo. Riprova.' })
        return
      }
      set({
        profile: profileRes.data,
        permissions: (permsRes.data || []).map(p => p.permission),
        profileError: null,
      })
    } catch (err) {
      set({ profile: null, permissions: [], profileError: 'Non siamo riusciti a caricare il tuo profilo. Riprova.' })
    }
  },

  hasPermission: (perm) => get().profile?.ruolo === 'admin' || get().permissions.includes(perm),

  hasRole: (...roles) => roles.includes(get().profile?.ruolo),

  hasOperativeRole: (role) => (get().profile?.ruoli_operativi || []).includes(role),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  },

  changePassword: async (currentPassword, newPassword) => {
    const email = get().user?.email
    if (!email) return { error: 'Sessione non valida' }

    // Verify current password using a separate client to avoid session interference
    const { createClient } = await import('@supabase/supabase-js')
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
    const { error: verifyError } = await tempClient.auth.signInWithPassword({ email, password: currentPassword })
    if (verifyError) return { error: 'La password attuale non è corretta' }

    // Update password on the real session
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, permissions: [] })
  },
}))
