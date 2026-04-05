import { Board, Folder } from '../types'
import { getSupabaseClient, isSupabaseEnabled } from './supabase'

const TABLE = 'purelike_user_boards'

export interface CloudSnapshot {
  boards: Board[]
  folders: Folder[]
  activeBoardId: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function canUseCloud(): boolean {
  return isSupabaseEnabled
}

export async function loadCloudSnapshot(email: string): Promise<CloudSnapshot | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const userEmail = normalizeEmail(email)
  const { data, error } = await supabase
    .from(TABLE)
    .select('boards, folders, active_board_id')
    .eq('user_email', userEmail)
    .maybeSingle()

  if (error || !data) return null

  return {
    boards: Array.isArray(data.boards) ? (data.boards as Board[]) : [],
    folders: Array.isArray(data.folders) ? (data.folders as Folder[]) : [],
    activeBoardId: typeof data.active_board_id === 'string' ? data.active_board_id : '1',
  }
}

export async function saveCloudSnapshot(email: string, snapshot: CloudSnapshot): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const userEmail = normalizeEmail(email)

  const { error } = await supabase
    .from(TABLE)
    .upsert({
      user_email: userEmail,
      boards: snapshot.boards,
      folders: snapshot.folders,
      active_board_id: snapshot.activeBoardId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_email' })

  if (error) {
    // Keep app responsive even if cloud save fails.
    console.error('Cloud save failed:', error.message)
  }
}
