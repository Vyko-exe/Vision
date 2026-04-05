import { useState, useRef } from 'react'
import { useBoardStore } from '../store/useBoardStore'
import { useAuthStore } from '../store/useAuthStore'
import { BOARD_COLORS } from '../types'

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const {
    boards, folders, activeBoardId,
    addBoard, deleteBoard, setActiveBoard, renameBoard, setBoardFolder, setBoardColor,
    addFolder, renameFolder, deleteFolder, toggleFolder, setFolderColor, togglePinBoard,
  } = useBoardStore()
  const { user, logout } = useAuthStore()

  const [editingBoard,  setEditingBoard]  = useState<string | null>(null)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editValue,     setEditValue]     = useState('')
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null)
  const [searchTerm,    setSearchTerm]    = useState('')

  // DnD state
  const [draggingId,  setDraggingId]  = useState<string | null>(null)
  const [dragOverId,  setDragOverId]  = useState<string | null>(null) // folderId or 'root'
  const dragCounter = useRef<Record<string, number>>({})

  const startRenameBoard  = (id: string, name: string) => { setEditingBoard(id);  setEditValue(name) }
  const startRenameFolder = (id: string, name: string) => { setEditingFolder(id); setEditValue(name) }
  const commitRenameBoard  = () => { if (editingBoard  && editValue.trim()) renameBoard(editingBoard, editValue.trim());  setEditingBoard(null)  }
  const commitRenameFolder = () => { if (editingFolder && editValue.trim()) renameFolder(editingFolder, editValue.trim()); setEditingFolder(null) }

  const handleDrop = (targetFolderId: string | null) => {
    if (draggingId) setBoardFolder(draggingId, targetFolderId)
    setDraggingId(null)
    setDragOverId(null)
    dragCounter.current = {}
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const rootBoards = boards.filter((b) => !b.folderId)
  const pinnedBoards = boards.filter((b) => b.pinned).slice(0, 3)
  const visiblePinnedBoards = normalizedSearch
    ? pinnedBoards.filter((b) => b.name.toLowerCase().includes(normalizedSearch))
    : pinnedBoards

  const visibleRootBoards = normalizedSearch
    ? rootBoards.filter((b) => b.name.toLowerCase().includes(normalizedSearch))
    : rootBoards

  const visibleFolders = normalizedSearch
    ? folders.filter((folder) => {
        if (folder.name.toLowerCase().includes(normalizedSearch)) return true
        return boards.some((b) => b.folderId === folder.id && b.name.toLowerCase().includes(normalizedSearch))
      })
    : folders
  const isDropTarget = (id: string | null) => dragOverId === (id ?? 'root') && draggingId !== null

  // ── Board item ─────────────────────────────────────────────────────────────
  const BoardItem = ({ board, indent = false }: { board: typeof boards[0]; indent?: boolean }) => {
    const active = board.id === activeBoardId
    const dot    = board.color ?? (active ? '#f5f5f5' : '#404040')

    return (
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); setDraggingId(board.id); e.dataTransfer.effectAllowed = 'move' }}
        onDragEnd={() => { setDraggingId(null); setDragOverId(null); dragCounter.current = {} }}
        onClick={() => { setActiveBoard(board.id); setColorPickerId(null); onClose?.() }}
        className={`group flex items-center gap-2 mx-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all
          ${indent ? 'pl-6' : ''}
          ${active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}
          ${draggingId === board.id ? 'opacity-40' : ''}`}
      >
        {/* Color dot — click to open picker */}
        <button
          onClick={(e) => { e.stopPropagation(); setColorPickerId(colorPickerId === board.id ? null : board.id) }}
          className="relative shrink-0 w-2.5 h-2.5 rounded-full transition-transform hover:scale-125"
          style={{ background: dot }}
          title="Board color"
        >
          {colorPickerId === board.id && (
            <div
              className="absolute left-4 top-0 z-30 bg-[#111] border border-white/[0.08] rounded-xl p-2 shadow-2xl flex flex-wrap gap-1.5"
              style={{ width: 116 }}
              onClick={(e) => e.stopPropagation()}
            >
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setBoardColor(board.id, c); setColorPickerId(null) }}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: board.color === c ? '#fff' : 'transparent' }}
                />
              ))}
              <button
                onClick={() => { setBoardColor(board.id, undefined); setColorPickerId(null) }}
                className="w-5 h-5 rounded-full border border-white/[0.1] bg-white/[0.04] text-white/30 text-xs flex items-center justify-center hover:text-white/70"
                title="Remove color"
              >✕</button>
            </div>
          )}
        </button>

        {/* Name */}
        {editingBoard === board.id ? (
          <input
            autoFocus value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRenameBoard}
            onKeyDown={(e) => e.key === 'Enter' && commitRenameBoard()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent text-primary text-sm outline-none border-b border-border"
          />
        ) : (
          <span className={`flex-1 text-sm truncate`}>
            {board.name}
          </span>
        )}

        {/* Rename */}
        <button
          onClick={(e) => { e.stopPropagation(); startRenameBoard(board.id, board.name) }}
          className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 text-xs transition-all shrink-0"
          title="Rename"
        >✎</button>

        {/* Pin */}
        <button
          onClick={(e) => { e.stopPropagation(); togglePinBoard(board.id) }}
          className={`text-xs transition-all shrink-0 ${board.pinned ? 'opacity-100 text-white/60' : 'opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/50'}`}
          title={board.pinned ? 'Unpin' : 'Pin'}
        >⊙</button>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); deleteBoard(board.id) }}
          className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/70 text-xs transition-all shrink-0"
          title="Delete"
        >✕</button>
      </div>
    )
  }

  // ── Drop zone highlight ────────────────────────────────────────────────────
  const DropZone = ({ folderId }: { folderId: string | null }) => (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
      onDragEnter={(e) => {
        e.stopPropagation()
        const key = folderId ?? 'root'
        dragCounter.current[key] = (dragCounter.current[key] ?? 0) + 1
        setDragOverId(key)
      }}
      onDragLeave={(e) => {
        e.stopPropagation()
        const key = folderId ?? 'root'
        dragCounter.current[key] = Math.max(0, (dragCounter.current[key] ?? 1) - 1)
        if (dragCounter.current[key] === 0) setDragOverId(null)
      }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(folderId) }}
      className={`mx-2 rounded-lg transition-all duration-150 ${
        isDropTarget(folderId)
          ? 'h-7 border border-dashed border-white/20 bg-white/[0.04] flex items-center justify-center'
          : 'h-1'
      }`}
    >
      {isDropTarget(folderId) && <span className="text-xs text-white/30">Drop here</span>}
    </div>
  )

  return (
    <aside className="w-64 bg-panel border-r border-white/[0.06] flex flex-col h-full" onClick={() => { setColorPickerId(null); setColorPickerFolderId(null) }}>

      {/* User row */}
      <div className="px-3 py-3 border-b border-white/[0.05] flex items-center gap-2 min-w-0">
        {user && (
          <>
            <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[11px] text-white/50 shrink-0 font-medium">
              {user.name[0].toUpperCase()}
            </div>
            <span className="text-[13px] text-white/40 truncate flex-1 min-w-0">{user.name}</span>
          </>
        )}
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
          {user && (
            <button onClick={logout} title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[13px] text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-colors">
              ↩
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 pb-2 pt-1">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[12px] text-white/60 placeholder:text-white/20 outline-none focus:border-white/15 transition-colors"
          />
        </div>

        {/* Pinned boards */}
        {visiblePinnedBoards.length > 0 && (
          <div className="mb-1">
            <div className="px-4 pb-1 pt-1">
              <span className="text-[10px] font-medium text-white/20 uppercase tracking-[0.22em]">Pinned</span>
            </div>
            {visiblePinnedBoards.map((b) => (
              <BoardItem key={b.id} board={b} />
            ))}
            <div className="mx-4 my-2 border-t border-white/[0.05]" />
          </div>
        )}

        <div className="px-4 pb-2 pt-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-white/20 uppercase tracking-[0.22em]">Boards</span>
          <button onClick={addFolder} className="text-white/20 hover:text-white/50 text-[11px] transition-colors">+ Folder</button>
        </div>

        {/* Folders */}
        {visibleFolders.map((folder) => {
          const folderBoards = boards.filter((b) => b.folderId === folder.id)
          const visibleFolderBoards = normalizedSearch
            ? folderBoards.filter((b) => b.name.toLowerCase().includes(normalizedSearch))
            : folderBoards
          const hasActive    = folderBoards.some((b) => b.id === activeBoardId)

          return (
            <div key={folder.id}>
              {/* Folder header — also a drop target */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDragEnter={(e) => { e.stopPropagation(); dragCounter.current[folder.id] = (dragCounter.current[folder.id] ?? 0) + 1; setDragOverId(folder.id) }}
                onDragLeave={(e) => { e.stopPropagation(); dragCounter.current[folder.id] = Math.max(0, (dragCounter.current[folder.id] ?? 1) - 1); if (!dragCounter.current[folder.id]) setDragOverId(null) }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(folder.id) }}
                onClick={() => toggleFolder(folder.id)}
                className={`group flex items-center gap-1.5 mx-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all
                  ${hasActive ? 'text-primary' : 'text-dim hover:text-primary'} hover:bg-white/[0.03]
                  ${dragOverId === folder.id && draggingId ? 'bg-white/[0.06] border border-dashed border-white/20' : ''}`}
              >
                <span className="text-xs shrink-0 transition-transform duration-150" style={{ display: 'inline-block', transform: folder.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>

                {/* Color dot for folder */}
                <button
                  onClick={(e) => { e.stopPropagation(); setColorPickerFolderId(colorPickerFolderId === folder.id ? null : folder.id) }}
                  className="relative shrink-0 w-2.5 h-2.5 rounded-full transition-transform hover:scale-125"
                  style={{ background: folder.color ?? '#404040' }}
                  title="Folder color"
                >
                  {colorPickerFolderId === folder.id && (
                    <div
                      className="absolute left-4 top-0 z-30 bg-[#111] border border-white/[0.08] rounded-xl p-2 shadow-2xl flex flex-wrap gap-1.5"
                      style={{ width: 116 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {BOARD_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setFolderColor(folder.id, c); setColorPickerFolderId(null) }}
                          className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                          style={{ background: c, borderColor: folder.color === c ? '#fff' : 'transparent' }}
                        />
                      ))}
                      <button
                        onClick={() => { setFolderColor(folder.id, undefined); setColorPickerFolderId(null) }}
                        className="w-5 h-5 rounded-full border border-white/[0.1] bg-white/[0.04] text-white/30 text-xs flex items-center justify-center hover:text-white/70"
                        title="Remove color"
                      >✕</button>
                    </div>
                  )}
                </button>

                {editingFolder === folder.id ? (
                  <input
                    autoFocus value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRenameFolder}
                    onKeyDown={(e) => e.key === 'Enter' && commitRenameFolder()}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-primary text-sm outline-none border-b border-border"
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">
                    {folder.name}
                  </span>
                )}

                <span className="text-xs text-white/20 opacity-0 group-hover:opacity-100">{folderBoards.length}</span>
                <button onClick={(e) => { e.stopPropagation(); startRenameFolder(folder.id, folder.name) }} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 text-xs transition-all" title="Rename">✎</button>
                <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/70 text-xs transition-all" title="Delete folder">✕</button>
              </div>

              {/* Folder boards */}
              {!folder.collapsed && (
                <>
                  {visibleFolderBoards.map((b) => <BoardItem key={b.id} board={b} indent />)}
                  <DropZone folderId={folder.id} />
                </>
              )}
            </div>
          )
        })}

        {/* Root boards + root drop zone */}
        <DropZone folderId={null} />
        {visibleRootBoards.map((b) => <BoardItem key={b.id} board={b} />)}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.05] space-y-1.5">
          <button
            onClick={() => addBoard()}
            className="w-full py-2 rounded-lg border border-dashed border-white/[0.08] text-white/25 hover:text-white/60 hover:border-white/15 text-[13px] transition-all"
          >
            + New board
          </button>

        </div>
    </aside>
  )
}
