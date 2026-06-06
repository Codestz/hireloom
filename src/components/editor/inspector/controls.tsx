import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '#/lib/utils.ts'

/**
 * Reusable inspector field controls + a collapsible Group. Every settings section composes
 * these, so visual style stays consistent and adding a new element's settings is a matter of
 * composition (see settings-panel.tsx's section registry), not bespoke markup.
 */

const labelCls = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
const inputCls =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none transition-colors focus:border-primary'

export function Group({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon?: ComponentType<{ className?: string }>
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold"
      >
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDownIcon
          className={cn('size-3.5 text-muted-foreground transition-transform', !open && '-rotate-90')}
        />
      </button>
      {open ? <div className="space-y-3 px-3 pb-3">{children}</div> : null}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  )
}

export function NumberField({
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      placeholder={placeholder}
      className={inputCls}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  )
}

export function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string | undefined) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  )
}

export function ColorField({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  return (
    <div className="flex gap-1.5">
      <input
        type="color"
        aria-label="Colour swatch"
        className="size-8 shrink-0 cursor-pointer rounded-md border border-border bg-background"
        value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#404040'}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        placeholder="#404040"
        className={inputCls}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  )
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <select
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** A row of mutually-exclusive buttons (icon and/or label). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: Array<{
    value: T
    label?: string
    title?: string
    icon?: ComponentType<{ className?: string }>
  }>
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => {
        const active = value === o.value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            title={o.title ?? o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {o.label ? <span>{o.label}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

/** A standalone toggle chip (on/off). */
export function Toggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon?: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </button>
  )
}
