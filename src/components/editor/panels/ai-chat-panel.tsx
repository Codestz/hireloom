import {
  ArrowUpIcon,
  AtSignIcon,
  CheckIcon,
  CornerDownRightIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { useBlockDoc } from '#/components/blocks'
import { Button } from '#/components/ui/button'
import { chatBuildCanvas } from '#/lib/ai/service'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import { applyChatOps, canvasOutline, opDiffs, opTargetIds, sectionTemplates } from '#/lib/canvas/chat-ops'
import type { ChatOp } from '#/lib/canvas/chat-ops'
import { mentionTargets } from '#/lib/canvas/document-index'
import type { MentionTarget } from '#/lib/canvas/document-index'
import { useAiHighlight } from '#/components/blocks/canvas-tree/ai-highlight'
import { cn } from '#/lib/utils.ts'

/**
 * The CV Chat — talk to your resume. The model reads a compact outline of the canvas and
 * returns a reply plus structured ops (add a section / edit a node / remove). Ops are shown as
 * a preview you Apply or Discard — the model never mutates the document directly. Applying runs
 * through applyChatOps (which sanitizes any AI-generated subtree). Cloud Gemini recommended.
 */
type Controller = ReturnType<typeof useBlockDoc>

interface Message {
  role: 'user' | 'assistant'
  text: string
  ops?: Array<ChatOp>
  summary?: Array<string>
  applied?: boolean
  pending?: boolean
}

const CHAT_KEY = 'hireloom.chat'

function loadMessages(): Array<Message> {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(CHAT_KEY)
    return raw ? (JSON.parse(raw) as Array<Message>) : []
  } catch {
    return []
  }
}

const SUGGESTIONS = [
  'Add a Projects section',
  'Add a certifications section for AWS and GCP',
  'What’s missing from my resume?',
]

export function AiChatPanel({ controller }: { controller: Controller }) {
  const { doc } = controller
  const aiReady = useAiReady()
  const [messages, setMessages] = useState<Array<Message>>(loadMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  // @-mention autocomplete: mq = the active "@query" (null when not typing one).
  const [mq, setMq] = useState<string | null>(null)
  const [mhi, setMhi] = useState(0)
  // Sticky focus: sections/entries the conversation is scoped to (carry across messages).
  const [focus, setFocus] = useState<Array<MentionTarget>>([])
  const { setFocusedIds, setAffectedIds } = useAiHighlight()

  // Mirror @-focus → green ring on the canvas.
  useEffect(() => {
    setFocusedIds(focus.map((s) => s.id))
  }, [focus, setFocusedIds])

  // Mirror the latest un-applied proposal's targets → amber "AI edit" ring on the canvas.
  useEffect(() => {
    const root = doc.canvas
    const pending = [...messages].reverse().find((m) => m.ops && !m.applied)
    setAffectedIds(root && pending?.ops ? opTargetIds(root, pending.ops) : [])
  }, [messages, doc.canvas, setAffectedIds])

  // Clear all AI highlights when leaving the chat.
  useEffect(() => () => {
    setFocusedIds([])
    setAffectedIds([])
  }, [setFocusedIds, setAffectedIds])

  const targets = doc.canvas ? mentionTargets(doc.canvas) : []
  const candidates =
    mq === null
      ? []
      : targets.filter((t) => t.label.toLowerCase().includes(mq.toLowerCase())).slice(0, 40)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.filter((m) => !m.pending)))
    } catch {
      /* private mode — chat just won't persist */
    }
  }, [messages])

  /** Targets @-mentioned in a message (longest-label-first so prefixes don't double-match). */
  function referencedTargets(msg: string): Array<MentionTarget> {
    let text = msg
    const out: Array<MentionTarget> = []
    for (const t of [...targets].sort((a, b) => b.label.length - a.label.length)) {
      const tok = `@${t.label}`
      if (text.includes(tok)) {
        out.push(t)
        text = text.split(tok).join(' ')
      }
    }
    return out
  }

  /** Replace the active "@query" with the chosen target's "@Label ". */
  function pickMention(s: MentionTarget | undefined) {
    const ta = taRef.current
    if (!s || !ta) return
    const caret = ta.selectionStart
    const m = /(?:^|\s)@(\S*)$/.exec(input.slice(0, caret))
    if (!m) return
    const start = caret - (m[1].length + 1)
    const before = input.slice(0, start)
    const insert = `@${s.label} `
    setInput(before + insert + input.slice(caret))
    setMq(null)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = (before + insert).length
      ta.setSelectionRange(pos, pos)
    })
  }

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || busy) return
    const root = doc.canvas
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto' // collapse the grown composer
    setBusy(true)
    const history = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, text: m.text }))
    setMessages((m) => [...m, { role: 'user', text: msg }, { role: 'assistant', text: '', pending: true }])
    try {
      // Sticky focus: a fresh @-mention re-scopes; otherwise keep the pinned targets.
      const mentioned = referencedTargets(msg)
      const active = mentioned.length ? mentioned : focus
      if (mentioned.length) setFocus(mentioned)
      const focusStr = active
        .map((t) => `${t.kind} "${t.label}" (${t.id})${t.sectionName ? ` in ${t.sectionName}` : ''}`)
        .join(', ')
      const res = await chatBuildCanvas(
        [...history, { role: 'user', text: msg }],
        root ? canvasOutline(root) : '(empty document)',
        root ? sectionTemplates(root) : '',
        focusStr,
      )
      // Dry-run to preview what would change (without mutating).
      const summary = root && res.ops.length ? applyChatOps(root, res.ops).summary : []
      setMessages((m) => {
        const next = [...m]
        next[next.length - 1] = {
          role: 'assistant',
          text: res.reply,
          ops: summary.length ? res.ops : undefined,
          summary: summary.length ? summary : undefined,
        }
        return next
      })
    } catch {
      setMessages((m) => {
        const next = [...m]
        next[next.length - 1] = { role: 'assistant', text: 'The AI request failed — check AI settings.' }
        return next
      })
    } finally {
      setBusy(false)
    }
  }

  function apply(index: number, ops: Array<ChatOp>) {
    const root = doc.canvas
    if (!root) return
    controller.onSetCanvasRoot(applyChatOps(root, ops).root)
    setMessages((m) => m.map((x, i) => (i === index ? { ...x, applied: true } : x)))
    toast.success('Applied to your resume')
  }

  if (!aiReady) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        The CV chat needs an AI engine — enable Chrome’s built-in AI, or add a Gemini key in AI
        Studio → Engine. Editing, ATS match, and PDF export work without it.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SparklesIcon className="size-4 text-primary" />
              Build & edit by chatting
            </div>
            <p className="text-xs text-muted-foreground">
              Ask to add or change sections — every change is previewed before it applies.
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMessages([])}
              className="self-end text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear chat
            </button>
            {messages.map((m, i) => {
              const diffs = m.ops && doc.canvas && !m.applied ? opDiffs(doc.canvas, m.ops) : []
              return (
              <div key={i} className={cn('flex flex-col gap-1.5', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}
                >
                  {m.pending ? <Loader2Icon className="size-3.5 animate-spin" /> : m.text}
                </div>
                {m.ops && m.summary ? (
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
                        {m.summary.map((s, j) => (
                          <li key={j}>• {s}</li>
                        ))}
                      </ul>
                    )}
                    {m.applied ? (
                      <p className="flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CheckIcon className="size-3" /> Applied
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => apply(i, m.ops!)}>
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          onClick={() =>
                            setMessages((ms) =>
                              ms.map((x, j) => (j === i ? { ...x, ops: undefined, summary: undefined } : x)),
                            )
                          }
                        >
                          Discard
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              )
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="relative border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        {mq !== null && candidates.length > 0 ? (
          <div className="absolute right-2 bottom-full left-2 mb-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            <p className="px-2.5 pt-2 pb-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Mention a section or entry
            </p>
            {candidates.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pickMention(s)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 py-2 pr-2.5 text-left text-xs',
                  s.kind === 'entry' ? 'pl-6' : 'pl-2.5',
                  i === mhi ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60',
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5 font-medium">
                  {s.kind === 'section' ? (
                    <AtSignIcon className="size-3 shrink-0 text-primary" />
                  ) : (
                    <CornerDownRightIcon className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {s.kind === 'entry' ? s.sectionName : (s.role ?? 'section')}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {focus.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Talking about</span>
            {focus.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2 text-[11px] font-medium text-primary"
              >
                @{s.label}
                <button
                  type="button"
                  aria-label={`Stop focusing ${s.label}`}
                  onClick={() => setFocus((f) => f.filter((x) => x.id !== s.id))}
                  className="flex size-3.5 items-center justify-center rounded-full hover:bg-primary/20"
                >
                  <XIcon className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col rounded-xl border border-border bg-background transition-colors focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => {
              const v = e.target.value
              setInput(v)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 176)}px`
              const caret = el.selectionStart
              const m = /(?:^|\s)@(\S*)$/.exec(v.slice(0, caret))
              setMq(m ? m[1] : null)
              setMhi(0)
            }}
            onKeyDown={(e) => {
              if (mq !== null && candidates.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setMhi((h) => (h + 1) % candidates.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setMhi((h) => (h - 1 + candidates.length) % candidates.length)
                  return
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault()
                  pickMention(candidates[mhi] ?? candidates[0])
                  return
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setMq(null)
                  return
                }
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send(input)
              }
            }}
            rows={2}
            placeholder="Ask to add or edit a section…"
            className="max-h-44 w-full resize-none bg-transparent px-3 py-2.5 text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <span className="flex items-center gap-1 truncate pl-1 text-[10px] text-muted-foreground">
              <AtSignIcon className="size-3" />
              mention · ⏎ send · ⇧⏎ new line
            </span>
            <Button
              type="submit"
              size="sm"
              className="h-7 gap-1 px-3 text-[11px]"
              disabled={busy || !input.trim()}
            >
              {busy ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <>
                  Send
                  <ArrowUpIcon className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
