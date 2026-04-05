import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type HubResourceType = 'pdf' | 'ref' | 'link'

export interface HubResource {
  id: string
  type: HubResourceType
  title: string
  url: string
  category?: string
  thumbnail?: string
  createdAt: number
}

interface HubStore {
  resources: HubResource[]
  addResource: (resource: Omit<HubResource, 'id' | 'createdAt'>) => void
  removeResource: (id: string) => void
  updateResource: (id: string, updates: Partial<Omit<HubResource, 'id' | 'createdAt'>>) => void
}

export const useHubStore = create<HubStore>()(
  persist(
    (set) => ({
      resources: [],
      addResource: (resource) =>
        set((state) => ({
          resources: [
            {
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              createdAt: Date.now(),
              ...resource,
            },
            ...state.resources,
          ],
        })),
      removeResource: (id) =>
        set((state) => ({
          resources: state.resources.filter((r) => r.id !== id),
        })),
      updateResource: (id, updates) =>
        set((state) => ({
          resources: state.resources.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
    }),
    { name: 'purelike_hub_resources_v1' }
  )
)
