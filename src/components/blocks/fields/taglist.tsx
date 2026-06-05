import { useContext, useState } from 'react'
import type { CSSProperties } from 'react'
import { AiEnabledContext } from '#/components/blocks/ai/ai-context'
import { AiTextMenu } from '#/components/blocks/ai/ai-text-menu'
import { EditableText } from '#/components/blocks/fields/editable-text'
import {
  AddButton,
  RemoveButton,
} from '#/components/blocks/fields/field-controls'
import type { TagStyle } from '#/components/blocks/fields/field-types'

export interface TaglistProps {
  items: Array<string>
  onChange: (next: Array<string>) => void
  style?: CSSProperties
  tagStyle: TagStyle
  accent: string
  dataField?: string
}

/**
 * An editable list of short strings rendered per the chosen `tagStyle` — a flowing inline
 * run, soft pills, or a bulleted list (the list form gets per-row AI actions). The data is
 * always `string[]`; only presentation changes.
 */
export function Taglist({
  items,
  onChange,
  style,
  tagStyle,
  accent,
  dataField,
}: TaglistProps) {
  const aiEnabled = useContext(AiEnabledContext)
  const [aiRev, setAiRev] = useState(0)
  const setItem = (i: number, text: string) =>
    onChange(items.map((it, j) => (j === i ? text : it)))
  const removeItem = (i: number) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, ''])

  if (tagStyle === 'inline') {
    return (
      <span style={style} data-field={dataField}>
        {items.map((it, i) => (
          <span key={i} className="group/row">
            {i > 0 ? <span style={{ color: '#a3a3a3' }}> · </span> : null}
            <EditableText
              value={it}
              placeholder="Skill"
              onChange={(t) => setItem(i, t)}
            />
            <RemoveButton onClick={() => removeItem(i)} />
          </span>
        ))}
        <AddButton
          label="Add"
          onClick={add}
          className="ml-1.5 align-baseline"
        />
      </span>
    )
  }

  if (tagStyle === 'list') {
    return (
      <ul
        data-field={dataField}
        style={{ margin: 0, paddingLeft: 14, ...style }}
      >
        {items.map((it, i) => (
          <li
            key={`${i}-${aiRev}`}
            data-ai-row
            className="group/row flex items-baseline gap-1.5"
            style={{ marginBottom: 2 }}
          >
            <span aria-hidden style={{ color: accent }}>
              •
            </span>
            <EditableText
              value={it}
              placeholder="Skill"
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
            <RemoveButton onClick={() => removeItem(i)} />
          </li>
        ))}
        <li style={{ listStyle: 'none' }}>
          <AddButton label="Add" onClick={add} />
        </li>
      </ul>
    )
  }

  // pills (default) — soft filled, no borders; flows to fill the width
  return (
    <span
      data-field={dataField}
      style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, ...style }}
    >
      {items.map((it, i) => (
        <span
          key={i}
          className="group/row inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
          style={{ backgroundColor: `${accent}14`, color: '#404040' }}
        >
          <EditableText
            value={it}
            placeholder="Skill"
            onChange={(t) => setItem(i, t)}
          />
          <RemoveButton onClick={() => removeItem(i)} />
        </span>
      ))}
      <AddButton label="Add" onClick={add} />
    </span>
  )
}
