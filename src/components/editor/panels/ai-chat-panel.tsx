import { ArrowUpIcon, CheckIcon, Loader2Icon, SparklesIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { useBlockDoc } from '#/components/blocks'
import { Button } from '#/components/ui/button'
import { chatBuildCanvas } from '#/lib/ai/service'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import { applyChatOps, canvasOutline, sectionTemplates } from '#/lib/canvas/chat-ops'
import type { ChatOp } from '#/lib/canvas/chat-ops'
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.filter((m) => !m.pending)))
    } catch {
      /* private mode — chat just won't persist */
    }
  }, [messages])

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || busy) return
    const root = doc.canvas
    setInput('')
    setBusy(true)
    const history = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, text: m.text }))
    setMessages((m) => [...m, { role: 'user', text: msg }, { role: 'assistant', text: '', pending: true }])
    try {
      const res = await chatBuildCanvas(
        [...history, { role: 'user', text: msg }],
        root ? canvasOutline(root) : '(empty document)',
        root ? sectionTemplates(root) : '',
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
            {messages.map((m, i) => (
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
                    <p className="mb-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      Proposed changes
                    </p>
                    <ul className="mb-1.5 space-y-0.5 text-xs text-foreground/90">
                      {m.summary.map((s, j) => (
                        <li key={j}>• {s}</li>
                      ))}
                    </ul>
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
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="flex items-end gap-1.5 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send(input)
            }
          }}
          rows={1}
          placeholder="Ask to add or edit a section…"
          className="max-h-28 min-h-8 flex-1 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50"
        />
        <Button type="submit" size="sm" className="size-8 shrink-0 p-0" disabled={busy || !input.trim()}>
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <ArrowUpIcon className="size-4" />}
        </Button>
      </form>
    </div>
  )
}
