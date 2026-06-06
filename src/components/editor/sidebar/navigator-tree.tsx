import { useState } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ColumnsIcon,
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
import { isBox, isHorizontal } from '#/lib/canvas/model'
import type { CanvasNode } from '#/lib/canvas/model'
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

/** Icon + label for a node row. Boxes show their layout; leaves show a content preview. */
function describe(node: CanvasNode): {
  Icon: ComponentType<{ className?: string }>
  label: string
  meta?: string
} {
  if (isBox(node)) {
    const Icon = isHorizontal(node) ? ColumnsIcon : RowsIcon
    const layout =
      node.props.display === 'grid'
        ? 'grid'
        : isHorizontal(node)
          ? 'row'
          : 'column'
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

function NodeRow({
  node,
  parentId,
  depth,
  controller,
  collapsed,
  toggle,
}: {
  node: CanvasNode
  parentId: string | null
  depth: number
  controller: Controller
  collapsed: Set<string>
  toggle: (id: string) => void
}) {
  const { selectedId, select, hoveredId, hover } = useCanvasSelection()
  const box = isBox(node)
  const hasChildren = box && node.children.length > 0
  const open = !collapsed.has(node.id)
  const selected = selectedId === node.id
  const highlighted = hoveredId === node.id
  const { Icon, label, meta } = describe(node)
  const color = box ? SELECT_COLOR.box : SELECT_COLOR.element

  return (
    <>
      <div
        className={cn(
          'group/row flex items-center gap-1 rounded-md py-1 pr-1 text-xs transition-colors',
          selected
            ? 'bg-primary/10 text-foreground'
            : highlighted
              ? 'bg-muted'
              : 'hover:bg-muted/60',
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
        onClick={() => select(node.id)}
        onMouseEnter={() => hover(node.id)}
        onMouseLeave={() => hover(null)}
      >
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
            />
          ))
        : null}
    </>
  )
}

/**
 * Left "Build" panel for canvas mode: the element tree, mirroring every canvas node (boxes
 * and leaves) with per-kind icon + label + content preview, collapse/expand, and delete.
 * Selection is two-way synced with the canvas via CanvasSelectionContext (click a row →
 * selects on the canvas + opens its Settings; canvas hover/selection highlights the row).
 */
export function NavigatorTree({ controller }: { controller: Controller }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const root = controller.doc.canvas
  if (!root) return null

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
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
      />
    </div>
  )
}
