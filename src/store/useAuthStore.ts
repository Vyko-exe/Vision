import { create } from 'zustand'

interface User {
  email: string
  name: string
}

interface AuthStore {
  user: User | null
  login: (email: string, password: string) => boolean
  loginGuest: (username: string) => void
  signup: (email: string, password: string, name: string) => boolean
  logout: () => void
}

const STORAGE_KEY = 'purelike_auth'

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

  login: (email, password) => {
    const raw = localStorage.getItem(`purelike_users`)
    const users: Record<string, { password: string; name: string }> = raw
      ? JSON.parse(raw)
      : {}
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

  signup: (email, password, name) => {
    const raw = localStorage.getItem(`purelike_users`)
    const users: Record<string, { password: string; name: string }> = raw
      ? JSON.parse(raw)
      : {}
    const key = email.toLowerCase()
    if (users[key]) return false // already exists
    users[key] = { password, name }
    localStorage.setItem(`purelike_users`, JSON.stringify(users))
    const user = { email: key, name }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    set({ user })
    return true
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ user: null })
  },
}))
