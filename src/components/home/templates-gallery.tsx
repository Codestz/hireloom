import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { ScaledCanvasPreview } from '#/components/blocks/canvas-tree/scaled-canvas-preview'
import { decompose } from '#/lib/canvas/decompose'
import { resumeToDoc } from '#/lib/blocks/json-resume'
import { resolveTokens } from '#/lib/templates'
import { TEMPLATES, templateTokens } from '#/lib/templates/presets'
import { TEMPLATE_SAMPLE } from '#/lib/sample/template-sample'
import { createResumeFromTemplate, resumeKeys } from '#/lib/db'

const CARD_WIDTH = 224 // w-56

/**
 * Template gallery — each card is a LIVE render of the neutral sample decomposed with the
 * template's layout + theme (scaled down), so the preview is always accurate. Clicking seeds a
 * new resume from that template and opens the editor.
 */
export function TemplatesGallery() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; label: string } | null>(null)

  const previews = useMemo(
    () =>
      TEMPLATES.map((t) => {
        const tokens = resolveTokens(templateTokens(t.id))
        return { t, tokens, root: decompose(resumeToDoc(TEMPLATE_SAMPLE), tokens) }
      }),
    [],
  )

  async function pick(id: string) {
    if (busy) return
    setBusy(id)
    try {
      await createResumeFromTemplate(id)
      // Invalidate so the editor's useLatestResume refetches the just-created template resume
      // (we call the repo directly, not the useCreateResume mutation).
      await qc.invalidateQueries({ queryKey: resumeKeys.all })
      await navigate({ to: '/editor' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap justify-center gap-6">
        {previews.map(({ t, tokens, root }) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPending({ id: t.id, label: t.label })}
            className="group flex w-56 flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
          >
            <div className="relative aspect-[8.5/11] overflow-hidden border-b border-border bg-white">
              <ScaledCanvasPreview root={root} tokens={tokens} width={CARD_WIDTH} />
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-foreground/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-medium shadow-md">
                  Use template
                  <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 p-3">
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs leading-snug text-muted-foreground">{t.description}</p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && !busy && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new resume?</DialogTitle>
            <DialogDescription>
              This creates a new resume from the <span className="font-medium text-foreground">{pending?.label}</span>{' '}
              template, with sample content you can edit. Your existing resumes stay saved on this
              device — nothing is replaced or lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={!!busy}>
              Cancel
            </Button>
            <Button onClick={() => pending && void pick(pending.id)} disabled={!!busy}>
              {busy ? 'Creating…' : 'Create from template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
