import { useEffect, useRef, useState } from 'react'
import { CanvasPreview } from './canvas-preview'
import type { CanvasBox } from '#/lib/canvas/model'
import type { ResolvedTokens } from '#/lib/templates'

/** A4-ish page width CanvasPreview renders at, before scaling. */
const PAGE_WIDTH = 612

/**
 * A read-only CanvasPreview scaled to a target thumbnail width. Pass `width` for a fixed scale, or
 * omit it to fill the (relative) parent responsively — the wrapper measures its own width. Shared by
 * the template gallery, the landing showcase, the import preview, and the resumes dashboard.
 */
export function ScaledCanvasPreview({
  root,
  tokens,
  width,
}: {
  root: CanvasBox
  tokens: ResolvedTokens
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState(0)

  useEffect(() => {
    if (width !== undefined || !ref.current) return
    const el = ref.current
    const update = () => setMeasured(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  const w = width ?? measured

  return (
    <div ref={ref} className="absolute inset-0">
      {w > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: PAGE_WIDTH,
            transform: `scale(${w / PAGE_WIDTH})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <CanvasPreview root={root} tokens={tokens} />
        </div>
      ) : null}
    </div>
  )
}
