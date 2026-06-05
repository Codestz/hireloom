import { SparklesIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { TEXT_ACTIONS } from '#/lib/ai/service'
import type { TextAction } from '#/lib/ai/service'

/**
 * Section-level ✨ menu: applies one tone/length action (improve, shorten, expand, more
 * formal/confident, fix grammar) to every bullet in the section at once — the same
 * transforms the per-line inline menu offers, fanned across the whole section. The rewrite
 * itself (and its single Undo) lives in the controller's `onImproveSection`.
 */
export function SectionAiMenu({
  onImprove,
}: {
  onImprove: (action: TextAction) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Improve section with AI"
          title="Improve the whole section with AI"
          contentEditable={false}
          className="flex size-5 items-center justify-center rounded text-neutral-400 outline-none transition-colors hover:bg-neutral-800 hover:text-primary data-[state=open]:text-primary"
        >
          <SparklesIcon className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {TEXT_ACTIONS.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => onImprove(a.id)}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
