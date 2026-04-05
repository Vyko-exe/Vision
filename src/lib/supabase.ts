import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseEnabled = Boolean(url && anonKey)

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseEnabled) return null
  if (!supabaseInstance) {
    supabaseInstance = createClient(url!, anonKey!, {
      auth: { persistSession: false },
    })
  }
  return supabaseInstance
}
