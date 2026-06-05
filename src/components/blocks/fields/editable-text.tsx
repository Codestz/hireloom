import { useState } from 'react'
import type { CSSProperties } from 'react'

export interface EditableTextProps {
  value: string
  placeholder?: string
  onChange: (text: string) => void
  style?: CSSProperties
  className?: string
  dataField?: string
  dataPart?: string
}

/**
 * Inline contentEditable text — the editor's atomic input. Uncontrolled: the initial value
 * is captured once so the caret never jumps mid-edit; the parent re-keys the card after
 * structural / AI changes to re-sync. (`textContent` is always a string for an element.)
 */
export function EditableText({
  value,
  placeholder,
  onChange,
  style,
  className,
  dataField,
  dataPart,
}: EditableTextProps) {
  const [initial] = useState(value)
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      data-placeholder={placeholder}
      data-field={dataField}
      data-part={dataPart}
      className={className}
      style={{ outline: 'none', cursor: 'text', ...style }}
      onInput={(e) => onChange(e.currentTarget.textContent)}
      onBlur={(e) => onChange(e.currentTarget.textContent)}
    >
      {initial}
    </span>
  )
}
