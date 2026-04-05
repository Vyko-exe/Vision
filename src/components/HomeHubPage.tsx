import { useAuthStore } from '../store/useAuthStore'

const HOUR = new Date().getHours()
const GREETING = HOUR < 5 ? 'Good night' : HOUR < 12 ? 'Good morning' : HOUR < 18 ? 'Good afternoon' : 'Good evening'

function BoardsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="1" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1" y="12" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="9" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function ResourcesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 2h9l5 5v13a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13 2v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11h8M7 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function HomeHubPage({
  userName,
  onOpenBoards,
  onOpenResources,
}: {
  userName: string
  onOpenBoards: () => void
  onOpenResources: () => void
}) {
  const logout = useAuthStore((s) => s.logout)
  const firstName = userName.split(' ')[0]

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070707] text-white relative flex flex-col">

      {/* ── Atmosphere ──────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-5%] w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 60%)' }} />
        <div className="absolute top-[35%] right-[20%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }} />
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-8 pt-7 pb-0 flex-shrink-0">
        <span className="text-[11px] font-medium tracking-[0.35em] text-white/20 uppercase select-none">
          Purelike
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/20 hidden sm:inline select-none">{userName}</span>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg text-[12px] text-white/25 hover:text-white/50 border border-white/[0.07] hover:border-white/15 transition-all"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">

        {/* Greeting */}
        <div className="text-center mb-14">
          <p className="text-[12px] tracking-[0.3em] text-white/20 uppercase mb-3 select-none">
            {GREETING}
          </p>
          <h1 className="text-[46px] md:text-[58px] font-bold tracking-[-0.03em] leading-tight text-white">
            {firstName}.
          </h1>
          <p className="mt-3 text-white/30 text-[15px]">Where do you want to go today?</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[720px]">

          {/* Boards card */}
          <button
            onClick={onOpenBoards}
            className="group text-left rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur
              p-7 transition-all duration-200
              hover:border-white/[0.16] hover:bg-white/[0.055]
              active:scale-[0.98]"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-11 h-11 rounded-xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-white/40 group-hover:text-white/70 group-hover:border-white/20 transition-all">
                <BoardsIcon />
              </div>
              <span className="text-[11px] tracking-[0.2em] text-white/18 uppercase mt-1 group-hover:text-white/35 transition-colors">
                Workspace
              </span>
            </div>

            <div className="mb-2 text-[22px] font-semibold tracking-tight">My boards</div>
            <p className="text-[13px] text-white/35 leading-relaxed">
              Moodboards, free canvas, annotations, and visual comparison. Your creative playground.
            </p>

            <div className="mt-8 flex items-center justify-between text-[12px] text-white/22 group-hover:text-white/40 transition-colors">
              <span>Art direction</span>
              <span className="translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Resources card */}
          <button
            onClick={onOpenResources}
            className="group text-left rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur
              p-7 transition-all duration-200
              hover:border-white/[0.16] hover:bg-white/[0.055]
              active:scale-[0.98]"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-11 h-11 rounded-xl border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-white/40 group-hover:text-white/70 group-hover:border-white/20 transition-all">
                <ResourcesIcon />
              </div>
              <span className="text-[11px] tracking-[0.2em] text-white/18 uppercase mt-1 group-hover:text-white/35 transition-colors">
                Library
              </span>
            </div>

            <div className="mb-2 text-[22px] font-semibold tracking-tight">My resources</div>
            <p className="text-[13px] text-white/35 leading-relaxed">
              PDFs, references, documentation. Organized by category for a clean library.
            </p>

            <div className="mt-8 flex items-center justify-between text-[12px] text-white/22 group-hover:text-white/40 transition-colors">
              <span>References & documentation</span>
              <span className="translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
