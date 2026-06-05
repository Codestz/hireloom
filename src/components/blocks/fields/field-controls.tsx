import { PlusIcon, XIcon } from 'lucide-react'
import { cn } from '#/lib/utils.ts'

/** The one "Add" affordance — every add control (sections, tags, bullets) uses this. */
export function AddButton({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      contentEditable={false}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-neutral-400 transition-colors hover:text-primary',
        className,
      )}
    >
      <PlusIcon className="size-2.5" />
      {label}
    </button>
  )
}

/** The hover-revealed "remove" affordance for an editable row (reveals on `group/row`). */
export function RemoveButton({
  onClick,
  label = 'Remove',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      contentEditable={false}
      onClick={onClick}
      className="flex size-4 shrink-0 items-center justify-center rounded text-neutral-300 opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-destructive"
    >
      <XIcon className="size-3" />
    </button>
  )
}
