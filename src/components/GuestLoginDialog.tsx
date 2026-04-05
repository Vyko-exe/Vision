import { useState, FormEvent } from 'react'

interface GuestLoginDialogProps {
  onConfirm: (username: string) => void
  onCancel: () => void
}

export default function GuestLoginDialog({ onConfirm, onCancel }: GuestLoginDialogProps) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!username.trim()) {
      setError('Enter your name.')
      return
    }
    
    onConfirm(username.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-8 w-96 shadow-lg">
        <h2 className="text-white text-xl font-semibold mb-2">Welcome!</h2>
        <p className="text-white/60 text-sm mb-6">What's your name?</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20"
            autoFocus
          />
          
          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
