import React from 'react'

export default function AppHeader({
  onGoHome,
  title,
  onToggleSidebar,
  sidebarOpen = false,
  actions,
}: {
  onGoHome: () => void
  title?: string
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
  actions?: React.ReactNode
}) {
  return (
    <header className="flex-shrink-0 h-11 flex items-center justify-between px-3 border-b border-white/[0.05] bg-canvas/90 backdrop-blur-sm relative z-50">

      {/* Left */}
      <div className="flex items-center gap-0.5">
        {onToggleSidebar && (
          <>
            <button
              onClick={onToggleSidebar}
              title="Menu"
              className="w-8 h-8 flex flex-col items-center justify-center gap-[4.5px] hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <div className={`w-[14px] h-[1.5px] bg-white/35 transition-all duration-200 ${sidebarOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
              <div className={`w-[14px] h-[1.5px] bg-white/35 transition-all duration-200 ${sidebarOpen ? 'opacity-0' : ''}`} />
              <div className={`w-[14px] h-[1.5px] bg-white/35 transition-all duration-200 ${sidebarOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
            </button>
            <div className="w-px h-4 bg-white/[0.08] mx-1" />
          </>
        )}

        <button
          onClick={onGoHome}
          className="h-8 px-2 flex items-center gap-1.5 text-[12px] text-white/28 hover:text-white/60 hover:bg-white/[0.05] rounded-lg transition-all"
        >
          <span className="text-[11px] leading-none">⌂</span>
          <span>Home</span>
        </button>

        {title && (
          <>
            <div className="w-px h-4 bg-white/[0.07] mx-1.5" />
            <span className="text-[13px] text-white/35 font-medium">{title}</span>
          </>
        )}
      </div>

      {/* Right */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
