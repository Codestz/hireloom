import { CheckIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { TEMPLATES } from '#/lib/templates/presets'
import type {
  FontOption,
  HeaderVariant,
  ThemeTokens,
} from '#/lib/templates/tokens'
import { cn } from '#/lib/utils.ts'

/**
 * Design panel (E5) — lives in the rail so the editor feels "filled". Live controls
 * for the resume's tokens: template, accent, font, density. Mutations flow up to the
 * workspace, which persists to the record and re-renders the canvas.
 */

const ACCENTS = [
  '#2f6b4f',
  '#0f766e',
  '#1d4ed8',
  '#7c3aed',
  '#be123c',
  '#b45309',
  '#334155',
  '#171717',
]

const DENSITIES: ReadonlyArray<readonly [string, number]> = [
  ['compact', 0.85],
  ['normal', 1],
  ['relaxed', 1.15],
]

function PanelField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

export function DesignPanel({
  tokens,
  activeTemplate,
  onChange,
  onApplyTemplate,
}: {
  tokens: ThemeTokens
  activeTemplate?: string
  onChange: (next: ThemeTokens) => void
  onApplyTemplate: (id: string) => void
}) {
  const densityKey =
    tokens.density <= 0.95
      ? 'compact'
      : tokens.density >= 1.05
        ? 'relaxed'
        : 'normal'

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <PanelField label="Template">
        <div className="flex flex-col gap-1.5">
          {TEMPLATES.map((tpl) => {
            const active = tpl.id === activeTemplate
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onApplyTemplate(tpl.id)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40 hover:bg-background',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {tpl.label}
                  </span>
                  {active ? (
                    <CheckIcon className="size-3.5 text-primary" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tpl.description}
                </p>
              </button>
            )
          })}
        </div>
      </PanelField>

      <PanelField label="Accent">
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((c) => {
            const active = tokens.accent.toLowerCase() === c.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                aria-pressed={active}
                onClick={() => onChange({ ...tokens, accent: c })}
                className={cn(
                  'flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition',
                  active
                    ? 'ring-2 ring-foreground'
                    : 'ring-1 ring-border hover:ring-foreground/40',
                )}
                style={{ backgroundColor: c }}
              >
                {active ? <CheckIcon className="size-3.5 text-white" /> : null}
              </button>
            )
          })}
        </div>
      </PanelField>

      <PanelField label="Font">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={tokens.fontBody}
          onValueChange={(v) =>
            v &&
            onChange({
              ...tokens,
              fontBody: v as FontOption,
              fontHeading: v as FontOption,
            })
          }
          className="justify-start"
        >
          <ToggleGroupItem value="sans">Sans</ToggleGroupItem>
          <ToggleGroupItem value="serif">Serif</ToggleGroupItem>
          <ToggleGroupItem value="mono">Mono</ToggleGroupItem>
        </ToggleGroup>
      </PanelField>

      <PanelField label="Density">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={densityKey}
          onValueChange={(v) => {
            if (!v) return
            const d = DENSITIES.find(([k]) => k === v)?.[1] ?? 1
            onChange({ ...tokens, density: d })
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
          <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
          <ToggleGroupItem value="relaxed">Relaxed</ToggleGroupItem>
        </ToggleGroup>
      </PanelField>

      <PanelField label="Header">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={tokens.headerVariant ?? 'standard'}
          onValueChange={(v) =>
            v && onChange({ ...tokens, headerVariant: v as HeaderVariant })
          }
          className="justify-start"
        >
          <ToggleGroupItem value="standard">Standard</ToggleGroupItem>
          <ToggleGroupItem value="centered">Centered</ToggleGroupItem>
          <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
        </ToggleGroup>
      </PanelField>
    </div>
  )
}
