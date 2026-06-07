import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ThemeToggle } from '#/components/app/theme-toggle'
import { ImportProgress, PreviewStep, UploadStep } from '#/components/import/import-steps'
import { aiActionsAvailable } from '#/lib/ai/service'
import { decompose } from '#/lib/canvas/decompose'
import { resumeToDoc } from '#/lib/blocks/json-resume'
import { createResume, resumeKeys } from '#/lib/db'
import { parseResumeJson } from '#/lib/resume'
import type { Resume } from '#/lib/resume'
import { resolveTokens } from '#/lib/templates'
import { TEMPLATES, templateTokens } from '#/lib/templates/presets'

export const Route = createFileRoute('/import')({ component: ImportPage })

type Progress = { stage: 'extract' | 'structure'; chars: number } | null

/**
 * The import flow: upload (any PDF / LinkedIn / JSON) → parse in-browser → preview the parsed resume
 * across the 4 layouts → open the chosen one in the editor. Owns the step machine + parse handlers;
 * the presentational steps live in components/import/import-steps.tsx.
 */
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
