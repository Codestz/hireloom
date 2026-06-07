import { CanvasPreview } from './canvas-preview'
import type { CanvasBox } from '#/lib/canvas/model'
import type { ResolvedTokens } from '#/lib/templates'

/** A4-ish page width CanvasPreview renders at, before scaling. */
const PAGE_WIDTH = 612

/**
 * A read-only CanvasPreview scaled to a target thumbnail width. Absolutely positioned at the
 * top-left of its (relative, overflow-hidden) host. Shared by the template gallery, the landing
 * showcase, and the import preview so the scale/transform isn't copy-pasted.
 */
export function ScaledCanvasPreview({
  root,
  tokens,
  width,
}: {
  root: CanvasBox
  tokens: ResolvedTokens
  width: number
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: PAGE_WIDTH,
        transform: `scale(${width / PAGE_WIDTH})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
      }}
    >
      <CanvasPreview root={root} tokens={tokens} />
    </div>
  )
}
