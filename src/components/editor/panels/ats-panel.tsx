import { SparklesIcon, WandSparklesIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { useBlockDoc } from '#/components/blocks'
import { Button } from '#/components/ui/button'
import { enginePrompt } from '#/lib/ai/engine'
import { tailorSummary } from '#/lib/ai/service'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import { matchResume } from '#/lib/ats/match'
import { resumeText } from '#/lib/blocks/doc-text'
import { canvasText, findSummaryNode } from '#/lib/canvas/canvas-text'
import { documentIndex } from '#/lib/canvas/document-index'
import { findNode } from '#/lib/canvas/tree-ops'

/**
 * ATS panel — paste a job description, get a deterministic keyword match against YOUR CANVAS
 * (the source of truth): score + matched/missing + which sections cover the keywords, plus AI
 * gap suggestions and one-click "Tailor my summary to this job" (applied to the canvas summary).
 */
type Controller = ReturnType<typeof useBlockDoc>

function Chips({ terms, tone }: { terms: Array<string>; tone: 'ok' | 'miss' }) {
  return (
    <div className="flex flex-wrap gap-1">
      {terms.map((t) => (
        <span
          key={t}
          className={
            tone === 'ok'
              ? 'rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary'
              : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700'
          }
        >
          {t}
        </span>
      ))}
    </div>
  )
}

export function AtsPanel({ controller }: { controller: Controller }) {
  const { doc } = controller
  const [jd, setJd] = useState('')
  const canAi = useAiReady()
  const [aiText, setAiText] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Tailor-to-JD
  const [tailored, setTailored] = useState('')
  const [tailoring, setTailoring] = useState(false)
  const [afterScore, setAfterScore] = useState<number | null>(null)

  const text = useMemo(() => (doc.canvas ? canvasText(doc.canvas) : resumeText(doc)), [doc])
  const result = useMemo(
    () => (jd.trim().length > 20 ? matchResume(jd, text) : null),
    [jd, text],
  )

  // Where the JD keywords land across the canvas sections (the source of truth).
  const coverage = useMemo(() => {
    const root = doc.canvas
    if (!root || !result) return []
    const terms = [...result.matched, ...result.missing].map((k) => k.term)
    return documentIndex(root)
      .map((s) => {
        const node = findNode(root, s.id)
        const lower = node ? canvasText(node).toLowerCase() : ''
        return { name: s.name, hits: terms.filter((tm) => lower.includes(tm)).length }
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits)
  }, [doc.canvas, result])
  const scoreColor =
    !result || result.score >= 60
      ? '#2f6b4f'
      : result.score >= 35
        ? '#b45309'
        : '#be123c'

  async function assist() {
    if (!result) return
    setAiLoading(true)
    setAiText(null)
    try {
      const missing = result.missing
        .map((m) => m.term)
        .slice(0, 12)
        .join(', ')
      const prompt = `I'm tailoring my resume to a job posting. These keywords from the job description are missing from my resume: ${missing}.

My resume:
${text.slice(0, 2000)}

For each missing keyword, give ONE short line: either note I likely already cover it with a synonym (name the synonym), or suggest a concise resume phrase I could add. Be specific and honest — never invent experience I don't show.`
      setAiText(await enginePrompt(prompt))
    } catch {
      toast.error('The AI request failed — check AI settings.')
    } finally {
      setAiLoading(false)
    }
  }

  async function tailor() {
    if (!result) return
    setTailoring(true)
    setTailored('')
    setAfterScore(null)
    try {
      const next = await tailorSummary(text, jd, setTailored)
      const summaryNode = doc.canvas ? findSummaryNode(doc.canvas) : null
      const oldSummary = summaryNode ? String(summaryNode.data.text ?? '') : doc.header.summary
      const after = oldSummary ? text.replace(oldSummary, next) : `${text}\n${next}`
      setAfterScore(matchResume(jd, after).score)
    } catch {
      toast.error('The AI request failed — check AI settings.')
    } finally {
      setTailoring(false)
    }
  }

  function applyTailored() {
    const root = doc.canvas
    const node = root ? findSummaryNode(root) : null
    if (node) {
      controller.onCanvasUpdateData(node.id, { text: tailored.trim() })
    } else {
      controller.onHeaderChange('summary', tailored.trim())
      controller.bump()
    }
    setTailored('')
    setAfterScore(null)
    toast.success('Summary tailored to the job')
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Job description
        </span>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the job posting here…"
          className="h-32 w-full resize-y rounded-md border border-border bg-background p-2 text-xs leading-relaxed outline-none focus:border-primary/50"
        />
        <span className="text-[11px] text-muted-foreground">
          Matched on your device — nothing is uploaded.
        </span>
      </div>

      {result ? (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-semibold tabular-nums"
              style={{ color: scoreColor }}
            >
              {result.score}%
            </span>
            <span className="text-xs text-muted-foreground">
              {result.matched.length} of{' '}
              {result.matched.length + result.missing.length} keywords present
            </span>
          </div>

          {result.missing.length ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Missing ({result.missing.length})
              </span>
              <Chips terms={result.missing.map((k) => k.term)} tone="miss" />
            </div>
          ) : null}

          {result.matched.length ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Matched ({result.matched.length})
              </span>
              <Chips terms={result.matched.map((k) => k.term)} tone="ok" />
            </div>
          ) : null}

          {coverage.length ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Coverage by section
              </span>
              {coverage.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground/90">{s.name}</span>
                  <span className="text-muted-foreground">
                    {s.hits} keyword{s.hits === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {canAi ? (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                onClick={tailor}
                disabled={tailoring}
                className="justify-start"
              >
                <WandSparklesIcon data-icon="inline-start" />
                {tailoring ? 'Tailoring…' : 'Tailor my summary to this job'}
              </Button>
              {tailored ? (
                <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-2">
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {tailored}
                  </p>
                  {afterScore !== null ? (
                    <p className="text-[11px] text-muted-foreground">
                      Projected match:{' '}
                      <span className="font-medium text-foreground">
                        {result.score}% → {afterScore}%
                      </span>
                    </p>
                  ) : null}
                  {!tailoring ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={applyTailored}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => {
                          setTailored('')
                          setAfterScore(null)
                        }}
                      >
                        Discard
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <Button
                size="sm"
                variant="outline"
                onClick={assist}
                disabled={aiLoading || !result.missing.length}
                className="justify-start"
              >
                <SparklesIcon data-icon="inline-start" />
                {aiLoading ? 'Thinking…' : 'AI suggestions for gaps'}
              </Button>
              {aiText ? (
                <div className="rounded-md border border-border bg-muted/40 p-2 text-xs leading-relaxed whitespace-pre-wrap">
                  {aiText}
                </div>
              ) : null}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              On-device AI suggestions need Chrome 127+ with built-in AI.
            </span>
          )}
        </>
      ) : null}
    </div>
  )
}
