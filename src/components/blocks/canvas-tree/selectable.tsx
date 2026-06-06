import type { CSSProperties, ReactNode } from 'react'
import { isBox } from '#/lib/canvas/model'
import type { CanvasNode } from '#/lib/canvas/model'
import { SELECT_COLOR, useCanvasSelection } from './selection'
import { KIND_LABEL } from './node-style'

/** The little type chip above a selected node, with a ↑ "select parent" button. */
function SelectionBadge({
  node,
  parentId,
  color,
  onSelectParent,
}: {
  node: CanvasNode
  parentId: string | null
  color: string
  onSelectParent: (id: string) => void
}) {
  return (
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
            onSelectParent(parentId)
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
  )
}

/**
 * Click-to-select wrapper. Stops propagation so the innermost node wins. Visual language to
 * tell containers from leaves at a glance: a Box gets a DASHED teal outline, a leaf element a
 * SOLID indigo one. Hover shows a faint preview; selection shows it bold plus the type badge.
 * Carries flex sizing (span /12) when the parent is a row.
 */
export function Selectable({
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
        <SelectionBadge node={node} parentId={parentId} color={color} onSelectParent={select} />
      ) : null}
      {children}
    </div>
  )
}
