import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ColumnsIcon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LayoutIcon,
  MinusIcon,
  PaletteIcon,
  RefreshCwIcon,
  RowsIcon,
  RulerIcon,
  TagIcon,
  TypeIcon,
  UnderlineIcon,
  UploadIcon,
} from 'lucide-react'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { isBox, makeElement } from '#/lib/canvas/model'
import type { CanvasBox, CanvasElement } from '#/lib/canvas/model'
import { FONT_OPTIONS, isFontChoice } from '#/lib/canvas/fonts'
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
import type { Ctx, Controller, Section } from './section-types'

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

const isStyleable = (n: Ctx['node']) =>
  n.kind === 'heading' || n.kind === 'text' || n.kind === 'list'

function indexInParent(controller: Controller, parentId: string, id: string): number {
  const root = controller.doc.canvas
  if (!root) return 0
  const parent = findNode(root, parentId)
  if (!parent || !isBox(parent)) return 0
  const i = parent.children.findIndex((c) => c.id === id)
  return i < 0 ? parent.children.length : i
}

function LayoutSection({ node, controller }: Ctx) {
  if (!isBox(node)) return null
  const p = node.props
  const display = p.display ?? 'flex'
  const set = (patch: Partial<CanvasBox['props']>) => controller.onCanvasUpdateProps(node.id, patch)
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
          <Toggle active={Boolean(p.wrap)} onClick={() => set({ wrap: !p.wrap })} label="Wrap children" />
        </>
      ) : null}

      {display === 'grid' ? (
        <Field label="Columns">
          <NumberField value={p.gridColumns} min={1} max={12} onChange={(gridColumns) => set({ gridColumns })} />
        </Field>
      ) : null}

      <Field label="Gap (px)">
        <NumberField value={p.gap} onChange={(gap) => set({ gap })} />
      </Field>

      <Field label="Font (cascades to children)">
        <SelectField
          value={p.fontFamily ?? ''}
          onChange={(v) => set({ fontFamily: isFontChoice(v) ? v : undefined })}
          options={FONT_OPTIONS}
        />
      </Field>
    </Group>
  )
}

function SizeSpacingSection({ node, controller }: Ctx) {
  if (!isBox(node)) return null
  const p = node.props
  const set = (patch: Partial<CanvasBox['props']>) => controller.onCanvasUpdateProps(node.id, patch)
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
  const set = (patch: Partial<CanvasBox['props']>) => controller.onCanvasUpdateProps(node.id, patch)
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
    <Group title="Section" icon={TagIcon} defaultOpen={false}>
      <Field label="Name (@-mention label)">
        <TextField
          value={node.name ?? ''}
          placeholder="e.g. Experience"
          onChange={(name) => controller.onCanvasRename(node.id, name || undefined)}
        />
      </Field>
      <Field label="Role (export / ATS)">
        <SelectField
          value={node.role ?? ''}
          onChange={(role) => controller.onCanvasSetRole(node.id, role || undefined)}
          options={ROLE_OPTIONS}
        />
      </Field>
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
      <Field label="Font">
        <SelectField
          value={s.fontFamily ?? ''}
          onChange={(v) => set({ fontFamily: isFontChoice(v) ? v : undefined })}
          options={FONT_OPTIONS}
        />
      </Field>
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
      const next = makeElement('text', { text: items.join('\n') })
      controller.onCanvasInsertNode(parentId, next, idx)
      controller.onCanvasRemoveNode(el.id)
      select(next.id)
    } else {
      const raw = typeof el.data.text === 'string' ? el.data.text : ''
      const items = raw.split('\n').map((s) => s.trim()).filter(Boolean)
      const next = makeElement('list', { items: items.length ? items : ['Item'] })
      controller.onCanvasInsertNode(parentId, next, idx)
      controller.onCanvasRemoveNode(el.id)
      select(next.id)
    }
  }

  return (
    <Group title="Convert" icon={RefreshCwIcon} defaultOpen={false}>
      <Toggle active={false} onClick={convert} icon={RefreshCwIcon} label={el.kind === 'list' ? 'To multiline text' : 'To list'} />
    </Group>
  )
}

/** Order matters — sections render top-to-bottom in the inspector. */
function ImageSection({ node, controller }: Ctx) {
  if (node.kind !== 'image') return null
  const d = node.data as { src?: string; alt?: string; width?: number }
  const set = (patch: Record<string, unknown>) => controller.onCanvasUpdateData(node.id, patch)
  const onFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set({ src: String(reader.result) })
    reader.readAsDataURL(file)
  }
  return (
    <Group title="Image" icon={ImageIcon}>
      {d.src ? (
        <img
          src={d.src}
          alt=""
          className="max-h-28 w-full rounded-md border border-border object-contain"
        />
      ) : null}
      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
        <UploadIcon className="size-3.5" />
        {d.src ? 'Replace image' : 'Upload image'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
      <Field label="Width (px)">
        <NumberField value={d.width} onChange={(width) => set({ width })} />
      </Field>
      <Field label="Alt text">
        <TextField value={d.alt ?? ''} placeholder="describe the image" onChange={(alt) => set({ alt })} />
      </Field>
      <p className="text-[10px] text-muted-foreground">
        Stored on your device (embedded in the file) and exported to PDF.
      </p>
    </Group>
  )
}

export const SECTIONS: Array<Section> = [
  { id: 'layout', appliesTo: isBox, Component: LayoutSection },
  { id: 'size', appliesTo: isBox, Component: SizeSpacingSection },
  { id: 'appearance', appliesTo: isBox, Component: AppearanceSection },
  { id: 'role', appliesTo: isBox, Component: RoleSection },
  { id: 'heading', appliesTo: (n) => n.kind === 'heading', Component: HeadingSection },
  { id: 'separator', appliesTo: (n) => n.kind === 'separator', Component: SeparatorSection },
  { id: 'image', appliesTo: (n) => n.kind === 'image', Component: ImageSection },
  { id: 'typography', appliesTo: isStyleable, Component: TypographySection },
  { id: 'convert', appliesTo: (n) => n.kind === 'list' || n.kind === 'text', Component: ConvertSection },
]
