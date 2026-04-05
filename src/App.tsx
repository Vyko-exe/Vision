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
  const [page, setPage] = useState<'home' | 'workspace' | 'resources'>('home')

  useEffect(() => {
    if (!user) return
    setPage('home')
  }, [user?.email])

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
