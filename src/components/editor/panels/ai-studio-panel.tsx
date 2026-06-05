import {
  CheckIcon,
  ClipboardIcon,
  PlusIcon,
  Settings2Icon,
  SparklesIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { useBlockDoc } from '#/components/blocks'
import { Button } from '#/components/ui/button'
import { engineLabel } from '#/lib/ai/engine'
import {
  generateCoverLetter,
  generateSummary,
  mergeSkills,
  suggestSkills,
} from '#/lib/ai/service'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import { experienceText, resumeText } from '#/lib/blocks/doc-text'
import { AiSettingsDialog } from '#/components/editor/dialogs/ai-settings-dialog'

/**
 * AI Studio — document-level generators powered by Chrome's on-device model:
 * draft a summary from the work history, mine skills from the bullets, and write a
 * cover letter from the resume + a job description. Everything streams in live and
 * stays on the device. Inline per-line actions live on the fields themselves (Phase 1).
 */
type Controller = ReturnType<typeof useBlockDoc>

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
      {children}
    </span>
  )
}

export function AiStudioPanel({ controller }: { controller: Controller }) {
  const { doc } = controller
  const aiOk = useAiReady()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [summary, setSummary] = useState('')
  const [sumBusy, setSumBusy] = useState(false)
  const [skills, setSkills] = useState<Array<string>>([])
  const [picked, setPicked] = useState<Array<string>>([])
  const [skillsBusy, setSkillsBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [jd, setJd] = useState('')
  const [letter, setLetter] = useState('')
  const [letterBusy, setLetterBusy] = useState(false)

  const skillsSec = doc.sections.find((s) => s.type === 'skills')

  async function genSummary() {
    const exp = experienceText(doc)
    if (!exp.trim()) {
      toast.error('Add some work experience first.')
      return
    }
    setSumBusy(true)
    setSummary('')
    try {
      await generateSummary(exp, setSummary)
    } catch {
      toast.error('The AI request failed — check AI settings.')
    } finally {
      setSumBusy(false)
    }
  }

  function applySummary() {
    controller.onHeaderChange('summary', summary)
    controller.bump()
    toast.success('Summary applied to your resume')
  }

  async function genSkills() {
    const exp = experienceText(doc)
    if (!exp.trim()) {
      toast.error('Add some work experience first.')
      return
    }
    const existing =
      (skillsSec?.items[0]?.data.tags as Array<string> | undefined) ?? []
    setSkillsBusy(true)
    setSkills([])
    setPicked([])
    try {
      setSkills(await suggestSkills(exp, existing))
    } catch {
      toast.error('The AI request failed — check AI settings.')
    } finally {
      setSkillsBusy(false)
    }
  }

  function togglePick(skill: string) {
    setPicked((p) =>
      p.includes(skill) ? p.filter((s) => s !== skill) : [...p, skill],
    )
  }

  async function addPicked() {
    if (!skillsSec) {
      toast.error('Add a Skills section first.')
      return
    }
    const item = skillsSec.items[0]
    const existing = (item.data.tags as Array<string> | undefined) ?? []
    setAdding(true)
    try {
      // Weave into the matching skill groups rather than appending one row each.
      const merged = await mergeSkills(existing, picked)
      controller.onItemChange(skillsSec.id, item.id, 'tags', merged)
      controller.bump()
      setSkills((prev) => prev.filter((s) => !picked.includes(s)))
      setPicked([])
      toast.success('Skills added')
    } catch {
      toast.error('The AI request failed — check AI settings.')
    } finally {
      setAdding(false)
    }
  }

  async function genLetter() {
    if (jd.trim().length < 20) {
      toast.error('Paste a job description first.')
      return
    }
    setLetterBusy(true)
    setLetter('')
    try {
      await generateCoverLetter(resumeText(doc), jd, setLetter)
    } catch {
      toast.error('The AI request failed — check AI settings.')
    } finally {
      setLetterBusy(false)
    }
  }

  if (!aiOk) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          No AI engine is ready. Enable Chrome’s built-in AI, or add your own
          Gemini key to use Cloud AI in any browser. (Editing, ATS match, and
          PDF export work without AI.)
        </p>
        <Button
          size="sm"
          variant="outline"
          className="justify-start"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2Icon data-icon="inline-start" />
          Set up an AI engine
        </Button>
        <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Engine */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
        <span className="text-[11px] text-muted-foreground">
          Engine:{' '}
          <span className="font-medium text-foreground">{engineLabel()}</span>
        </span>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="AI settings"
          className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings2Icon className="size-3.5" />
          Change
        </button>
      </div>
      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Summary */}
      <section className="flex flex-col gap-2">
        <Label>Professional summary</Label>
        <Button
          size="sm"
          variant="outline"
          className="justify-start"
          onClick={genSummary}
          disabled={sumBusy}
        >
          <SparklesIcon data-icon="inline-start" />
          {sumBusy ? 'Writing…' : 'Generate from experience'}
        </Button>
        {summary ? (
          <>
            <p className="rounded-md border border-border bg-muted/40 p-2 text-xs leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={applySummary} disabled={sumBusy}>
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={genSummary}
                disabled={sumBusy}
              >
                Regenerate
              </Button>
            </div>
          </>
        ) : null}
      </section>

      {/* Skills */}
      <section className="flex flex-col gap-2">
        <Label>Skills from your experience</Label>
        <Button
          size="sm"
          variant="outline"
          className="justify-start"
          onClick={genSkills}
          disabled={skillsBusy}
        >
          <SparklesIcon data-icon="inline-start" />
          {skillsBusy ? 'Scanning…' : 'Suggest skills'}
        </Button>
        {skills.length ? (
          <>
            <p className="text-[11px] text-muted-foreground">
              Tap to select — they’ll be merged into your existing skill groups.
            </p>
            <div className="flex flex-wrap gap-1">
              {skills.map((s) => {
                const on = picked.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => togglePick(s)}
                    className={
                      on
                        ? 'inline-flex items-center gap-0.5 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground'
                        : 'inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary/20'
                    }
                  >
                    {on ? (
                      <CheckIcon className="size-3" />
                    ) : (
                      <PlusIcon className="size-3" />
                    )}
                    {s}
                  </button>
                )
              })}
            </div>
            {picked.length ? (
              <Button
                size="sm"
                className="justify-start"
                onClick={() => void addPicked()}
                disabled={adding}
              >
                {adding
                  ? 'Adding…'
                  : `Add ${picked.length} skill${picked.length > 1 ? 's' : ''}`}
              </Button>
            ) : null}
          </>
        ) : null}
      </section>

      {/* Cover letter */}
      <section className="flex flex-col gap-2">
        <Label>Cover letter</Label>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the job description…"
          className="h-24 w-full resize-y rounded-md border border-border bg-background p-2 text-xs leading-relaxed outline-none focus:border-primary/50"
        />
        <Button
          size="sm"
          variant="outline"
          className="justify-start"
          onClick={genLetter}
          disabled={letterBusy}
        >
          <SparklesIcon data-icon="inline-start" />
          {letterBusy ? 'Writing…' : 'Write cover letter'}
        </Button>
        {letter ? (
          <>
            <p className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/40 p-2 text-xs leading-relaxed whitespace-pre-wrap">
              {letter}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={() => {
                void navigator.clipboard.writeText(letter)
                toast.success('Cover letter copied')
              }}
            >
              <ClipboardIcon data-icon="inline-start" />
              Copy
            </Button>
          </>
        ) : null}
      </section>
    </div>
  )
}
