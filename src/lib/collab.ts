import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseEnabled } from './supabase'
import { CanvasElement } from '../types'

export interface CollabUser {
  id: string
  name: string
  color: string
  cursor: { x: number; y: number } | null
}

export interface SessionInfo {
  shareCode: string
  boardName: string
  elements: CanvasElement[]
}

const SESSION_TABLE = 'board_sessions'

const CURSOR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
]

export function randomColor(): string {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
}

/** Create a new board session and return its share code */
export async function createSession(
  ownerEmail: string,
  boardId: string,
  boardName: string,
  elements: CanvasElement[],
): Promise<string | null> {
  if (!isSupabaseEnabled) return null
  const supabase = getSupabaseClient()!
  const shareCode = crypto.randomUUID()
  const { error } = await supabase.from(SESSION_TABLE).insert({
    share_code: shareCode,
    owner_email: ownerEmail,
    board_id: boardId,
    board_name: boardName,
    elements,
  })
  // Fallback: keep realtime collaboration available even when DB session table is missing.
  if (error) {
    console.warn('createSession fallback (db unavailable):', error.message)
  }
  return shareCode
}

/** Load a session snapshot by share code */
export async function loadSession(shareCode: string): Promise<SessionInfo | null> {
  if (!isSupabaseEnabled) return null
  const supabase = getSupabaseClient()!
  const { data, error } = await supabase
    .from(SESSION_TABLE)
    .select('board_name, elements, share_code')
    .eq('share_code', shareCode)
    .maybeSingle()
  if (error || !data) return null
  return {
    shareCode: data.share_code,
    boardName: data.board_name,
    elements: Array.isArray(data.elements) ? (data.elements as CanvasElement[]) : [],
  }
}

/** Persist current elements to session (debounced by caller) */
export async function saveSessionElements(
  shareCode: string,
  elements: CanvasElement[],
): Promise<void> {
  if (!isSupabaseEnabled) return
  const supabase = getSupabaseClient()!
  const { error } = await supabase
    .from(SESSION_TABLE)
    .update({ elements, updated_at: new Date().toISOString() })
    .eq('share_code', shareCode)
  if (error) {
    // Ignore persistence errors so realtime collab keeps working.
    return
  }
}

// ── Realtime channel helpers ──────────────────────────────────────────────────

export function getCollabChannel(shareCode: string) {
  if (!isSupabaseEnabled) return null
  return getSupabaseClient()!.channel(`collab:${shareCode}`)
}

export function broadcastElements(
  channel: RealtimeChannel,
  elements: CanvasElement[],
  senderId: string,
) {
  void channel.send({ type: 'broadcast', event: 'elements', payload: { elements, senderId } })
}

export function broadcastCursor(
  channel: RealtimeChannel,
  x: number,
  y: number,
  userId: string,
  name: string,
  color: string,
) {
  void channel.send({ type: 'broadcast', event: 'cursor', payload: { x, y, userId, name, color } })
}
