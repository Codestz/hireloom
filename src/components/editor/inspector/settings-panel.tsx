import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ColumnsIcon,
  HeadingIcon,
  ItalicIcon,
  LayoutIcon,
  MinusIcon,
  PaletteIcon,
  RefreshCwIcon,
  RowsIcon,
  RulerIcon,
  TagIcon,
  Trash2Icon,
  TypeIcon,
  UnderlineIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { useBlockDoc } from '#/components/blocks'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { isBox, makeElement } from '#/lib/canvas/model'
import type { CanvasBox, CanvasElement, CanvasNode } from '#/lib/canvas/model'
import { findNode } from '#/lib/canvas/tree-ops'
import {
  ColorField,
  Field,
  Group,
  NumberField,
  Segmented,
  SelectField,
  TextField,
  Toggle,
} from './controls'

type Controller = ReturnType<typeof useBlockDoc>

interface Ctx {
  node: CanvasNode
  controller: Controller
  parentId: string | null
}

/** A settings section: shown when `appliesTo(node)` is true. Add a section → no monolith edit. */
interface Section {
  id: string
  appliesTo: (node: CanvasNode) => boolean
  Component: ComponentType<Ctx>
}

const ROLE_OPTIONS = [
  ['', '— none —'],
  ['header', 'Header'],
  ['summary', 'Summary'],
  ['work', 'Work'],
  ['education', 'Education'],
  ['skills', 'Skills'],
  ['projects', 'Projects'],
  ['certifications', 'Certifications'],
  ['awards', 'Awards'],
  ['publications', 'Publications'],
  ['languages', 'Languages'],
  ['volunteer', 'Volunteer'],
  ['references', 'References'],
  ['custom', 'Custom'],
].map(([value, label]) => ({ value, label }))

const SEPARATOR_OPTIONS = ['dot', 'bullet', 'dash', 'line', 'slash', 'pipe'].map((v) => ({
  value: v,
  label: v,
}))

const isStyleable = (n: CanvasNode) =>
  n.kind === 'heading' || n.kind === 'text' || n.kind === 'list'

function indexInParent(controller: Controller, parentId: string, id: string): number {
  const root = controller.doc.canvas
  if (!root) return 0
  const parent = findNode(root, parentId)
  if (!parent || !isBox(parent)) return 0
  const i = parent.children.findIndex((c) => c.id === id)
  return i < 0 ? parent.children.length : i
}

// ── Sections ────────────────────────────────────────────────────────────────────────────

function LayoutSection({ node, controller }: Ctx) {
  if (!isBox(node)) return null
  const p = node.props
  const display = p.display ?? 'flex'
  const set = (patch: Partial<CanvasBox['props']>) =>
    controller.onCanvasUpdateProps(node.id, patch)
  return (
    <Group title="Layout" icon={LayoutIcon}>
      <Field label="Display">
        <Segmented
          value={display}
          onChange={(v) => set({ display: v })}
          options={[
            { value: 'flex', label: 'Flex' },
            { value: 'grid', label: 'Grid' },
            { value: 'block', label: 'Block' },
          ]}
        />
      </Field>

      {display === 'flex' ? (
        <>
          <Field label="Direction">
            <Segmented
              value={p.direction ?? 'column'}
              onChange={(v) => set({ direction: v })}
              options={[
                { value: 'column', label: 'Column', icon: RowsIcon },
                { value: 'row', label: 'Row', icon: ColumnsIcon },
              ]}
            />
          </Field>
          <Field label="Align (cross axis)">
            <Segmented
              value={p.align ?? 'stretch'}
              onChange={(v) => set({ align: v })}
              options={[
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' },
                { value: 'stretch', label: 'Stretch' },
              ]}
            />
          </Field>
          <Field label="Justify (main axis)">
            <SelectField
              value={p.justify ?? 'start'}
              onChange={(v) => set({ justify: v })}
              options={[
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' },
                { value: 'between', label: 'Space between' },
                { value: 'around', label: 'Space around' },
              ]}
            />
          </Field>
          <Toggle
            active={Boolean(p.wrap)}
            onClick={() => set({ wrap: !p.wrap })}
            label="Wrap children"
          />
        </>
      ) : null}

      {display === 'grid' ? (
        <Field label="Columns">
          <NumberField
            value={p.gridColumns}
            min={1}
            max={12}
            onChange={(gridColumns) => set({ gridColumns })}
          />
        </Field>
      ) : null}

      <Field label="Gap (px)">
        <NumberField value={p.gap} onChange={(gap) => set({ gap })} />
      </Field>
    </Group>
  )
}

function SizeSpacingSection({ node, controller }: Ctx) {
  if (!isBox(node)) return null
  const p = node.props
  const set = (patch: Partial<CanvasBox['props']>) =>
    controller.onCanvasUpdateProps(node.id, patch)
  return (
    <Group title="Size & spacing" icon={RulerIcon} defaultOpen={false}>
      <Field label="Width (span /12, inside a row)">
        <NumberField value={p.span} min={1} max={12} onChange={(span) => set({ span })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Padding (px)">
          <NumberField value={p.pad} onChange={(pad) => set({ pad })} />
        </Field>
        <Field label="Margin (px)">
          <NumberField value={p.margin} onChange={(margin) => set({ margin })} />
        </Field>
      </div>
    </Group>
  )
}

function AppearanceSection({ node, controller }: Ctx) {
  if (!isBox(node)) return null
  const p = node.props
  const set = (patch: Partial<CanvasBox['props']>) =>
    controller.onCanvasUpdateProps(node.id, patch)
  return (
    <Group title="Appearance" icon={PaletteIcon} defaultOpen={false}>
      <Field label="Background">
        <ColorField value={p.bg} onChange={(bg) => set({ bg })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Border (CSS)">
          <TextField value={p.border ?? ''} placeholder="1px solid #ddd" onChange={(border) => set({ border })} />
        </Field>
        <Field label="Radius (px)">
          <NumberField value={p.radius} onChange={(radius) => set({ radius })} />
        </Field>
      </div>
    </Group>
  )
}

function RoleSection({ node, controller }: Ctx) {
  if (!isBox(node)) return null
  return (
    <Group title="Role (export / ATS)" icon={TagIcon} defaultOpen={false}>
      <SelectField
        value={node.role ?? ''}
        onChange={(role) => controller.onCanvasSetRole(node.id, role || undefined)}
        options={ROLE_OPTIONS}
      />
    </Group>
  )
}

function HeadingSection({ node, controller }: Ctx) {
  if (node.kind !== 'heading') return null
  const level = node.data.level === 1 ? '1' : node.data.level === 3 ? '3' : '2'
  return (
    <Group title="Heading" icon={HeadingIcon}>
      <Field label="Level">
        <Segmented
          value={level}
          onChange={(v) => controller.onCanvasUpdateData(node.id, { level: Number(v) })}
          options={[
            { value: '1', label: 'H1' },
            { value: '2', label: 'H2' },
            { value: '3', label: 'H3' },
          ]}
        />
      </Field>
    </Group>
  )
}

function SeparatorSection({ node, controller }: Ctx) {
  if (node.kind !== 'separator') return null
  const variant = typeof node.data.variant === 'string' ? node.data.variant : 'dot'
  return (
    <Group title="Separator" icon={MinusIcon}>
      <Field label="Style">
        <SelectField
          value={variant}
          onChange={(v) => controller.onCanvasUpdateData(node.id, { variant: v })}
          options={SEPARATOR_OPTIONS}
        />
      </Field>
    </Group>
  )
}

function TypographySection({ node, controller }: Ctx) {
  if (!isStyleable(node)) return null
  const el = node as CanvasElement
  const s = el.style ?? {}
  const set = (patch: CanvasElement['style']) => controller.onCanvasUpdateStyle(el.id, patch)
  return (
    <Group title="Typography" icon={TypeIcon}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size (px)">
          <NumberField value={s.fontSize} onChange={(fontSize) => set({ fontSize })} />
        </Field>
        <Field label="Weight">
          <SelectField
            value={String(s.fontWeight ?? 400)}
            onChange={(v) => set({ fontWeight: Number(v) })}
            options={[
              { value: '400', label: 'Regular' },
              { value: '500', label: 'Medium' },
              { value: '600', label: 'Semibold' },
              { value: '700', label: 'Bold' },
            ]}
          />
        </Field>
      </div>
      <Field label="Style">
        <div className="flex gap-1">
          <Toggle active={Boolean(s.italic)} onClick={() => set({ italic: !s.italic })} icon={ItalicIcon} label="Italic" />
          <Toggle active={Boolean(s.underline)} onClick={() => set({ underline: !s.underline })} icon={UnderlineIcon} label="Underline" />
          <Toggle active={s.fontWeight === 700} onClick={() => set({ fontWeight: s.fontWeight === 700 ? 400 : 700 })} icon={BoldIcon} label="Bold" />
        </div>
      </Field>
      <Field label="Align">
        <Segmented
          value={s.align ?? 'left'}
          onChange={(align) => set({ align })}
          options={[
            { value: 'left', title: 'Left', icon: AlignLeftIcon },
            { value: 'center', title: 'Center', icon: AlignCenterIcon },
            { value: 'right', title: 'Right', icon: AlignRightIcon },
          ]}
        />
      </Field>
      <Field label="Colour">
        <ColorField value={s.color} onChange={(color) => set({ color })} />
      </Field>
    </Group>
  )
}

function ConvertSection({ node, controller, parentId }: Ctx) {
  const { select } = useCanvasSelection()
  if (node.kind !== 'list' && node.kind !== 'text') return null
  if (parentId === null) return null
  const el = node

  const convert = () => {
    const idx = indexInParent(controller, parentId, el.id)
    if (el.kind === 'list') {
      const items = Array.isArray(el.data.items)
        ? el.data.items.filter((x): x is string => typeof x === 'string')
        : []
      const text = makeElement('text', { text: items.join('\n') })
      controller.onCanvasInsertNode(parentId, text, idx)
      controller.onCanvasRemoveNode(el.id)
      select(text.id)
    } else {
      const raw = typeof el.data.text === 'string' ? el.data.text : ''
      const items = raw.split('\n').map((s) => s.trim()).filter(Boolean)
      const list = makeElement('list', { items: items.length ? items : ['Item'] })
      controller.onCanvasInsertNode(parentId, list, idx)
      controller.onCanvasRemoveNode(el.id)
      select(list.id)
    }
  }

  return (
    <Group title="Convert" icon={RefreshCwIcon} defaultOpen={false}>
      <Toggle
        active={false}
        onClick={convert}
        icon={RefreshCwIcon}
        label={el.kind === 'list' ? 'To multiline text' : 'To list'}
      />
    </Group>
  )
}

const SECTIONS: Array<Section> = [
  { id: 'layout', appliesTo: isBox, Component: LayoutSection },
  { id: 'size', appliesTo: isBox, Component: SizeSpacingSection },
  { id: 'appearance', appliesTo: isBox, Component: AppearanceSection },
  { id: 'role', appliesTo: isBox, Component: RoleSection },
  { id: 'heading', appliesTo: (n) => n.kind === 'heading', Component: HeadingSection },
  { id: 'separator', appliesTo: (n) => n.kind === 'separator', Component: SeparatorSection },
  { id: 'typography', appliesTo: isStyleable, Component: TypographySection },
  { id: 'convert', appliesTo: (n) => n.kind === 'list' || n.kind === 'text', Component: ConvertSection },
]

const KIND_LABEL: Record<string, string> = {
  box: 'Box',
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

export function SettingsPanel({ controller }: { controller: Controller }) {
  const { selectedId, select } = useCanvasSelection()
  const root = controller.doc.canvas
  if (!root) return null
  const node = selectedId ? findNode(root, selectedId) : null
  if (!node) {
    return (
      <p className="px-3 py-4 text-xs text-muted-foreground">
        Select a node on the canvas to edit it.
      </p>
    )
  }
  const parentId = parentOf(root, node.id)
  const isRoot = node.id === root.id
  const sections = SECTIONS.filter((s) => s.appliesTo(node))

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <span
          className="inline-block size-2 rounded-full"
          style={{ background: isBox(node) ? '#0d9488' : '#6366f1' }}
        />
        <span className="text-xs font-semibold">{KIND_LABEL[node.kind] ?? node.kind}</span>
      </div>

      {sections.map((s) => (
        <s.Component key={s.id} node={node} controller={controller} parentId={parentId} />
      ))}

      {!isRoot ? (
        <div className="px-3 py-3">
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

function parentOf(root: CanvasBox, id: string): string | null {
  for (const child of root.children) {
    if (child.id === id) return root.id
    if (isBox(child)) {
      const hit = parentOf(child, id)
      if (hit) return hit
    }
  }
  return null
}
