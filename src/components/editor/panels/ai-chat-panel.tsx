import {
  ArrowUpIcon,
  AtSignIcon,
  ChevronDownIcon,
  CornerDownRightIcon,
  Loader2Icon,
  Settings2Icon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { useBlockDoc } from '#/components/blocks'
import { Button } from '#/components/ui/button'
import { AiSettingsDialog } from '#/components/editor/dialogs/ai-settings-dialog'
import { engineLabel } from '#/lib/ai/engine'
import { chatTools } from '#/lib/ai/service'
import { runTools } from '#/lib/ai/tool-engine'
import type { ToolCall } from '#/lib/ai/tool-engine'
import { toolDiffs, toolTargetIds } from '#/lib/ai/tool-preview'
import { ChatMessage } from './chat-message'
import type { Message } from './chat-message'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import { canvasOutline } from '#/lib/canvas/canvas-text'
import { mentionTargets } from '#/lib/canvas/document-index'
import type { MentionTarget } from '#/lib/canvas/document-index'
import { useAiHighlight } from '#/components/blocks/canvas-tree/ai-highlight'
import { resolveTokens } from '#/lib/templates'
import type { ThemeTokens } from '#/lib/templates/tokens'
import { cn } from '#/lib/utils.ts'

/**
 * The CV Chat — talk to your resume. The model reads a compact outline of the canvas and returns
 * a reply plus TOOL CALLS (edit/transform/add/remove). Calls are shown as a before/after preview
 * you Apply or Discard — the model never mutates the document directly. Applying runs through the
 * ToolEngine (zod-validated; structure/style built by the canonical builders). Cloud Gemini rec.
 */
type Controller = ReturnType<typeof useBlockDoc>

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
  'Write a professional summary from my experience',
  'Suggest skills I should add',
  'Add a Projects section',
  'What’s missing from my resume?',
]

export function AiChatPanel({ controller, tokens }: { controller: Controller; tokens: ThemeTokens }) {
  const { doc } = controller
  const resolved = useMemo(() => resolveTokens(tokens), [tokens])
  const aiReady = useAiReady()
  const [messages, setMessages] = useState<Array<Message>>(loadMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  // @-mention autocomplete: mq = the active "@query" (null when not typing one).
  const [mq, setMq] = useState<string | null>(null)
  const [mhi, setMhi] = useState(0)
  // Sticky focus: sections/entries the conversation is scoped to (carry across messages).
  const [focus, setFocus] = useState<Array<MentionTarget>>([])
  const { setFocusedIds, setAffectedIds } = useAiHighlight()

  // Mirror the latest un-applied proposal's targets → amber "AI edit" ring on the canvas.
  useEffect(() => {
    const root = doc.canvas
    const pending = [...messages].reverse().find((m) => m.tools && !m.applied)
    setAffectedIds(root && pending?.tools ? toolTargetIds(root, pending.tools) : [])
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

  /** Drop a target: remove its @mention from the draft and from sticky focus. */
  function removeFocus(t: MentionTarget) {
    setInput((prev) => prev.split(`@${t.label}`).join('').replace(/\s{2,}/g, ' ').trimStart())
    setFocus((f) => f.filter((x) => x.id !== t.id))
  }

  // Live focus: what's @-mentioned in the DRAFT right now, else the sticky focus from last send.
  const liveMentions = referencedTargets(input)
  const shownFocus = liveMentions.length ? liveMentions : focus
  const focusedKey = shownFocus.map((t) => t.id).join(',')
  useEffect(() => {
    setFocusedIds(focusedKey ? focusedKey.split(',') : [])
  }, [focusedKey, setFocusedIds])

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
      const res = await chatTools(
        [...history, { role: 'user', text: msg }],
        root ? canvasOutline(root) : '(empty document)',
        focusStr,
      )
      setMessages((m) => {
        const next = [...m]
        next[next.length - 1] = {
          role: 'assistant',
          text: res.reply,
          tools: res.tools.length ? res.tools : undefined,
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

  async function apply(index: number, tools: Array<ToolCall>) {
    const root = doc.canvas
    if (!root) return
    const result = await runTools(root, resolved, tools)
    controller.onSetCanvasRoot(result.root)
    setMessages((m) => m.map((x, i) => (i === index ? { ...x, applied: true } : x)))
    if (result.errors.length) toast.error(`Applied with ${result.errors.length} issue(s): ${result.errors[0]}`)
    else toast.success('Applied to your resume')
  }

  if (!aiReady) {
    return (
      <div className="flex flex-col gap-3 p-4 text-sm text-muted-foreground">
        <p>
          The Assistant needs an AI engine — enable Chrome’s built-in AI, or add your own Gemini key
          for cloud AI in any browser. Editing, Job Match, and PDF export work without it.
        </p>
        <Button size="sm" variant="outline" className="justify-start" onClick={() => setSettingsOpen(true)}>
          <Settings2Icon data-icon="inline-start" />
          Set up an AI engine
        </Button>
        <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <SparklesIcon className="size-3.5 text-primary" /> Assistant
        </span>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Change AI model"
          title="Change AI model — on-device (private) or your own Gemini key"
          className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Settings2Icon className="size-3" />
          {engineLabel()}
          <ChevronDownIcon className="size-3 opacity-70" />
        </button>
      </div>
      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
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
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="self-start text-[11px] text-primary underline-offset-2 transition-colors hover:underline"
            >
              Running on {engineLabel()} — switch model
            </button>
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
              const diffs =
                m.tools && doc.canvas && !m.applied ? toolDiffs(doc.canvas, resolved, m.tools) : []
              return (
                <ChatMessage
                  key={i}
                  message={m}
                  diffs={diffs}
                  onApply={() => void apply(i, m.tools!)}
                  onDiscard={() =>
                    setMessages((ms) => ms.map((x, j) => (j === i ? { ...x, tools: undefined } : x)))
                  }
                />
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

        {shownFocus.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Talking about</span>
            {shownFocus.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2 text-[11px] font-medium text-primary"
              >
                @{s.label}
                <button
                  type="button"
                  aria-label={`Stop focusing ${s.label}`}
                  onClick={() => removeFocus(s)}
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
