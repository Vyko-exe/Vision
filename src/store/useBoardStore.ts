import { create } from 'zustand'
import { Board, CanvasElement, Folder, Tool } from '../types'

const defaultBoard: Board = { id: '1', name: 'Board 1', elements: [] }

interface BoardStore {
  boards: Board[]
  folders: Folder[]
  activeBoardId: string
  selectedTool: Tool
  selectedElementIds: string[]
  drawColor: string
  strokeWidth: number
  bwMode: boolean
  bgColor: string
  undoStack: CanvasElement[][]
  redoStack: CanvasElement[][]

  addBoard: (folderId?: string) => void
  deleteBoard: (id: string) => void
  renameBoard: (id: string, name: string) => void
  setActiveBoard: (id: string) => void
  setBoardFolder: (boardId: string, folderId: string | null) => void
  setBoardColor: (boardId: string, color: string | undefined) => void

  addFolder: () => void
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  toggleFolder: (id: string) => void
  setFolderColor: (folderId: string, color: string | undefined) => void

  addElement: (element: CanvasElement) => void
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  deleteSelectedElements: () => void
  setSelectedElements: (ids: string[]) => void
  groupElements: (ids: string[]) => void
  ungroupElements: (ids: string[]) => void
  flipImage: (id: string, axis: 'x' | 'y') => void
  rotateImage: (id: string, delta: number) => void
  togglePinBoard: (id: string) => void

  saveSnapshot: () => void
  undo: () => void
  redo: () => void

  setTool: (tool: Tool) => void
  setDrawColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  toggleBwMode: () => void
  setBgColor: (color: string) => void

  hydrateFromSnapshot: (snapshot: { boards: Board[]; folders: Folder[]; activeBoardId: string }) => void
}

function cloneElements(elements: CanvasElement[]): CanvasElement[] {
  return JSON.parse(JSON.stringify(elements))
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  boards: [defaultBoard],
  folders: [],
  activeBoardId: '1',
  selectedTool: 'select',
  selectedElementIds: [],
  drawColor: '#ffffff',
  strokeWidth: 3,
  bwMode: false,
  bgColor: '#0e0e0e',
  undoStack: [],
  redoStack: [],

  addBoard: (folderId) => {
    const id = Date.now().toString()
    const count = get().boards.length + 1
    set((s) => ({
      boards: [
        ...s.boards,
        { id, name: `Board ${count}`, elements: [], folderId: folderId ?? undefined },
      ],
      activeBoardId: id,
      undoStack: [],
      redoStack: [],
    }))
  },

  deleteBoard: (id) => {
    const boards = get().boards.filter((b) => b.id !== id)
    if (boards.length === 0) return
    set({
      boards,
      activeBoardId: get().activeBoardId === id ? boards[0].id : get().activeBoardId,
    })
  },

  renameBoard: (id, name) =>
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, name } : b)),
    })),

  setActiveBoard: (id) =>
    set({ activeBoardId: id, selectedElementIds: [], undoStack: [], redoStack: [] }),

  setBoardFolder: (boardId, folderId) =>
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, folderId: folderId ?? undefined } : b
      ),
    })),

  setBoardColor: (boardId, color) =>
    set((s) => ({
      boards: s.boards.map((b) => (b.id === boardId ? { ...b, color } : b)),
    })),

  addFolder: () => {
    const id = 'f_' + Date.now()
    const count = get().folders.length + 1
    set((s) => ({
      folders: [...s.folders, { id, name: `Folder ${count}`, collapsed: false }],
    }))
  },

  renameFolder: (id, name) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    })),

  deleteFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      boards: s.boards.map((b) =>
        b.folderId === id ? { ...b, folderId: undefined } : b
      ),
    })),

  toggleFolder: (id) =>
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, collapsed: !f.collapsed } : f
      ),
    })),

  setFolderColor: (folderId, color) =>
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === folderId ? { ...f, color } : f
      ),
    })),

  saveSnapshot: () => {
    const board = get().boards.find((b) => b.id === get().activeBoardId)
    if (!board) return
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), cloneElements(board.elements)],
      redoStack: [],
    }))
  },

  undo: () => {
    const { undoStack, activeBoardId, boards } = get()
    if (undoStack.length === 0) return
    const curr = boards.find((b) => b.id === activeBoardId)!.elements
    const prev = undoStack[undoStack.length - 1]
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, cloneElements(curr)],
      boards: s.boards.map((b) =>
        b.id === activeBoardId ? { ...b, elements: prev } : b
      ),
      selectedElementIds: [],
    }))
  },

  redo: () => {
    const { redoStack, activeBoardId, boards } = get()
    if (redoStack.length === 0) return
    const curr = boards.find((b) => b.id === activeBoardId)!.elements
    const next = redoStack[redoStack.length - 1]
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, cloneElements(curr)],
      boards: s.boards.map((b) =>
        b.id === activeBoardId ? { ...b, elements: next } : b
      ),
      selectedElementIds: [],
    }))
  },

  addElement: (element) => {
    get().saveSnapshot()
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === s.activeBoardId
          ? { ...b, elements: [...b.elements, element] }
          : b
      ),
    }))
  },

  updateElement: (id, updates) =>
    set((s) => ({
      boards: s.boards.map((b) => {
        if (b.id !== s.activeBoardId) return b

        const updatedElements = b.elements.map((el) =>
          el.id === id ? ({ ...el, ...updates } as CanvasElement) : el
        )

        const updatedEl = updatedElements.find((el) => el.id === id)
        if (!updatedEl || updatedEl.type === 'group' || !('groupId' in updatedEl) || !updatedEl.groupId) {
          return { ...b, elements: updatedElements }
        }

        const groupId = updatedEl.groupId
        const group = updatedElements.find((el) => el.id === groupId && el.type === 'group')
        if (!group) return { ...b, elements: updatedElements }

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        updatedElements.forEach((el) => {
          if (el.groupId !== groupId) return
          if (el.type === 'image') {
            minX = Math.min(minX, el.x)
            minY = Math.min(minY, el.y)
            maxX = Math.max(maxX, el.x + el.width)
            maxY = Math.max(maxY, el.y + el.height)
          } else if (el.type === 'text') {
            minX = Math.min(minX, el.x)
            minY = Math.min(minY, el.y)
            maxX = Math.max(maxX, el.x + (el.width ?? 200))
            maxY = Math.max(maxY, el.y + el.fontSize * 1.5)
          } else if (el.type === 'line') {
            for (let i = 0; i < el.points.length; i += 2) {
              minX = Math.min(minX, el.points[i])
              maxX = Math.max(maxX, el.points[i])
              minY = Math.min(minY, el.points[i + 1])
              maxY = Math.max(maxY, el.points[i + 1])
            }
          }
        })

        if (minX === Infinity) return { ...b, elements: updatedElements }

        const PAD = 28
        return {
          ...b,
          elements: updatedElements.map((el) =>
            el.id === groupId && el.type === 'group'
              ? {
                  ...el,
                  x: minX - PAD,
                  y: minY - PAD,
                  width: maxX - minX + PAD * 2,
                  height: maxY - minY + PAD * 2,
                }
              : el
          ),
        }
      }),
    })),

  deleteSelectedElements: () => {
    const ids = get().selectedElementIds
    if (ids.length === 0) return
    get().saveSnapshot()
    set((s) => {
      const board = s.boards.find((b) => b.id === s.activeBoardId)
      if (!board) return s
      const deletedGroupIds = ids.filter((id) =>
        board.elements.some((el) => el.id === id && el.type === 'group')
      )
      const memberIds = board.elements
        .filter((el) => el.groupId && deletedGroupIds.includes(el.groupId))
        .map((el) => el.id)
      const allToDelete = new Set([...ids, ...memberIds])

      return {
        boards: s.boards.map((b) =>
          b.id === s.activeBoardId
            ? { ...b, elements: b.elements.filter((el) => !allToDelete.has(el.id)) }
            : b
        ),
        selectedElementIds: [],
      }
    })
  },

  groupElements: (ids) => {
    if (ids.length < 2) return
    get().saveSnapshot()
    const board = get().boards.find((b) => b.id === get().activeBoardId)!
    const selected = board.elements.filter((el) => ids.includes(el.id))

    const existingGroupId = selected.find((el) => el.groupId)?.groupId ?? null
    const PAD = 28

    const calcBounds = (members: typeof selected) => {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      members.forEach((el) => {
        if (el.type === 'image') {
          minX = Math.min(minX, el.x)
          minY = Math.min(minY, el.y)
          maxX = Math.max(maxX, el.x + el.width)
          maxY = Math.max(maxY, el.y + el.height)
        } else if (el.type === 'text') {
          minX = Math.min(minX, el.x)
          minY = Math.min(minY, el.y)
          maxX = Math.max(maxX, el.x + (el.width ?? 200))
          maxY = Math.max(maxY, el.y + el.fontSize * 2)
        } else if (el.type === 'line') {
          for (let i = 0; i < el.points.length; i += 2) {
            minX = Math.min(minX, el.points[i])
            maxX = Math.max(maxX, el.points[i])
            minY = Math.min(minY, el.points[i + 1])
            maxY = Math.max(maxY, el.points[i + 1])
          }
        }
      })

      return { minX, minY, maxX, maxY }
    }

    if (existingGroupId) {
      const allMembers = board.elements.filter(
        (el) => el.groupId === existingGroupId || ids.includes(el.id)
      )
      const { minX, minY, maxX, maxY } = calcBounds(allMembers)

      set((s) => ({
        boards: s.boards.map((b) =>
          b.id === s.activeBoardId
            ? {
                ...b,
                elements: b.elements.map((el) => {
                  if (el.type === 'group' && el.id === existingGroupId) {
                    return {
                      ...el,
                      x: minX - PAD,
                      y: minY - PAD,
                      width: maxX - minX + PAD * 2,
                      height: maxY - minY + PAD * 2,
                    }
                  }
                  if (ids.includes(el.id)) {
                    return { ...el, groupId: existingGroupId }
                  }
                  return el
                }),
              }
            : b
        ),
      }))
      return
    }

    const groupId = 'g_' + Date.now()
    const { minX, minY, maxX, maxY } = calcBounds(selected)
    const frame: import('../types').CanvasGroup = {
      id: groupId,
      type: 'group',
      x: minX - PAD,
      y: minY - PAD,
      width: maxX - minX + PAD * 2,
      height: maxY - minY + PAD * 2,
      label: 'Groupe',
    }

    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === s.activeBoardId
          ? {
              ...b,
              elements: [
                frame,
                ...b.elements.map((el) =>
                  ids.includes(el.id) ? { ...el, groupId } : el
                ),
              ],
            }
          : b
      ),
    }))
  },

  ungroupElements: (ids) => {
    const board = get().boards.find((b) => b.id === get().activeBoardId)
    if (!board) return
    const groupIds = new Set(
      board.elements
        .filter((el) => ids.includes(el.id) && el.groupId)
        .map((el) => el.groupId!)
    )
    if (groupIds.size === 0) return
    get().saveSnapshot()
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === s.activeBoardId
          ? {
              ...b,
              elements: b.elements
                .filter((el) => !(el.type === 'group' && groupIds.has(el.id)))
                .map((el) =>
                  el.groupId && groupIds.has(el.groupId)
                    ? { ...el, groupId: undefined }
                    : el
                ),
            }
          : b
      ),
    }))
  },

  setSelectedElements: (ids) => set({ selectedElementIds: ids }),

  flipImage: (id, axis) => {
    get().saveSnapshot()
    set((s) => ({
      boards: s.boards.map((b) => {
        if (b.id !== s.activeBoardId) return b
        return {
          ...b,
          elements: b.elements.map((el) => {
            if (el.id !== id || el.type !== 'image') return el
            return axis === 'x'
              ? { ...el, flipX: !el.flipX }
              : { ...el, flipY: !el.flipY }
          }),
        }
      }),
    }))
  },

  rotateImage: (id, delta) => {
    get().saveSnapshot()
    set((s) => ({
      boards: s.boards.map((b) => {
        if (b.id !== s.activeBoardId) return b
        return {
          ...b,
          elements: b.elements.map((el) => {
            if (el.id !== id || el.type !== 'image') return el
            const current = el.rotation ?? 0
            return { ...el, rotation: (current + delta + 360) % 360 }
          }),
        }
      }),
    }))
  },

  togglePinBoard: (id) =>
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === id ? { ...b, pinned: !b.pinned } : b
      ),
    })),

  setTool: (tool) => set({ selectedTool: tool, selectedElementIds: [] }),
  setDrawColor: (color) => set({ drawColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  toggleBwMode: () => set((s) => ({ bwMode: !s.bwMode })),
  setBgColor: (color) => set({ bgColor: color }),

  hydrateFromSnapshot: (snapshot) =>
    set(() => {
      const boards = snapshot.boards.length > 0 ? snapshot.boards : [defaultBoard]
      const activeBoardId = boards.some((b) => b.id === snapshot.activeBoardId)
        ? snapshot.activeBoardId
        : boards[0].id

      return {
        boards,
        folders: snapshot.folders,
        activeBoardId,
        selectedElementIds: [],
        undoStack: [],
        redoStack: [],
      }
    }),
}))
