import { CheckIcon, PaletteIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { ResolvedTokens } from '#/lib/templates'
import { cn } from '#/lib/utils.ts'
import { getSectionType } from '#/components/blocks/registry/section-registry'

/**
 * Design picker — a swatch on the section heading that opens a gallery of the section
 * type's design variants, each a live, scaled, non-interactive preview rendered with
 * the section's real data. Picking one swaps the layout; the data is untouched.
 */
export function DesignPicker({
  type,
  variantId,
  sampleData,
  tokens,
  onSelect,
}: {
  type: string
  variantId?: string
  sampleData: Record<string, unknown>
  tokens: ResolvedTokens
  onSelect: (variantId: string) => void
}) {
  const st = getSectionType(type)
  if (!st || st.variants.length < 2) return null
  const current = variantId ?? st.variants[0].id
  const noop = () => undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change design"
        title="Change design"
        className="flex size-5 items-center justify-center rounded text-neutral-400 outline-none transition-colors hover:bg-neutral-800 hover:text-white data-[state=open]:bg-neutral-800 data-[state=open]:text-white"
      >
        <PaletteIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <p className="px-1 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {st.heading} design
        </p>
        <div className="flex flex-col gap-1.5">
          {st.variants.map((v) => {
            const selected = v.id === current
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                className={cn(
                  'rounded-lg border p-2 text-left transition-colors',
                  selected
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {v.label}
                  </span>
                  {selected ? (
                    <CheckIcon className="size-3.5 text-primary" />
                  ) : null}
                </div>
                <div className="h-16 overflow-hidden rounded-md bg-white p-2 ring-1 ring-border/60">
                  <div
                    className="pointer-events-none origin-top-left select-none text-neutral-900"
                    style={{ zoom: 0.5, width: '200%' }}
                  >
                    <v.Layout
                      data={sampleData}
                      tokens={tokens}
                      onChange={noop}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
