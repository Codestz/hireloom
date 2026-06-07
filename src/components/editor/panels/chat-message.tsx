import { CheckIcon, Loader2Icon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { ToolCall } from '#/lib/ai/tool-engine'
import type { ToolDiff } from '#/lib/ai/tool-preview'
import { cn } from '#/lib/utils.ts'

export interface Message {
  role: 'user' | 'assistant'
  text: string
  tools?: Array<ToolCall>
  applied?: boolean
  pending?: boolean
}

/**
 * One chat message: the bubble + (for assistant proposals) a "Proposed changes" card showing the
 * before/after diff of the tool calls, with Apply / Discard. `diffs` is computed by the parent
 * (empty while the proposal is still pending or already applied).
 */
export function ChatMessage({
  message: m,
  diffs,
  onApply,
  onDiscard,
}: {
  message: Message
  diffs: Array<ToolDiff>
  onApply: () => void
  onDiscard: () => void
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', m.role === 'user' ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed',
          m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        {m.pending ? <Loader2Icon className="size-3.5 animate-spin" /> : m.text}
      </div>
      {m.tools ? (
        <div className="w-full rounded-lg border border-border bg-card p-2">
          <p className="mb-1.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Proposed changes
          </p>
          {diffs.length > 0 ? (
            <div className="mb-2 space-y-1.5">
              {diffs.map((d, j) => (
                <div key={j} className="overflow-hidden rounded-md border border-border">
                  <p className="bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    {d.title}
                  </p>
                  <div className="divide-y divide-border/40 font-mono text-[10.5px] leading-snug">
                    {d.lines.map((l, k) => (
                      <div
                        key={k}
                        className={cn(
                          'flex gap-1.5 px-2 py-0.5 break-words whitespace-pre-wrap',
                          l.t === 'del'
                            ? 'bg-red-500/10 text-red-300'
                            : l.t === 'add'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'text-muted-foreground',
                        )}
                      >
                        <span className="shrink-0 select-none opacity-70">
                          {l.t === 'del' ? '−' : l.t === 'add' ? '+' : ' '}
                        </span>
                        <span>{l.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="mb-1.5 space-y-0.5 text-xs text-foreground/90">
              {m.tools.map((tcall, j) => (
                <li key={j}>• {tcall.tool.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          )}
          {m.applied ? (
            <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
              <CheckIcon className="size-3" /> Applied
            </p>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="h-6 px-2 text-[11px]" onClick={onApply}>
                Apply
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={onDiscard}>
                Discard
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
