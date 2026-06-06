import type { CSSProperties, ReactNode } from 'react'
import type { ResolvedTokens } from '#/lib/templates'
import { EditableText } from '#/components/blocks/fields/editable-text'
import { useBlockDocController } from '#/components/blocks/state/block-doc-context'
import {
  SELECT_COLOR,
  useCanvasSelection,
} from '#/components/blocks/canvas-tree/selection'
import { isBox, isHorizontal } from '#/lib/canvas/model'
import type {
  CanvasBox,
  CanvasElement,
  CanvasNode,
  ElementStyle,
  SeparatorVariant,
} from '#/lib/canvas/model'

/**
 * Read-only renderer for the canvas Box tree (WS-B). Walks the tree → flex boxes → leaf
 * element views. No editing/selection/DnD yet (those are WS-C/D). Rendered by BlockDocument
 * only when `doc.canvas` is present, so the typed path is untouched during migration.
 *
 * Layout: a Box is a flex container (row/column from `props.layout`). A child Box inside a
 * horizontal parent claims width from its `span` (/12); other children flex naturally.
 */

const SEPARATOR_GLYPH: Record<SeparatorVariant, string> = {
  dot: '·',
  bullet: '•',
  dash: '–',
  line: '—',
  slash: '/',
  pipe: '|',
}

function separatorVariant(v: unknown): SeparatorVariant {
  return typeof v === 'string' && v in SEPARATOR_GLYPH ? (v as SeparatorVariant) : 'dot'
}

function boxStyle(box: CanvasBox): CSSProperties {
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

/** Width contribution of a node sitting inside a horizontal parent. */
function childFlex(node: CanvasNode): CSSProperties {
  if (isBox(node) && node.props.span !== undefined) {
    return { flex: `0 0 ${(node.props.span / 12) * 100}%`, minWidth: 0 }
  }
  return { minWidth: 0 }
}

function elementStyle(style: ElementStyle | undefined): CSSProperties {
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

function asText(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function ElementView({
  el,
  tokens,
}: {
  el: CanvasElement
  tokens: ResolvedTokens
}) {
  const { onCanvasUpdateData } = useBlockDocController()
  const style = elementStyle(el.style)
  switch (el.kind) {
    case 'heading': {
      const level = el.data.level === 1 ? 1 : el.data.level === 3 ? 3 : 2
      return (
        <div
          style={{
            fontFamily: tokens.fontHeadingCss,
            fontWeight: 700,
            fontSize: level === 1 ? tokens.baseFontSize * 1.8 : tokens.baseFontSize,
            textTransform: level >= 2 ? 'uppercase' : undefined,
            letterSpacing: level >= 2 ? 1 : undefined,
            color: level >= 2 ? tokens.accent : undefined,
            ...style,
          }}
        >
          <EditableText
            value={asText(el.data.text)}
            placeholder="Heading"
            onChange={(text) => onCanvasUpdateData(el.id, { text })}
          />
        </div>
      )
    }
    case 'text':
      return (
        <div style={{ whiteSpace: 'pre-wrap', ...style }}>
          <EditableText
            value={asText(el.data.text)}
            placeholder="Text"
            onChange={(text) => onCanvasUpdateData(el.id, { text })}
          />
        </div>
      )
    case 'list': {
      const items = Array.isArray(el.data.items)
        ? el.data.items.filter((x): x is string => typeof x === 'string')
        : []
      const setItem = (i: number, text: string) =>
        onCanvasUpdateData(el.id, {
          items: items.map((v, j) => (j === i ? text : v)),
        })
      return (
        <ul style={{ margin: 0, paddingLeft: tokens.space(5), ...style }}>
          {items.map((it, i) => (
            <li key={i} style={{ marginBottom: tokens.space(1) }}>
              <EditableText value={it} onChange={(text) => setItem(i, text)} />
            </li>
          ))}
        </ul>
      )
    }
    case 'separator':
      return (
        <span style={{ color: '#9ca3af', ...style }}>
          {SEPARATOR_GLYPH[separatorVariant(el.data.variant)]}
        </span>
      )
    case 'divider':
      return (
        <hr
          style={{ border: 0, borderTop: '1px solid #d4d4d4', width: '100%', ...style }}
        />
      )
    case 'spacer': {
      const size = typeof el.data.size === 'number' ? el.data.size : tokens.space(4)
      return <div style={{ height: size }} />
    }
    case 'image':
      return (
        <img
          src={asText(el.data.src)}
          alt={asText(el.data.alt)}
          style={{ maxWidth: '100%', ...style }}
        />
      )
    case 'icon':
      return <span style={style}>{asText(el.data.name)}</span>
    case 'button':
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: 4,
            background: tokens.accent,
            color: '#fff',
            ...style,
          }}
        >
          {asText(el.data.label)}
        </span>
      )
    default:
      return null
  }
}

function NodeView({ node, tokens }: { node: CanvasNode; tokens: ResolvedTokens }) {
  return isBox(node) ? (
    <BoxView box={node} tokens={tokens} />
  ) : (
    <ElementView el={node} tokens={tokens} />
  )
}

/**
 * Click-to-select wrapper. Stops propagation so the innermost node wins; shows a selection
 * outline (teal for containers, indigo for leaves). When the parent is horizontal it also
 * carries the flex sizing (span /12) so the outline box matches the laid-out child.
 */
function Selectable({
  node,
  flex,
  children,
}: {
  node: CanvasNode
  flex?: CSSProperties
  children: ReactNode
}) {
  const { selectedId, select } = useCanvasSelection()
  const selected = selectedId === node.id
  const color = isBox(node) ? SELECT_COLOR.box : SELECT_COLOR.element
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        select(node.id)
      }}
      style={{
        ...flex,
        outline: selected ? `2px solid ${color}` : undefined,
        outlineOffset: 1,
        borderRadius: 2,
      }}
    >
      {children}
    </div>
  )
}

function BoxView({ box, tokens }: { box: CanvasBox; tokens: ResolvedTokens }) {
  const horizontal = isHorizontal(box)
  return (
    <div style={boxStyle(box)}>
      {box.children.map((child) => (
        <Selectable
          key={child.id}
          node={child}
          flex={horizontal ? childFlex(child) : undefined}
        >
          <NodeView node={child} tokens={tokens} />
        </Selectable>
      ))}
    </div>
  )
}

export function CanvasRenderer({
  root,
  tokens,
}: {
  root: CanvasBox
  tokens: ResolvedTokens
}) {
  return (
    <Selectable node={root}>
      <BoxView box={root} tokens={tokens} />
    </Selectable>
  )
}
