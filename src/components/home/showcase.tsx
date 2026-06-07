import { useMemo } from 'react'
import { CheckIcon, FileTextIcon, MessageSquareIcon, SparklesIcon, TargetIcon } from 'lucide-react'
import { ScaledCanvasPreview } from '#/components/blocks/canvas-tree/scaled-canvas-preview'
import { decompose } from '#/lib/canvas/decompose'
import { resumeToDoc } from '#/lib/blocks/json-resume'
import { resolveTokens } from '#/lib/templates'
import { DEFAULT_TOKENS } from '#/lib/templates/tokens'
import { TEMPLATE_SAMPLE } from '#/lib/sample/template-sample'

const STEPS = [
  {
    icon: FileTextIcon,
    title: 'Start or import',
    body: 'Begin from a template, a blank page, or drop in a LinkedIn / JSON resume — parsed in your browser.',
  },
  {
    icon: SparklesIcon,
    title: 'Edit with AI',
    body: 'Talk to your resume: tighten bullets, add sections, tailor to a job. Every change is previewed.',
  },
  {
    icon: TargetIcon,
    title: 'Match & export',
    body: 'Score against a job post, then export a clean, ATS-safe PDF — all on your device.',
  },
]

function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-14">
      <div className="grid gap-6 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <Icon className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** A faithful static reproduction of the Assistant chat + diff (the real design, no live data). */
function AssistantCard() {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MessageSquareIcon className="size-3.5 text-primary" /> Assistant
      </div>
      <div className="self-end rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground">
        Tighten my Recurly bullets
      </div>
      <div className="max-w-[88%] rounded-lg bg-muted px-2.5 py-1.5 text-xs">
        Here’s a tighter version — Apply to keep it.
      </div>
      <div className="rounded-md border border-border">
        <p className="bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground">Rewrite list</p>
        <div className="font-mono text-[10.5px] leading-snug">
          <div className="flex gap-1.5 bg-red-500/10 px-2 py-0.5 text-red-500">
            <span className="opacity-70">−</span>
            <span>Designed and implemented robust solutions to complex challenges.</span>
          </div>
          <div className="flex gap-1.5 bg-emerald-500/10 px-2 py-0.5 text-emerald-600">
            <span className="opacity-70">+</span>
            <span>Engineered solutions that improved system stability and uptime.</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Apply</span>
        <span className="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground">Discard</span>
      </div>
    </div>
  )
}

/** A static ATS / Job Match card using the real score + chip language. */
function AtsCard() {
  const matched = ['typescript', 'react', 'node.js', 'ci/cd', 'microservices']
  const missing = ['kubernetes', 'rust']
  return (
    <div className="flex h-full flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <TargetIcon className="size-3.5 text-primary" /> Job Match
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-primary">82%</span>
        <span className="text-xs text-muted-foreground">keywords present</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {matched.map((t) => (
          <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
            {t}
          </span>
        ))}
        {missing.map((t) => (
          <span key={t} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-600">
            {t}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <CheckIcon className="size-3 text-primary" /> Coverage by section · tailor in a click
      </p>
    </div>
  )
}

const SHOWCASE = [
  {
    title: 'Talk to your resume',
    body: 'An AI assistant that edits the document with you — improve, add, tailor — and shows a before/after diff before anything changes.',
    render: () => <AssistantCard />,
  },
  {
    title: 'A real canvas builder',
    body: 'Everything is a primitive you can move, restyle, and rearrange. Single column, a sidebar, a header band — your call.',
    render: 'builder' as const,
  },
  {
    title: 'Beat the bots',
    body: 'Paste a job post for an on-device keyword match, section coverage, and a one-click tailored summary.',
    render: () => <AtsCard />,
  },
]

export function Showcase() {
  const builderRoot = useMemo(() => {
    const tokens = resolveTokens(DEFAULT_TOKENS)
    return { tokens, root: decompose(resumeToDoc(TEMPLATE_SAMPLE), tokens) }
  }, [])

  return (
    <>
      <HowItWorks />
      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="grid items-stretch gap-8 lg:grid-cols-3">
          {SHOWCASE.map((s) => (
            <div key={s.title} className="flex flex-col gap-3">
              <div className="h-72">
                {s.render === 'builder' ? (
                  <div className="relative h-full overflow-hidden rounded-xl border border-border bg-white">
                    <ScaledCanvasPreview root={builderRoot.root} tokens={builderRoot.tokens} width={294} />
                  </div>
                ) : (
                  s.render()
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
