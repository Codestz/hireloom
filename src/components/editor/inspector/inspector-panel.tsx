import { useState } from 'react'
import { Trash2Icon } from 'lucide-react'
import type { useBlockDoc } from '#/components/blocks'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { isBox, makeBox, makeElement } from '#/lib/canvas/model'
import type {
  BoxLayout,
  CanvasNode,
  ElementKind,
  SeparatorVariant,
} from '#/lib/canvas/model'
import { findNode, findParent } from '#/lib/canvas/tree-ops'

type Controller = ReturnType<typeof useBlockDoc>

const ROLES = [
  '',
  'header',
  'summary',
  'work',
  'education',
  'skills',
  'projects',
  'certifications',
  'awards',
  'publications',
  'languages',
  'volunteer',
  'references',
  'custom',
]

const SEPARATORS: Array<SeparatorVariant> = ['dot', 'bullet', 'dash', 'line', 'slash', 'pipe']

const PALETTE: Array<{ label: string; make: () => CanvasNode }> = [
  { label: 'Box ↓ (vertical)', make: () => makeBox('vertical', { gap: 8 }) },
  { label: 'Box → (horizontal)', make: () => makeBox('horizontal', { gap: 6 }) },
  { label: 'Heading', make: () => makeElement('heading', { text: 'Heading', level: 2 }) },
  { label: 'Text', make: () => makeElement('text', { text: 'Text' }) },
  { label: 'List', make: () => makeElement('list', { items: ['Item'] }) },
  { label: 'Separator', make: () => makeElement('separator', { variant: 'dot' }) },
  { label: 'Divider', make: () => makeElement('divider', {}) },
  { label: 'Spacer', make: () => makeElement('spacer', { size: 12 }) },
]

const ELEMENT_LABEL: Record<ElementKind, string> = {
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

const groupCls = 'border-b border-border px-3 py-3'
const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
const inputCls =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary'
const chipCls =
  'rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-muted'
const chipActiveCls = 'rounded-md border border-primary bg-primary px-2 py-1 text-xs text-primary-foreground'

export function InspectorPanel({ controller }: { controller: Controller }) {
  const { selectedId, select } = useCanvasSelection()
  const [tab, setTab] = useState<'components' | 'settings'>('components')
  const root = controller.doc.canvas
  if (!root) return null

  const selected = selectedId ? findNode(root, selectedId) : null
  const parent = selectedId ? findParent(root, selectedId) : null
  // New nodes land in the selected container (a Box), else at the root.
  const target = selected && isBox(selected) ? selected.id : root.id

  return (
    <div className="flex h-full flex-col text-sm">
      <div className="flex border-b border-border">
        {(['components', 'settings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'flex-1 border-b-2 border-primary px-3 py-2 text-xs font-medium capitalize'
                : 'flex-1 border-b-2 border-transparent px-3 py-2 text-xs font-medium capitalize text-muted-foreground hover:text-foreground'
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'components' ? (
          <div className={groupCls}>
            <span className={labelCls}>
              Add into {selected && isBox(selected) ? 'selected box' : 'the page'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const node = p.make()
                    controller.onCanvasAddNode(target, node)
                    select(node.id)
                  }}
                  className={chipCls}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : selected ? (
          <Settings
            controller={controller}
            node={selected}
            parentId={parent?.id ?? null}
            isRoot={selected.id === root.id}
          />
        ) : (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            Select a node on the canvas to edit it.
          </p>
        )}
      </div>
    </div>
  )
}

function Settings({
  controller,
  node,
  parentId,
  isRoot,
}: {
  controller: Controller
  node: CanvasNode
  parentId: string | null
  isRoot: boolean
}) {
  const { select } = useCanvasSelection()
  const heading = isBox(node) ? 'Box' : ELEMENT_LABEL[node.kind]

  return (
    <div>
      <div className={groupCls}>
        <span className="text-xs font-semibold">{heading}</span>
      </div>

      {isBox(node) ? (
        <BoxSettings controller={controller} node={node} />
      ) : (
        <ElementSettings controller={controller} node={node} parentId={parentId} />
      )}

      {!isRoot ? (
        <div className={groupCls}>
          <button
            type="button"
            onClick={() => {
              controller.onCanvasRemoveNode(node.id)
              select(null)
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500 hover:text-white"
          >
            <Trash2Icon className="size-3.5" /> Delete node
          </button>
        </div>
      ) : null}
    </div>
  )
}

function BoxSettings({
  controller,
  node,
}: {
  controller: Controller
  node: Extract<CanvasNode, { kind: 'box' }>
}) {
  return (
    <div className={groupCls}>
      <span className={labelCls}>Layout</span>
      <div className="mb-3 flex gap-1.5">
        {(['vertical', 'horizontal'] as Array<BoxLayout>).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => controller.onCanvasUpdateProps(node.id, { layout: l })}
            className={node.props.layout === l ? chipActiveCls : chipCls}
          >
            {l === 'vertical' ? '↓ Vertical' : '→ Horizontal'}
          </button>
        ))}
      </div>

      <label className={labelCls}>Gap (px)</label>
      <input
        type="number"
        className={`${inputCls} mb-3`}
        value={node.props.gap ?? ''}
        onChange={(e) =>
          controller.onCanvasUpdateProps(node.id, {
            gap: e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
      />

      <label className={labelCls}>Width (span /12, in a horizontal box)</label>
      <input
        type="number"
        min={1}
        max={12}
        className={`${inputCls} mb-3`}
        value={node.props.span ?? ''}
        onChange={(e) =>
          controller.onCanvasUpdateProps(node.id, {
            span: e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
      />

      <label className={labelCls}>Role (export / ATS)</label>
      <select
        className={inputCls}
        value={node.role ?? ''}
        onChange={(e) =>
          controller.onCanvasSetRole(node.id, e.target.value || undefined)
        }
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r === '' ? '— none —' : r}
          </option>
        ))}
      </select>
    </div>
  )
}

function ElementSettings({
  controller,
  node,
  parentId,
}: {
  controller: Controller
  node: Extract<CanvasNode, { kind: ElementKind }>
  parentId: string | null
}) {
  const { select } = useCanvasSelection()
  return (
    <>
      {node.kind === 'separator' ? (
        <div className={groupCls}>
          <span className={labelCls}>Separator style</span>
          <select
            className={inputCls}
            value={typeof node.data.variant === 'string' ? node.data.variant : 'dot'}
            onChange={(e) => controller.onCanvasUpdateData(node.id, { variant: e.target.value })}
          >
            {SEPARATORS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {node.kind === 'heading' ? (
        <div className={groupCls}>
          <span className={labelCls}>Heading level</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => controller.onCanvasUpdateData(node.id, { level: lvl })}
                className={node.data.level === lvl ? chipActiveCls : chipCls}
              >
                H{lvl}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {node.kind === 'list' ? (
        <div className={groupCls}>
          <span className={labelCls}>List</span>
          <button
            type="button"
            onClick={() => {
              if (parentId === null) return
              const items = Array.isArray(node.data.items)
                ? node.data.items.filter((x): x is string => typeof x === 'string')
                : []
              const text = makeElement('text', { text: items.join('\n') })
              const idx = indexInParent(controller, parentId, node.id)
              controller.onCanvasInsertNode(parentId, text, idx)
              controller.onCanvasRemoveNode(node.id)
              select(text.id)
            }}
            className={`${chipCls} w-full`}
          >
            Convert to multiline text
          </button>
        </div>
      ) : null}

      {node.kind === 'text' ? (
        <div className={groupCls}>
          <span className={labelCls}>Text</span>
          <button
            type="button"
            onClick={() => {
              if (parentId === null) return
              const raw = typeof node.data.text === 'string' ? node.data.text : ''
              const items = raw.split('\n').map((s) => s.trim()).filter(Boolean)
              const list = makeElement('list', { items: items.length ? items : ['Item'] })
              const idx = indexInParent(controller, parentId, node.id)
              controller.onCanvasInsertNode(parentId, list, idx)
              controller.onCanvasRemoveNode(node.id)
              select(list.id)
            }}
            className={`${chipCls} w-full`}
          >
            Convert to list
          </button>
        </div>
      ) : null}

      {node.kind === 'heading' || node.kind === 'text' || node.kind === 'list' ? (
        <StyleSettings controller={controller} node={node} />
      ) : null}
    </>
  )
}

function StyleSettings({
  controller,
  node,
}: {
  controller: Controller
  node: Extract<CanvasNode, { kind: ElementKind }>
}) {
  const style = node.style ?? {}
  return (
    <div className={groupCls}>
      <span className={labelCls}>Style</span>
      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          onClick={() =>
            controller.onCanvasUpdateStyle(node.id, {
              fontWeight: style.fontWeight === 700 ? 400 : 700,
            })
          }
          className={style.fontWeight === 700 ? chipActiveCls : chipCls}
        >
          Bold
        </button>
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => controller.onCanvasUpdateStyle(node.id, { align: a })}
            className={style.align === a ? chipActiveCls : chipCls}
          >
            {a}
          </button>
        ))}
      </div>

      <label className={labelCls}>Font size (px)</label>
      <input
        type="number"
        className={`${inputCls} mb-3`}
        value={style.fontSize ?? ''}
        onChange={(e) =>
          controller.onCanvasUpdateStyle(node.id, {
            fontSize: e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
      />

      <label className={labelCls}>Colour</label>
      <input
        type="text"
        placeholder="#404040"
        className={inputCls}
        value={style.color ?? ''}
        onChange={(e) =>
          controller.onCanvasUpdateStyle(node.id, { color: e.target.value || undefined })
        }
      />
    </div>
  )
}

function indexInParent(controller: Controller, parentId: string, id: string): number {
  const root = controller.doc.canvas
  if (!root) return 0
  const parent = findNode(root, parentId)
  if (!parent || !isBox(parent)) return 0
  const i = parent.children.findIndex((c) => c.id === id)
  return i < 0 ? parent.children.length : i
}
