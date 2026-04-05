import { useState } from 'react'
import { useBoardStore } from '../store/useBoardStore'
import { Tool, CanvasImage } from '../types'
import ColorPalettePanel from './ColorPalettePanel'

const tools: { id: Tool; icon: string; label: string; shortcut: string }[] = [
  { id: 'picker', icon: '◉',  label: 'Picker', shortcut: 'I' },
  { id: 'text',   icon: 'Aa', label: 'Text',   shortcut: 'T' },
  { id: 'draw',   icon: '∿',  label: 'Draw',   shortcut: 'D' },
]

// ── Color sort helpers ────────────────────────────────────────────────────────

async function getDominantHue(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const SIZE = 48
        const canvas = document.createElement('canvas')
        canvas.width = SIZE; canvas.height = SIZE
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data

        let hueX = 0, hueY = 0, totalWeight = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          const s = max - min
          if (s < 0.08) continue // skip near-grays

          const l = (max + min) / 2
          const colorfulness = s * (1 - Math.abs(2 * l - 1))

          let h = 0
          if (max === r)      h = ((g - b) / s + 6) % 6
          else if (max === g) h = (b - r) / s + 2
          else                h = (r - g) / s + 4
          const deg = h / 6 * 360

          // Circular mean to avoid 0°/360° wrap issues
          hueX += Math.cos(deg * Math.PI / 180) * colorfulness
          hueY += Math.sin(deg * Math.PI / 180) * colorfulness
          totalWeight += colorfulness
        }

        if (totalWeight < 0.05) { resolve(-1); return } // essentially grayscale
        const mean = Math.atan2(hueY / totalWeight, hueX / totalWeight) * 180 / Math.PI
        resolve((mean + 360) % 360)
      } catch {
        resolve(0)
      }
    }
    img.onerror = () => resolve(0)
    img.src = src
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Toolbar({ onToggleFullscreen }: { onToggleFullscreen?: () => void }) {
  const {
    selectedTool, setTool,
    drawColor, setDrawColor,
    strokeWidth, setStrokeWidth,
    bwMode, toggleBwMode,
    selectedElementIds, boards, activeBoardId,
    updateElement, saveSnapshot,
  } = useBoardStore()

  const [showPalette, setShowPalette] = useState(false)
  const [sorting, setSorting] = useState(false)

  const activeBoard = boards.find((b) => b.id === activeBoardId)

  // Single image selected → palette button
  const selectedImage = selectedElementIds.length === 1
    ? activeBoard?.elements.find((el) => el.id === selectedElementIds[0] && el.type === 'image') as CanvasImage | undefined
    : undefined

  // 2+ images selected → sort by color button
  const selectedImages = selectedElementIds.length >= 2
    ? (activeBoard?.elements.filter(
        (el) => selectedElementIds.includes(el.id) && el.type === 'image'
      ) as CanvasImage[]) ?? []
    : []

  if (showPalette && !selectedImage) setShowPalette(false)

  const handleSortByColor = async () => {
    if (selectedImages.length < 2 || sorting) return
    setSorting(true)
    saveSnapshot()

    const withHue = await Promise.all(
      selectedImages.map(async (img) => ({ img, hue: await getDominantHue(img.src) }))
    )

    // Sort: chromatic images by hue, grayscale at the end
    withHue.sort((a, b) => {
      if (a.hue < 0 && b.hue < 0) return 0
      if (a.hue < 0) return 1
      if (b.hue < 0) return -1
      return a.hue - b.hue
    })

    // Grid layout: start from top-left of current bounding box
    const cols = Math.ceil(Math.sqrt(withHue.length))
    const startX = Math.min(...selectedImages.map((i) => i.x))
    const startY = Math.min(...selectedImages.map((i) => i.y))
    const maxW   = Math.max(...selectedImages.map((i) => i.width))
    const maxH   = Math.max(...selectedImages.map((i) => i.height))
    const GAP = 18

    withHue.forEach(({ img }, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      updateElement(img.id, {
        x: startX + col * (maxW + GAP),
        y: startY + row * (maxH + GAP),
      })
    })

    setSorting(false)
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-10 flex items-center gap-0.5 bg-panel border border-border rounded-2xl px-2 py-2 shadow-2xl shadow-black/60">

      {showPalette && selectedImage && (
        <ColorPalettePanel imageSrc={selectedImage.src} onClose={() => setShowPalette(false)} />
      )}

      {tools.map((t) => (
        <button
          key={t.id}
          title={`${t.label}  ${t.shortcut}`}
          onClick={() => setTool(t.id)}
          className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-150
            ${selectedTool === t.id
              ? 'bg-white/10 text-primary'
              : 'text-muted hover:text-dim hover:bg-white/[0.04]'
            }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-px h-5 bg-border mx-1.5" />

      {/* Color picker */}
      <label title="Color" className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all">
        <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: drawColor }} />
        <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </label>

      {/* Stroke width */}
      <div className="flex items-center gap-2 px-2">
        <input type="range" min={1} max={30} value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          title="Stroke width"
          className="w-16 h-1 appearance-none bg-border rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      <div className="w-px h-5 bg-border mx-1.5" />

      {/* B&W toggle */}
      <button
        onClick={toggleBwMode}
        title="Black & White  (B)"
        className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all duration-150
          ${bwMode ? 'bg-white/10 text-primary' : 'text-muted hover:text-dim hover:bg-white/[0.04]'}`}
      >
        <span className="w-4 h-4 rounded-full border border-current" style={{
          background: bwMode ? 'linear-gradient(135deg, #fff 50%, #000 50%)' : 'linear-gradient(135deg, #888 50%, #333 50%)'
        }} />
      </button>

      <div className="w-px h-5 bg-border mx-1.5" />

      {/* Sort by color — 2+ images selected */}
      {selectedImages.length >= 2 && (
        <button
          title={sorting ? 'Sorting...' : `Sort by color (${selectedImages.length} images)`}
          onClick={handleSortByColor}
          disabled={sorting}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150
            ${sorting
              ? 'opacity-40 cursor-wait'
              : 'text-muted hover:text-dim hover:bg-white/[0.04]'
            }`}
        >
          <span
            className="w-4 h-4 rounded-full"
            style={{
              background: sorting
                ? '#555'
                : 'conic-gradient(#f55, #ff5, #5f5, #55f, #f5f, #f55)',
              opacity: sorting ? 0.4 : 0.85,
            }}
          />
        </button>
      )}

      {/* Palette — 1 image selected */}
      {selectedImage && (
        <button
          title="Color palette"
          onClick={() => setShowPalette((v) => !v)}
          className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all duration-150
            ${showPalette ? 'bg-white/10 text-primary' : 'text-muted hover:text-dim hover:bg-white/[0.04]'}`}
        >
          <span className="flex gap-0.5">
            <span className="w-1.5 h-4 rounded-sm" style={{ background: 'linear-gradient(#e55, #55e)' }} />
            <span className="w-1.5 h-4 rounded-sm" style={{ background: 'linear-gradient(#5e5, #e5e)' }} />
            <span className="w-1.5 h-4 rounded-sm" style={{ background: 'linear-gradient(#55e, #e55)' }} />
          </span>
        </button>
      )}

      <button
        title="Fullscreen"
        onClick={onToggleFullscreen}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all duration-150 text-muted hover:text-dim hover:bg-white/[0.04]"
      >
        ⛶
      </button>
    </div>
  )
}
