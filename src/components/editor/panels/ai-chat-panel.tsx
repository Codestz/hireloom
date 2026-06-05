import { ArrowUpIcon, CheckIcon, Loader2Icon, SparklesIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { useBlockDoc } from '#/components/blocks'
import { Button } from '#/components/ui/button'
import { chatEdit, mergeSkills } from '#/lib/ai/service'
import type { ChatAction } from '#/lib/ai/service'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import { chatContext } from '#/lib/blocks/doc-text'
import { cn } from '#/lib/utils.ts'

/**
 * The CV Chat — talk to your résumé. The model reads a compact context and returns a
 * STRUCTURED edit (rewrite summary / rewrite a role's bullets / add skills) or a plain
 * answer. Edits are shown as a preview you Apply or Discard — the model never mutates
 * the document directly. The conversation persists across sidebar tabs for the session.
 */
type Controller = ReturnType<typeof useBlockDoc>

interface Message {
  role: 'user' | 'assistant'
  text: string
  action?: ChatAction
  applied?: boolean
  pending?: boolean
}

// Persist the conversation for the browser session (survives sidebar-tab switches;
// cleared when the tab closes). One editor edits one résumé, so a single key is fine.
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
  'Make my summary more senior',
  'Tighten my most recent role’s bullets',
  'What’s weak about my résumé?',
]

const EDIT_LABEL: Record<string, string> = {
  rewrite_summary: 'Proposed summary',
  rewrite_entry: 'Proposed bullets',
  add_skills: 'Skills to add',
}

export function AiChatPanel({ controller }: { controller: Controller }) {
  const { doc } = controller
  const aiReady = useAiReady()
  const [messages, setMessages] = useState<Array<Message>>(loadMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    // Persist the conversation (drop any in-flight message) for the session.
    try {
      sessionStorage.setItem(
        CHAT_KEY,
        JSON.stringify(messages.filter((m) => !m.pending)),
      )
    } catch {
      /* private mode — chat just won't persist */
    }
  }, [messages])

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || busy) return
    setInput('')
    setBusy(true)
    setMessages((m) => [
      ...m,
      { role: 'user', text: msg },
      { role: 'assistant', text: '', pending: true },
    ])
    try {
      const action = await chatEdit(chatContext(doc), msg)
      const editable =
        action.kind !== 'answer' && (action.content ?? '').trim().length > 0
      setMessages((m) => {
        const next = [...m]
        next[next.length - 1] = {
          role: 'assistant',
          text: action.reply,
          action: editable ? action : undefined,
        }
        return next
      })
    } catch {
      setMessages((m) => {
        const next = [...m]
        next[next.length - 1] = {
          role: 'assistant',
          text: 'The AI request failed — check AI settings.',
        }
        return next
      })
    } finally {
      setBusy(false)
    }
  }

  async function apply(index: number, action: ChatAction) {
    setApplyingIndex(index)
    try {
      if (await applyAction(action)) {
        finishApply(index)
      } else {
        toast.error(
          "Couldn't find where to apply that — try naming the section.",
        )
      }
    } finally {
      setApplyingIndex(null)
    }
  }

  function finishApply(index: number) {
    controller.bump()
    setMessages((m) =>
      m.map((msg, i) => (i === index ? { ...msg, applied: true } : msg)),
    )
    toast.success('Applied to your résumé')
  }

  async function applyAction(action: ChatAction): Promise<boolean> {
    const content = action.content ?? ''
    let ok = false
    if (action.kind === 'rewrite_summary') {
      controller.onHeaderChange('summary', content.trim())
      ok = true
    } else if (action.kind === 'add_skills') {
      const sec = doc.sections.find((s) => s.type === 'skills')
      const item = sec?.items[0]
      if (sec && item) {
        const existing = (item.data.tags as Array<string> | undefined) ?? []
        const added = content
          .split(/[,\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        // Weave into existing groups instead of appending one row per skill.
        const merged = await mergeSkills(existing, added)
        controller.onItemChange(sec.id, item.id, 'tags', merged)
        ok = true
      }
    } else if (action.kind === 'rewrite_entry') {
      const exp = doc.sections.find((s) => s.type === 'experience')
      const t = (action.target ?? '').toLowerCase()
      const item = exp?.items.find((it) => {
        const d = it.data as { title?: string; company?: string }
        return [d.company, d.title]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(t) && t.length > 1)
      })
      if (exp && item) {
        const bullets = content
          .split('\n')
          .map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim())
          .filter(Boolean)
        controller.onItemChange(exp.id, item.id, 'bullets', bullets)
        ok = true
      }
    }
    return ok
  }

  if (!aiReady) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        The CV chat needs an AI engine — enable Chrome’s built-in AI, or add a
        Gemini key in AI Studio → Engine. Editing, ATS match, and PDF export
        work without it.
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
              Talk to your résumé
            </div>
            <p className="text-xs text-muted-foreground">
              Ask for edits or advice — every change is previewed before it
              applies. Private by default.
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
              <div
                key={i}
                className={cn(
                  'flex flex-col gap-1.5',
                  m.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  {m.pending ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    m.text
                  )}
                </div>
                {m.action ? (
                  <div className="w-full rounded-lg border border-border bg-card p-2">
                    <p className="mb-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      {EDIT_LABEL[m.action.kind] ?? 'Proposed change'}
                      {m.action.kind === 'rewrite_entry' && m.action.target
                        ? ` · ${m.action.target}`
                        : ''}
                    </p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                      {m.action.content}
                    </p>
                    {m.applied ? (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CheckIcon className="size-3" /> Applied
                      </p>
                    ) : (
                      <div className="mt-1.5 flex gap-2">
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[11px]"
                          disabled={applyingIndex === i}
                          onClick={() => void apply(i, m.action!)}
                        >
                          {applyingIndex === i ? 'Applying…' : 'Apply'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          disabled={applyingIndex === i}
                          onClick={() =>
                            setMessages((ms) =>
                              ms.map((x, j) =>
                                j === i ? { ...x, action: undefined } : x,
                              ),
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
          placeholder="Ask to edit or improve…"
          className="max-h-28 min-h-8 flex-1 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50"
        />
        <Button
          type="submit"
          size="sm"
          className="size-8 shrink-0 p-0"
          disabled={busy || !input.trim()}
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ArrowUpIcon className="size-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
