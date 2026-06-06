import { useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ColumnsIcon,
  GripVerticalIcon,
  HeadingIcon,
  ImageIcon,
  ListIcon,
  MinusIcon,
  MousePointerClickIcon,
  RowsIcon,
  SeparatorVerticalIcon,
  SmileIcon,
  SpaceIcon,
  SquareIcon,
  Trash2Icon,
  TypeIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { useBlockDoc } from '#/components/blocks'
import { SELECT_COLOR, useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { useDragState } from '#/components/blocks/canvas-tree/drag-context'
import { isBox, isHorizontal } from '#/lib/canvas/model'
import type { CanvasNode } from '#/lib/canvas/model'
import { findNode, findParent } from '#/lib/canvas/tree-ops'
import { cn } from '#/lib/utils.ts'

type Controller = ReturnType<typeof useBlockDoc>

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  heading: HeadingIcon,
  text: TypeIcon,
  list: ListIcon,
  separator: SeparatorVerticalIcon,
  divider: MinusIcon,
  spacer: SpaceIcon,
  image: ImageIcon,
  icon: SmileIcon,
  button: MousePointerClickIcon,
}

function snippet(s: string, n = 24): string {
  const t = s.trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

function describe(node: CanvasNode): {
  Icon: ComponentType<{ className?: string }>
  label: string
  meta?: string
} {
  if (isBox(node)) {
    const Icon = isHorizontal(node) ? ColumnsIcon : RowsIcon
    const layout = node.props.display === 'grid' ? 'grid' : isHorizontal(node) ? 'row' : 'column'
    return { Icon: node.role ? SquareIcon : Icon, label: 'Box', meta: node.role ?? layout }
  }
  const el = node
  const Icon = ICONS[el.kind] ?? SquareIcon
  switch (el.kind) {
    case 'heading':
    case 'text':
      return { Icon, label: el.kind === 'heading' ? 'Heading' : 'Text', meta: snippet(String(el.data.text ?? '')) }
    case 'list':
      return { Icon, label: 'List', meta: `${Array.isArray(el.data.items) ? el.data.items.length : 0} items` }
    case 'separator':
      return { Icon, label: 'Separator', meta: String(el.data.variant ?? 'dot') }
    default:
      return { Icon, label: el.kind.charAt(0).toUpperCase() + el.kind.slice(1) }
  }
}

/** Where a navigator drag will land. */
interface NavDrop {
  activeId: string
  container: string
  index: number
  /** Render the insertion line above this row id (null = at the very end). */
  beforeId: string | null
  indent: number
}

const LINE = '#6366f1'

function InsertionLine({ indent }: { indent: number }) {
  return <div style={{ height: 2, marginLeft: indent, background: LINE, borderRadius: 2 }} />
}

function NodeRow({
  node,
  parentId,
  depth,
  index,
  controller,
  collapsed,
  toggle,
  drop,
  canvasActive,
  canvasOver,
}: {
  node: CanvasNode
  parentId: string | null
  depth: number
  index: number
  controller: Controller
  collapsed: Set<string>
  toggle: (id: string) => void
  drop: NavDrop | null
  canvasActive: string | null
  canvasOver: string | null
}) {
  const { selectedId, select, hoveredId, hover } = useCanvasSelection()
  const box = isBox(node)
  const hasChildren = box && node.children.length > 0
  const open = !collapsed.has(node.id)
  const selected = selectedId === node.id
  const highlighted = hoveredId === node.id
  const dimmed = drop?.activeId === node.id || canvasActive === node.id
  const dropInto = canvasOver === node.id
  const { Icon, label, meta } = describe(node)
  const color = box ? SELECT_COLOR.box : SELECT_COLOR.element
  const draggable = useDraggable({ id: node.id })

  return (
    <>
      {drop?.beforeId === node.id ? <InsertionLine indent={drop.indent} /> : null}
      <div
        data-nav-id={node.id}
        data-nav-parent={parentId ?? ''}
        data-nav-index={index}
        data-nav-container={box ? '1' : '0'}
        data-nav-depth={depth}
        ref={draggable.setNodeRef}
        className={cn(
          'group/row flex items-center gap-1 rounded-md py-1 pr-1 text-xs transition-colors',
          selected ? 'bg-primary/10 text-foreground' : highlighted ? 'bg-muted' : 'hover:bg-muted/60',
        )}
        style={{
          paddingLeft: depth * 12 + 4,
          opacity: dimmed ? 0.4 : undefined,
          boxShadow: dropInto ? `inset 0 0 0 1px ${color}` : undefined,
        }}
        onClick={() => select(node.id)}
        onMouseEnter={() => hover(node.id)}
        onMouseLeave={() => hover(null)}
      >
        {parentId ? (
          <button
            ref={draggable.setActivatorNodeRef}
            {...draggable.listeners}
            {...draggable.attributes}
            aria-label="Drag to move"
            title="Drag to move"
            onClick={(e) => e.stopPropagation()}
            className="flex size-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100"
            style={{ touchAction: 'none' }}
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation()
              toggle(node.id)
            }}
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          >
            {open ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}

        <Icon className="size-3.5 shrink-0" style={{ color }} />
        <span className="shrink-0 font-medium">{label}</span>
        {meta ? <span className="truncate text-muted-foreground">· {meta}</span> : null}

        <span className="flex-1" />
        {parentId ? (
          <button
            type="button"
            aria-label="Delete node"
            title="Delete node"
            onClick={(e) => {
              e.stopPropagation()
              controller.onCanvasRemoveNode(node.id)
              if (selected) select(null)
            }}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-colors group-hover/row:opacity-100 hover:bg-red-500 hover:text-white"
          >
            <Trash2Icon className="size-3" />
          </button>
        ) : null}
      </div>

      {hasChildren && open
        ? node.children.map((child, i) => (
            <NodeRow
              key={child.id}
              node={child}
              parentId={node.id}
              depth={depth + 1}
              index={i}
              controller={controller}
              collapsed={collapsed}
              toggle={toggle}
              drop={drop}
              canvasActive={canvasActive}
              canvasOver={canvasOver}
            />
          ))
        : null}
    </>
  )
}

/**
 * Left "Build" panel: the element tree mirroring every canvas node, with two-way selection
 * sync. DnD: drag a row by its grip and drop it at an exact slot — an insertion line shows
 * where it lands (reorder among siblings or reparent into a box). The drop target/index is
 * projected from the live pointer over the row rects. Reflects in-progress canvas drags too.
 */
export function NavigatorTree({ controller }: { controller: Controller }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [drop, setDrop] = useState<NavDrop | null>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<NavDrop | null>(null)
  const canvasDrag = useDragState()
  const root = controller.doc.canvas
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  if (!root) return null

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    dropRef.current = null
    setDrop({ activeId: id, container: root.id, index: 0, beforeId: null, indent: 16 })
  }

  const onDragMove = (e: DragMoveEvent) => {
    const tree = treeRef.current
    if (!tree) return
    const active = String(e.active.id)
    const a = e.activatorEvent as PointerEvent
    const py = a.clientY + e.delta.y
    const rows = [...tree.querySelectorAll('[data-nav-id]')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        id: el.getAttribute('data-nav-id') ?? '',
        parent: el.getAttribute('data-nav-parent') || null,
        index: Number(el.getAttribute('data-nav-index')),
        container: el.getAttribute('data-nav-container') === '1',
        depth: Number(el.getAttribute('data-nav-depth')),
        mid: r.top + r.height / 2,
      }
    })
    let slot = rows.length
    for (let i = 0; i < rows.length; i++) {
      if (py < rows[i].mid) {
        slot = i
        break
      }
    }
    const below = slot < rows.length ? rows[slot] : undefined
    const above = slot > 0 ? rows[slot - 1] : undefined
    let container: string, index: number, indent: number
    const beforeId = below?.id ?? null
    if (!above) {
      container = root.id
      index = 0
      indent = 16
    } else if (above.container && below && below.parent === above.id) {
      // Right after an expanded container header → drop in as its first child.
      container = above.id
      index = 0
      indent = (above.depth + 1) * 12 + 16
    } else {
      container = above.parent ?? root.id
      index = above.index + 1
      indent = above.depth * 12 + 16
    }
    // Never drop a box into itself or its own subtree.
    const activeNode = findNode(root, active)
    if (activeNode && isBox(activeNode) && (container === active || findNode(activeNode, container))) return
    const next: NavDrop = { activeId: active, container, index, beforeId, indent }
    dropRef.current = next
    setDrop(next)
  }

  const onDragEnd = (_e: DragEndEvent) => {
    const d = dropRef.current
    const active = drop?.activeId ?? null
    dropRef.current = null
    setDrop(null)
    if (!d || !active) return
    let index = d.index
    const parent = findParent(root, active)
    if (parent && parent.id === d.container) {
      const from = parent.children.findIndex((c) => c.id === active)
      if (from >= 0 && from < index) index -= 1
    }
    controller.onCanvasMoveNode(active, d.container, index)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        dropRef.current = null
        setDrop(null)
      }}
    >
      <div ref={treeRef} className="p-2">
        <p className="px-2 pb-1 text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          Elements
        </p>
        <NodeRow
          node={root}
          parentId={null}
          depth={0}
          index={0}
          controller={controller}
          collapsed={collapsed}
          toggle={toggle}
          drop={drop}
          canvasActive={canvasDrag.activeId}
          canvasOver={canvasDrag.overContainerId}
        />
        {drop && drop.beforeId === null ? <InsertionLine indent={drop.indent} /> : null}
      </div>
      <DragOverlay dropAnimation={null}>
        {drop ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: LINE,
              color: '#fff',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            Move
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
