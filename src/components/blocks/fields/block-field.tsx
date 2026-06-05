import { useContext, useState } from 'react'
import type { CSSProperties } from 'react'
import type { FieldDef } from '#/lib/blocks'
import { AiEnabledContext } from '#/components/blocks/ai/ai-context'
import { AiTextMenu } from '#/components/blocks/ai/ai-text-menu'
import { EditableText } from '#/components/blocks/fields/editable-text'
import {
  AddButton,
  RemoveButton,
} from '#/components/blocks/fields/field-controls'
import { Taglist } from '#/components/blocks/fields/taglist'
import type { TagStyle } from '#/components/blocks/fields/field-types'

export interface BlockFieldProps {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
  style?: CSSProperties
  tagStyle?: TagStyle
  accent?: string
}

/**
 * The one generic renderer that turns a field `kind` into an in-place editable control.
 * Every block reuses it; a new field kind is one more case here. `tagStyle` lets a design
 * variant render a taglist as inline / pills / list without changing the data.
 */
export function BlockField({
  field,
  value,
  onChange,
  style,
  tagStyle = 'inline',
  accent = '#2f6b4f',
}: BlockFieldProps) {
  const aiEnabled = useContext(AiEnabledContext)
  // Bumped on an AI apply to remount the (uncontrolled) editors with the new text.
  const [aiRev, setAiRev] = useState(0)

  if (
    field.kind === 'text' ||
    field.kind === 'longtext' ||
    field.kind === 'link'
  ) {
    // longtext is a block so its focus ring is a single box, not one per wrapped line.
    const blockStyle =
      field.kind === 'longtext'
        ? ({ display: 'block', ...style } as CSSProperties)
        : style
    return (
      <EditableText
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={onChange}
        style={blockStyle}
        dataField={field.key}
      />
    )
  }

  if (field.kind === 'daterange') {
    const p = (value as { start: string; end: string } | undefined) ?? {
      start: '',
      end: '',
    }
    return (
      <span style={style} data-field={field.key}>
        <EditableText
          value={p.start}
          placeholder="2023"
          onChange={(t) => onChange({ ...p, start: t })}
          dataPart="start"
        />
        <span> – </span>
        <EditableText
          value={p.end}
          placeholder="Present"
          onChange={(t) => onChange({ ...p, end: t })}
          dataPart="end"
        />
      </span>
    )
  }

  if (field.kind === 'taglist') {
    return (
      <Taglist
        items={(value as Array<string> | undefined) ?? []}
        onChange={onChange}
        style={style}
        tagStyle={tagStyle}
        accent={accent}
        dataField={field.key}
      />
    )
  }

  // list — bulleted achievements with per-row AI actions
  const items = (value as Array<string> | undefined) ?? []
  const setItem = (i: number, text: string) =>
    onChange(items.map((it, j) => (j === i ? text : it)))
  const removeItem = (i: number) => onChange(items.filter((_, j) => j !== i))
  return (
    <div data-field={field.key}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {items.map((it, i) => (
          <li
            key={`${i}-${aiRev}`}
            data-bullet
            data-ai-row
            className="group/row flex items-baseline gap-1.5"
          >
            <span aria-hidden>•</span>
            <EditableText
              value={it}
              placeholder="Describe an achievement…"
              onChange={(t) => setItem(i, t)}
              className="flex-1"
            />
            {aiEnabled ? (
              <AiTextMenu
                getText={() => items[i] ?? ''}
                onApply={(t) => {
                  setItem(i, t)
                  setAiRev((r) => r + 1)
                }}
              />
            ) : null}
            <RemoveButton label="Remove point" onClick={() => removeItem(i)} />
          </li>
        ))}
      </ul>
      <AddButton
        label="Add"
        onClick={() => onChange([...items, ''])}
        className="mt-1 ml-4"
      />
    </div>
  )
}
