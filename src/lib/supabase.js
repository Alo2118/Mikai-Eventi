import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Mancano le variabili VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Separate client for admin user creation — doesn't affect current session
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})
