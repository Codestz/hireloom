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
import { isBox, makeBox, makeElement } from '#/lib/canvas/model'
import type { CanvasNode } from '#/lib/canvas/model'
import { findNode } from '#/lib/canvas/tree-ops'

type Controller = ReturnType<typeof useBlockDoc>

interface PaletteItem {
  label: string
  icon: ComponentType<{ className?: string }>
  make: () => CanvasNode
}

const GROUPS: Array<{ title: string; items: Array<PaletteItem> }> = [
  {
    title: 'Containers',
    items: [
      { label: 'Column', icon: RowsIcon, make: () => makeBox('column', { gap: 8 }) },
      { label: 'Row', icon: ColumnsIcon, make: () => makeBox('row', { gap: 6 }) },
    ],
  },
  {
    title: 'Text',
    items: [
      { label: 'Heading', icon: HeadingIcon, make: () => makeElement('heading', { text: 'Heading', level: 2 }) },
      { label: 'Text', icon: TypeIcon, make: () => makeElement('text', { text: 'Text' }) },
      { label: 'List', icon: ListIcon, make: () => makeElement('list', { items: ['Item'] }) },
    ],
  },
  {
    title: 'Structure',
    items: [
      { label: 'Separator', icon: SeparatorVerticalIcon, make: () => makeElement('separator', { variant: 'dot' }) },
      { label: 'Divider', icon: MinusIcon, make: () => makeElement('divider', {}) },
      { label: 'Spacer', icon: SpaceIcon, make: () => makeElement('spacer', { size: 12 }) },
    ],
  },
  {
    title: 'Media',
    items: [
      { label: 'Image', icon: ImageIcon, make: () => makeElement('image', { src: '', alt: '' }) },
      { label: 'Icon', icon: SmileIcon, make: () => makeElement('icon', { name: '' }) },
      { label: 'Button', icon: MousePointerClickIcon, make: () => makeElement('button', { label: 'Button' }) },
    ],
  },
]

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
        Adding into{' '}
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
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    const node = item.make()
                    controller.onCanvasAddNode(target, node)
                    select(node.id)
                  }}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-[10px] text-muted-foreground transition-colors hover:border-primary hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
