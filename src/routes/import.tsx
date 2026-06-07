import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FileJsonIcon,
  FileTextIcon,
  LinkedinIcon,
  Loader2Icon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ThemeToggle } from '#/components/app/theme-toggle'
import { Button } from '#/components/ui/button'
import { ScaledCanvasPreview } from '#/components/blocks/canvas-tree/scaled-canvas-preview'
import { aiActionsAvailable } from '#/lib/ai/service'
import { engineLabel } from '#/lib/ai/engine'
import { decompose } from '#/lib/canvas/decompose'
import { resumeToDoc } from '#/lib/blocks/json-resume'
import { createResume, resumeKeys } from '#/lib/db'
import { parseResumeJson } from '#/lib/resume'
import type { Resume } from '#/lib/resume'
import { resolveTokens } from '#/lib/templates'
import { TEMPLATES, templateTokens } from '#/lib/templates/presets'
import { cn } from '#/lib/utils.ts'

export const Route = createFileRoute('/import')({ component: ImportPage })

type Progress = { stage: 'extract' | 'structure'; chars: number } | null

function ImportPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [canAi, setCanAi] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<Progress>(null)
  const [parsed, setParsed] = useState<Resume | null>(null)
  const [choice, setChoice] = useState('ats-safe')
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    void aiActionsAvailable().then(setCanAi)
  }, [])

  // Live previews of the USER's parsed content in each template layout.
  const previews = useMemo(() => {
    if (!parsed) return []
    const doc = resumeToDoc(parsed)
    return TEMPLATES.map((t) => {
      const tokens = resolveTokens(templateTokens(t.id))
      return { t, tokens, root: decompose(doc, tokens) }
    })
  }, [parsed])

  async function handleAiPdf(file: File) {
    if (!canAi) {
      toast.error('AI import needs an AI engine — enable Chrome’s on-device AI or add a Gemini key.')
      return
    }
    setBusy(true)
    setProgress({ stage: 'extract', chars: 0 })
    try {
      const { extractPdfText } = await import('#/lib/import/pdf-text')
      const text = await extractPdfText(await file.arrayBuffer())
      if (text.trim().length < 40) {
        toast.error('Couldn’t read text from that PDF — is it a scan/image?')
        return
      }
      setProgress({ stage: 'structure', chars: 0 })
      const { aiImportResume } = await import('#/lib/import/ai-import')
      const resume = await aiImportResume(text, (chars) => setProgress({ stage: 'structure', chars }))
      setParsed(resume)
    } catch {
      toast.error('Could not import that PDF.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function handleLinkedIn(file: File) {
    setBusy(true)
    const id = toast.loading('Reading LinkedIn PDF…')
    try {
      const { extractLinkedInColumns } = await import('#/lib/import/pdf-text')
      const { parseLinkedInResume } = await import('#/lib/import/linkedin')
      setParsed(parseLinkedInResume(await extractLinkedInColumns(await file.arrayBuffer())))
      toast.success('Imported from LinkedIn', { id })
    } catch {
      toast.error('Could not read that PDF. Use LinkedIn → More → Save to PDF.', { id })
    } finally {
      setBusy(false)
    }
  }

  async function handleJson(file: File) {
    setBusy(true)
    try {
      const result = parseResumeJson(await file.text())
      if (!result.ok) {
        toast.error(`Invalid JSON Resume — ${result.error}`)
        return
      }
      setParsed(result.resume)
    } finally {
      setBusy(false)
    }
  }

  async function openInEditor() {
    if (!parsed || opening) return
    setOpening(true)
    await createResume({
      title: 'Imported resume',
      data: parsed,
      tokens: templateTokens(choice),
      templateId: choice,
    })
    await qc.invalidateQueries({ queryKey: resumeKeys.all })
    await navigate({ to: '/editor' })
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="font-serif text-xl font-medium tracking-tight">
          Hire<span className="text-primary">loom</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-20">
        {progress ? (
          <ImportProgress stage={progress.stage} chars={progress.chars} />
        ) : !parsed ? (
          <UploadStep canAi={canAi} busy={busy} onAiPdf={handleAiPdf} onLinkedIn={handleLinkedIn} onJson={handleJson} />
        ) : (
          <PreviewStep
            previews={previews}
            choice={choice}
            onChoose={setChoice}
            onBack={() => setParsed(null)}
            onOpen={() => void openInEditor()}
            opening={opening}
          />
        )}
      </main>
    </div>
  )
}

function UploadStep({
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

interface Preview {
  t: (typeof TEMPLATES)[number]
  tokens: ReturnType<typeof resolveTokens>
  root: ReturnType<typeof decompose>
}

function PreviewStep({
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
        {/* Big live preview of the selected layout */}
        <div className="flex justify-center">
          <div className="relative aspect-[8.5/11] w-full max-w-[520px] overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <ScaledCanvasPreview root={selected.root} tokens={selected.tokens} width={520} />
          </div>
        </div>

        {/* Layout chooser + CTA */}
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

function ImportProgress({ stage, chars }: { stage: 'extract' | 'structure'; chars: number }) {
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
