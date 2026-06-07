import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FileJsonIcon,
  FileTextIcon,
  LinkedinIcon,
  Loader2Icon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { ScaledCanvasPreview } from '#/components/blocks/canvas-tree/scaled-canvas-preview'
import { engineLabel } from '#/lib/ai/engine'
import type { CanvasBox } from '#/lib/canvas/model'
import type { ResolvedTokens } from '#/lib/templates'
import type { Template } from '#/lib/templates/presets'
import { cn } from '#/lib/utils.ts'

/** A parsed resume rendered in one template's layout — one option in the layout chooser. */
export interface Preview {
  t: Template
  tokens: ResolvedTokens
  root: CanvasBox
}

/** Step 1 — choose a source file. */
export function UploadStep({
  canAi,
  busy,
  onAiPdf,
  onLinkedIn,
  onJson,
}: {
  canAi: boolean
  busy: boolean
  onAiPdf: (f: File) => void
  onLinkedIn: (f: File) => void
  onJson: (f: File) => void
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Import your resume</h1>
        <p className="max-w-md text-pretty text-muted-foreground">
          Bring in an existing resume — everything is parsed in your browser, nothing is uploaded.
          You’ll preview the result and pick a layout next.
        </p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-3">
        <DropCard accept="application/pdf" label="Any resume PDF" hint={canAi ? 'Structured by AI' : 'Needs an AI engine'} icon={FileTextIcon} busy={busy} onPick={onAiPdf} />
        <DropCard accept="application/pdf" label="LinkedIn PDF" hint="More → Save to PDF" icon={LinkedinIcon} busy={busy} onPick={onLinkedIn} />
        <DropCard accept="application/json,.json" label="JSON Resume" hint="jsonresume.org" icon={FileJsonIcon} busy={busy} onPick={onJson} />
      </div>
      <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← Back to home
      </Link>
    </div>
  )
}

function DropCard({
  accept,
  label,
  hint,
  icon: Icon,
  busy,
  onPick,
}: {
  accept: string
  label: string
  hint: string
  icon: typeof LinkedinIcon
  busy: boolean
  onPick: (file: File) => void
}) {
  return (
    <label
      className={cn(
        'group flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/50 hover:shadow-md',
        busy && 'pointer-events-none opacity-60',
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        {busy ? <Loader2Icon className="size-5 animate-spin" /> : <Icon className="size-5" />}
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
    </label>
  )
}

/** Step 2 — preview the parsed resume and pick a layout. */
export function PreviewStep({
  previews,
  choice,
  onChoose,
  onBack,
  onOpen,
  opening,
}: {
  previews: Array<Preview>
  choice: string
  onChoose: (id: string) => void
  onBack: () => void
  onOpen: () => void
  opening: boolean
}) {
  const selected = previews.find((p) => p.t.id === choice) ?? previews[0]
  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Import a different file
        </button>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Looks good — pick a layout</h1>
        <p className="text-sm text-muted-foreground">
          Here’s your resume. Choose a starting layout (you can change everything in the editor).
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex justify-center">
          <div className="relative aspect-[8.5/11] w-full max-w-[520px] overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <ScaledCanvasPreview root={selected.root} tokens={selected.tokens} width={520} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Layouts</p>
          {previews.map(({ t }) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChoose(t.id)}
              className={cn(
                'flex items-start justify-between gap-2 rounded-lg border p-3 text-left transition-colors',
                t.id === choice
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-accent',
              )}
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-[11px] leading-snug text-muted-foreground">{t.description}</span>
              </span>
              {t.id === choice ? <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
            </button>
          ))}
          <Button size="lg" className="mt-1" onClick={onOpen} disabled={opening}>
            {opening ? <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" /> : null}
            {opening ? 'Opening…' : 'Open in editor'}
            {!opening ? <ArrowRightIcon data-icon="inline-end" /> : null}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Parsing progress (PDF extract / AI structure). */
export function ImportProgress({ stage, chars }: { stage: 'extract' | 'structure'; chars: number }) {
  const pct = stage === 'extract' ? 8 : Math.min(95, 12 + (chars / 1500) * 83)
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 py-24">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2Icon className="size-4 animate-spin text-primary" />
        {stage === 'extract' ? 'Reading the PDF…' : `Structuring with ${engineLabel()}…`}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {stage === 'structure'
          ? `Building your resume — ${chars} characters so far. On-device can take a minute.`
          : 'Extracting text in your browser — nothing is uploaded.'}
      </p>
    </div>
  )
}
