export type Tool = 'select' | 'image' | 'text' | 'draw' | 'pan' | 'picker'

export const ANNOTATION_CATEGORIES = [
  { id: 'anatomy',     label: 'Anatomy',     color: '#dc4949' },
  { id: 'color',       label: 'Color',       color: '#9b59b6' },
  { id: 'composition', label: 'Compo',       color: '#4a90d9' },
  { id: 'lighting',    label: 'Lighting',    color: '#e8a220' },
  { id: 'perspective', label: 'Perspective', color: '#1abc9c' },
  { id: 'gesture',     label: 'Gesture',     color: '#e91e8c' },
  { id: 'reference',   label: 'Reference',   color: '#6b7280' },
] as const

export type CategoryId = typeof ANNOTATION_CATEGORIES[number]['id']

export interface CanvasImage {
  id: string
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  src: string
  groupId?: string
  annotation?: string
  categories?: string[]
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}

export interface CanvasText {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  color: string
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic'
  textDecoration?: 'underline'
  highlightColor?: string
  width?: number
  groupId?: string
}

export interface CanvasLine {
  id: string
  type: 'line'
  points: number[]
  color: string
  strokeWidth: number
  groupId?: string
}

export interface CanvasGroup {
  id: string
  type: 'group'
  x: number
  y: number
  width: number
  height: number
  label?: string
  groupId?: string
}

export type CanvasElement = CanvasImage | CanvasText | CanvasLine | CanvasGroup

export interface Board {
  id: string
  name: string
  elements: CanvasElement[]
  folderId?: string
  color?: string
  pinned?: boolean
}

export interface Folder {
  id: string
  name: string
  collapsed: boolean
  color?: string
}

export const BOARD_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
]
