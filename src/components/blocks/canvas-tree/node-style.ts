import type { CSSProperties } from 'react'
import { isBox } from '#/lib/canvas/model'
import type {
  CanvasBox,
  CanvasNode,
  ElementStyle,
  SeparatorVariant,
} from '#/lib/canvas/model'

/** Pure style/derivation helpers for the canvas renderer (no JSX, no React state). */

export const SEPARATOR_GLYPH: Record<SeparatorVariant, string> = {
  dot: '·',
  bullet: '•',
  dash: '–',
  line: '—',
  slash: '/',
  pipe: '|',
}

export function separatorVariant(v: unknown): SeparatorVariant {
  return typeof v === 'string' && v in SEPARATOR_GLYPH ? (v as SeparatorVariant) : 'dot'
}

/** Human label per node kind — used by the selection badge, navigator, inspector. */
export const KIND_LABEL: Record<string, string> = {
  box: 'Box',
  heading: 'Heading',
  text: 'Text',
  list: 'List',
  separator: 'Separator',
  divider: 'Divider',
  spacer: 'Spacer',
  image: 'Image',
  icon: 'Icon',
  button: 'Button',
}

function mapAlign(a: NonNullable<CanvasBox['props']['align']>): CSSProperties['alignItems'] {
  return a === 'start' ? 'flex-start' : a === 'end' ? 'flex-end' : a
}

function mapJustify(
  j: NonNullable<CanvasBox['props']['justify']>,
): CSSProperties['justifyContent'] {
  switch (j) {
    case 'start':
      return 'flex-start'
    case 'end':
      return 'flex-end'
    case 'between':
      return 'space-between'
    case 'around':
      return 'space-around'
    default:
      return 'center'
  }
}

/** CSS for a Box from its props (flex / grid / block). */
export function boxStyle(box: CanvasBox): CSSProperties {
  const p = box.props
  const display = p.display ?? 'flex'
  const style: CSSProperties = {}
  if (display === 'grid') {
    style.display = 'grid'
    style.gridTemplateColumns = `repeat(${p.gridColumns ?? 2}, minmax(0, 1fr))`
  } else if (display === 'block') {
    style.display = 'block'
  } else {
    style.display = 'flex'
    style.flexDirection = p.direction === 'row' ? 'row' : 'column'
    if (p.wrap) style.flexWrap = 'wrap'
  }
  if (p.gap !== undefined) style.gap = p.gap
  if (p.pad !== undefined) style.padding = p.pad
  if (p.margin !== undefined) style.margin = p.margin
  if (p.align) style.alignItems = mapAlign(p.align)
  if (p.justify) style.justifyContent = mapJustify(p.justify)
  if (p.bg) style.background = p.bg
  if (p.border) style.border = p.border
  if (p.radius !== undefined) style.borderRadius = p.radius
  return style
}

/** Width contribution of a node sitting inside a horizontal (row) parent — its span /12. */
export function childFlex(node: CanvasNode): CSSProperties {
  if (isBox(node) && node.props.span !== undefined) {
    return { flex: `0 0 ${(node.props.span / 12) * 100}%`, minWidth: 0 }
  }
  return { minWidth: 0 }
}

/** Per-element typography/spacing style → CSS. */
export function elementStyle(style: ElementStyle | undefined): CSSProperties {
  if (!style) return {}
  const s: CSSProperties = {}
  if (style.fontSize !== undefined) s.fontSize = style.fontSize
  if (style.fontWeight !== undefined) s.fontWeight = style.fontWeight
  if (style.italic) s.fontStyle = 'italic'
  if (style.underline) s.textDecoration = 'underline'
  if (style.color) s.color = style.color
  if (style.align) s.textAlign = style.align
  if (style.marginTop !== undefined) s.marginTop = style.marginTop
  if (style.marginBottom !== undefined) s.marginBottom = style.marginBottom
  return s
}

export function asText(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
