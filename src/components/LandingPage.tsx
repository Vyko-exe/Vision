import { useState, FormEvent } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import GuestLoginDialog from './GuestLoginDialog'

const FEATURES = [
  'Free infinite canvas',
  'Palette extraction',
  'Annotations & comparison',
  'Multi-board & folders',
]

export default function LandingPage() {
  const { login, signup, loginGuest } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showGuestDialog, setShowGuestDialog] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) { setError('Fill in all fields.'); return }
    if (mode === 'signup') {
      if (!name.trim()) { setError('Enter your name.'); return }
      if (!signup(email, password, name)) setError('This email is already in use.')
    } else {
      if (!login(email, password)) setError('Incorrect email or password.')
    }
  }

  const toggle = () => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }

  return (
    <div className="min-h-screen bg-[#070707] text-white flex overflow-hidden">

      {/* ── Left panel ────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] p-14 relative overflow-hidden select-none">

        {/* Gradient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-8%] w-[560px] h-[560px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)' }} />
          <div className="absolute bottom-[-8%] right-[0%] w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)' }} />
          <div className="absolute top-[45%] left-[30%] w-[320px] h-[320px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 65%)' }} />
          {/* subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <span className="text-[11px] font-medium tracking-[0.35em] text-white/25 uppercase">
            Purelike
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <h1 className="text-[64px] font-bold tracking-[-0.03em] leading-[1.05] mb-7 text-white">
            Art<br />
            direction.<br />
            <span style={{ color: 'rgba(139,92,246,0.85)' }}>Without limits.</span>
          </h1>
          <p className="text-white/35 text-[17px] leading-relaxed max-w-[340px]">
            A workspace designed for artists.
          </p>

          <div className="mt-10 space-y-3.5">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3 text-[13px] text-white/40">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(139,92,246,0.7)' }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[11px] text-white/15">
          Visual creation space.
        </p>
      </div>

      {/* ── Right panel (form) ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle right-side bg */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.015) 0%, transparent 60%)' }} />

        <div className="w-full max-w-[360px] relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <span className="text-[11px] tracking-[0.35em] text-white/25 uppercase">Purelike</span>
            <h1 className="text-3xl font-bold mt-3 tracking-tight">Your creative space</h1>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[26px] font-semibold tracking-tight">
              {mode === 'login' ? 'Welcome back.' : 'Create an account.'}
            </h2>
            <p className="text-white/35 text-sm mt-1.5">
              {mode === 'login'
                ? 'Sign in to access your workspace.'
                : 'Join the art direction workspace.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-white/30 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all
                    focus:border-white/20 focus:bg-white/[0.06]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-white/30 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all
                  focus:border-white/20 focus:bg-white/[0.06]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-white/30 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all
                  focus:border-white/20 focus:bg-white/[0.06]"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-400/80 pt-0.5">{error}</p>
            )}

            <button
              type="submit"
              className="w-full mt-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all
                bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/20
                active:scale-[0.98]"
            >
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setShowGuestDialog(true)}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 transition-all
                  bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.16]
                  active:scale-[0.98]"
              >
                Sign in as guest
              </button>
            )}
          </form>

          {/* Toggle */}
          <div className="mt-6 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <button
              onClick={toggle}
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors whitespace-nowrap px-2"
            >
              {mode === 'login'
                ? 'No account? Sign up'
                : 'Already registered? Sign in'}
            </button>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
        </div>
      </div>

      {/* Guest Login Dialog */}
      {showGuestDialog && (
        <GuestLoginDialog
          onConfirm={(username) => {
            setShowGuestDialog(false)
            loginGuest(username)
          }}
          onCancel={() => setShowGuestDialog(false)}
        />
      )}
    </div>
  )
}
