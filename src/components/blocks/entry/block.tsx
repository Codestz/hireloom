import { GripVerticalIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/utils.ts'

/**
 * A Block — one card of the résumé, with a hover toolbar pinned above it. Compound by
 * design so consumers compose exactly the controls they need (and new ones can be added
 * without touching this file):
 *
 *   <Block dragging={isDragging}>
 *     <Block.Toolbar>
 *       <Block.Drag handle={dragHandle} />
 *       <Block.Action icon={SparklesIcon} label="Improve" onClick={onImprove} />
 *       <Block.Action icon={Trash2Icon} label="Delete" onClick={onDelete} danger />
 *     </Block.Toolbar>
 *     {children}
 *   </Block>
 */
const BTN =
  'flex size-6 items-center justify-center rounded text-neutral-300 outline-none transition-colors hover:bg-neutral-700 hover:text-white'

function Block({
  children,
  dragging,
}: {
  children: ReactNode
  dragging?: boolean
}) {
  return (
    <div
      className={cn(
        'hl-block group/blk relative -mx-2 rounded-md px-2 py-1',
        dragging && 'opacity-60',
      )}
    >
      {children}
    </div>
  )
}

/** The hover-revealed toolbar pinned above the block (top-left). Compose actions inside. */
function BlockToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute bottom-full left-0 z-20 -mb-px hidden origin-bottom-left items-center gap-0.5 rounded-lg border border-neutral-700 bg-neutral-900 p-0.5 shadow-lg group-hover/blk:pointer-events-auto group-hover/blk:flex before:absolute before:top-full before:left-0 before:h-3 before:w-full before:content-['']"
      style={{ transform: 'scale(var(--chrome-zoom, 1))' }}
      contentEditable={false}
    >
      {children}
    </div>
  )
}

/** One toolbar button. `danger` tints it red on hover (for destructive actions). */
function BlockAction({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(BTN, danger && 'hover:bg-red-500 hover:text-white')}
    >
      <Icon className="size-4" />
    </button>
  )
}

/** The drag grip — pass a sortable lib's handle node, or fall back to a static grip. */
function BlockDrag({ handle }: { handle?: ReactNode }) {
  return (
    handle ?? (
      <span className={cn(BTN, 'cursor-grab')}>
        <GripVerticalIcon className="size-4" />
      </span>
    )
  )
}

Block.Toolbar = BlockToolbar
Block.Action = BlockAction
Block.Drag = BlockDrag

export { Block }
