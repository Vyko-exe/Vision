import { Board, Folder } from '../types'

export interface LocalBoardSnapshot {
  boards: Board[]
  folders: Folder[]
  activeBoardId: string | null
}

export function getStorageKey(username: string): string {
  return `purelike_boards_${username.toLowerCase()}`
}

export function loadLocalSnapshot(username: string): LocalBoardSnapshot | null {
  try {
    const key = getStorageKey(username)
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.error('Failed to load local snapshot:', err)
    return null
  }
}

export function saveLocalSnapshot(username: string, snapshot: LocalBoardSnapshot): void {
  try {
    const key = getStorageKey(username)
    localStorage.setItem(key, JSON.stringify(snapshot))
  } catch (err) {
    console.error('Failed to save local snapshot:', err)
  }
}
