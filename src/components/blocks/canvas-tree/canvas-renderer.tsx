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
            // Match the classic SectionHeading: section labels (h2/h3) are NOT bold —
            // uppercase + accent + letter-spacing carry them; only the name (h1) is bold.
            fontWeight: level === 1 ? 700 : 400,
            fontSize: level === 1 ? tokens.baseFontSize * 1.8 : tokens.baseFontSize * 0.85,
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
      // Mirror the classic list (block-field.tsx): paddingLeft 16, manual • bullet in a
      // baseline flex row with a 6px gap — so indentation matches the typed layout exactly.
      return (
        <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'none', ...style }}>
          {items.map((it, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                marginBottom: tokens.space(1),
              }}
            >
              <span aria-hidden>•</span>
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

const KIND_LABEL: Record<string, string> = {
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

/**
 * Click-to-select wrapper. Stops propagation so the innermost node wins. Visual language to
 * tell containers from leaves at a glance: a Box gets a DASHED teal outline, a leaf element a
 * SOLID indigo one. Hover shows a faint preview of that outline; selection shows it bold plus
 * a small type badge. Carries flex sizing (span /12) when the parent is a row.
 */
function Selectable({
  node,
  parentId,
  flex,
  children,
}: {
  node: CanvasNode
  parentId: string | null
  flex?: CSSProperties
  children: ReactNode
}) {
  const { selectedId, select, hoveredId, hover } = useCanvasSelection()
  const selected = selectedId === node.id
  const hovered = hoveredId === node.id && !selected
  const box = isBox(node)
  const color = box ? SELECT_COLOR.box : SELECT_COLOR.element
  const lineStyle = box ? 'dashed' : 'solid'
  const outline = selected
    ? `2px ${lineStyle} ${color}`
    : hovered
      ? `1px ${lineStyle} ${color}80`
      : undefined
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        select(node.id)
      }}
      // onMouseOver bubbles, so the innermost node's handler fires first; stopPropagation
      // then prevents ancestors from also marking themselves hovered (no nested noise).
      onMouseOver={(e) => {
        e.stopPropagation()
        hover(node.id)
      }}
      style={{
        ...flex,
        position: 'relative',
        outline,
        outlineOffset: box ? 2 : 1,
        borderRadius: 2,
      }}
    >
      {selected ? (
        <span
          contentEditable={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'translateY(-100%)',
            zoom: 'var(--chrome-zoom, 1)' as unknown as number,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: color,
            color: '#fff',
            fontSize: 9,
            lineHeight: 1.4,
            padding: '1px 4px 1px 6px',
            borderRadius: 3,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            letterSpacing: 0.3,
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {KIND_LABEL[node.kind] ?? node.kind}
          {parentId ? (
            <button
              type="button"
              title="Select parent container"
              onClick={(e) => {
                e.stopPropagation()
                select(parentId)
              }}
              style={{
                display: 'inline-flex',
                cursor: 'pointer',
                border: 'none',
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                borderRadius: 2,
                padding: '0 3px',
                lineHeight: 1.3,
              }}
            >
              ↑
            </button>
          ) : null}
        </span>
      ) : null}
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
          parentId={box.id}
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
  const { hover } = useCanvasSelection()
  return (
    <div onMouseLeave={() => hover(null)}>
      <Selectable node={root} parentId={null}>
        <BoxView box={root} tokens={tokens} />
      </Selectable>
    </div>
  )
}
