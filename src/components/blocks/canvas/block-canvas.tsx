import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAiReady } from '#/lib/ai/use-ai-ready'
import type { LayoutKind, ResolvedTokens } from '#/lib/templates'
import { AiEnabledContext } from '#/components/blocks/ai/ai-context'
import { BlockDocProvider } from '#/components/blocks/state/block-doc-context'
import { BlockDocument } from '#/components/blocks/document/block-document'
import {
  useFitToWidth,
  useMounted,
} from '#/components/blocks/canvas/canvas-metrics'
import type { useBlockDoc } from '#/components/blocks/state/use-block-doc'

const PAGE_W = 595

/**
 * The editor canvas — the Atelier sheet hosting the block document. Auto-fits the
 * page to fill the width (so it's not tiny) and offers zoom controls. Client-gated
 * (dnd-kit + contentEditable) so the SSR-rendered empty sheet hydrates cleanly.
 */
export function BlockCanvas({
  controller,
  tokens,
  layout,
  dropActive,
}: {
  controller: ReturnType<typeof useBlockDoc>
  tokens: ResolvedTokens
  layout?: LayoutKind
  dropActive?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [userZoom, setUserZoom] = useState(1)
  const aiEnabled = useAiReady()

  const mounted = useMounted()
  const fit = useFitToWidth(panelRef, PAGE_W)
  const zoom = fit * userZoom

  return (
    <div
      ref={panelRef}
      className="canvas-backdrop relative h-full overflow-auto print:h-auto print:overflow-visible"
    >
      <div className="flex min-h-full justify-center px-8 py-12 print:block print:min-h-0 print:p-0">
        <div className="zoom-layer" style={{ zoom }}>
          <div
            ref={sheetRef}
            style={{ '--chrome-zoom': 1 / zoom } as CSSProperties}
            className="atelier-sheet relative h-fit w-[595px] rounded-[2px] bg-white p-12 text-neutral-900 print:w-full print:rounded-none print:p-[16mm]"
          >
            {mounted ? (
              <AiEnabledContext.Provider value={aiEnabled}>
                <BlockDocProvider value={controller.actions}>
                  <BlockDocument
                    key={controller.rev}
                    doc={controller.doc}
                    tokens={tokens}
                    layout={layout}
                    dropActive={dropActive}
                  />
                </BlockDocProvider>
              </AiEnabledContext.Provider>
            ) : null}
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 left-1/2 flex w-fit -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-background/90 p-1 shadow-lg backdrop-blur print:hidden">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setUserZoom((z) => Math.max(0.5, z - 0.1))}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MinusIcon className="size-4" />
        </button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setUserZoom((z) => Math.min(2.5, z + 0.1))}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PlusIcon className="size-4" />
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          type="button"
          aria-label="Fit to width"
          onClick={() => setUserZoom(1)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MaximizeIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
