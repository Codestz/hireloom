import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  CollisionDetection,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import type { useBlockDoc } from '#/components/blocks'
import { isBox, isHorizontal } from '#/lib/canvas/model'
import type { CanvasBox } from '#/lib/canvas/model'
import { findNode, findParent } from '#/lib/canvas/tree-ops'
import {
  PALETTE_LABEL,
  makePaletteNode,
  paletteKeyFromId,
} from '#/lib/canvas/palette'
import { KIND_LABEL } from './node-style'
import { DragContext } from './drag-context'
import type { DragState } from './drag-context'

type Controller = ReturnType<typeof useBlockDoc>

/** All box ids in the tree — the set of valid drop containers. */
function collectContainerIds(box: CanvasBox, into: Set<string> = new Set()): Set<string> {
  into.add(box.id)
  for (const c of box.children) if (isBox(c)) collectContainerIds(c, into)
  return into
}

/** Collision that prefers the INNERMOST box under the pointer (so drops nest correctly). */
function innermostBox(containerIds: Set<string>): CollisionDetection {
  return (args) => {
    const hits = pointerWithin(args)
    const boxes = hits.filter((h) => containerIds.has(String(h.id)))
    if (boxes.length === 0) return hits.slice(0, 1)
    let best = boxes[0]
    let bestArea = Infinity
    for (const b of boxes) {
      const r = args.droppableRects.get(b.id)
      const area = r ? r.width * r.height : Infinity
      if (area <= bestArea) {
        bestArea = area
        best = b
      }
    }
    return [best]
  }
}

const EMPTY: DragState = { activeId: null, overContainerId: null, dropIndex: null }

/**
 * Lifts a single DndContext over the canvas (and, later, the palette). Computes the drop
 * container + index from the live pointer (zoom-safe) and commits moves via the controller.
 * Renderer reads the drop position from DragContext to draw the insertion line.
 */
export function CanvasDndProvider({
  controller,
  children,
}: {
  controller: Controller
  children: ReactNode
}) {
  const root = controller.doc.canvas
  const [state, setState] = useState<DragState>(EMPTY)
  const dropRef = useRef<{ over: string; index: number } | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )
  const containerIds = useMemo(
    () => (root ? collectContainerIds(root) : new Set<string>()),
    [root],
  )
  const collision = useMemo(() => innermostBox(containerIds), [containerIds])

  if (!root) return <>{children}</>

  const pointerOf = (e: DragMoveEvent) => {
    const a = e.activatorEvent as PointerEvent
    return { x: a.clientX + e.delta.x, y: a.clientY + e.delta.y }
  }

  /** Index among a container's direct child node-wrappers nearest the pointer. */
  const indexInContainer = (containerId: string, pointer: { x: number; y: number }) => {
    const el = document.querySelector(`[data-container-id="${containerId}"]`)
    const node = findNode(root, containerId)
    if (!el || !node || !isBox(node)) return 0
    const horizontal = isHorizontal(node)
    const kids = [...el.children].filter((c) =>
      (c as HTMLElement).hasAttribute('data-node-id'),
    )
    let i = 0
    for (const kid of kids) {
      const r = kid.getBoundingClientRect()
      const mid = horizontal ? r.left + r.width / 2 : r.top + r.height / 2
      const p = horizontal ? pointer.x : pointer.y
      if (p > mid) i++
      else break
    }
    return i
  }

  const onDragStart = (e: DragStartEvent) =>
    setState({ activeId: String(e.active.id), overContainerId: null, dropIndex: null })

  const onDragMove = (e: DragMoveEvent) => {
    const over = e.over?.id ? String(e.over.id) : null
    if (!over || !containerIds.has(over)) {
      dropRef.current = null
      setState((s) => ({ ...s, overContainerId: null, dropIndex: null }))
      return
    }
    const index = indexInContainer(over, pointerOf(e))
    dropRef.current = { over, index }
    setState((s) => ({ ...s, overContainerId: over, dropIndex: index }))
  }

  const onDragEnd = (_e: DragEndEvent) => {
    const active = state.activeId
    const drop = dropRef.current
    dropRef.current = null
    setState(EMPTY)
    if (!active || !drop) return

    // Palette drop (new:<key>) → insert a fresh node at the slot; otherwise move an existing one.
    const paletteKey = paletteKeyFromId(active)
    if (paletteKey) {
      controller.onCanvasInsertNode(drop.over, makePaletteNode(paletteKey), drop.index)
      return
    }

    let index = drop.index
    // Same-container downward move: moveNode removes-then-inserts, so the target shifts back one.
    const parent = findParent(root, active)
    if (parent && parent.id === drop.over) {
      const from = parent.children.findIndex((c) => c.id === active)
      if (from >= 0 && from < index) index -= 1
    }
    controller.onCanvasMoveNode(active, drop.over, index)
  }

  const activeLabel = state.activeId
    ? (() => {
        const paletteKey = paletteKeyFromId(state.activeId)
        if (paletteKey) return PALETTE_LABEL[paletteKey]
        const n = findNode(root, state.activeId)
        return n ? (KIND_LABEL[n.kind] ?? n.kind) : null
      })()
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        dropRef.current = null
        setState(EMPTY)
      }}
    >
      <DragContext.Provider value={state}>{children}</DragContext.Provider>
      <DragOverlay dropAnimation={null}>
        {activeLabel ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#6366f1',
              color: '#fff',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {activeLabel}
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
