import { useMemo } from 'react'
import { FileTextIcon, SparklesIcon, TargetIcon } from 'lucide-react'
import { ScaledCanvasPreview } from '#/components/blocks/canvas-tree/scaled-canvas-preview'
import { AssistantCard, AtsCard } from './showcase-cards'
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
