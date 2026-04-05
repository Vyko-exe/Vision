import { create } from 'zustand'
import { getSupabaseClient, isSupabaseEnabled } from '../lib/supabase'

interface User {
  email: string
  name: string
}

interface AuthStore {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  loginGuest: (username: string) => void
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => Promise<void>
  init: () => Promise<void>
}

const STORAGE_KEY = 'purelike_auth'
const USERS_KEY = 'purelike_users'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: loadUser(),

  init: async () => {
    if (!isSupabaseEnabled) return
    const supabase = getSupabaseClient()!
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const user = {
        email: session.user.email!,
        name: (session.user.user_metadata?.name as string) ?? session.user.email!.split('@')[0],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      set({ user })
    }
  },

  login: async (email, password) => {
    if (isSupabaseEnabled) {
      const supabase = getSupabaseClient()!
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) return false
      const user = {
        email: data.user.email!,
        name: (data.user.user_metadata?.name as string) ?? email.split('@')[0],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      set({ user })
      return true
    }
    // Fallback local
    const raw = localStorage.getItem(USERS_KEY)
    const users: Record<string, { password: string; name: string }> = raw ? JSON.parse(raw) : {}
    const match = users[email.toLowerCase()]
    if (!match || match.password !== password) return false
    const user = { email: email.toLowerCase(), name: match.name }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    set({ user })
    return true
  },

  loginGuest: (username) => {
    const user = { email: `${username.toLowerCase()}@purelike.local`, name: username }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    set({ user })
  },

  signup: async (email, password, name) => {
    if (isSupabaseEnabled) {
      const supabase = getSupabaseClient()!
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error || !data.user) return false
      const user = { email: data.user.email!, name }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      set({ user })
      return true
    }
    // Fallback local
    const raw = localStorage.getItem(USERS_KEY)
    const users: Record<string, { password: string; name: string }> = raw ? JSON.parse(raw) : {}
    const key = email.toLowerCase()
    if (users[key]) return false
    users[key] = { password, name }
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    const user = { email: key, name }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    set({ user })
    return true
  },

  logout: async () => {
    if (isSupabaseEnabled) {
      const supabase = getSupabaseClient()!
      await supabase.auth.signOut()
    }
    localStorage.removeItem(STORAGE_KEY)
    set({ user: null })
  },
}))
