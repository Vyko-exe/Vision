import { create } from 'zustand'
import { RealtimeChannel } from '@supabase/supabase-js'
import { CanvasElement } from '../types'
import {
  CollabUser, randomColor,
  getCollabChannel, broadcastElements, broadcastCursor,
  saveSessionElements, loadSession,
} from '../lib/collab'

interface CollabStore {
  /** true when a collab session is active */
  active: boolean
  shareCode: string | null
  /** local user identity */
  localUser: { id: string; name: string; color: string } | null
  /** all remote cursors/users */
  remoteUsers: CollabUser[]
  channel: RealtimeChannel | null

  /** Owner: start a new session for a board */
  startSession: (ownerEmail: string, boardId: string, boardName: string, elements: CanvasElement[]) => Promise<string | null>
  /** Guest: join an existing session */
  joinSession: (shareCode: string, guestName: string) => Promise<CanvasElement[] | null>
  /** Broadcast elements to peers (debounced internally) */
  pushElements: (elements: CanvasElement[]) => void
  /** Broadcast cursor position */
  pushCursor: (x: number, y: number) => void
  /** Subscribe handler – called by Canvas when remote elements arrive */
  onRemoteElements: ((elements: CanvasElement[]) => void) | null
  setOnRemoteElements: (cb: (elements: CanvasElement[]) => void) => void
  /** Stop collab and cleanup */
  stopSession: () => void
}

function makeUserId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// Debounce helper
function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export const useCollabStore = create<CollabStore>((set, get) => {
  const debouncedSave = debounce((shareCode: string, elements: CanvasElement[]) => {
    void saveSessionElements(shareCode, elements)
  }, 1500)

  const debouncedBroadcast = debounce((channel: RealtimeChannel, elements: CanvasElement[], userId: string) => {
    broadcastElements(channel, elements, userId)
  }, 120)

  return {
    active: false,
    shareCode: null,
    localUser: null,
    remoteUsers: [],
    channel: null,
    onRemoteElements: null,

    setOnRemoteElements: (cb) => set({ onRemoteElements: cb }),

    startSession: async (ownerEmail, boardId, boardName, elements) => {
      const { createSession } = await import('../lib/collab')
      const shareCode = await createSession(ownerEmail, boardId, boardName, elements)
      if (!shareCode) return null
      const localUser = { id: makeUserId(), name: ownerEmail.split('@')[0], color: randomColor() }
      const channel = getCollabChannel(shareCode)
      if (!channel) return null
      subscribeChannel(channel, localUser.id, set, get)
      set({ active: true, shareCode, localUser, channel })
      return shareCode
    },

    joinSession: async (shareCode, guestName) => {
      const session = await loadSession(shareCode)
      if (!session) return null
      const localUser = { id: makeUserId(), name: guestName, color: randomColor() }
      const channel = getCollabChannel(shareCode)
      if (!channel) return session.elements
      subscribeChannel(channel, localUser.id, set, get)
      set({ active: true, shareCode, localUser, channel })
      return session.elements
    },

    pushElements: (elements) => {
      const { channel, localUser, shareCode } = get()
      if (!channel || !localUser) return
      debouncedBroadcast(channel, elements, localUser.id)
      if (shareCode) debouncedSave(shareCode, elements)
    },

    pushCursor: (x, y) => {
      const { channel, localUser } = get()
      if (!channel || !localUser) return
      broadcastCursor(channel, x, y, localUser.id, localUser.name, localUser.color)
    },

    stopSession: () => {
      const { channel } = get()
      if (channel) void channel.unsubscribe()
      set({ active: false, shareCode: null, localUser: null, remoteUsers: [], channel: null })
    },
  }
})

function subscribeChannel(
  channel: RealtimeChannel,
  localUserId: string,
  set: (s: Partial<CollabStore>) => void,
  get: () => CollabStore,
) {
  channel
    .on('broadcast', { event: 'elements' }, ({ payload }) => {
      if (payload.senderId === localUserId) return
      const cb = get().onRemoteElements
      if (cb) cb(payload.elements as CanvasElement[])
    })
    .on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const { userId, name, color, x, y } = payload as { userId: string; name: string; color: string; x: number; y: number }
      if (userId === localUserId) return
      set({
        remoteUsers: (() => {
          const users = get().remoteUsers.filter((u) => u.id !== userId)
          return [...users, { id: userId, name, color, cursor: { x, y } }]
        })(),
      })
    })
    .subscribe()
}
