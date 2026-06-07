import { CheckIcon, MessageSquareIcon, TargetIcon } from 'lucide-react'

/**
 * Static marketing mockups for the landing showcase — faithful reproductions of the real Assistant
 * (chat + diff) and Job Match UI, built from the same design language so they read as the product.
 * Intentionally non-interactive (no live data).
 */

/** The AI Assistant: a user message, a proposal reply, and a red/green rewrite diff. */
export function AssistantCard() {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MessageSquareIcon className="size-3.5 text-primary" /> Assistant
      </div>
      <div className="self-end rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground">
        Tighten my HireLoom bullets
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

/** Job Match: a keyword score + matched/missing chips. */
export function AtsCard() {
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
