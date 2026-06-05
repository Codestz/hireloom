import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  GripVerticalIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Block } from '#/components/blocks/entry/block'

/**
 * A draggable entry card — wires dnd-kit's sortable to the Block's left grip handle,
 * so dragging the grip reorders entries within a section. Only the grip starts a drag;
 * the text stays editable.
 */
export function SortableEntry({
  id,
  htmlId,
  onImprove,
  onInsertAbove,
  onInsertBelow,
  onDelete,
  children,
}: {
  id: string
  htmlId?: string
  onImprove?: () => void
  onInsertAbove?: () => void
  onInsertBelow?: () => void
  onDelete?: () => void
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const handle = (
    <span
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className="flex size-6 cursor-grab items-center justify-center rounded text-neutral-400 transition-colors hover:bg-white/20 hover:text-white active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-4" />
    </span>
  )

  return (
    <div
      ref={setNodeRef}
      id={htmlId}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        scrollMarginTop: 24,
      }}
      className="mt-2"
    >
      <Block dragging={isDragging}>
        <Block.Toolbar>
          <Block.Drag handle={handle} />
          {onImprove ? (
            <Block.Action
              icon={SparklesIcon}
              label="Improve with AI"
              onClick={onImprove}
            />
          ) : null}
          {onInsertAbove ? (
            <Block.Action
              icon={ArrowUpToLineIcon}
              label="Insert above"
              onClick={onInsertAbove}
            />
          ) : null}
          {onInsertBelow ? (
            <Block.Action
              icon={ArrowDownToLineIcon}
              label="Insert below"
              onClick={onInsertBelow}
            />
          ) : null}
          {onDelete ? (
            <Block.Action
              icon={Trash2Icon}
              label="Delete"
              onClick={onDelete}
              danger
            />
          ) : null}
        </Block.Toolbar>
        {children}
      </Block>
    </div>
  )
}
