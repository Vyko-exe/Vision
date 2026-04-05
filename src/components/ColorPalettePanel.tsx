import { useEffect, useState } from 'react'
import { useBoardStore } from '../store/useBoardStore'

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

async function extractPalette(src: string, numColors = 8): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const SIZE = 120
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))
      ctx.drawImage(img, 0, 0, SIZE, SIZE)

      let data: Uint8ClampedArray
      try {
        data = ctx.getImageData(0, 0, SIZE, SIZE).data
      } catch {
        return reject(new Error('Cannot read pixel data (CORS?)'))
      }

      const Q = 24
      const colorMap = new Map<string, { count: number; r: number; g: number; b: number }>()

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue
        const r = Math.floor(data[i] / Q) * Q
        const g = Math.floor(data[i + 1] / Q) * Q
        const b = Math.floor(data[i + 2] / Q) * Q
        const key = `${r},${g},${b}`
        const entry = colorMap.get(key)
        if (entry) entry.count++
        else colorMap.set(key, { count: 1, r, g, b })
      }

      const sorted = [...colorMap.values()].sort((a, b) => b.count - a.count)

      const palette: string[] = []
      for (const c of sorted) {
        if (palette.length >= numColors) break
        const hex = rgbToHex(c.r, c.g, c.b)
        const tooClose = palette.some((p) => colorDistance(p, hex) < 55)
        if (!tooClose) palette.push(hex)
      }

      resolve(palette)
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export default function ColorPalettePanel({
  imageSrc,
  onClose,
}: {
  imageSrc: string
  onClose: () => void
}) {
  const [palette, setPalette] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const setDrawColor = useBoardStore((s) => s.setDrawColor)

  useEffect(() => {
    setLoading(true)
    setError(null)
    extractPalette(imageSrc)
      .then((colors) => {
        setPalette(colors)
        setLoading(false)
      })
      .catch((e: Error) => {
        setError(e.message)
        setLoading(false)
      })
  }, [imageSrc])

  const handleSwatchClick = (hex: string) => {
    setDrawColor(hex)
    navigator.clipboard.writeText(hex).catch(() => {})
    setCopied(hex)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="bg-panel border border-border rounded-2xl shadow-2xl shadow-black/60 px-3 py-2.5 min-w-[240px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-dim">Image palette</span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-muted hover:text-dim text-xs"
        >
          ✕
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-3">
          <span className="text-xs text-muted animate-pulse">Extracting...</span>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 py-2 px-1">{error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="flex flex-wrap gap-2">
            {palette.map((hex) => {
              const lum = luminance(hex)
              const labelColor = lum > 0.35 ? '#000' : '#fff'
              return (
                <button
                  key={hex}
                  title={hex}
                  onClick={() => handleSwatchClick(hex)}
                  className="relative group w-9 h-9 rounded-xl border border-white/10 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                  style={{ background: hex }}
                >
                  <span
                    className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                    style={{ color: 'var(--color-dim)' }}
                  >
                    {hex}
                  </span>
                  {copied === hex && (
                    <span className="text-[9px] font-bold pointer-events-none" style={{ color: labelColor }}>
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-muted mt-4">
            Click → set active color + copy
          </p>
        </>
      )}
    </div>
  )
}
