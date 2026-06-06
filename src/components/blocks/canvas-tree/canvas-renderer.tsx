import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { ResolvedTokens } from '#/lib/templates'
import { isBox, isHorizontal } from '#/lib/canvas/model'
import type { CanvasBox, CanvasNode } from '#/lib/canvas/model'
import type { FontChoice } from '#/lib/canvas/fonts'
import { useCanvasSelection } from './selection'
import { useDragState } from './drag-context'
import { boxStyle, childFlex } from './node-style'
import { ElementView } from './element-view'
import { Selectable } from './selectable'

/** The projected insertion line shown at the drop slot inside the active container. */
function DropLine({ horizontal }: { horizontal: boolean }) {
  return (
    <div
      style={
        horizontal
          ? { width: 2, alignSelf: 'stretch', background: '#6366f1', borderRadius: 2 }
          : { height: 2, width: '100%', background: '#6366f1', borderRadius: 2 }
      }
    />
  )
}

/**
 * Renders the canvas Box tree: walks Box → flex/grid container → Selectable-wrapped children →
 * NodeView (Box or leaf ElementView). Selection, inline editing and styling live in the
 * imported modules (selectable / element-view / node-style); this file is just the walk.
 * Mounted by BlockDocument when `doc.canvas` is present.
 */

function NodeView({
  node,
  tokens,
  inheritedFont,
}: {
  node: CanvasNode
  tokens: ResolvedTokens
  inheritedFont?: FontChoice
}) {
  return isBox(node) ? (
    <BoxView box={node} tokens={tokens} inheritedFont={inheritedFont} />
  ) : (
    <ElementView el={node} tokens={tokens} inheritedFont={inheritedFont} />
  )
}

function BoxView({
  box,
  tokens,
  inheritedFont,
}: {
  box: CanvasBox
  tokens: ResolvedTokens
  inheritedFont?: FontChoice
}) {
  const horizontal = isHorizontal(box)
  const { setNodeRef } = useDroppable({ id: box.id })
  const drag = useDragState()
  const childFont = box.props.fontFamily ?? inheritedFont

  const items: Array<ReactNode> = box.children.map((child) => (
    <Selectable
      key={child.id}
      node={child}
      parentId={box.id}
      flex={horizontal ? childFlex(child) : undefined}
    >
      <NodeView node={child} tokens={tokens} inheritedFont={childFont} />
    </Selectable>
  ))

  if (drag.overContainerId === box.id && drag.dropIndex !== null) {
    items.splice(
      drag.dropIndex,
      0,
      <DropLine key="drop-line" horizontal={horizontal} />,
    )
  }

  return (
    <div ref={setNodeRef} data-container-id={box.id} style={boxStyle(box)}>
      {items}
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
        <BoxView box={root} tokens={tokens} inheritedFont={root.props.fontFamily} />
      </Selectable>
    </div>
  )
}
