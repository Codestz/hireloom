import { useDraggable } from '@dnd-kit/core'
import {
  BoxSelectIcon,
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
  TypeIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { useBlockDoc } from '#/components/blocks'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { isBox } from '#/lib/canvas/model'
import { findNode } from '#/lib/canvas/tree-ops'
import { PALETTE_LABEL, makePaletteNode, paletteDragId } from '#/lib/canvas/palette'
import type { PaletteKey } from '#/lib/canvas/palette'

type Controller = ReturnType<typeof useBlockDoc>

const ICON: Record<PaletteKey, ComponentType<{ className?: string }>> = {
  'box-column': RowsIcon,
  'box-row': ColumnsIcon,
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

const GROUPS: Array<{ title: string; keys: Array<PaletteKey> }> = [
  { title: 'Containers', keys: ['box-column', 'box-row'] },
  { title: 'Text', keys: ['heading', 'text', 'list'] },
  { title: 'Structure', keys: ['separator', 'divider', 'spacer'] },
  { title: 'Media', keys: ['image', 'icon', 'button'] },
]

/** A palette item: drag onto the canvas to place at the drop line, or click to add into the target. */
function PaletteCard({ paletteKey, onAdd }: { paletteKey: PaletteKey; onAdd: () => void }) {
  const { setNodeRef, listeners, attributes } = useDraggable({ id: paletteDragId(paletteKey) })
  const Icon = ICON[paletteKey]
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={onAdd}
      style={{ touchAction: 'none' }}
      className="flex aspect-square cursor-grab flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-[10px] text-muted-foreground transition-colors hover:border-primary hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-4" />
      {PALETTE_LABEL[paletteKey]}
    </button>
  )
}

export function ComponentsPalette({ controller }: { controller: Controller }) {
  const { selectedId, select } = useCanvasSelection()
  const root = controller.doc.canvas
  if (!root) return null
  const selected = selectedId ? findNode(root, selectedId) : null
  const intoBox = selected && isBox(selected)
  const target = intoBox ? selected.id : root.id

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-2 text-[11px] text-muted-foreground">
        <BoxSelectIcon className="size-3.5 shrink-0" />
        Drag onto the canvas, or click to add into{' '}
        <span className="font-medium text-foreground">
          {intoBox ? 'the selected box' : 'the page'}
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title}>
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.title}
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {group.keys.map((key) => (
              <PaletteCard
                key={key}
                paletteKey={key}
                onAdd={() => {
                  const node = makePaletteNode(key)
                  controller.onCanvasAddNode(target, node)
                  select(node.id)
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
