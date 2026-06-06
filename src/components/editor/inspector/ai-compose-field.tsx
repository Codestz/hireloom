import { useState } from 'react'
import { SparklesIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { useBlockDoc } from '#/components/blocks'
import { useCanvasSelection } from '#/components/blocks/canvas-tree/selection'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import { composeBlock } from '#/lib/ai/service'
import { sanitizeAiNode } from '#/lib/canvas/ai-compose'
import { isBox } from '#/lib/canvas/model'
import { findNode } from '#/lib/canvas/tree-ops'

type Controller = ReturnType<typeof useBlockDoc>

/**
 * AI compose (A2): describe a section → the model returns a primitive tree → sanitizeAiNode
 * (the security boundary) → inserted into the selected box (or the page). Only shown when an
 * AI engine is ready.
 */
export function AiComposeField({ controller }: { controller: Controller }) {
  const ready = useAiReady()
  const { selectedId, select } = useCanvasSelection()
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const root = controller.doc.canvas
  if (!ready || !root) return null

  const selected = selectedId ? findNode(root, selectedId) : null
  const intoBox = selected && isBox(selected)
  const target = intoBox ? selected.id : root.id

  async function generate() {
    const req = prompt.trim()
    if (!req || busy) return
    setBusy(true)
    const id = toast.loading('Composing with AI…')
    try {
      const node = sanitizeAiNode(await composeBlock(req))
      if (!node) throw new Error('Could not build a section from that prompt.')
      controller.onCanvasAddNode(target, node)
      select(node.id)
      setPrompt('')
      toast.success('Added to the canvas', { id })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI request failed', { id })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <SparklesIcon className="size-3.5 text-primary" /> Compose with AI
      </span>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`e.g. "a Skills section as a list of my cloud + AI tools"`}
        rows={2}
        className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
        }}
      />
      <button
        type="button"
        disabled={busy || !prompt.trim()}
        onClick={generate}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {busy ? <Loader2Icon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5" />}
        {intoBox ? 'Add into selected box' : 'Add to page'}
      </button>
    </div>
  )
}
