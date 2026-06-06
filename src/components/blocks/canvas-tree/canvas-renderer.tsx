import type { ResolvedTokens } from '#/lib/templates'
import { isBox, isHorizontal } from '#/lib/canvas/model'
import type { CanvasBox, CanvasNode } from '#/lib/canvas/model'
import { useCanvasSelection } from './selection'
import { boxStyle, childFlex } from './node-style'
import { ElementView } from './element-view'
import { Selectable } from './selectable'

/**
 * Renders the canvas Box tree: walks Box → flex/grid container → Selectable-wrapped children →
 * NodeView (Box or leaf ElementView). Selection, inline editing and styling live in the
 * imported modules (selectable / element-view / node-style); this file is just the walk.
 * Mounted by BlockDocument when `doc.canvas` is present.
 */

function NodeView({ node, tokens }: { node: CanvasNode; tokens: ResolvedTokens }) {
  return isBox(node) ? (
    <BoxView box={node} tokens={tokens} />
  ) : (
    <ElementView el={node} tokens={tokens} />
  )
}

function BoxView({ box, tokens }: { box: CanvasBox; tokens: ResolvedTokens }) {
  const horizontal = isHorizontal(box)
  return (
    <div style={boxStyle(box)}>
      {box.children.map((child) => (
        <Selectable
          key={child.id}
          node={child}
          parentId={box.id}
          flex={horizontal ? childFlex(child) : undefined}
        >
          <NodeView node={child} tokens={tokens} />
        </Selectable>
      ))}
    </div>
  )
}

export function CanvasRenderer({
  root,
  tokens,
}: {
  root: CanvasBox
  tokens: ResolvedTokens
}) {
  const { hover } = useCanvasSelection()
  return (
    <div onMouseLeave={() => hover(null)}>
      <Selectable node={root} parentId={null}>
        <BoxView box={root} tokens={tokens} />
      </Selectable>
    </div>
  )
}
