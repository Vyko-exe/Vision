import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import * as pdfjs from 'pdfjs-dist'
import { useHubStore, HubResource } from '../store/useHubStore'
import AppHeader from './AppHeader'

// ── PDF.js worker ─────────────────────────────────────────────────────────────
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ['artbook', 'anatomy', 'resources', 'references']

function openPdf(url: string) {
  if (url.startsWith('data:')) {
    const [header, b64] = url.split(',')
    const mime = header.split(':')[1].split(';')[0]
    const bytes = atob(b64)
    const buf = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
    window.open(URL.createObjectURL(new Blob([buf], { type: mime })), '_blank')
  } else {
    window.open(url, '_blank')
  }
}

function cleanTitle(name: string) {
  return name.replace(/\.pdf$/i, '')
}

async function generateThumbnail(dataUrl: string): Promise<string | null> {
  try {
    const pdf = await pdfjs.getDocument(dataUrl).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const scale = 300 / viewport.width
    const scaled = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = scaled.width
    canvas.height = scaled.height
    const ctx = canvas.getContext('2d')!
    await page.render({
      canvas,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport: scaled,
    }).promise
    return canvas.toDataURL('image/jpeg', 0.78)
  } catch {
    return null
  }
}

// ── Placeholder colors (derived from title) ───────────────────────────────────
const PLACEHOLDER_GRADIENTS = [
  ['#1a1a2e', '#16213e'],
  ['#1a1a1a', '#2d1b2e'],
  ['#0f1923', '#1a2f1a'],
  ['#1f1a0f', '#2e1f1a'],
  ['#1a0f1f', '#0f1a2e'],
]
function titleGradient(title: string) {
  const i = title.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length
  return PLACEHOLDER_GRADIENTS[i]
}

// ── PDF Card ──────────────────────────────────────────────────────────────────

function PdfCard({
  pdf,
  categories,
  isEditing,
  onOpen,
  onDelete,
  onCategoryChange,
  onStartRename,
  onRename,
}: {
  pdf: HubResource
  categories: string[]
  isEditing: boolean
  onOpen: () => void
  onDelete: () => void
  onCategoryChange: (cat: string) => void
  onStartRename: () => void
  onRename: (title: string) => void
}) {
  const [renameValue, setRenameValue] = useState(cleanTitle(pdf.title))
  const [showCatMenu, setShowCatMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const title = cleanTitle(pdf.title)
  const [grad0, grad1] = titleGradient(title)

  useEffect(() => {
    if (isEditing) {
      setRenameValue(title)
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
    }
  }, [isEditing, title])

  const commitRename = () => {
    const v = renameValue.trim()
    onRename(v ? v + (pdf.title.endsWith('.pdf') ? '' : '') : pdf.title)
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all duration-150 overflow-hidden">

      {/* Preview */}
      <button onClick={onOpen} className="relative w-full overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {pdf.thumbnail ? (
          <img
            src={pdf.thumbnail}
            alt={title}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3"
            style={{ background: `linear-gradient(160deg, ${grad0}, ${grad1})` }}
          >
            <span className="text-5xl font-bold text-white/10 select-none uppercase">
              {title[0] ?? 'P'}
            </span>
            <span className="text-[10px] font-medium tracking-[0.2em] text-white/15 uppercase">PDF</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white/80 text-xs font-medium tracking-wide">
            Open ↗
          </span>
        </div>
      </button>

      {/* Footer */}
      <div className="px-2.5 py-2 flex flex-col gap-1.5">
        {/* Title / rename */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') onRename(pdf.title)
            }}
            className="w-full bg-white/[0.06] border border-white/[0.15] rounded px-1.5 py-0.5 text-[12px] text-white/90 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onDoubleClick={onStartRename}
            title={title}
            className="text-left text-[12px] text-white/65 leading-snug line-clamp-2 hover:text-white/90 transition-colors"
          >
            {title}
          </button>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between gap-1">
          {/* Category */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setShowCatMenu((v) => !v)}
              className="text-[10px] text-white/25 hover:text-white/55 transition-colors truncate max-w-full"
            >
              {pdf.category || <span className="italic">uncategorized</span>}
            </button>
            {showCatMenu && (
              <div className="absolute bottom-full left-0 mb-1 z-20 bg-[#111] border border-white/[0.1] rounded-lg py-1 min-w-[130px] shadow-xl">
                <div
                  className="px-3 py-1.5 text-[11px] text-white/25 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  onClick={() => { onCategoryChange(''); setShowCatMenu(false) }}
                >
                  Uncategorized
                </div>
                {categories.map((cat) => (
                  <div
                    key={cat}
                    onClick={() => { onCategoryChange(cat); setShowCatMenu(false) }}
                    className={`px-3 py-1.5 text-[12px] hover:bg-white/[0.05] transition-colors cursor-pointer
                      ${pdf.category === cat ? 'text-white/80' : 'text-white/40'}`}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Icon actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={onStartRename}
              title="Rename"
              className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all text-[11px]"
            >
              ✎
            </button>
            <button
              onClick={onDelete}
              title="Delete"
              className="w-5 h-5 flex items-center justify-center rounded text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all text-[10px]"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PdfVaultPage({ onBack }: { onBack: () => void }) {
  const { resources, addResource, removeResource, updateResource } = useHubStore()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [importCategory, setImportCategory] = useState(DEFAULT_CATEGORIES[0])
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [addingCat, setAddingCat] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pdfs = useMemo(() => resources.filter((r) => r.type === 'pdf'), [resources])

  const categories = useMemo(() => {
    const fromPdfs = pdfs.map((p) => (p.category ?? '').trim().toLowerCase()).filter(Boolean)
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...extraCategories, ...fromPdfs]))
  }, [pdfs, extraCategories])

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {}
    pdfs.forEach((p) => {
      const cat = (p.category ?? '').trim().toLowerCase()
      if (cat) map[cat] = (map[cat] ?? 0) + 1
    })
    return map
  }, [pdfs])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return pdfs.filter((p) => {
      const matchSearch = !q || cleanTitle(p.title).toLowerCase().includes(q)
      const cat = (p.category ?? '').trim().toLowerCase()
      const matchCat = activeCategory === 'all' || cat === activeCategory
      return matchSearch && matchCat
    })
  }, [pdfs, search, activeCategory])

  const importFiles = useCallback(async (files: File[]) => {
    const pdfFiles = files.filter((f) => f.type === 'application/pdf')
    for (const file of pdfFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (ev) => resolve(ev.target?.result as string)
        reader.readAsDataURL(file)
      })
      const thumbnail = await generateThumbnail(dataUrl)
      addResource({ type: 'pdf', title: file.name, url: dataUrl, thumbnail: thumbnail ?? undefined, category: importCategory })
    }
  }, [addResource, importCategory])

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    importFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    importFiles(Array.from(e.dataTransfer.files))
  }

  const confirmNewCategory = () => {
    const val = newCatInput.trim().toLowerCase()
    if (val && !categories.includes(val)) setExtraCategories((prev) => [...prev, val])
    if (val) setActiveCategory(val)
    setNewCatInput('')
    setAddingCat(false)
  }

  const handleRename = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim()
    if (trimmed) updateResource(id, { title: trimmed })
    setEditingId(null)
  }

  return (
    <div
      className="h-screen w-screen bg-[#080808] text-white flex flex-col overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
      onDrop={onDrop}
      onClick={() => setEditingId(null)}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-white/25 rounded-3xl px-16 py-12 text-center">
            <p className="text-2xl font-semibold text-white/60">Drop PDFs here</p>
          </div>
        </div>
      )}

      {/* Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-[5%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 65%)' }} />
      </div>

      <AppHeader
        onGoHome={onBack}
        title="PDF Vault"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={importCategory}
              onChange={(e) => setImportCategory(e.target.value)}
              className="h-7 px-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/45 outline-none hover:border-white/15 focus:border-white/20 transition-colors cursor-pointer capitalize"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#111] capitalize">{cat}</option>
              ))}
            </select>
            <label className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[12px] text-white/60 hover:text-white/90 hover:bg-white/[0.1] hover:border-white/20 transition-all cursor-pointer active:scale-95">
              + Import
              <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={onFilePick} className="hidden" />
            </label>
          </div>
        }
      />

      {/* Body */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-white/[0.06] flex flex-col py-4 overflow-y-auto">
          <p className="px-4 mb-3 text-[10px] font-medium tracking-[0.25em] text-white/20 uppercase">Categories</p>

          <button
            onClick={() => setActiveCategory('all')}
            className={`flex items-center justify-between px-4 py-2 text-[13px] transition-colors rounded-lg mx-2
              ${activeCategory === 'all' ? 'text-white bg-white/[0.07]' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'}`}
          >
            <span>All</span>
            <span className="text-[11px] text-white/20">{pdfs.length}</span>
          </button>

          <div className="mt-1 space-y-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full flex items-center justify-between px-4 py-2 text-[13px] transition-colors rounded-lg mx-2 pr-6
                  ${activeCategory === cat ? 'text-white bg-white/[0.07]' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'}`}
              >
                <span className="truncate capitalize">{cat}</span>
                {(categoryCounts[cat] ?? 0) > 0 && (
                  <span className="text-[11px] text-white/20 flex-shrink-0">{categoryCounts[cat]}</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 px-3">
            {addingCat ? (
              <input
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmNewCategory()
                  if (e.key === 'Escape') { setAddingCat(false); setNewCatInput('') }
                }}
                onBlur={confirmNewCategory}
                autoFocus
                placeholder="name..."
                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1.5 text-[12px] text-white placeholder-white/20 outline-none focus:border-white/25"
              />
            ) : (
              <button
                onClick={() => setAddingCat(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-white/25 hover:text-white/50 transition-colors rounded-lg hover:bg-white/[0.03]"
              >
                <span className="text-base leading-none">+</span>
                <span>New category</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-6 py-4 border-b border-white/[0.05] flex-shrink-0">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm pointer-events-none">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a document..."
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-9 pr-9 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 text-sm transition-colors">✕</button>
              )}
            </div>
          </div>

          {/* Count */}
          <div className="px-6 py-2.5 flex-shrink-0">
            <p className="text-[11px] text-white/20 uppercase tracking-widest">
              {visible.length} document{visible.length !== 1 ? 's' : ''}
              {activeCategory !== 'all' && <span className="ml-1 capitalize">· {activeCategory}</span>}
            </p>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {visible.length === 0 && pdfs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl border border-dashed border-white/[0.1] flex items-center justify-center">
                  <svg width="24" height="30" viewBox="0 0 24 30" fill="none">
                    <path d="M2 0h13l9 9v19a2 2 0 01-2 2H2a2 2 0 01-2-2V2a2 2 0 012-2z" fill="white" fillOpacity="0.06"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-white/35">No documents</p>
                  <p className="text-[13px] text-white/18 mt-1">Import PDFs or drop them here</p>
                </div>
                <label className="mt-2 px-4 py-2 rounded-xl border border-dashed border-white/[0.1] text-[13px] text-white/25 hover:text-white/55 hover:border-white/20 transition-all cursor-pointer">
                  + Import PDFs
                  <input type="file" accept="application/pdf" multiple onChange={onFilePick} className="hidden" />
                </label>
              </div>
            )}

            {visible.length === 0 && pdfs.length > 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-[14px] text-white/30">No results</p>
                <button onClick={() => { setSearch(''); setActiveCategory('all') }} className="text-[12px] text-white/20 hover:text-white/50 transition-colors">
                  Clear filters
                </button>
              </div>
            )}

            {visible.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3" onClick={(e) => e.stopPropagation()}>
                {visible.map((pdf) => (
                  <PdfCard
                    key={pdf.id}
                    pdf={pdf}
                    categories={categories}
                    isEditing={editingId === pdf.id}
                    onOpen={() => openPdf(pdf.url)}
                    onDelete={() => removeResource(pdf.id)}
                    onCategoryChange={(cat) => updateResource(pdf.id, { category: cat })}
                    onStartRename={() => setEditingId(pdf.id)}
                    onRename={(title) => handleRename(pdf.id, title)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
