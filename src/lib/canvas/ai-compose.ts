import { newNodeId } from './model'
import type {
  BoxAlign,
  BoxDisplay,
  BoxJustify,
  BoxProps,
  CanvasElement,
  CanvasNode,
  ElementKind,
  ElementStyle,
  FlexDirection,
  SeparatorVariant,
  TextAlign,
} from './model'
import type { FontChoice } from './fonts'

/**
 * SECURITY BOUNDARY for AI-generated canvas trees. NEVER splice raw model JSON into the doc:
 * sanitizeAiNode mints fresh ids, whitelists node kinds + props + styles, coerces each data
 * shape, and bounds depth/breadth — anything unknown is dropped or downgraded to a Text. The
 * result is always a valid CanvasNode tree (or null if there's nothing usable).
 */

const ELEMENT_KINDS: ReadonlySet<string> = new Set<ElementKind>([
  'heading', 'text', 'list', 'separator', 'divider', 'spacer', 'image', 'icon', 'button',
])
const DISPLAY: ReadonlySet<BoxDisplay> = new Set<BoxDisplay>(['flex', 'grid', 'block'])
const DIRECTION: ReadonlySet<FlexDirection> = new Set<FlexDirection>(['row', 'column'])
const BOX_ALIGN: ReadonlySet<BoxAlign> = new Set<BoxAlign>(['start', 'center', 'end', 'stretch', 'baseline'])
const JUSTIFY: ReadonlySet<BoxJustify> = new Set<BoxJustify>(['start', 'center', 'end', 'between', 'around'])
const SEP: ReadonlySet<SeparatorVariant> = new Set<SeparatorVariant>(['dot', 'bullet', 'dash', 'line', 'slash', 'pipe'])
const TEXT_ALIGN: ReadonlySet<TextAlign> = new Set<TextAlign>(['left', 'center', 'right', 'justify'])
const FONT: ReadonlySet<FontChoice> = new Set<FontChoice>(['sans', 'serif', 'mono'])

const MAX_DEPTH = 6
const MAX_CHILDREN = 40
const MAX_LEN = 2000

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
const str = (v: unknown, max = MAX_LEN): string => (typeof v === 'string' ? v.slice(0, max) : '')
const numIn = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : undefined
const isTrue = (v: unknown): true | undefined => (v === true ? true : undefined)
function oneOf<T extends string>(v: unknown, set: ReadonlySet<T>): T | undefined {
  return typeof v === 'string' && set.has(v as T) ? (v as T) : undefined
}

/** Any text we can salvage from an unknown/too-deep node. */
function salvageText(r: Record<string, unknown>): string {
  const d = rec(r.data)
  return str(d.text) || str(r.text) || str(r.content)
}

function sanitizeStyle(raw: unknown): ElementStyle | undefined {
  const r = rec(raw)
  const s: ElementStyle = {}
  const ff = oneOf(r.fontFamily, FONT)
  if (ff) s.fontFamily = ff
  const fs = numIn(r.fontSize, 4, 200)
  if (fs !== undefined) s.fontSize = fs
  const fw = numIn(r.fontWeight, 100, 900)
  if (fw !== undefined) s.fontWeight = fw
  if (isTrue(r.italic)) s.italic = true
  if (isTrue(r.underline)) s.underline = true
  if (typeof r.color === 'string') s.color = str(r.color, 32)
  const al = oneOf(r.align, TEXT_ALIGN)
  if (al) s.align = al
  return Object.keys(s).length ? s : undefined
}

function sanitizeElement(kind: ElementKind, raw: Record<string, unknown>): CanvasElement {
  const d = rec(raw.data)
  let data: Record<string, unknown>
  switch (kind) {
    case 'heading':
      data = { text: str(d.text), level: numIn(d.level, 1, 3) ?? 2 }
      break
    case 'text':
      data = { text: str(d.text) }
      break
    case 'list':
      data = {
        items: Array.isArray(d.items)
          ? d.items.filter((x): x is string => typeof x === 'string').slice(0, MAX_CHILDREN).map((x) => str(x))
          : [],
      }
      break
    case 'separator':
      data = { variant: oneOf(d.variant, SEP) ?? 'dot' }
      break
    case 'spacer':
      data = { size: numIn(d.size, 0, 400) ?? 8 }
      break
    case 'image':
      data = { src: str(d.src, 4000), alt: str(d.alt) }
      break
    case 'icon':
      data = { name: str(d.name, 64) }
      break
    case 'button':
      data = { label: str(d.label), href: str(d.href, 4000) }
      break
    default:
      data = {}
  }
  const style = sanitizeStyle(raw.style)
  return { id: newNodeId(kind), kind, data, ...(style ? { style } : {}) }
}

function sanitizeProps(raw: unknown): BoxProps {
  const r = rec(raw)
  const p: BoxProps = { display: oneOf(r.display, DISPLAY) ?? 'flex' }
  const dir = oneOf(r.direction, DIRECTION)
  if (dir) p.direction = dir
  const gc = numIn(r.gridColumns, 1, 12)
  if (gc !== undefined) p.gridColumns = gc
  const gap = numIn(r.gap, 0, 200)
  if (gap !== undefined) p.gap = gap
  const pad = numIn(r.pad, 0, 200)
  if (pad !== undefined) p.pad = pad
  const margin = numIn(r.margin, 0, 200)
  if (margin !== undefined) p.margin = margin
  const al = oneOf(r.align, BOX_ALIGN)
  if (al) p.align = al
  const ju = oneOf(r.justify, JUSTIFY)
  if (ju) p.justify = ju
  if (isTrue(r.wrap)) p.wrap = true
  if (typeof r.bg === 'string') p.bg = str(r.bg, 32)
  if (typeof r.border === 'string') p.border = str(r.border, 64)
  const rad = numIn(r.radius, 0, 100)
  if (rad !== undefined) p.radius = rad
  const span = numIn(r.span, 1, 12)
  if (span !== undefined) p.span = span
  const ff = oneOf(r.fontFamily, FONT)
  if (ff) p.fontFamily = ff
  if (p.display === 'flex' && !p.direction) p.direction = 'column'
  return p
}

function sanitizeNode(raw: unknown, depth: number): CanvasNode | null {
  const r = rec(raw)
  if (r.kind === 'box') {
    if (depth >= MAX_DEPTH) {
      const t = salvageText(r)
      return t ? sanitizeElement('text', { data: { text: t } }) : null
    }
    const childrenRaw = Array.isArray(r.children) ? r.children.slice(0, MAX_CHILDREN) : []
    const children = childrenRaw
      .map((c) => sanitizeNode(c, depth + 1))
      .filter((c): c is CanvasNode => c !== null)
    const role = typeof r.role === 'string' ? str(r.role, 32) : undefined
    return { id: newNodeId('box'), kind: 'box', props: sanitizeProps(r.props), ...(role ? { role } : {}), children }
  }
  if (typeof r.kind === 'string' && ELEMENT_KINDS.has(r.kind)) {
    return sanitizeElement(r.kind as ElementKind, r)
  }
  const t = salvageText(r)
  return t ? sanitizeElement('text', { data: { text: t } }) : null
}

/** Turn raw AI JSON into a safe CanvasNode tree (or null if unusable). */
export function sanitizeAiNode(raw: unknown): CanvasNode | null {
  return sanitizeNode(raw, 0)
}
