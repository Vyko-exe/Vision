import { useState, useEffect, useRef, useMemo } from 'react'
import { useBoardStore } from '../store/useBoardStore'
import { CanvasImage } from '../types'

const STORAGE_KEY = 'purelike_annotation_pos'

function loadPos() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export default function AnnotationPanel() {
  const {
    boards,
    activeBoardId,
    selectedElementIds,
    updateElement,
    groupElements,
    setSelectedElements,
  } = useBoardStore()
  const activeBoard = boards.find((b) => b.id === activeBoardId)
  const normalizeTag = (tag: string) => tag.trim().toLowerCase()

  const allTags = useMemo(() => {
    if (!activeBoard) return [] as string[]
    const firstByNorm = new Map<string, string>()
    activeBoard.elements.forEach((item) => {
      if (item.type !== 'image' || !item.categories) return
      item.categories.forEach((tag) => {
        const norm = normalizeTag(tag)
        if (!norm || firstByNorm.has(norm)) return
        firstByNorm.set(norm, tag.trim())
      })
    })
    return Array.from(firstByNorm.values())
  }, [activeBoard])

  const el = selectedElementIds.length === 1
    ? activeBoard?.elements.find((e) => e.id === selectedElementIds[0])
    : null

  if (!el || el.type !== 'image') return null

  const toggleTag = (tag: string) => {
    const current = el.categories ?? []
    const norm = normalizeTag(tag)
    const has = current.some((c) => normalizeTag(c) === norm)
    const next = has
      ? current.filter((c) => normalizeTag(c) !== norm)
      : [...current, tag.trim()]
    updateElement(el.id, { categories: next.length > 0 ? next : undefined })
  }

  const addTag = (rawTag: string) => {
    const tag = rawTag.trim()
    if (!tag) return
    const current = el.categories ?? []
    if (current.some((c) => normalizeTag(c) === normalizeTag(tag))) return
    updateElement(el.id, { categories: [...current, tag] })
  }

  const stackByTag = (tag: string) => {
    if (!activeBoard) return
    const trimmedTag = tag.trim()
    const norm = normalizeTag(trimmedTag)
    if (!norm) return

    const images = activeBoard.elements
      .filter((item): item is CanvasImage => item.type === 'image' && (item.categories ?? []).some((t) => normalizeTag(t) === norm))

    if (images.length < 2) return

    const ids = images.map((img) => img.id)
    groupElements(ids)

    const anchorX = Math.min(...images.map((img) => img.x))
    const anchorY = Math.min(...images.map((img) => img.y))
    const cols = Math.ceil(Math.sqrt(images.length))
    const gap = 20
    const maxW = Math.max(...images.map((img) => img.width))
    const maxH = Math.max(...images.map((img) => img.height))

    images
      .slice()
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .forEach((img, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = anchorX + col * (maxW + gap) + (maxW - img.width) / 2
        const y = anchorY + row * (maxH + gap) + (maxH - img.height) / 2
        updateElement(img.id, { x, y })
      })

    const state = useBoardStore.getState()
    const boardAfter = state.boards.find((b) => b.id === state.activeBoardId)
    const groupId = boardAfter?.elements.find((item) => item.id === ids[0] && item.type === 'image')?.groupId
    if (groupId) updateElement(groupId, { label: `#${trimmedTag}` })

    setSelectedElements(ids)
  }

  return (
    <DraggablePanel key={el.id}>
      <AnnotationForm
        initial={el.annotation ?? ''}
        tags={el.categories ?? []}
        allTags={allTags}
        onSave={(v) => updateElement(el.id, { annotation: v || undefined })}
        onToggleTag={toggleTag}
        onAddTag={addTag}
        onStackByTag={stackByTag}
      />
    </DraggablePanel>
  )
}

function DraggablePanel({ children }: { children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = loadPos()
    return saved ?? { x: window.innerWidth - 240, y: 80 }
  })

  const dragging  = useRef(false)
  const offset    = useRef({ x: 0, y: 0 })
  const currentPos = useRef(pos)
  currentPos.current = pos

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 208, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.current.y)),
      })
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPos.current))
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const onHandleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }

  return (
    <div
      className="fixed z-20 w-64 bg-[#0f0f0f] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onMouseDown={onHandleMouseDown}
        className="px-3 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2 cursor-grab active:cursor-grabbing"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white/20 shrink-0">
          <circle cx="2" cy="2" r="1" fill="currentColor"/><circle cx="8" cy="2" r="1" fill="currentColor"/>
          <circle cx="2" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/>
          <circle cx="2" cy="5" r="1" fill="currentColor"/><circle cx="8" cy="5" r="1" fill="currentColor"/>
        </svg>
        <span className="text-[10px] font-medium text-white/25 uppercase tracking-[0.22em]">Annotation</span>
      </div>
      <div className="select-text">{children}</div>
    </div>
  )
}

function AnnotationForm({ initial, tags, allTags, onSave, onToggleTag, onAddTag, onStackByTag }: {
  initial: string
  tags: string[]
  allTags: string[]
  onSave: (v: string) => void
  onToggleTag: (tag: string) => void
  onAddTag: (tag: string) => void
  onStackByTag: (tag: string) => void
}) {
  const [value, setValue] = useState(initial)
  const [newTag, setNewTag] = useState('')
  const [activeTag, setActiveTag] = useState('')

  const normalizeTag = (tag: string) => tag.trim().toLowerCase()

  useEffect(() => { setValue(initial) }, [initial])
  useEffect(() => {
    if (activeTag && allTags.some((t) => normalizeTag(t) === normalizeTag(activeTag))) return
    if (tags.length > 0) { setActiveTag(tags[0]); return }
    if (allTags.length > 0) { setActiveTag(allTags[0]); return }
    setActiveTag('')
  }, [activeTag, allTags, tags])

  return (
    <div className="p-3 space-y-3">
      {/* Tag chips */}
      <div className="flex flex-wrap gap-1">
        {allTags.map((tag) => {
          const assigned = tags.some((t) => normalizeTag(t) === normalizeTag(tag))
          const selected = normalizeTag(activeTag) === normalizeTag(tag)
          return (
            <button
              key={tag}
              onClick={() => { onToggleTag(tag); setActiveTag(tag) }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                selected ? 'border-white/40 text-white/90' : 'border-white/12 text-white/60 hover:text-white/85'
              }`}
              style={{
                background: assigned ? 'rgba(245,245,245,0.12)' : 'transparent',
              }}
            >
              #{tag}
            </button>
          )
        })}
        {allTags.length === 0 && (
          <span className="text-[10px] text-white/30">No tags yet</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const tag = newTag.trim()
            if (!tag) return
            onAddTag(tag)
            setActiveTag(tag)
            setNewTag('')
          }}
          placeholder="Create tag"
          className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-white/70 placeholder:text-white/20 outline-none focus:border-white/18"
        />
        <button
          onClick={() => {
            const tag = newTag.trim()
            if (!tag) return
            onAddTag(tag)
            setActiveTag(tag)
            setNewTag('')
          }}
          className="px-2 py-1 rounded-lg border border-white/[0.1] text-[11px] text-white/60 hover:text-white/85 hover:border-white/20"
        >
          Add
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/35 truncate">Stack tag: {activeTag ? `#${activeTag}` : '-'}</span>
        <button
          onClick={() => activeTag && onStackByTag(activeTag)}
          disabled={!activeTag}
          className="px-2 py-1 rounded-lg border border-white/[0.1] text-[11px] text-white/60 hover:text-white/85 hover:border-white/20 disabled:opacity-40 disabled:hover:text-white/60 disabled:hover:border-white/[0.1]"
        >
          Stack & Group
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        placeholder="Describe your intent..."
        rows={4}
        className="w-full bg-transparent text-[13px] resize-none outline-none placeholder:text-white/20 leading-relaxed text-white/70"
      />
    </div>
  )
}
