import { ColumnsIcon, LayoutIcon, PaletteIcon, RowsIcon, RulerIcon, TagIcon } from 'lucide-react'
import { isBox } from '#/lib/canvas/model'
import type { CanvasBox } from '#/lib/canvas/model'
import { FONT_OPTIONS, isFontChoice } from '#/lib/canvas/fonts'
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
import { ROLE_OPTIONS } from './section-helpers'

/** Inspector sections for Box (container) nodes: layout, size/spacing, appearance, section role. */

export function LayoutSection({ node, controller }: Ctx) {
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

export function SizeSpacingSection({ node, controller }: Ctx) {
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

export function AppearanceSection({ node, controller }: Ctx) {
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

export function RoleSection({ node, controller }: Ctx) {
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
