import type { CSSProperties, ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { GripVerticalIcon } from 'lucide-react'
import { isBox } from '#/lib/canvas/model'
import type { CanvasNode } from '#/lib/canvas/model'
import { SELECT_COLOR, useCanvasSelection } from './selection'
import { useDragState } from './drag-context'
import { KIND_LABEL } from './node-style'

/**
 * The node chip: one coherent affordance pinned to the node's top-left edge (color-matched —
 * teal for boxes, indigo for leaves). On hover it's just a grip (the drag handle); on selection
 * it expands to grip + type label + ↑ select-parent. Replaces the old floating gutter grip +
 * separate badge.
 */
function NodeChip({
  node,
  parentId,
  color,
  selected,
  onSelectParent,
  gripRef,
  gripListeners,
  gripAttributes,
}: {
  node: CanvasNode
  parentId: string | null
  color: string
  selected: boolean
  onSelectParent: (id: string) => void
  gripRef: (el: HTMLElement | null) => void
  gripListeners: Record<string, unknown> | undefined
  gripAttributes: Record<string, unknown>
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
        gap: 3,
        background: color,
        color: '#fff',
        fontSize: 9,
        lineHeight: 1.4,
        padding: '1px 4px',
        borderRadius: 4,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
        zIndex: 11,
      }}
    >
      {parentId ? (
        <button
          ref={gripRef}
          {...gripListeners}
          {...gripAttributes}
          aria-label="Drag to move"
          title="Drag to move"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            cursor: 'grab',
            border: 'none',
            background: 'transparent',
            color: '#fff',
            padding: 0,
            margin: '0 -1px',
            touchAction: 'none',
          }}
        >
          <GripVerticalIcon style={{ width: 11, height: 11 }} />
        </button>
      ) : null}

      {selected ? (
        <>
          <span style={{ fontWeight: 600 }}>{KIND_LABEL[node.kind] ?? node.kind}</span>
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
        </>
      ) : null}
    </span>
  )
}

/**
 * Click-to-select + drag wrapper. Selection language: a Box gets a DASHED teal outline, a leaf
 * a SOLID indigo one (faint on hover, bold + chip on select/hover). Dragging starts from the
 * chip's grip only (so inline editing isn't hijacked); the dragged node dims while a drop line
 * elsewhere shows where it lands. Carries flex sizing (span /12) when the parent is a row.
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
  const drag = useDragState()
  const { setNodeRef, setActivatorNodeRef, listeners, attributes } = useDraggable({
    id: node.id,
  })
  const selected = selectedId === node.id
  const hovered = hoveredId === node.id && !selected
  const dragging = drag.activeId === node.id
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
      ref={setNodeRef}
      data-node-id={node.id}
      onClick={(e) => {
        e.stopPropagation()
        select(node.id)
      }}
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
        opacity: dragging ? 0.4 : undefined,
      }}
    >
      {selected || hovered ? (
        <NodeChip
          node={node}
          parentId={parentId}
          color={color}
          selected={selected}
          onSelectParent={select}
          gripRef={setActivatorNodeRef}
          gripListeners={listeners}
          gripAttributes={attributes}
        />
      ) : null}
      {children}
    </div>
  )
}
