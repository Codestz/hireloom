import { Loader2Icon, SparklesIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { TEXT_ACTIONS, transformTextStream } from '#/lib/ai/service'
import type { TextAction } from '#/lib/ai/service'

/**
 * The ✨ on-device-AI affordance for a single text field (bullet, skill line, summary).
 * Streams the rewrite straight into the field's contentEditable element so you watch it
 * type, then commits the final text via onApply. Reversible via an Undo toast. The host
 * row must carry `data-ai-row` (the field to stream into is its [contenteditable]).
 */
export function AiTextMenu({
  getText,
  onApply,
  triggerClassName,
}: {
  getText: () => string
  onApply: (text: string) => void
  /** Override the trigger button styling (e.g. when hosted in the node chip). */
  triggerClassName?: string
}) {
  const [busy, setBusy] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  async function run(action: TextAction) {
    const before = getText()
    if (!before.trim()) {
      toast.error('Nothing to improve yet.')
      return
    }
    // Only the real editor — NOT the chip's contenteditable="false" span (which would match
    // a bare [contenteditable] selector and come first in DOM, so the stream would land there).
    const el = triggerRef.current
      ?.closest('[data-ai-row]')
      ?.querySelector<HTMLElement>('[contenteditable="true"]')
    setBusy(true)
    const id = toast.loading('Improving on your device…')
    try {
      const final = await transformTextStream(before, action, (partial) => {
        if (el) el.textContent = partial // live "typing" into the field
      })
      onApply(final)
      toast.success('Updated', {
        id,
        action: { label: 'Undo', onClick: () => onApply(before) },
      })
    } catch {
      if (el) el.textContent = before // restore on failure
      toast.error('The AI request failed — check AI settings.', { id })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="AI actions"
          title="AI actions"
          contentEditable={false}
          disabled={busy}
          className={
            triggerClassName ??
            'flex size-4 shrink-0 items-center justify-center rounded text-neutral-300 opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-primary data-[state=open]:text-primary data-[state=open]:opacity-100'
          }
        >
          {busy ? (
            <Loader2Icon className="size-3 animate-spin" />
          ) : (
            <SparklesIcon className="size-3" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {TEXT_ACTIONS.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => run(a.id)}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
