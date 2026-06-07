import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  MinusIcon,
  RefreshCwIcon,
  TypeIcon,
  UnderlineIcon,
  UploadIcon,
} from 'lucide-react'
import { makeElement } from '#/lib/canvas/model'
import type { CanvasElement } from '#/lib/canvas/model'
import { FONT_OPTIONS, isFontChoice } from '#/lib/canvas/fonts'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
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
import type { Ctx } from './section-types'
import { SEPARATOR_OPTIONS, indexInParent, isStyleable } from './section-helpers'

/** Inspector sections for leaf (element) nodes: heading, separator, typography, convert, image. */

export function HeadingSection({ node, controller }: Ctx) {
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

export function SeparatorSection({ node, controller }: Ctx) {
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

export function TypographySection({ node, controller }: Ctx) {
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
          {/* Bundled fonts ship only normal + bold faces, so intermediate weights wouldn't render
              in the PDF — offer just the two that stay WYSIWYG. */}
          <SelectField
            value={(s.fontWeight ?? 400) >= 600 ? '700' : '400'}
            onChange={(v) => set({ fontWeight: Number(v) })}
            options={[
              { value: '400', label: 'Regular' },
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

export function ConvertSection({ node, controller, parentId }: Ctx) {
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

export function ImageSection({ node, controller }: Ctx) {
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
