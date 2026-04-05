import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import ColorPalettePanel from './ColorPalettePanel'
import {
  Stage, Layer, Image as KonvaImage, Text, Line, Transformer, Rect, Group,
} from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'
import { useBoardStore } from '../store/useBoardStore'
import { CanvasImage, CanvasGroup, CanvasText, CanvasElement } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function haveIntersection(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return !(b.x > a.x + a.width || b.x + b.width < a.x || b.y > a.y + a.height || b.y + b.height < a.y)
}

interface DragCallbacks {
  onDragStart: (id: string, x: number, y: number) => void
  onDragMove:  (id: string, x: number, y: number) => void
  onDragEnd:   (id: string, x: number, y: number) => void
}

// ── Image element ──────────────────────────────────────────────────────────────
function ImageEl({ el, onSelect, drag, listening = true }: {
  el: CanvasImage
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void
  drag: DragCallbacks
  listening?: boolean
}) {
  const [image] = useImage(el.src, 'anonymous')
  const { updateElement, selectedElementIds } = useBoardStore()
  const ANNOTATION_FONT = 11
  const ANNOTATION_PAD  = 6

  const flipScaleX = el.flipX ? -1 : 1
  const flipScaleY = el.flipY ? -1 : 1
  const offsetX    = el.flipX ? el.width  : 0
  const offsetY    = el.flipY ? el.height : 0

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x} y={el.y}
      rotation={el.rotation ?? 0}
      draggable
      listening={listening}
      onMouseDown={(e) => { if (e.evt.button === 1) e.evt.preventDefault() }}
      onClick={(e) => { if (e.evt.button !== 1) onSelect(e) }}
      onTap={onSelect}
      onDragStart={(e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.evt.buttons === 4) { (e.target as Konva.Node).stopDrag(); return }
        drag.onDragStart(el.id, e.target.x(), e.target.y())
      }}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        drag.onDragMove(el.id, e.target.x(), e.target.y())
        updateElement(el.id, { x: e.target.x(), y: e.target.y() })
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        if (selectedElementIds.length > 1 && selectedElementIds.includes(el.id)) {
          drag.onDragEnd(el.id, e.target.x(), e.target.y())
        } else {
          updateElement(el.id, { x: e.target.x(), y: e.target.y() })
        }
      }}
    >
      <KonvaImage
        image={image}
        width={el.width} height={el.height}
        scaleX={flipScaleX}
        scaleY={flipScaleY}
        offsetX={offsetX}
        offsetY={offsetY}
        onTransformEnd={(e) => {
          useBoardStore.getState().saveSnapshot()
          const node = e.target as Konva.Image
          const group = node.getParent() as Konva.Group
          updateElement(el.id, {
            x: group.x(), y: group.y(),
            width:    Math.abs(node.width()  * node.scaleX()),
            height:   Math.abs(node.height() * node.scaleY()),
            rotation: group.rotation(),
          })
          node.scaleX(flipScaleX); node.scaleY(flipScaleY)
          node.offsetX(offsetX);   node.offsetY(offsetY)
        }}
      />
      {el.annotation && (
        <>
          <Rect
            x={0}
            y={el.height + 4}
            width={el.width}
            height={ANNOTATION_FONT * 1.5 * Math.max(1, el.annotation.split('\n').length) + ANNOTATION_PAD * 2}
            fill="rgba(0,0,0,0.55)"
            cornerRadius={4}
            listening={false}
          />
          <Text
            x={ANNOTATION_PAD}
            y={el.height + 4 + ANNOTATION_PAD}
            width={el.width - ANNOTATION_PAD * 2}
            text={el.annotation}
            fontSize={ANNOTATION_FONT}
            fill="rgba(245,245,245,0.75)"
            wrap="word"
            listening={false}
          />
        </>
      )}
    </Group>
  )
}

// ── Text element ───────────────────────────────────────────────────────────────
function TextEl({ el, onSelect, drag, stageRef, listening = true }: {
  el: CanvasText
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void
  drag: DragCallbacks
  stageRef: React.RefObject<Konva.Stage | null>
  listening?: boolean
}) {
  const textRef = useRef<Konva.Text>(null)
  const { updateElement, selectedElementIds } = useBoardStore()

  const handleDblClick = () => {
    const node = textRef.current!
    const stage = node.getStage()!
    const absPos = node.getAbsolutePosition()
    const stageBox = stage.container().getBoundingClientRect()
    const scale = stageRef.current?.scaleX() ?? 1
    node.hide()

    const wrap = document.createElement('div')
    Object.assign(wrap.style, {
      position: 'fixed',
      top: `${stageBox.top + absPos.y}px`,
      left: `${stageBox.left + absPos.x}px`,
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    })

    const textarea = document.createElement('textarea')
    textarea.value = el.text
    const textWidth = el.width ? el.width * scale : Math.max(node.width() * scale, 180)
    Object.assign(textarea.style, {
      width:      `${textWidth}px`,
      minHeight:  `${el.fontSize * scale * 1.5}px`,
      fontSize:   `${el.fontSize * scale}px`,
      lineHeight: '1.5',
      border:     '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      padding:    `${8 * scale}px ${12 * scale}px`,
      overflow:   'hidden',
      background: 'rgba(10, 10, 10, 0.97)',
      color:      el.color,
      outline:    'none',
      resize:     'none',
      fontFamily: 'inherit',
      whiteSpace: el.width ? 'pre-wrap' : 'pre',
      boxShadow:  '0 8px 32px rgba(0,0,0,0.6)',
    })

    const hint = document.createElement('div')
    Object.assign(hint.style, {
      fontSize: '11px', color: 'rgba(255,255,255,0.22)',
      fontFamily: 'inherit', pointerEvents: 'none',
    })
    hint.textContent = '↵ confirm · ⇧↵ newline · ⎋ cancel'

    wrap.appendChild(textarea)
    wrap.appendChild(hint)
    document.body.appendChild(wrap)

    const autoResize = () => { textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px' }
    textarea.addEventListener('input', autoResize)
    autoResize()
    textarea.focus()
    textarea.select()

    // Strip HTML on paste — keep plain text only
    textarea.addEventListener('paste', (ev) => {
      ev.preventDefault()
      const plain = ev.clipboardData?.getData('text/plain') ?? ''
      const s = textarea.selectionStart ?? 0, e2 = textarea.selectionEnd ?? 0
      textarea.value = textarea.value.slice(0, s) + plain + textarea.value.slice(e2)
      textarea.selectionStart = textarea.selectionEnd = s + plain.length
      autoResize()
    })

    let done = false
    const finish = () => {
      if (done) return; done = true
      updateElement(el.id, { text: textarea.value.trim() || el.text })
      document.body.removeChild(wrap)
      node.show()
    }
    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); finish() }
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); finish() }
    })
    textarea.addEventListener('blur', finish)
  }

  const width = el.width ? Math.max(20, el.width) : undefined
  const highlightW = width ?? Math.max(60, el.text.split('\n').reduce((m, line) => Math.max(m, line.length), 0) * el.fontSize * 0.58)
  const lineCount = Math.max(1, el.text.split('\n').length)
  const highlightH = Math.max(el.fontSize * 1.5, lineCount * el.fontSize * 1.5)

  return (
    <>
      {el.highlightColor && (
        <Rect
          x={el.x - 2}
          y={el.y - 2}
          width={highlightW + 4}
          height={highlightH + 4}
          cornerRadius={4}
          fill={el.highlightColor}
          opacity={0.35}
          listening={false}
        />
      )}
      <Text
        ref={textRef}
        id={el.id}
        name="element"
        x={el.x} y={el.y}
        text={el.text}
        fontSize={el.fontSize}
        fill={el.color}
        fontStyle={el.fontStyle ?? 'normal'}
        textDecoration={el.textDecoration}
        width={width}
        wrap={el.width ? 'word' : 'none'}
        listening={listening}
        draggable
        onMouseDown={(e) => { if (e.evt.button === 1) e.evt.preventDefault() }}
        onClick={(e) => { if (e.evt.button !== 1) onSelect(e) }}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDragStart={(e) => {
          if (e.evt.buttons === 4) { (e.target as Konva.Node).stopDrag(); return }
          drag.onDragStart(el.id, e.target.x(), e.target.y())
        }}
        onDragMove={(e) => {
          drag.onDragMove(el.id, e.target.x(), e.target.y())
          updateElement(el.id, { x: e.target.x(), y: e.target.y() })
        }}
        onDragEnd={(e) => {
          if (selectedElementIds.length > 1 && selectedElementIds.includes(el.id)) {
            drag.onDragEnd(el.id, e.target.x(), e.target.y())
          } else {
            updateElement(el.id, { x: e.target.x(), y: e.target.y() })
          }
        }}
      />
    </>
  )
}

// ── Group frame ────────────────────────────────────────────────────────────────
function GroupEl({ el, stageRef, activeBoardId, listening = true }: {
  el: CanvasGroup
  stageRef: React.RefObject<Konva.Stage | null>
  activeBoardId: string
  listening?: boolean
}) {
  const { boards, updateElement, setSelectedElements } = useBoardStore()
  const members = boards.find((b) => b.id === activeBoardId)?.elements.filter((m) => m.groupId === el.id) ?? []
  const startPositions = useRef(new Map<string, { x: number; y: number }>())
  const labelRef = useRef<Konva.Text>(null)

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.evt.buttons === 4) { (e.target as Konva.Node).stopDrag(); return }
    useBoardStore.getState().saveSnapshot()
    startPositions.current.clear()
    startPositions.current.set(el.id, { x: e.target.x(), y: e.target.y() })
    members.forEach((m) => {
      const node = stageRef.current?.findOne<Konva.Node>('#' + m.id)
      if (node) startPositions.current.set(m.id, { x: node.x(), y: node.y() })
    })
  }

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const start = startPositions.current.get(el.id)
    if (!start) return
    const dx = e.target.x() - start.x
    const dy = e.target.y() - start.y
    members.forEach((m) => {
      const node = stageRef.current?.findOne<Konva.Node>('#' + m.id)
      const s = startPositions.current.get(m.id)
      if (node && s) { node.x(s.x + dx); node.y(s.y + dy) }
    })
  }

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const start = startPositions.current.get(el.id)
    if (!start) return
    const dx = e.target.x() - start.x
    const dy = e.target.y() - start.y
    updateElement(el.id, { x: e.target.x(), y: e.target.y() })
    members.forEach((m) => {
      const s = startPositions.current.get(m.id)
      if (s) updateElement(m.id, { x: s.x + dx, y: s.y + dy })
    })
    startPositions.current.clear()
  }

  const labelFontSize = Math.max(11, Math.floor(el.width / 20))
  const labelY = el.y - labelFontSize - 12

  const handleTransform = (e: Konva.KonvaEventObject<Event>) => {
    if (!labelRef.current) return
    const node = e.target as Konva.Rect
    const liveW = el.width * node.scaleX()
    const newFontSize = Math.max(11, Math.floor(liveW / 20))
    labelRef.current.fontSize(newFontSize)
    labelRef.current.x(node.x())
    labelRef.current.y(node.y() - newFontSize - 12)
    labelRef.current.width(liveW)
    labelRef.current.getLayer()?.batchDraw()
  }

  const handleDblClick = () => {
    const stage = stageRef.current
    if (!stage) return
    const scale = stage.scaleX()
    const stageBox = stage.container().getBoundingClientRect()
    const absX = stageBox.left + stage.x() + (el.x + el.width / 2) * scale
    const absY = stageBox.top + stage.y() + labelY * scale

    const input = document.createElement('input')
    document.body.appendChild(input)
    labelRef.current?.hide()
    labelRef.current?.getLayer()?.batchDraw()
    input.value = el.label ?? 'Groupe'
    Object.assign(input.style, {
      position: 'fixed',
      top: `${absY}px`,
      left: `${absX}px`,
      transform: 'translate(-50%, 0)',
      width: `${Math.max(80, el.width * scale)}px`,
      fontSize: `${Math.max(10, labelFontSize * scale)}px`,
      fontFamily: 'inherit',
      textAlign: 'center',
      background: 'transparent',
      color: 'rgba(255,255,255,0.7)',
      border: 'none',
      padding: '0',
      outline: 'none',
      zIndex: '9999',
    })
    input.focus(); input.select()
    const done = () => {
      updateElement(el.id, { label: input.value.trim() || 'Groupe' })
      labelRef.current?.show()
      labelRef.current?.getLayer()?.batchDraw()
      if (document.body.contains(input)) document.body.removeChild(input)
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); done() } })
    input.addEventListener('blur', done)
  }

  return (
    <>
      <Rect
        id={el.id}
        x={el.x} y={el.y}
        width={el.width} height={el.height}
        fill="rgba(255,255,255,0.025)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        cornerRadius={6}
        draggable={listening}
        listening={listening}
        onMouseDown={(e) => { if (e.evt.button === 1) { e.evt.preventDefault(); e.evt.stopPropagation() } }}
        onClick={(e) => { if (e.evt.button !== 1) setSelectedElements([el.id]) }}
        onDblClick={handleDblClick}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransform={handleTransform}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Rect
          const newW = Math.max(80, node.width() * node.scaleX())
          const newH = Math.max(80, node.height() * node.scaleY())
          const scaleX = newW / el.width
          const scaleY = newH / el.height
          const newX = node.x()
          const newY = node.y()

          updateElement(el.id, { x: newX, y: newY, width: newW, height: newH })

          members.forEach((member) => {
            if (member.type === 'image' || member.type === 'text') {
              const relX = member.x - el.x
              const relY = member.y - el.y
              if (member.type === 'image') {
                updateElement(member.id, {
                  x: newX + relX * scaleX,
                  y: newY + relY * scaleY,
                  width: Math.max(20, Math.round(member.width * scaleX)),
                  height: Math.max(20, Math.round(member.height * scaleY)),
                })
              } else {
                const textScale = Math.max(scaleX, scaleY)
                updateElement(member.id, {
                  x: newX + relX * scaleX,
                  y: newY + relY * scaleY,
                  width: Math.max(40, Math.round((member.width ?? 200) * scaleX)),
                  fontSize: Math.max(8, Math.round(member.fontSize * textScale)),
                })
              }
            } else if (member.type === 'line') {
              updateElement(member.id, {
                points: member.points.map((value, index) =>
                  index % 2 === 0
                    ? newX + (value - el.x) * scaleX
                    : newY + (value - el.y) * scaleY
                ),
              })
            }
          })

          node.scaleX(1); node.scaleY(1)
          node.width(newW); node.height(newH)
        }}
      />
      <Text
        ref={labelRef}
        x={el.x}
        y={labelY}
        width={el.width}
        align="center"
        text={el.label ?? 'Groupe'}
        fontSize={labelFontSize}
        fill="rgba(255,255,255,0.35)"
        listening={listening}
        onClick={(e) => { if (e.evt.button !== 1) setSelectedElements([el.id]) }}
        onDblClick={handleDblClick}
      />
    </>
  )
}

// ── Main Canvas ────────────────────────────────────────────────────────────────
export default function Canvas({ uiHidden = false }: { uiHidden?: boolean }) {
  const {
    boards, activeBoardId, selectedTool, selectedElementIds,
    drawColor, strokeWidth, bwMode, bgColor,
    addElement, updateElement, setSelectedElements, deleteSelectedElements, flipImage, setTool, setDrawColor, saveSnapshot,
  } = useBoardStore()

  const activeBoard = boards.find((b) => b.id === activeBoardId)!
  const selectedImage = selectedElementIds.length === 1
    ? activeBoard.elements.find((el) => el.id === selectedElementIds[0] && el.type === 'image') as CanvasImage | undefined
    : undefined
  const selectedTextEl = selectedElementIds.length === 1
    ? activeBoard.elements.find((el) => el.id === selectedElementIds[0] && el.type === 'text') as CanvasText | undefined
    : undefined
  const URL_RE = /https?:\/\/[^\s]+/g
  const textUrls = selectedTextEl ? [...selectedTextEl.text.matchAll(URL_RE)].map((m) => m[0]) : []
  const stageRef    = useRef<Konva.Stage>(null)
  const trRef       = useRef<Konva.Transformer>(null)
  const layerRef    = useRef<Konva.Layer>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Inline text input state
  const [textInput, setTextInput] = useState<{
    canvasX: number; canvasY: number; screenX: number; screenY: number
  } | null>(null)
  const [textValue, setTextValue] = useState('')
  const [pickedHex, setPickedHex] = useState<string | null>(null)
  const [showPalette, setShowPalette] = useState(false)

  // Focus textarea when it appears
  useEffect(() => {
    if (textInput) setTimeout(() => textareaRef.current?.focus(), 0)
  }, [textInput])

  useEffect(() => {
    if (!pickedHex) return
    const timeout = window.setTimeout(() => setPickedHex(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [pickedHex])

  useEffect(() => {
    if (!selectedImage) setShowPalette(false)
  }, [selectedImage])

  const submitTextInput = useCallback((value: string, pos: { canvasX: number; canvasY: number }) => {
    if (value.trim()) {
      addElement({
        id: Date.now().toString(),
        type: 'text',
        x: pos.canvasX, y: pos.canvasY,
        text: value.trim(),
        fontSize: 18,
        color: '#f5f5f5',
      })
    }
    setTool('select')
    setTextInput(null)
    setTextValue('')
  }, [addElement, setTool])

  const toggleBold = useCallback((el: CanvasText) => {
    const style = el.fontStyle ?? 'normal'
    const hasBold = style.includes('bold')
    const hasItalic = style.includes('italic')
    const next = hasBold
      ? (hasItalic ? 'italic' : 'normal')
      : (hasItalic ? 'bold italic' : 'bold')
    updateElement(el.id, { fontStyle: next })
  }, [updateElement])

  const toggleItalic = useCallback((el: CanvasText) => {
    const style = el.fontStyle ?? 'normal'
    const hasBold = style.includes('bold')
    const hasItalic = style.includes('italic')
    const next = hasItalic
      ? (hasBold ? 'bold' : 'normal')
      : (hasBold ? 'bold italic' : 'italic')
    updateElement(el.id, { fontStyle: next })
  }, [updateElement])

  const toggleUnderline = useCallback((el: CanvasText) => {
    updateElement(el.id, { textDecoration: el.textDecoration === 'underline' ? undefined : 'underline' })
  }, [updateElement])

  const toggleHighlight = useCallback((el: CanvasText) => {
    updateElement(el.id, { highlightColor: el.highlightColor ? undefined : '#f5e25a' })
  }, [updateElement])

  // Drawing
  const isDrawing     = useRef(false)
  const currentLineId = useRef<string | null>(null)

  // Rubber-band selection
  const [selRect, setSelRect] = useState({ x: 0, y: 0, width: 0, height: 0, visible: false })
  const selStart    = useRef({ x: 0, y: 0 })
  const isSelecting = useRef(false)

  // Pan / zoom
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [stagePos,  setStagePos]  = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)
  const isPanning   = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  // Multi-drag
  const dragStartPositions = useRef(new Map<string, { x: number; y: number }>())

  // ── Transformer sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return
    const nodes = selectedElementIds
      .map((id) => stageRef.current!.findOne<Konva.Node>('#' + id))
      .filter((n): n is Konva.Node => n != null)
    trRef.current.nodes(nodes)
    trRef.current.getLayer()?.batchDraw()
  }, [selectedElementIds])

  useEffect(() => {
    const onResize = () => setStageSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const alignSelection = () => {
    if (selectedElementIds.length < 2) return
    useBoardStore.getState().saveSnapshot()

    const selected = activeBoard.elements.filter((el) => selectedElementIds.includes(el.id))
    const getElementBounds = (el: CanvasElement) => {
      if (el.type === 'image') return { x: el.x, y: el.y, width: el.width, height: el.height }
      if (el.type === 'text') return { x: el.x, y: el.y, width: el.width ?? 200, height: el.fontSize * 1.5 }
      if (el.type === 'group') return { x: el.x, y: el.y, width: el.width, height: el.height }
      return null
    }

    const bounds = selected.map(getElementBounds).filter((b): b is { x: number; y: number; width: number; height: number } => b !== null)
    if (bounds.length < 2) return

    const minY = Math.min(...bounds.map((b) => b.y))
    const minX = Math.min(...bounds.map((b) => b.x))
    const GAP = 30
    const spaceBetween = Math.max(GAP, GAP)

    let currentX = minX
    selected.forEach((el) => {
      const bounds = getElementBounds(el)
      if (!bounds) return
      updateElement(el.id, {
        x: Math.round(currentX),
        y: minY,
      })
      currentX += bounds.width + spaceBetween
    })
  }

  const arrangeImagesInGrid = useCallback(() => {
    const images = activeBoard.elements
      .filter((el) => selectedElementIds.includes(el.id) && el.type === 'image') as CanvasImage[]
    if (images.length < 2) return

    useBoardStore.getState().saveSnapshot()

    const sorted = [...images].sort((a, b) => (a.y - b.y) || (a.x - b.x))
    const cols = Math.ceil(Math.sqrt(sorted.length))
    const gap = 24
    const avgW = sorted.reduce((acc, img) => acc + img.width, 0) / sorted.length
    const avgH = sorted.reduce((acc, img) => acc + img.height, 0) / sorted.length
    const cellW = Math.max(140, Math.min(340, avgW))
    const cellH = Math.max(100, Math.min(240, avgH))
    const startX = Math.min(...sorted.map((img) => img.x))
    const startY = Math.min(...sorted.map((img) => img.y))

    sorted.forEach((img, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const s = Math.min(cellW / img.width, cellH / img.height)
      const newW = Math.max(20, Math.round(img.width * s))
      const newH = Math.max(20, Math.round(img.height * s))
      const x = Math.round(startX + col * (cellW + gap) + (cellW - newW) / 2)
      const y = Math.round(startY + row * (cellH + gap) + (cellH - newH) / 2)
      updateElement(img.id, { x, y, width: newW, height: newH })
    })
  }, [activeBoard.elements, selectedElementIds, updateElement])

  const pickColorFromTarget = useCallback((target: Konva.Node): string | null => {
    const stage = stageRef.current
    if (!stage) return null

    const pointer = stage.getPointerPosition()
    if (!pointer) return null

    let node: Konva.Node | null = target
    let imageNode: Konva.Image | null = null
    while (node) {
      if (node.getClassName() === 'Image') {
        imageNode = node as Konva.Image
        break
      }
      node = node.getParent()
    }
    if (!imageNode) return null

    const src = imageNode.image() as (HTMLImageElement & { naturalWidth: number; naturalHeight: number }) | null
    if (!src) return null

    const inv = imageNode.getAbsoluteTransform().copy().invert()
    const local = inv.point(pointer)
    if (local.x < 0 || local.y < 0 || local.x > imageNode.width() || local.y > imageNode.height()) return null

    const sourceW = src.naturalWidth || src.width
    const sourceH = src.naturalHeight || src.height
    if (!sourceW || !sourceH) return null

    const sx = Math.max(0, Math.min(sourceW - 1, Math.floor((local.x / imageNode.width()) * sourceW)))
    const sy = Math.max(0, Math.min(sourceH - 1, Math.floor((local.y / imageNode.height()) * sourceH)))

    const pixelCanvas = document.createElement('canvas')
    pixelCanvas.width = 1
    pixelCanvas.height = 1
    const ctx = pixelCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    try {
      ctx.drawImage(src, sx, sy, 1, 1, 0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      if (a === 0) return null
      return rgbToHex(r, g, b)
    } catch {
      return null
    }
  }, [])

  // ── Keyboard: Delete + G/Shift+G ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedElements()
        return
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (e.shiftKey) {
          useBoardStore.getState().redo()
        } else {
          useBoardStore.getState().undo()
        }
        return
      }
      if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        useBoardStore.getState().redo()
        return
      }
      if (e.key === 'g' || e.key === 'G') {
        const { selectedElementIds: ids, groupElements, ungroupElements } = useBoardStore.getState()
        if (e.shiftKey) {
          ungroupElements(ids)
        } else if (ids.length >= 2) {
          groupElements(ids)
        }
        return
      }

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        alignSelection()
        return
      }

      if (e.key === 'x' || e.key === 'X') {
        const { selectedElementIds: ids, flipImage } = useBoardStore.getState()
        if (ids.length === 1) { e.preventDefault(); flipImage(ids[0], 'x') }
        return
      }

      if (e.key === 'y' && !e.ctrlKey && !e.metaKey) {
        const { selectedElementIds: ids, flipImage } = useBoardStore.getState()
        if (ids.length === 1) { e.preventDefault(); flipImage(ids[0], 'y') }
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        zoomToSelection()
        return
      }

      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        arrangeImagesInGrid()
        return
      }

      if (e.key === 'Escape') {
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelectedElements, stageSize, stageScale, selectedElementIds, arrangeImagesInGrid])

  // ── Ctrl+V paste image ────────────────────────────────────────────────────────
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItem = items.find((item) => item.type.startsWith('image/'))
      if (!imageItem) return
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string
        const img = new window.Image()
        img.onload = () => {
          const maxW = 600
          const s = img.width > maxW ? maxW / img.width : 1
          const cx = (stageSize.width  / 2 - stagePos.x) / stageScale
          const cy = (stageSize.height / 2 - stagePos.y) / stageScale
          useBoardStore.getState().addElement({
            id: Date.now().toString() + Math.random(),
            type: 'image',
            x: cx - (img.width * s) / 2,
            y: cy - (img.height * s) / 2,
            width: img.width * s,
            height: img.height * s,
            src,
          })
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [stagePos, stageScale, stageSize])

  // ── OS drop ──────────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const stage = stageRef.current; if (!stage) return
    const box = stage.container().getBoundingClientRect()
    const x = (e.clientX - box.left  - stagePos.x) / stageScale
    const y = (e.clientY - box.top   - stagePos.y) / stageScale
    Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/')).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string
        const img = new window.Image()
        img.onload = () => {
          const maxW = 600
          const s = img.width > maxW ? maxW / img.width : 1
          addElement({ id: Date.now().toString() + Math.random(), type: 'image', x, y, width: img.width * s, height: img.height * s, src })
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    })
  }, [addElement, stagePos, stageScale])

  // ── Multi-drag callbacks ──────────────────────────────────────────────────────
  const drag = useMemo<DragCallbacks>(() => ({
    onDragStart: (id, x, y) => {
      useBoardStore.getState().saveSnapshot()
      dragStartPositions.current.clear()
      const ids = useBoardStore.getState().selectedElementIds
      if (ids.includes(id)) {
        ids.forEach((eid) => {
          const node = stageRef.current?.findOne<Konva.Node>('#' + eid)
          if (node) dragStartPositions.current.set(eid, { x: node.x(), y: node.y() })
        })
      } else {
        dragStartPositions.current.set(id, { x, y })
      }
    },
    onDragMove: (id, x, y) => {
      const start = dragStartPositions.current.get(id); if (!start) return
      const dx = x - start.x, dy = y - start.y
      useBoardStore.getState().selectedElementIds.forEach((eid) => {
        if (eid === id) return
        const node = stageRef.current?.findOne<Konva.Node>('#' + eid)
        const s    = dragStartPositions.current.get(eid)
        if (node && s) { node.x(s.x + dx); node.y(s.y + dy) }
      })
    },
    onDragEnd: (id, x, y) => {
      const start = dragStartPositions.current.get(id); if (!start) return
      const dx = x - start.x, dy = y - start.y
      const { updateElement: upd, selectedElementIds: ids } = useBoardStore.getState()
      ids.forEach((eid) => {
        const s = dragStartPositions.current.get(eid)
        if (s) upd(eid, { x: s.x + dx, y: s.y + dy })
      })
      dragStartPositions.current.clear()
    },
  }), [])

  // ── Pointer helpers ───────────────────────────────────────────────────────────
  const getPointerInStage = () => {
    const pos = stageRef.current!.getPointerPosition()!
    return { x: (pos.x - stagePos.x) / stageScale, y: (pos.y - stagePos.y) / stageScale }
  }

  const getSelectionBounds = () => {
    const selected = activeBoard.elements.filter((el) => selectedElementIds.includes(el.id))
    if (selected.length === 0) return null

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    selected.forEach((el) => {
      if (el.type === 'image') {
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      } else if (el.type === 'text') {
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + (el.width ?? 200))
        maxY = Math.max(maxY, el.y + el.fontSize * 1.5)
      } else if (el.type === 'line') {
        for (let i = 0; i < el.points.length; i += 2) {
          minX = Math.min(minX, el.points[i])
          maxX = Math.max(maxX, el.points[i])
          minY = Math.min(minY, el.points[i + 1])
          maxY = Math.max(maxY, el.points[i + 1])
        }
      } else if (el.type === 'group') {
        minX = Math.min(minX, el.x)
        minY = Math.min(minY, el.y)
        maxX = Math.max(maxX, el.x + el.width)
        maxY = Math.max(maxY, el.y + el.height)
      }
    })

    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }

  const zoomToSelection = () => {
    const bounds = getSelectionBounds()
    if (!bounds) return
    const PAD = 80
    const scaleX = (stageSize.width  - PAD * 2) / bounds.width
    const scaleY = (stageSize.height - PAD * 2) / bounds.height
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.05), 10)
    const targetCenterX = bounds.x + bounds.width  / 2
    const targetCenterY = bounds.y + bounds.height / 2
    setStageScale(newScale)
    setStagePos({
      x: stageSize.width  / 2 - targetCenterX * newScale,
      y: stageSize.height / 2 - targetCenterY * newScale,
    })
  }

  // ── Resolve group selection ───────────────────────────────────────────────────
  const resolveSelectIds = (el: { id: string }, additive: boolean, currentIds: string[]): string[] => {
    if (!additive) return [el.id]
    const already = currentIds.includes(el.id)
    return already ? currentIds.filter((id) => id !== el.id) : [...currentIds, el.id]
  }

  const isDrawMode = selectedTool === 'draw'
  const isPanMode = selectedTool === 'pan'

  // ── Mouse down ───────────────────────────────────────────────────────────────
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isMiddleButton = e.evt.button === 1

    if (selectedTool === 'pan' || isMiddleButton) {
      isPanning.current = true
      lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY }
      e.evt.preventDefault()
      e.evt.stopPropagation()
      return
    }

    if (selectedTool === 'text') {
      const canvasPos = getPointerInStage()
      setTextInput({ canvasX: canvasPos.x, canvasY: canvasPos.y, screenX: 0, screenY: 0 })
      setTextValue('')
      return
    }

    if (selectedTool === 'picker') {
      e.evt.preventDefault()
      const hex = pickColorFromTarget(e.target)
      if (hex) {
        setDrawColor(hex)
        setPickedHex(hex)
        void navigator.clipboard?.writeText(hex).catch(() => undefined)
      }
      setTool('select')
      return
    }

    if (selectedTool === 'draw') {
      isDrawing.current = true
      const pos = getPointerInStage()
      const id = Date.now().toString()
      currentLineId.current = id
      addElement({ id, type: 'line', points: [pos.x, pos.y], color: drawColor, strokeWidth })
      return
    }

    if (selectedTool === 'select' && e.target === e.target.getStage()) {
      setSelectedElements([])
      const pos = getPointerInStage()
      selStart.current = pos
      isSelecting.current = true
      setSelRect({ x: pos.x, y: pos.y, width: 0, height: 0, visible: true })
    }
  }

  // ── Mouse move ───────────────────────────────────────────────────────────────
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) {
      const dx = e.evt.clientX - lastPointer.current.x
      const dy = e.evt.clientY - lastPointer.current.y
      lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY }
      setStagePos((p) => ({ x: p.x + dx, y: p.y + dy }))
      return
    }
    if (isDrawing.current && currentLineId.current) {
      const pos = getPointerInStage()
      const board = useBoardStore.getState().boards.find((b) => b.id === activeBoardId)
      const line  = board?.elements.find((el) => el.id === currentLineId.current)
      if (line && line.type === 'line') updateElement(currentLineId.current, { points: [...line.points, pos.x, pos.y] })
      return
    }
    if (isSelecting.current) {
      const pos = getPointerInStage()
      setSelRect({
        x: Math.min(selStart.current.x, pos.x),
        y: Math.min(selStart.current.y, pos.y),
        width:  Math.abs(pos.x - selStart.current.x),
        height: Math.abs(pos.y - selStart.current.y),
        visible: true,
      })
    }
  }

  // ── Mouse up ─────────────────────────────────────────────────────────────────
  const handleMouseUp = () => {
    isPanning.current = false
    if (isDrawing.current) useBoardStore.getState().saveSnapshot()
    isDrawing.current  = false
    currentLineId.current = null

    if (isSelecting.current) {
      isSelecting.current = false
      if (selRect.width > 4 || selRect.height > 4) {
        const selected = activeBoard.elements
          .filter((el) => {
            if (el.type === 'image') return haveIntersection(selRect, { x: el.x, y: el.y, width: el.width, height: el.height })
            if (el.type === 'text') {
              const node = stageRef.current?.findOne<Konva.Text>('#' + el.id)
              if (node) return haveIntersection(selRect, { x: node.x(), y: node.y(), width: node.width(), height: node.height() })
              return haveIntersection(selRect, { x: el.x, y: el.y, width: el.width ?? 200, height: el.fontSize * 1.5 })
            }
            return false
          })
          .map((el) => el.id)
        setSelectedElements(selected)
      }
      setSelRect((r) => ({ ...r, visible: false }))
    }
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const scaleBy  = 1.03
    const oldScale = stageScale
    const pointer  = stageRef.current!.getPointerPosition()!
    const newScale = Math.min(Math.max(e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy, 0.05), 10)
    const mpt = { x: (pointer.x - stagePos.x) / oldScale, y: (pointer.y - stagePos.y) / oldScale }
    setStageScale(newScale)
    setStagePos({ x: pointer.x - mpt.x * newScale, y: pointer.y - mpt.y * newScale })
  }

  const cursor =
    selectedTool === 'pan'  ? 'grab' :
    selectedTool === 'draw' ? 'crosshair' :
    selectedTool === 'picker' ? 'crosshair' :
    selectedTool === 'text' ? 'crosshair' :
    'default'

  return (
    <div className="flex-1 overflow-hidden relative" style={{ cursor, filter: bwMode ? 'grayscale(1)' : 'none', background: bgColor }} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        backgroundPosition: `${stagePos.x % 40}px ${stagePos.y % 40}px`,
      }} />

      <Stage
        ref={stageRef}
        width={stageSize.width} height={stageSize.height}
        x={stagePos.x} y={stagePos.y}
        scaleX={stageScale} scaleY={stageScale}
        style={{ cursor, filter: bwMode ? 'grayscale(1)' : 'none', transition: 'filter 120ms ease' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <Layer ref={layerRef}>
          {/* Groups rendered first (behind everything) */}
          {activeBoard.elements
            .filter((el) => el.type === 'group')
            .map((el) => (
              <GroupEl
                key={el.id}
                el={el as CanvasGroup}
                stageRef={stageRef}
                activeBoardId={activeBoardId}
                listening={!isPanMode}
              />
            ))}

          {/* Regular elements */}
          {activeBoard.elements
            .filter((el) => el.type !== 'group')
            .map((el) => {
              const onSelectEl = (e: Konva.KonvaEventObject<MouseEvent>) =>
                setSelectedElements(resolveSelectIds(el, e.evt.shiftKey, selectedElementIds))

              if (el.type === 'image') return (
                <ImageEl 
                  key={el.id} 
                  el={el} 
                  onSelect={(e) => { if (e.evt.button !== 1) onSelectEl(e) }}
                  drag={drag}
                  listening={!isDrawMode && !isPanMode}
                />
              )
              if (el.type === 'text') return (
                <TextEl key={el.id} el={el} onSelect={(e) => { if (e.evt.button !== 1) onSelectEl(e) }} drag={drag}
                  stageRef={stageRef} listening={!isDrawMode && !isPanMode} />
              )
              if (el.type === 'line') return (
                <Line key={el.id} points={el.points} stroke={el.color}
                  strokeWidth={el.strokeWidth} tension={0.4} lineCap="round" lineJoin="round"
                  strokeScaleEnabled={false}
                  listening={false} />
              )
              return null
            })}
          <Transformer ref={trRef}
            boundBoxFunc={(_, nb) => ({ ...nb, width: Math.max(10, nb.width), height: Math.max(10, nb.height) })}
          />

          {/* Rubber-band */}
          {selRect.visible && (
            <Rect x={selRect.x} y={selRect.y} width={selRect.width} height={selRect.height}
              fill="rgba(245,245,245,0.03)" stroke="rgba(245,245,245,0.35)"
              strokeWidth={1 / stageScale} dash={[5 / stageScale, 3 / stageScale]} listening={false} />
          )}

        </Layer>
      </Stage>

      {!uiHidden && (
        <div className="absolute bottom-4 right-4 text-xs text-muted select-none flex items-center gap-3">
          {selectedElementIds.length > 1 && <span className="text-dim">{selectedElementIds.length} elements</span>}
          {pickedHex && <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-primary border border-border">{pickedHex}</span>}
          {Math.round(stageScale * 100)}%
          <button
            title="Exporter en PNG"
            onClick={() => {
              const stage = stageRef.current
              if (!stage) return
              const dataURL = stage.toDataURL({ pixelRatio: 2 })
              const a = document.createElement('a')
              a.download = `purelike-board.png`
              a.href = dataURL
              a.click()
            }}
            className="ml-1 px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-muted hover:text-primary transition-all text-xs"
          >
            ↓ PNG
          </button>
        </div>
      )}

      {!uiHidden && selectedImage && (
        <div
          className="absolute z-20"
          style={{
            left: stagePos.x + (selectedImage.x + selectedImage.width / 2) * stageScale,
            top: stagePos.y + (selectedImage.y + selectedImage.height + 10) * stageScale,
            transform: 'translate(-50%, 0)',
          }}
        >
          {showPalette && (
            <div className="mb-1.5">
              <ColorPalettePanel
                imageSrc={selectedImage.src}
                onClose={() => setShowPalette(false)}
              />
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-panel/95 border border-border shadow-xl">
            <button
              title="Mirror horizontal"
              onClick={() => flipImage(selectedImage.id, 'x')}
              className="px-2 py-1 rounded-lg text-xs text-muted hover:text-primary hover:bg-white/[0.05]"
            >
              ⇔
            </button>
            <button
              title="Mirror vertical"
              onClick={() => flipImage(selectedImage.id, 'y')}
              className="px-2 py-1 rounded-lg text-xs text-muted hover:text-primary hover:bg-white/[0.05]"
            >
              ⇕
            </button>
            <div className="w-px h-3.5 bg-border mx-0.5" />
            <button
              title="Color palette"
              onClick={() => setShowPalette((v) => !v)}
              className={`px-2 py-1 rounded-lg text-xs transition-all hover:bg-white/[0.05]
                ${showPalette ? 'text-primary' : 'text-muted hover:text-primary'}`}
            >
              <span className="flex gap-0.5 items-center">
                <span className="w-1.5 h-3.5 rounded-sm" style={{ background: 'linear-gradient(#e55, #55e)' }} />
                <span className="w-1.5 h-3.5 rounded-sm" style={{ background: 'linear-gradient(#5e5, #e5e)' }} />
                <span className="w-1.5 h-3.5 rounded-sm" style={{ background: 'linear-gradient(#55e, #e55)' }} />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Text actions — shown when a text element is selected */}
      {!uiHidden && selectedTextEl && (() => {
        const node = stageRef.current?.findOne<Konva.Text>('#' + selectedTextEl.id)
        const nodeH = node ? node.height() : selectedTextEl.fontSize * 1.5
        return (
          <div
            className="absolute z-20"
            style={{
              left: stagePos.x + (selectedTextEl.x + (selectedTextEl.width ? selectedTextEl.width / 2 : 60)) * stageScale,
              top:  stagePos.y + (selectedTextEl.y + nodeH + 8) * stageScale,
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-panel/95 border border-border shadow-xl">
              <label
                title="Text color"
                className="relative w-7 h-7 rounded-lg border border-white/[0.14] overflow-hidden cursor-pointer hover:border-white/25 transition-colors"
                onMouseDown={(e) => { e.stopPropagation(); saveSnapshot() }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="absolute inset-0" style={{ background: selectedTextEl.color }} />
                <input
                  type="color"
                  value={selectedTextEl.color}
                  onChange={(e) => updateElement(selectedTextEl.id, { color: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>

              <button
                title="Bold"
                onMouseDown={(e) => { e.stopPropagation(); saveSnapshot() }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleBold(selectedTextEl)
                }}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all
                  ${selectedTextEl.fontStyle?.includes('bold') ? 'bg-white/[0.12] text-primary' : 'text-muted hover:text-primary hover:bg-white/[0.05]'}`}
              >
                B
              </button>

              <button
                title="Italic"
                onMouseDown={(e) => { e.stopPropagation(); saveSnapshot() }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleItalic(selectedTextEl)
                }}
                className={`w-7 h-7 rounded-lg text-xs italic transition-all
                  ${selectedTextEl.fontStyle?.includes('italic') ? 'bg-white/[0.12] text-primary' : 'text-muted hover:text-primary hover:bg-white/[0.05]'}`}
              >
                I
              </button>

              <button
                title="Underline"
                onMouseDown={(e) => { e.stopPropagation(); saveSnapshot() }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleUnderline(selectedTextEl)
                }}
                className={`w-7 h-7 rounded-lg text-xs underline transition-all
                  ${selectedTextEl.textDecoration === 'underline' ? 'bg-white/[0.12] text-primary' : 'text-muted hover:text-primary hover:bg-white/[0.05]'}`}
              >
                U
              </button>

              <button
                title="Highlight"
                onMouseDown={(e) => { e.stopPropagation(); saveSnapshot() }}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleHighlight(selectedTextEl)
                }}
                className={`w-7 h-7 rounded-lg text-xs transition-all
                  ${selectedTextEl.highlightColor ? 'bg-white/[0.12] text-primary' : 'text-muted hover:text-primary hover:bg-white/[0.05]'}`}
              >
                H
              </button>

              <label
                title="Highlight color"
                className="relative w-7 h-7 rounded-lg border border-white/[0.14] overflow-hidden cursor-pointer hover:border-white/25 transition-colors"
                onMouseDown={(e) => { e.stopPropagation(); saveSnapshot() }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="absolute inset-0" style={{ background: selectedTextEl.highlightColor ?? '#f5e25a' }} />
                <input
                  type="color"
                  value={selectedTextEl.highlightColor ?? '#f5e25a'}
                  onChange={(e) => updateElement(selectedTextEl.id, { highlightColor: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>

              {textUrls.length > 0 && <div className="w-px h-4 bg-border mx-0.5" />}

              {textUrls.slice(0, 3).map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg text-xs text-muted hover:text-primary hover:bg-white/[0.05] transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  ↗ {textUrls.length === 1 ? 'Open link' : `Link ${i + 1}`}
                </a>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Inline text input */}
      {textInput && (() => {
        const stageBox = stageRef.current?.container().getBoundingClientRect()
        const sx = (stageBox?.left ?? 0) + textInput.canvasX * stageScale + stagePos.x
        const sy = (stageBox?.top  ?? 0) + textInput.canvasY * stageScale + stagePos.y
        return (
          <div style={{ position: 'fixed', top: sy, left: sx, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              ref={textareaRef}
              value={textValue}
              placeholder="Type your text..."
              onChange={(e) => {
                setTextValue(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setTextInput(null); setTextValue('') }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTextInput(textValue, textInput) }
              }}
              onPaste={(e) => {
                e.preventDefault()
                const plain = e.clipboardData.getData('text/plain')
                const s = e.currentTarget.selectionStart ?? 0
                const end = e.currentTarget.selectionEnd ?? 0
                const next = textValue.slice(0, s) + plain + textValue.slice(end)
                setTextValue(next)
              }}
              onBlur={() => submitTextInput(textValue, textInput)}
              rows={1}
              style={{
                width:        `${Math.max(200, 280 * stageScale)}px`,
                fontSize:     `${18 * stageScale}px`,
                lineHeight:   '1.5',
                fontFamily:   'inherit',
                background:   'rgba(10, 10, 10, 0.97)',
                color:        '#f0f0f0',
                caretColor:   '#f0f0f0',
                border:       '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                outline:      'none',
                resize:       'none',
                overflow:     'hidden',
                padding:      `${Math.max(6, 8 * stageScale)}px ${Math.max(8, 12 * stageScale)}px`,
                boxShadow:    '0 8px 32px rgba(0,0,0,0.55)',
              }}
            />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'inherit', pointerEvents: 'none' }}>
              ↵ create · ⇧↵ newline · ⎋ cancel
            </div>
          </div>
        )
      })()}
    </div>
  )
}
