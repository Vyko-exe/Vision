import { useEffect, useRef, useState } from 'react'
import AppHeader from './components/AppHeader'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import AnnotationPanel from './components/AnnotationPanel'
import HomeHubPage from './components/HomeHubPage'
import PdfVaultPage from './components/PdfVaultPage'
import LandingPage from './components/LandingPage'
import { useBoardStore } from './store/useBoardStore'
import { useAuthStore } from './store/useAuthStore'
import { Tool } from './types'
import { canUseCloud, loadCloudSnapshot, saveCloudSnapshot } from './lib/cloudBoards'
import { loadLocalSnapshot, saveLocalSnapshot } from './lib/localBoards'
import { useCollabStore } from './store/useCollabStore'

const shortcuts: Record<string, Tool> = {
  v: 'select', h: 'pan', i: 'picker', t: 'text', d: 'draw',
}

function BoardApp({ onGoHome }: { onGoHome: () => void }) {
  const user = useAuthStore((s) => s.user)
  const setTool = useBoardStore((s) => s.setTool)
  const hydrateFromSnapshot = useBoardStore((s) => s.hydrateFromSnapshot)
  const { bgColor, setBgColor } = useBoardStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(false)
  const [cloudReady, setCloudReady] = useState(false)
  const boardRootRef = useRef<HTMLDivElement>(null)
  const [shareTooltip, setShareTooltip] = useState<string | null>(null)
  const { active: collabActive, shareCode, startSession, remoteUsers } = useCollabStore()

  const handleShare = async () => {
    if (collabActive && shareCode) {
      const url = `${window.location.origin}?join=${shareCode}`
      await navigator.clipboard.writeText(url).catch(() => undefined)
      setShareTooltip('Lien copié !')
      setTimeout(() => setShareTooltip(null), 2000)
      return
    }
    if (!user) return
    const board = useBoardStore.getState().boards.find((b) => b.id === useBoardStore.getState().activeBoardId)
    if (!board) return
    setShareTooltip('Création...')
    const code = await startSession(user.email, board.id, board.name, board.elements)
    if (code) {
      const url = `${window.location.origin}?join=${code}`
      await navigator.clipboard.writeText(url).catch(() => undefined)
      setShareTooltip('Lien copié !')
      setTimeout(() => setShareTooltip(null), 2500)
    } else {
      setShareTooltip('Erreur — voir console')
      setTimeout(() => setShareTooltip(null), 3000)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
      if (e.key === 'b' || e.key === 'B') { useBoardStore.getState().toggleBwMode(); return }
      const tool = shortcuts[e.key.toLowerCase()]
      if (tool) setTool(tool)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTool])

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === boardRootRef.current
      setIsFullscreenMode(active)
      if (active) setSidebarOpen(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    const bootSnapshots = async () => {
      if (!user?.email) {
        if (!cancelled) setCloudReady(true)
        return
      }

      // Extract username from email (before @purelike.local)
      const username = user.email.split('@')[0]

      if (canUseCloud()) {
        const cloud = await loadCloudSnapshot(user.email)
        if (!cancelled && cloud) {
          hydrateFromSnapshot(cloud)
          setCloudReady(true)
          return
        }
      }

      const local = loadLocalSnapshot(username)
      if (!cancelled && local) {
        hydrateFromSnapshot({
          boards: local.boards,
          folders: local.folders,
          activeBoardId: local.activeBoardId ?? local.boards[0]?.id ?? '1',
        })
      }
      if (!cancelled) setCloudReady(true)
    }

    setCloudReady(false)
    bootSnapshots()
    return () => { cancelled = true }
  }, [user?.email, hydrateFromSnapshot])

  useEffect(() => {
    if (!cloudReady || !user?.email) return

    // Extract username from email (before @purelike.local)
    const username = user.email.split('@')[0]
    let cloudTimer: ReturnType<typeof setTimeout> | null = null

    const unsub = useBoardStore.subscribe((state) => {
      const snapshot = {
        boards: state.boards,
        folders: state.folders,
        activeBoardId: state.activeBoardId,
      }
      saveLocalSnapshot(username, snapshot)

      if (!canUseCloud()) return
      if (cloudTimer) clearTimeout(cloudTimer)
      cloudTimer = setTimeout(() => {
        void saveCloudSnapshot(user.email, snapshot)
      }, 700)
    })

    return () => {
      if (cloudTimer) clearTimeout(cloudTimer)
      unsub()
    }
  }, [cloudReady, user?.email])

  const enterFullscreen = async () => {
    if (!boardRootRef.current || document.fullscreenElement) return
    try { await boardRootRef.current.requestFullscreen() } catch { /* blocked */ }
  }

  return (
    <div ref={boardRootRef} className="flex flex-col h-screen w-screen overflow-hidden bg-canvas text-primary">

      {/* Header */}
      {!isFullscreenMode && (
        <AppHeader
          onGoHome={onGoHome}
          actions={
            <div className="flex items-center gap-1.5">

              {/* Live user avatars */}
              {collabActive && remoteUsers.length > 0 && (
                <div className="flex -space-x-1 items-center mr-0.5">
                  {remoteUsers.map((u) => (
                    <div key={u.id} title={u.name}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-black/50 select-none"
                      style={{ background: u.color }}
                    >
                      {u.name[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              )}

              {/* Share / Live button */}
              <div className="relative">
                <button
                  onClick={() => void handleShare()}
                  title={collabActive ? 'Copier le lien de partage' : 'Partager ce board'}
                  className={`px-2.5 h-8 flex items-center gap-1.5 rounded-lg text-[12px] transition-colors font-medium
                    ${collabActive
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.05]'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${collabActive ? 'bg-indigo-400 animate-pulse' : 'bg-white/25'}`} />
                  {collabActive ? 'Live' : 'Share'}
                </button>
                {shareTooltip && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap px-2.5 py-1 bg-[#111] border border-white/[0.1] rounded-lg text-[11px] text-white/55 z-50 pointer-events-none">
                    {shareTooltip}
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-white/[0.07] mx-0.5" />

              <div className="relative">
                <button
                  onClick={() => {
                    setHelpOpen(false)
                    setSettingsOpen((v) => !v)
                  }}
                  title="Settings"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] transition-colors
                    ${settingsOpen ? 'bg-white/[0.08] text-white/70' : 'text-white/25 hover:text-white/55 hover:bg-white/[0.05]'}`}
                >
                  ⚙
                </button>
                {settingsOpen && (
                  <div
                    className="absolute top-full right-0 mt-1.5 w-56 bg-[#111] border border-white/[0.08] rounded-xl p-3 shadow-2xl z-50 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-[10px] font-medium text-white/25 uppercase tracking-[0.22em]">Canvas</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-white/50">Background color</span>
                      <label className="relative w-8 h-8 rounded-lg border border-white/[0.1] cursor-pointer overflow-hidden flex-shrink-0">
                        <span className="absolute inset-0" style={{ background: bgColor }} />
                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      </label>
                    </div>
                    <input
                      type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-[12px] text-white/50 font-mono outline-none focus:border-white/15 transition-colors"
                      placeholder="#080808"
                    />
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setSettingsOpen(false)
                    setHelpOpen((v) => !v)
                  }}
                  title="Shortcuts"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] transition-colors
                    ${helpOpen ? 'bg-white/[0.08] text-white/70' : 'text-white/25 hover:text-white/55 hover:bg-white/[0.05]'}`}
                >
                  ?
                </button>
                {helpOpen && (
                  <div
                    className="absolute top-full right-0 mt-1.5 w-64 bg-[#111] border border-white/[0.08] rounded-xl p-3 shadow-2xl z-50 text-[11px] text-white/35 space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-white/55 font-medium mb-2">Shortcuts</div>
                    {[
                      ['Select', 'V'], ['Color picker', 'I'], ['Text', 'T'], ['Draw', 'D'], ['Pan', 'H'],
                      ['Group', 'G'], ['Ungroup', 'Shift+G'], ['Black & white', 'B'], ['Delete', 'Delete'],
                      ['Undo', 'Ctrl+Z'], ['Redo', 'Ctrl+Y'], ['Flip H', 'X'], ['Flip V', 'Y'],
                      ['Align', 'A'], ['Grid', 'C'], ['Zoom selection', 'Space'], ['Paste image', 'Ctrl+V'],
                    ].map(([label, key]) => (
                      <div key={key} className="flex justify-between">
                        <span>{label}</span>
                        <kbd className="text-white/25 font-mono">{key}</kbd>
                      </div>
                    ))}
                    <div className="border-t border-white/[0.06] pt-1.5 mt-1 text-white/18">
                      Scroll → zoom · Middle click → pan
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* Bottom-left — burger only */}
      {!isFullscreenMode && (
        <div className="absolute bottom-6 left-6 z-20 bg-panel border border-border rounded-2xl px-1.5 py-1.5 shadow-2xl shadow-black/60">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title="Menu"
            className={`w-9 h-9 flex flex-col items-center justify-center gap-[4.5px] rounded-xl transition-all duration-150
              ${sidebarOpen ? 'bg-white/10 text-primary' : 'text-muted hover:text-dim hover:bg-white/[0.04]'}`}
          >
            <div className={`w-[14px] h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? 'rotate-45 translate-y-[5.5px]' : ''}`} />
            <div className={`w-[14px] h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? 'opacity-0' : ''}`} />
            <div className={`w-[14px] h-[1.5px] bg-current transition-all duration-200 ${sidebarOpen ? '-rotate-45 -translate-y-[5.5px]' : ''}`} />
          </button>
        </div>
      )}

      {/* Sidebar overlay */}
      {sidebarOpen && !isFullscreenMode && (
        <div className="absolute inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      {!isFullscreenMode && (
        <div className={`fixed top-11 left-0 h-[calc(100%-2.75rem)] z-40 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="relative flex-1 flex min-h-0" onClick={() => { setSettingsOpen(false); setHelpOpen(false) }}>
        <Canvas uiHidden={isFullscreenMode} />
        {!isFullscreenMode && <Toolbar onToggleFullscreen={enterFullscreen} />}
        {!isFullscreenMode && <AnnotationPanel />}
      </div>
    </div>
  )
}

export default function App() {
  const user = useAuthStore((s) => s.user)
  const init = useAuthStore((s) => s.init)
  const [page, setPage] = useState<'home' | 'workspace' | 'resources'>('home')
  const [joinCode, setJoinCode] = useState<string | null>(() => new URLSearchParams(window.location.search).get('join'))
  const [joinName, setJoinName] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const { joinSession } = useCollabStore()
  const hydrateFromSnapshot = useBoardStore((s) => s.hydrateFromSnapshot)

  useEffect(() => {
    void init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    setPage('home')
  }, [user?.email])

  const handleJoin = async () => {
    if (!joinCode || !joinName.trim()) return
    setJoinLoading(true)
    const defaultName = joinName.trim() || (user?.name ?? 'Guest')
    const elements = await joinSession(joinCode, defaultName)
    if (elements !== null) {
      hydrateFromSnapshot({
        boards: [{ id: joinCode, name: 'Shared Board', elements }],
        folders: [],
        activeBoardId: joinCode,
      })
      window.history.replaceState({}, '', window.location.pathname)
      setJoinCode(null)
      setPage('workspace')
    } else {
      setJoinLoading(false)
    }
  }

  if (joinCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas text-primary">
        <div className="w-80 space-y-4">
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-2xl font-medium">Join session</h1>
            <p className="text-muted text-sm">Enter your name to join the collaborative board</p>
          </div>
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleJoin()}
            placeholder={user?.name ?? 'Your name'}
            className="w-full bg-white/[0.04] border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-white/20 transition-colors"
            autoFocus
          />
          <button
            onClick={() => void handleJoin()}
            disabled={!joinName.trim() || joinLoading}
            className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-primary font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {joinLoading ? 'Joining…' : 'Join board'}
          </button>
          <button onClick={() => setJoinCode(null)} className="w-full text-center text-muted text-xs hover:text-dim py-1">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!user) return <LandingPage />
  if (page === 'workspace') return <BoardApp onGoHome={() => setPage('home')} />
  if (page === 'resources') return <PdfVaultPage onBack={() => setPage('home')} />

  return (
    <HomeHubPage
      userName={user.name}
      onOpenBoards={() => setPage('workspace')}
      onOpenResources={() => setPage('resources')}
    />
  )
}
