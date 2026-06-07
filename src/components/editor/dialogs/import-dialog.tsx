import {
  FileJsonIcon,
  FileTextIcon,
  LinkedinIcon,
  Loader2Icon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { aiActionsAvailable } from '#/lib/ai/service'
import { engineLabel } from '#/lib/ai/engine'
import { parseResumeJson } from '#/lib/resume'
import type { Resume } from '#/lib/resume'
import { TEMPLATES } from '#/lib/templates/presets'
import { cn } from '#/lib/utils.ts'

/**
 * Import / replace a resume from a file — any resume PDF (AI-structured on-device), a
 * LinkedIn "Save to PDF", or a JSON Resume. Everything is parsed in-browser (pdf.js +
 * the on-device model); nothing is uploaded.
 */
export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (resume: Resume, templateId?: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [canAi, setCanAi] = useState(false)
  const [staged, setStaged] = useState<Resume | null>(null)
  const [progress, setProgress] = useState<{
    stage: 'extract' | 'structure'
    chars: number
  } | null>(null)

  useEffect(() => {
    void aiActionsAvailable().then(setCanAi)
  }, [])

  useEffect(() => {
    if (!open) setStaged(null)
  }, [open])

  async function handleAiPdf(file: File) {
    if (!canAi) {
      toast.error(
        'AI import needs an AI engine — enable Chrome’s on-device AI or add a Gemini key in AI settings.',
      )
      return
    }
    setBusy(true)
    setProgress({ stage: 'extract', chars: 0 })
    try {
      const buf = await file.arrayBuffer()
      const { extractPdfText } = await import('#/lib/import/pdf-text')
      const text = await extractPdfText(buf)
      if (text.trim().length < 40) {
        toast.error('Couldn’t read text from that PDF — is it a scan/image?')
        return
      }
      setProgress({ stage: 'structure', chars: 0 })
      const { aiImportResume } = await import('#/lib/import/ai-import')
      const resume = await aiImportResume(text, (chars) =>
        setProgress({ stage: 'structure', chars }),
      )
      toast.success("Imported — pick a layout")
      setStaged(resume)
    } catch {
      toast.error('Could not import that PDF.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function handlePdf(file: File) {
    setBusy(true)
    const id = toast.loading('Reading LinkedIn PDF…')
    try {
      const buf = await file.arrayBuffer()
      const { extractLinkedInColumns } = await import('#/lib/import/pdf-text')
      const { parseLinkedInResume } = await import('#/lib/import/linkedin')
      const resume = parseLinkedInResume(await extractLinkedInColumns(buf))
      toast.success("Imported from LinkedIn", { id })
      setStaged(resume)
    } catch {
      toast.error(
        'Could not read that PDF. Use LinkedIn → More → Save to PDF.',
        {
          id,
        },
      )
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
      toast.success("Imported JSON Resume")
      setStaged(result.resume)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staged ? 'Pick a layout' : 'Import a resume'}</DialogTitle>
          <DialogDescription>
            {staged
              ? 'Your resume was imported. Choose a starting layout — you can change everything later.'
              : 'Bring in an existing resume to edit. Everything is parsed in your browser — nothing is uploaded.'}
          </DialogDescription>
        </DialogHeader>
        {staged ? (
          <TemplateChoice
            onPick={(id) => {
              onImported(staged, id)
              onOpenChange(false)
            }}
          />
        ) : progress ? (
          <ImportProgress stage={progress.stage} chars={progress.chars} />
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            <FilePick
              accept="application/pdf"
              label="Any resume PDF"
              hint={
                canAi
                  ? 'Structured by AI — review the result'
                  : 'Needs an AI engine (on-device or Gemini)'
              }
              icon={FileTextIcon}
              busy={busy}
              onPick={handleAiPdf}
            />
            <FilePick
              accept="application/pdf"
              label="From LinkedIn PDF"
              hint="Best results from LinkedIn → More → Save to PDF"
              icon={LinkedinIcon}
              busy={busy}
              onPick={handlePdf}
            />
            <FilePick
              accept="application/json,.json"
              label="From JSON Resume"
              icon={FileJsonIcon}
              busy={busy}
              onPick={handleJson}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TemplateChoice({ onPick }: { onPick: (templateId: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onPick(t.id)}
          className="flex flex-col gap-0.5 rounded-md border border-border p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <span className="text-sm font-medium">{t.label}</span>
          <span className="text-[11px] leading-snug text-muted-foreground">{t.description}</span>
        </button>
      ))}
    </div>
  )
}

function ImportProgress({
  stage,
  chars,
}: {
  stage: 'extract' | 'structure'
  chars: number
}) {
  // The structured JSON for a typical resume lands around ~1500 chars; ease toward 95%.
  const pct = stage === 'extract' ? 8 : Math.min(95, 12 + (chars / 1500) * 83)
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2Icon className="size-4 animate-spin text-primary" />
        {stage === 'extract'
          ? 'Reading the PDF…'
          : `Structuring with ${engineLabel()}…`}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {stage === 'structure'
          ? `Building your resume — ${chars} characters so far. On-device can take a minute.`
          : 'Extracting text in your browser — nothing is uploaded.'}
      </p>
    </div>
  )
}

function FilePick({
  accept,
  label,
  hint,
  icon: Icon,
  busy,
  onPick,
}: {
  accept: string
  label: string
  hint?: string
  icon: typeof LinkedinIcon
  busy: boolean
  onPick: (file: File) => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent',
        busy && 'pointer-events-none opacity-60',
      )}
    >
      {busy ? (
        <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Icon className="size-4 shrink-0 text-primary" />
      )}
      <span className="flex flex-col">
        {label}
        {hint ? (
          <span className="text-[11px] font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
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
