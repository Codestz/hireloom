import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
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
import {
  SELECT_COLOR,
  useCanvasSelection,
} from '#/components/blocks/canvas-tree/selection'
import { useDragState } from '#/components/blocks/canvas-tree/drag-context'
import { isBox, isHorizontal } from '#/lib/canvas/model'
import type { CanvasBox, CanvasNode } from '#/lib/canvas/model'
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

function snippet(s: string, n = 26): string {
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
    const layout =
      node.props.display === 'grid' ? 'grid' : isHorizontal(node) ? 'row' : 'column'
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

function collectContainerIds(box: CanvasBox, into: Set<string> = new Set()): Set<string> {
  into.add(box.id)
  for (const c of box.children) if (isBox(c)) collectContainerIds(c, into)
  return into
}

/** Collision over the navigator: the innermost box row under the pointer. */
function innermostRow(containerIds: Set<string>): CollisionDetection {
  return (args) => {
    const hits = pointerWithin(args).filter((h) => containerIds.has(String(h.id)))
    if (hits.length === 0) return []
    let best = hits[0]
    let bestArea = Infinity
    for (const h of hits) {
      const r = args.droppableRects.get(h.id)
      const area = r ? r.width * r.height : Infinity
      if (area <= bestArea) {
        bestArea = area
        best = h
      }
    }
    return [best]
  }
}

interface DragUi {
  activeId: string | null
  /** Container box being targeted (drop goes inside it). */
  overId: string | null
}

function NodeRow({
  node,
  parentId,
  depth,
  controller,
  collapsed,
  toggle,
  ui,
}: {
  node: CanvasNode
  parentId: string | null
  depth: number
  controller: Controller
  collapsed: Set<string>
  toggle: (id: string) => void
  ui: DragUi
}) {
  const { selectedId, select, hoveredId, hover } = useCanvasSelection()
  const box = isBox(node)
  const hasChildren = box && node.children.length > 0
  const open = !collapsed.has(node.id)
  const selected = selectedId === node.id
  const highlighted = hoveredId === node.id
  const dimmed = ui.activeId === node.id
  const dropInto = ui.overId === node.id
  const { Icon, label, meta } = describe(node)
  const color = box ? SELECT_COLOR.box : SELECT_COLOR.element

  const draggable = useDraggable({ id: node.id })
  const droppable = useDroppable({ id: node.id, disabled: !box })
  const setRowRef = (el: HTMLElement | null) => {
    draggable.setNodeRef(el)
    if (box) droppable.setNodeRef(el)
  }

  return (
    <>
      <div
        ref={setRowRef}
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
        {/* Drag grip */}
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
        ? node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              parentId={node.id}
              depth={depth + 1}
              controller={controller}
              collapsed={collapsed}
              toggle={toggle}
              ui={ui}
            />
          ))
        : null}
    </>
  )
}

/**
 * Left "Build" panel: the element tree, mirroring every canvas node with per-kind icon, label,
 * and content preview, collapse/expand, delete, and TWO-WAY selection sync with the canvas.
 *
 * DnD: drag a row by its grip and drop onto any Box row to move the node INTO that box (great
 * for nesting into containers you can't easily hit on the canvas). It runs in its own
 * DndContext (isolated from the canvas one) and reflects in-progress canvas drags too — the
 * active row dims and the target box row is outlined whichever surface you drag from.
 */
export function NavigatorTree({ controller }: { controller: Controller }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [navDrag, setNavDrag] = useState<DragUi>({ activeId: null, overId: null })
  const canvasDrag = useDragState()
  const root = controller.doc.canvas
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const containerIds = useMemo(() => (root ? collectContainerIds(root) : new Set<string>()), [root])
  const collision = useMemo(() => innermostRow(containerIds), [containerIds])

  if (!root) return null

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onDragStart = (e: DragStartEvent) =>
    setNavDrag({ activeId: String(e.active.id), overId: null })

  const onDragEnd = (e: DragEndEvent) => {
    const active = String(e.active.id)
    const over = e.over ? String(e.over.id) : null
    setNavDrag({ activeId: null, overId: null })
    if (over && containerIds.has(over) && over !== active) {
      controller.onCanvasMoveNode(active, over) // append into the target box
    }
  }

  // Merge: navigator drag wins; otherwise reflect an in-progress canvas drag.
  const ui: DragUi = navDrag.activeId
    ? navDrag
    : { activeId: canvasDrag.activeId, overId: canvasDrag.overContainerId }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={(e) => setNavDrag((s) => ({ ...s, overId: e.over ? String(e.over.id) : null }))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setNavDrag({ activeId: null, overId: null })}
    >
      <div className="p-2">
        <p className="px-2 pb-1 text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          Elements
        </p>
        <NodeRow
          node={root}
          parentId={null}
          depth={0}
          controller={controller}
          collapsed={collapsed}
          toggle={toggle}
          ui={ui}
        />
      </div>
      <DragOverlay dropAnimation={null}>
        {navDrag.activeId ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#6366f1',
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
